// Core synthesis logic for moments — extracted from index.js so it
// can be imported in tests with openai + admin stubbed via proxyquire.
//
// Produces three single-sentence lines (agreement / divergence /
// emergent) across the stack of views on a single moment, caches them
// on `moments/{momentId}.synthesis`, and logs AI usage.

const admin = require("firebase-admin");
const {getOpenAI} = require("./openaiClient.js");

// First-draft prompt copy. Should be reviewed against real samples
// before shipping to production.
function buildPrompt(views) {
  const viewBlocks = views.map((v, i) => {
    const when = v.createdAt && typeof v.createdAt.toDate === "function"
      ? v.createdAt.toDate().toISOString().slice(0, 10)
      : "unknown";
    return `View ${i + 1} — author ${v.authorId} (${when}):\n"""\n${(v.text || "").trim()}\n"""`;
  }).join("\n\n");

  return `You are reading multiple first-person accounts of the same lived moment, written by different members of a family. Produce a compact synthesis that names what is in front of us, without editorializing.

Given the following views of one moment, produce THREE single-sentence lines.

1. agreement_line: What do these views agree on? One concrete sentence. If they agree on a factual anchor (what happened, when, who was there), name that. If they agree on the emotional weight, name that.

2. divergence_line: Where do the views differ? This is not conflict to resolve — it is information. Name the shape of the difference in one sentence. Return null (not a string) if the views don't meaningfully differ.

3. emergent_line: What pattern is visible in the stack of views that neither view stated alone? Something only a third reader would notice. Return null if nothing emerges.

Rules:
- Never write "both parents agree that..." — use concrete nouns from the views.
- Never use clinical language ("conflict resolution", "communication breakdown").
- Never exceed 20 words per sentence.
- Return only JSON: {"agreement_line":"...","divergence_line":"..."|null,"emergent_line":"..."|null}

VIEWS:

${viewBlocks}

Return only the JSON object.`;
}

async function runMomentSynthesis(db, momentId, opts = {}) {
  const logger = opts.logger || console;
  const openai = opts.openai || getOpenAI();
  const nowFn = opts.now || (() => admin.firestore.Timestamp.now());

  const momentRef = db.collection("moments").doc(momentId);
  const momentSnap = await momentRef.get();
  if (!momentSnap.exists) {
    if (logger.warn) logger.warn(`synthesizeMoment: moment ${momentId} does not exist`);
    return {skipped: "missing"};
  }
  const moment = momentSnap.data();

  const viewsSnap = await db.collection("journal_entries")
      .where("momentId", "==", momentId)
      .orderBy("createdAt", "asc")
      .get();

  const views = viewsSnap.docs.map((d) => {
    const data = typeof d.data === "function" ? d.data() : d.data;
    return {entryId: d.id, ...data};
  });
  if (views.length < 2) {
    return {skipped: "too_few_views", viewCount: views.length};
  }

  const model = opts.model || "gpt-4o-mini";
  let response;
  try {
    response = await openai.chat.completions.create({
      model,
      messages: [{role: "user", content: buildPrompt(views)}],
      max_tokens: 400,
      response_format: {type: "json_object"},
    });
  } catch (err) {
    if (logger.error) logger.error(`synthesizeMoment: OpenAI call failed for ${momentId}: ${err.message}`);
    throw err;
  }

  const text = response.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    if (logger.warn) logger.warn(`synthesizeMoment: JSON parse failed for ${momentId}: ${err.message}`);
    return {skipped: "parse_error"};
  }

  const agreementLine = typeof parsed.agreement_line === "string"
    ? parsed.agreement_line.trim().slice(0, 400)
    : "";
  const divergenceLine = typeof parsed.divergence_line === "string"
    ? parsed.divergence_line.trim().slice(0, 400)
    : null;
  const emergentLine = typeof parsed.emergent_line === "string"
    ? parsed.emergent_line.trim().slice(0, 400)
    : null;

  if (!agreementLine) {
    if (logger.warn) logger.warn(`synthesizeMoment: missing agreement_line for ${momentId}`);
    return {skipped: "empty_agreement"};
  }

  const now = nowFn();
  await momentRef.update({
    synthesis: {
      agreementLine,
      divergenceLine,
      emergentLine,
      model,
      generatedAt: now,
    },
    synthesisUpdatedAt: now,
  });

  await db.collection("ai_usage_events").add({
    kind: "moment_synthesis",
    familyId: moment.familyId,
    momentId,
    model,
    tokens: response.usage?.total_tokens || 0,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    timestamp: now,
  });

  if (logger.info) {
    logger.info(
        `synthesizeMoment: ${momentId} — agreement + ` +
        `${divergenceLine ? "divergence" : "no divergence"} + ` +
        `${emergentLine ? "emergent" : "no emergent"} ` +
        `(${views.length} views)`,
    );
  }

  return {
    ok: true,
    viewCount: views.length,
    agreementLine,
    divergenceLine,
    emergentLine,
  };
}

module.exports = {runMomentSynthesis, buildPrompt};
