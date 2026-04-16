const SYSTEM_PROMPT = `You are writing one short dinner-table conversation question for a family.

Rules:
- Output exactly ONE question, max 25 words.
- Match the requested audience: "kid" prompts must be accessible to a 7-year-old; "adult" prompts can be more reflective.
- Use the family signal as inspiration, NOT as a quote — never repeat the journal/manual text verbatim.
- Connect the family signal to the requested theme.
- No preamble, no headers, no explanation. Just the question.
- Plain text. No emoji unless the audience is "kid" and it would clearly help.`;

async function synthesizePrompt({ client, theme, audience, excerpts }) {
  const excerptBlock = excerpts
    .map(e => `(${e.source}, ${e.firstName}) ${e.text}`)
    .join("\n");

  const userMessage = `Theme: ${theme}
Audience: ${audience}

Family signals from the last 7 days:
${excerptBlock}

Write the question now.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content.find(b => b.type === "text");
  if (!block || !block.text) {
    throw new Error("synthesis returned no text block");
  }

  return {
    text: block.text.trim(),
    source: "synthesized",
  };
}

async function synthesizeOrFallback({ client, theme, audience, excerpts, libraryFallback }) {
  try {
    const synth = await synthesizePrompt({ client, theme, audience, excerpts });
    return { ...synth, sourceRefs: { journalEntryIds: [], manualAnswerIds: [] } };
  } catch (err) {
    console.warn("[dinner-prompts] synthesis failed, falling back to library", err.message);
    const fb = libraryFallback();
    if (!fb) return null;
    return {
      text: fb.prompt.text,
      source: "library",
      sourceRefs: { libraryId: fb.prompt.id },
      relaxation: fb.relaxation,
    };
  }
}

module.exports = { synthesizePrompt, synthesizeOrFallback, SYSTEM_PROMPT };
