// Core logic for the weekly-focus prescription — extracted from
// index.js so it can be unit-tested with anthropic + db injected.
//
// Reads the couple's just-finished ritual (what went well / was hard /
// small joys + the intentions they typed) and returns ONE concrete
// shared thing to try for the week. Guidance is wanted — but it stays
// as disciplined as the Mirror line: one action, plain language, no
// therapy-speak, at most two sentences, always overridable by the
// couple in the UI.

function buildWeeklyFocusPrompt({wentWell, wasHard, smallJoys, intentions}) {
  const parts = [];
  if (wentWell && wentWell.trim()) {
    parts.push(`What went well:\n"${wentWell.trim()}"`);
  }
  if (wasHard && wasHard.trim()) {
    parts.push(`What was hard:\n"${wasHard.trim()}"`);
  }
  if (smallJoys && smallJoys.trim()) {
    parts.push(`Small joys:\n"${smallJoys.trim()}"`);
  }
  const cleaned = (intentions || [])
      .map((s) => String(s).trim())
      .filter(Boolean);
  if (cleaned.length > 0) {
    parts.push(
        `What they said they want to carry into the week:\n` +
        cleaned.map((t) => `- ${t}`).join("\n"),
    );
  }
  return (
    `A couple just finished their weekly ritual. Here is what they said.\n\n` +
    `${parts.join("\n\n")}\n\n` +
    `Give them ONE concrete thing to try together this coming week.`
  );
}

async function runWeeklyFocusSynthesis(deps, payload) {
  const {db, anthropic, logger = console, logAIUsage} = deps;
  const {uid, data} = payload || {};

  if (!uid) {
    throw new Error("Authentication required");
  }

  const wentWell = String((data && data.wentWell) || "");
  const wasHard = String((data && data.wasHard) || "");
  const smallJoys = String((data && data.smallJoys) || "");
  const intentions = Array.isArray(data && data.intentions) ?
    data.intentions.map((s) => String(s).trim()).filter(Boolean) :
    [];

  const hasSignal = Boolean(
      wentWell.trim() ||
      wasHard.trim() ||
      smallJoys.trim() ||
      intentions.length > 0,
  );
  if (!hasSignal) {
    throw new Error("Nothing to build a focus from");
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap && userSnap.data && userSnap.data();
  if (!userData || userData.role !== "parent") {
    throw new Error("Only parents can use the weekly focus");
  }

  const system =
    "You are closing a couple's weekly ritual. Output EXACTLY one or " +
    "two short sentences naming ONE concrete shared thing the two of " +
    "them can try together this week, grounded in what they just said. " +
    "Plain language, warm, specific. It is fine to suggest and guide — " +
    "but no therapy-speak, no jargon, no numbered lists, no preamble, " +
    "no advice-as-lecture, no questions. Just the one thing, said " +
    "plainly. Do not exceed two sentences.";

  const userMessage = buildWeeklyFocusPrompt({
    wentWell,
    wasHard,
    smallJoys,
    intentions,
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 160,
    temperature: 0.6,
    system,
    messages: [{role: "user", content: userMessage}],
  });

  const focus = (
    (response.content && response.content[0] && response.content[0].text) || ""
  ).trim();
  if (!focus) {
    throw new Error("Synthesis returned empty");
  }

  if (typeof logAIUsage === "function") {
    try {
      await logAIUsage(db, {
        familyId: userData.familyId,
        userId: uid,
        functionName: "synthesizeWeeklyFocus",
        model: "claude-sonnet-4-6",
        usage: response.usage,
      });
    } catch (e) {
      if (logger && logger.warn) {
        logger.warn("logAIUsage failed (non-critical):", e.message);
      }
    }
  }

  return {focus};
}

module.exports = {runWeeklyFocusSynthesis, buildWeeklyFocusPrompt};
