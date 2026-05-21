// functions/claritySessionTurn.handler.js
//
// Core logic for one clarity-session turn. Mirrors the extracted
// handler pattern in synthesizeWeeklyFocus.handler.js.
//
// Deps injected: { db, anthropic, logger, logAIUsage }
// Payload:       { uid, data: { obstacleId, message } }

"use strict";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  "You are a clarity coach for one of the users of an app called Relish.",
  "The user is working through an obstacle in one of their close relationships.",
  "",
  "VOICE:",
  "Warm, specific, slightly dry. Not therapy-speak. Not coach-jargon.",
  "Not performative neutrality. Name what you notice, even when uncomfortable.",
  "",
  "TURN STRUCTURE:",
  "Each of your turns has exactly two parts: a brief reflection (1-2 short",
  "paragraphs) and ONE question at the end. Never more than one question.",
  "Your response should be shorter than the user's.",
  "",
  "WHAT YOU NEVER DO:",
  "- Never ask more than one question per turn.",
  "- Never moralize or instruct.",
  "- Never write the user's exact words for the prescription. Offer a question",
  "  for them to ask, not a script to recite.",
  "- Never advance to prescription without checking ('Want to try something concrete?').",
  "- Never advice-dump mid-session.",
  "",
  "PRESCRIPTION:",
  "When clarity surfaces (the user has named what they want / where the friction",
  "is / what they don't know), propose ONE prescription. Include the",
  "`prescriptionDraft` field in your JSON response when proposing.",
  "Shapes available:",
  "- 'atomic': one specific question or sentence for the user to ask",
  "- 'sequence': 2-4 ordered conditional moves",
  "- 'experiment': a week-long behavior change to try",
  "- 'illustrated-story': only for kid recipients",
  "When the prescription is something to say, phrase as the question the user",
  "should ask, not as a script to read aloud.",
  "",
  "SAFETY:",
  "If the user surfaces self-harm, severe distress, or domestic violence",
  "indicators: break form. Name what you noticed. Suggest real-world resources",
  "(a therapist, a hotline). Do not prescribe a confrontational move.",
  "",
  "PRIVACY: Synthesize at the level of the dynamic, not the specific.",
  "Do not include: sexual acts, third-party names, financial figures,",
  "medical details, or quoted private words.",
  "Apply the uncomfortable test: Would the user be uncomfortable if",
  "this exact sentence were read by someone they share this with? If yes,",
  "generalize further.",
  "",
  "OUTPUT FORMAT (strict):",
  "Respond with a single JSON object, nothing else. No prose, no preamble,",
  "no markdown fences. The schema is:",
  '  { "reflection": string, "question": string,',
  '    "prescriptionDraft"?: { "shape": "atomic"|"sequence"|"experiment"|"illustrated-story", "body": string } }',
].join("\n");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Draft a working title from the user's first message.
 * Caps at 60 chars; truncates cleanly with an ellipsis.
 */
function draftTitleFromFirstMessage(message) {
  const cleaned = String(message || "").trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57).trim() + "…";
}

/**
 * Build a flat transcript array from saved move docs.
 * Only picks moves of type "clarity-session".
 */
function buildTranscript(docs) {
  const turns = [];
  for (const doc of docs) {
    const data = typeof doc.data === "function" ? doc.data() : doc;
    if (data && data.type === "clarity-session" && data.payload) {
      turns.push({
        role: data.payload.role,
        content: data.payload.content,
      });
    }
  }
  return turns;
}

/**
 * Build the single user-facing message that carries obstacle context +
 * full transcript (including the new user turn already appended).
 */
function buildPerTurnUserMessage(obstacleTitle, transcript) {
  const parts = [];
  if (obstacleTitle && obstacleTitle.trim()) {
    parts.push(`Obstacle: ${obstacleTitle.trim()}`);
    parts.push("");
  }
  for (const t of transcript) {
    const label = t.role === "user" ? "USER" : "ASSISTANT";
    parts.push(`${label}: ${t.content}`);
  }
  parts.push("");
  parts.push("Respond as ASSISTANT now.");
  return parts.join("\n");
}

/** Parse and validate the JSON envelope from the model. */
function parseEnvelope(rawText) {
  const stripped = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  const obj = JSON.parse(stripped); // throws on bad JSON
  if (!obj || typeof obj !== "object") throw new Error("Not a JSON object");

  if (typeof obj.reflection !== "string" || !obj.reflection.trim()) {
    throw new Error("Missing reflection");
  }
  if (typeof obj.question !== "string" || !obj.question.trim()) {
    throw new Error("Missing question");
  }

  const out = {
    reflection: obj.reflection.trim(),
    question: obj.question.trim(),
  };

  if (obj.prescriptionDraft) {
    const pd = obj.prescriptionDraft;
    const validShapes = ["atomic", "sequence", "experiment", "illustrated-story"];
    if (!validShapes.includes(pd.shape)) throw new Error("Bad shape: " + pd.shape);
    if (typeof pd.body !== "string" || !pd.body.trim()) throw new Error("Bad body");
    out.prescriptionDraft = { shape: pd.shape, body: pd.body.trim() };
  }

  return out;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function runClaritySessionTurn(deps, payload) {
  const { db, anthropic, logger = console, logAIUsage } = deps;
  const { uid, data } = payload || {};

  // 1. Auth guard.
  if (!uid) throw new Error("Authentication required");

  const obstacleId = (data && data.obstacleId) || null;
  const message =
    data && typeof data.message === "string" ? data.message.trim() : "";

  if (!obstacleId) throw new Error("obstacleId is required");
  if (!message) throw new Error("message is required");

  // 2. Load obstacle + ownership check.
  const obstacleRef = db.collection("obstacles").doc(obstacleId);
  const obstacleSnap = await obstacleRef.get();
  if (!obstacleSnap.exists) throw new Error("Obstacle not found");
  const obstacle = obstacleSnap.data();

  if (obstacle.authorId !== uid) throw new Error("Access denied");

  // 3. Load user + family-scope check.
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap && userSnap.data && userSnap.data();
  if (!userData || userData.familyId !== obstacle.familyId) {
    throw new Error("Access denied");
  }

  // 4. Status guard — only valid in fresh or clarifying.
  if (obstacle.status !== "fresh" && obstacle.status !== "clarifying") {
    throw new Error(`Cannot run clarity turn from status ${obstacle.status}`);
  }

  // 5. Load existing moves for transcript context (ordered chronologically).
  const movesSnap = await obstacleRef.collection("moves").orderBy("at", "asc").get();
  const priorTranscript = buildTranscript(movesSnap.docs);

  // Append the incoming user turn to produce the full transcript for the model.
  const fullTranscript = [...priorTranscript, { role: "user", content: message }];

  // 6. Write the user move (before calling the model so it's persisted even on LLM failure).
  const nowValue = new Date(); // fallback timestamp (FieldValue.serverTimestamp() used in prod wrapper)
  await obstacleRef.collection("moves").add({
    type: "clarity-session",
    at: nowValue,
    byUserId: uid,
    payload: { role: "user", content: message },
  });

  // 7. If fresh → transition to clarifying and draft a working title.
  if (obstacle.status === "fresh") {
    await obstacleRef.update({
      status: "clarifying",
      title: draftTitleFromFirstMessage(message),
      updatedAt: nowValue,
    });
  }

  // 8. Build the title to include in context (post-update if we just set it).
  const activeTitle =
    obstacle.status === "fresh"
      ? draftTitleFromFirstMessage(message)
      : obstacle.title || "";

  // 9. Call Anthropic.
  const userMessage = buildPerTurnUserMessage(activeTitle, fullTranscript);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0.6,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText =
    (response.content && response.content[0] && response.content[0].text) || "";

  // 10. Parse the JSON envelope.
  let parsed;
  try {
    parsed = parseEnvelope(rawText);
  } catch (e) {
    if (logger && logger.error) {
      logger.error("Bad clarity envelope:", e.message, rawText.slice(0, 200));
    }
    throw new Error("AI response could not be parsed");
  }

  // 11. Write the assistant move.
  const assistantContent = [parsed.reflection, "", parsed.question].join("\n");
  await obstacleRef.collection("moves").add({
    type: "clarity-session",
    at: nowValue,
    byUserId: uid,
    payload: {
      role: "assistant",
      content: assistantContent,
      reflection: parsed.reflection,
      question: parsed.question,
      ...(parsed.prescriptionDraft
        ? { prescriptionDraft: parsed.prescriptionDraft }
        : {}),
    },
  });

  // 12. Log AI usage (best-effort — never fails the call).
  if (typeof logAIUsage === "function") {
    try {
      await logAIUsage(db, {
        familyId: userData.familyId,
        userId: uid,
        functionName: "claritySessionTurn",
        model: "claude-sonnet-4-6",
        usage: response.usage,
      });
    } catch (e) {
      if (logger && logger.warn) {
        logger.warn("logAIUsage failed (non-critical):", e.message);
      }
    }
  }

  return {
    assistantTurn: {
      reflection: parsed.reflection,
      question: parsed.question,
      prescriptionDraft: parsed.prescriptionDraft,
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  runClaritySessionTurn,
  SYSTEM_PROMPT,
  draftTitleFromFirstMessage,
  buildTranscript,
  buildPerTurnUserMessage,
  parseEnvelope,
};
