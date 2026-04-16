const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

const library = require("../data/dinner-prompts.json");
const { audienceForDate, pickTheme } = require("./themes");
const { pickWithFallback } = require("./library");
const { hasJuicySignal } = require("./signal");
const { synthesizeOrFallback } = require("./synthesis");
const { validateApiKey } = require("./auth");
const {
  writeNewDay, readDay, recordSwap, recordReport,
  recentlyServedLibraryIds, synthCountInLast7Days,
} = require("./dayDoc");
const { flaggedLibraryIds, writeFlag } = require("./overlay");
const { collectRecentSignals } = require("./signalSources");
const {
  handleGetDinnerPrompt,
  handleSwapDinnerPrompt,
  handleReportDinnerPrompt,
} = require("./handlers");

let anthropic;
function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

async function loadHouseholdMemberIds(householdId) {
  const db = admin.firestore();
  // NOTE: scoping field in Relish schema is `familyId`, not `householdId`.
  // The parameter name `householdId` is kept at the API surface (Symphony's concept);
  // this function translates to the Firestore field.
  const snap = await db.collection("people")
    .where("familyId", "==", householdId)
    .where("relationshipType", "in", ["self", "spouse", "child"])
    .get();
  const ids = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.linkedUserId) ids.push(data.linkedUserId);
  });
  return ids;
}

function buildDeps({ householdId, now }) {
  const db = admin.firestore();
  return {
    validateApiKey,
    readDay,
    writeNewDay,
    recordSwap,
    recordReport,
    audienceForDate,
    pickTheme,
    hasJuicySignal,
    pickWithFallback,
    collectRecentSignals,
    recentlyServedLibraryIds,
    flaggedLibraryIds,
    writeFlag,
    synthCountInLast7Days,
    synthesizeOrFallback,
    library,
    anthropicClient: getAnthropic(),
    collections: {
      apiKeys: db.collection("api_keys"),
      days: db.collection("dinner_prompts").doc(householdId).collection("days"),
      overlay: db.collection("dinner_prompts").doc(householdId).collection("library_overlay"),
      journals: db.collection("journal_entries"),
      contributions: db.collection("contributions"),
    },
    now,
  };
}

const COMMON_OPTS = {
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 30,
  secrets: ["ANTHROPIC_API_KEY"],
  cors: true,
};

const getDinnerPrompt = onRequest(COMMON_OPTS, async (req, res) => {
  try {
    const householdId = req.method === "GET" ? req.query.householdId : (req.body && req.body.householdId);
    if (!householdId) { res.status(400).json({ error: "householdId required" }); return; }
    const now = new Date();
    const deps = buildDeps({ householdId, now });
    deps.householdMemberIds = await loadHouseholdMemberIds(householdId);

    if (req.method === "POST" && req.body && req.body.swap) {
      await handleSwapDinnerPrompt(req, res, deps);
    } else {
      await handleGetDinnerPrompt(req, res, deps);
    }
  } catch (err) {
    console.error("[dinner-prompts] getDinnerPrompt error", err);
    res.status(500).json({ error: "internal error" });
  }
});

const reportDinnerPrompt = onRequest(COMMON_OPTS, async (req, res) => {
  try {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const householdId = req.body && req.body.householdId;
    if (!householdId) { res.status(400).json({ error: "householdId required" }); return; }
    const now = new Date();
    const deps = buildDeps({ householdId, now });
    await handleReportDinnerPrompt(req, res, deps);
  } catch (err) {
    console.error("[dinner-prompts] reportDinnerPrompt error", err);
    res.status(500).json({ error: "internal error" });
  }
});

module.exports = { getDinnerPrompt, reportDinnerPrompt };
