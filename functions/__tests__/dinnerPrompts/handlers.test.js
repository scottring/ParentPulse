const assert = require("assert");
const sinon = require("sinon");
const { handleGetDinnerPrompt } = require("../../dinnerPrompts/handlers");

function fakeReq({ method = "GET", query = {}, body = {}, headers = {} } = {}) {
  return { method, query, body, headers };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    set(name, val) { this.headers[name] = val; },
  };
  return res;
}

describe("handlers.handleGetDinnerPrompt — happy path (library)", () => {
  it("returns and persists a library-picked prompt when no day-doc exists", async () => {
    const req = fakeReq({
      method: "GET",
      query: { householdId: "h1", date: "2026-04-16" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves(null),
      writeNewDay: sinon.stub().resolves(),
      audienceForDate: () => "kid",
      pickTheme: () => "courage",
      hasJuicySignal: () => ({ matched: false }),
      pickWithFallback: () => ({
        prompt: { id: "courage-001", text: "Brave?", themes: ["courage"], audiences: ["kid"] },
        relaxation: "none",
      }),
      collectRecentSignals: sinon.stub().resolves({ journalEntries: [], manualAnswers: [] }),
      recentlyServedLibraryIds: sinon.stub().resolves([]),
      flaggedLibraryIds: sinon.stub().resolves([]),
      synthCountInLast7Days: sinon.stub().resolves(0),
      synthesizeOrFallback: sinon.stub(),
      library: [],
      anthropicClient: null,
      householdMemberIds: ["user-1"],
      collections: {
        apiKeys: {},
        days: { doc: () => ({}) },
        overlay: {},
        journals: {},
        contributions: {},
      },
      now: new Date("2026-04-16T22:00:00Z"),
    };

    await handleGetDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.text, "Brave?");
    assert.strictEqual(res.body.source, "library");
    assert.strictEqual(res.body.audience, "kid");
    assert.strictEqual(res.body.theme, "courage");
    sinon.assert.calledOnce(deps.writeNewDay);
  });

  it("returns 401 when api key is invalid", async () => {
    const req = fakeReq({ method: "GET", query: { householdId: "h1", date: "2026-04-16" }, headers: {} });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: false, status: 401, error: "missing api key" }),
      collections: { apiKeys: {} },
    };
    await handleGetDinnerPrompt(req, res, deps);
    assert.strictEqual(res.statusCode, 401);
  });

  it("returns the existing day-doc when one is already present", async () => {
    const req = fakeReq({
      method: "GET",
      query: { householdId: "h1", date: "2026-04-16" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Existing?", audience: "kid", theme: "courage", source: "library",
        sourceRefs: { libraryId: "x" }, status: "served", servedAt: new Date(),
      }),
      writeNewDay: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) } },
      now: new Date(),
    };
    await handleGetDinnerPrompt(req, res, deps);
    assert.strictEqual(res.body.text, "Existing?");
    sinon.assert.notCalled(deps.writeNewDay);
  });
});

describe("handlers.handleSwapDinnerPrompt", () => {
  const { handleSwapDinnerPrompt } = require("../../dinnerPrompts/handlers");

  it("records a swap and returns a new prompt", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", swap: true },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Old?", audience: "kid", theme: "courage", source: "library",
        sourceRefs: { libraryId: "courage-001" }, status: "served",
      }),
      recordSwap: sinon.stub().resolves(),
      audienceForDate: () => "kid",
      pickTheme: () => "courage",
      hasJuicySignal: () => ({ matched: false }),
      pickWithFallback: () => ({
        prompt: { id: "courage-002", text: "New brave?", themes: ["courage"], audiences: ["kid"] },
        relaxation: "none",
      }),
      collectRecentSignals: sinon.stub().resolves({ journalEntries: [], manualAnswers: [] }),
      recentlyServedLibraryIds: sinon.stub().resolves(["courage-001"]),
      flaggedLibraryIds: sinon.stub().resolves([]),
      synthCountInLast7Days: sinon.stub().resolves(0),
      synthesizeOrFallback: sinon.stub(),
      library: [],
      anthropicClient: null,
      householdMemberIds: ["user-1"],
      collections: {
        apiKeys: {}, days: { doc: () => ({}) }, overlay: {}, journals: {}, contributions: {},
      },
      now: new Date("2026-04-16T23:00:00Z"),
    };

    await handleSwapDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.text, "New brave?");
    sinon.assert.calledOnce(deps.recordSwap);
    const swapArgs = deps.recordSwap.firstCall.args[0];
    assert.strictEqual(swapArgs.newPayload.text, "New brave?");
    assert.strictEqual(swapArgs.newPayload.sourceRefs.libraryId, "courage-002");
  });

  it("returns 404 when there is no day-doc to swap from", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", swap: true },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves(null),
      collections: { apiKeys: {}, days: { doc: () => ({}) } },
      now: new Date(),
    };
    await handleSwapDinnerPrompt(req, res, deps);
    assert.strictEqual(res.statusCode, 404);
  });
});

describe("handlers.handleReportDinnerPrompt", () => {
  const { handleReportDinnerPrompt } = require("../../dinnerPrompts/handlers");

  it("flags the library prompt and records a report on the day-doc", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", reason: "too dark" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Bad?", source: "library", sourceRefs: { libraryId: "courage-001" }, status: "served",
      }),
      writeFlag: sinon.stub().resolves(),
      recordReport: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) }, overlay: {} },
      now: new Date("2026-04-16T23:30:00Z"),
    };

    await handleReportDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    sinon.assert.calledOnce(deps.writeFlag);
    sinon.assert.calledOnce(deps.recordReport);
    const flagCall = deps.writeFlag.firstCall.args[0];
    assert.strictEqual(flagCall.libraryId, "courage-001");
    assert.strictEqual(flagCall.reason, "too dark");
  });

  it("does not call writeFlag when the source is synthesized (no libraryId)", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", reason: "weird" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Synth?", source: "synthesized", sourceRefs: { journalEntryIds: ["j1"] }, status: "served",
      }),
      writeFlag: sinon.stub().resolves(),
      recordReport: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) }, overlay: {} },
      now: new Date(),
    };
    await handleReportDinnerPrompt(req, res, deps);
    sinon.assert.notCalled(deps.writeFlag);
    sinon.assert.calledOnce(deps.recordReport);
  });
});
