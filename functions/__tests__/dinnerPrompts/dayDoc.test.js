const assert = require("assert");
const sinon = require("sinon");
const { writeNewDay, readDay, recordSwap, recordReport } = require("../../dinnerPrompts/dayDoc");

function fakeDayDocRef(initial) {
  let state = initial;
  return {
    get: sinon.stub().callsFake(async () => ({
      exists: state !== undefined,
      data: () => state,
    })),
    set: sinon.stub().callsFake(async (data) => { state = data; }),
    update: sinon.stub().callsFake(async (patch) => {
      state = { ...state, ...patch };
    }),
    _state: () => state,
  };
}

describe("dayDoc.writeNewDay", () => {
  it("persists a new day-doc with status 'served'", async () => {
    const ref = fakeDayDocRef(undefined);
    const now = new Date("2026-04-16T22:00:00Z");
    await writeNewDay({
      ref,
      payload: {
        text: "Q?",
        audience: "kid",
        theme: "courage",
        source: "library",
        sourceRefs: { libraryId: "courage-001" },
      },
      now,
    });
    sinon.assert.calledOnce(ref.set);
    const written = ref.set.firstCall.args[0];
    assert.strictEqual(written.status, "served");
    assert.strictEqual(written.text, "Q?");
    assert.deepStrictEqual(written.swapHistory, []);
    assert.ok(written.servedAt instanceof Date);
  });
});

describe("dayDoc.readDay", () => {
  it("returns null when doc does not exist", async () => {
    const ref = fakeDayDocRef(undefined);
    const result = await readDay({ ref });
    assert.strictEqual(result, null);
  });
  it("returns the data when doc exists", async () => {
    const ref = fakeDayDocRef({ text: "Q?", status: "served" });
    const result = await readDay({ ref });
    assert.strictEqual(result.text, "Q?");
  });
});

describe("dayDoc.recordSwap", () => {
  it("appends to swapHistory and overwrites the prompt fields", async () => {
    const ref = fakeDayDocRef({
      text: "Old?", audience: "kid", theme: "courage", source: "library",
      sourceRefs: { libraryId: "courage-001" }, status: "served", swapHistory: [],
    });
    const now = new Date("2026-04-16T23:00:00Z");
    await recordSwap({
      ref,
      newPayload: { text: "New?", source: "library", sourceRefs: { libraryId: "courage-002" } },
      now,
    });
    const state = ref._state();
    assert.strictEqual(state.text, "New?");
    assert.strictEqual(state.status, "swapped");
    assert.strictEqual(state.swapHistory.length, 1);
    assert.strictEqual(state.swapHistory[0].previousText, "Old?");
    assert.strictEqual(state.swapHistory[0].previousLibraryId, "courage-001");
  });
});

describe("dayDoc.recordReport", () => {
  it("sets status to reported and stores reason + timestamp", async () => {
    const ref = fakeDayDocRef({ text: "Q?", status: "served" });
    const now = new Date("2026-04-16T23:00:00Z");
    await recordReport({ ref, reason: "too dark for kids", now });
    const state = ref._state();
    assert.strictEqual(state.status, "reported");
    assert.strictEqual(state.reportedReason, "too dark for kids");
    assert.ok(state.reportedAt instanceof Date);
  });
});
