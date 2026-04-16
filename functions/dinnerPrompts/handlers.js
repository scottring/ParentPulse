const { extractBearer } = require("./auth");

function dayDocPath(householdId, dateStr) {
  return `dinner_prompts/${householdId}/days/${dateStr}`;
}

function shapeResponse(dayData, includeRefs) {
  const out = {
    text: dayData.text,
    audience: dayData.audience,
    theme: dayData.theme,
    source: dayData.source,
    servedAt: dayData.servedAt,
  };
  if (includeRefs) out.sourceRefs = dayData.sourceRefs || {};
  return out;
}

async function generatePrompt({ deps, householdId, dateStr, audience, theme }) {
  const [recentlyServed, flagged, signals, synthCount] = await Promise.all([
    deps.recentlyServedLibraryIds({ daysCollection: deps.collections.days, now: deps.now, windowDays: 30 }),
    deps.flaggedLibraryIds({ overlayCollection: deps.collections.overlay }),
    deps.collectRecentSignals({
      householdId,
      householdMemberIds: deps.householdMemberIds,
      journalsCollection: deps.collections.journals,
      contributionsCollection: deps.collections.contributions,
      now: deps.now,
      windowDays: 7,
    }),
    deps.synthCountInLast7Days({ daysCollection: deps.collections.days, now: deps.now }),
  ]);

  const signal = deps.hasJuicySignal({
    theme,
    recentJournalEntries: signals.journalEntries,
    recentManualAnswers: signals.manualAnswers,
    synthCountInLast7Days: synthCount,
    now: deps.now,
  });

  const libraryFallback = () => deps.pickWithFallback({
    library: deps.library,
    audience,
    theme,
    recentlyServedIds: recentlyServed,
    flaggedIds: flagged,
  });

  if (signal.matched && deps.anthropicClient) {
    const excerpts = signals.journalEntries
      .filter(e => signal.matchedJournalIds.includes(e.id))
      .map(e => ({ source: "journal", text: e.text, firstName: "" }));
    const synth = await deps.synthesizeOrFallback({
      client: deps.anthropicClient,
      theme, audience, excerpts, libraryFallback,
    });
    if (synth) {
      if (synth.source === "synthesized") {
        synth.sourceRefs = {
          journalEntryIds: signal.matchedJournalIds,
          manualAnswerIds: signal.matchedManualIds,
        };
      }
      return synth;
    }
  }

  const fb = libraryFallback();
  if (!fb) return null;
  return {
    text: fb.prompt.text,
    source: "library",
    sourceRefs: { libraryId: fb.prompt.id },
  };
}

async function handleGetDinnerPrompt(req, res, deps) {
  const apiKey = extractBearer(req.headers.authorization);
  const householdId = (req.method === "GET" ? req.query.householdId : req.body.householdId);
  const dateStr = (req.method === "GET" ? req.query.date : req.body.date);
  const includeRefs = (req.method === "GET" ? req.query.include === "refs" : req.body.include === "refs");

  if (!householdId || !dateStr) {
    res.status(400).json({ error: "householdId and date are required" });
    return;
  }

  const auth = await deps.validateApiKey({
    apiKey, householdId, apiKeysCollection: deps.collections.apiKeys,
  });
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const dayRef = deps.collections.days.doc(dateStr);
  const existing = await deps.readDay({ ref: dayRef });
  if (existing) {
    res.status(200).json(shapeResponse(existing, includeRefs));
    return;
  }

  const audience = deps.audienceForDate(new Date(dateStr + "T12:00:00Z"));
  const theme = deps.pickTheme({ householdId, date: new Date(dateStr + "T12:00:00Z"), audience });

  const generated = await generatePrompt({ deps, householdId, dateStr, audience, theme });
  if (!generated) {
    res.status(500).json({ error: "no prompt could be produced" });
    return;
  }

  await deps.writeNewDay({
    ref: dayRef,
    payload: { ...generated, audience, theme },
    now: deps.now,
  });

  res.status(200).json(shapeResponse({ ...generated, audience, theme, servedAt: deps.now }, includeRefs));
}

module.exports = { handleGetDinnerPrompt, dayDocPath, shapeResponse };
