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
