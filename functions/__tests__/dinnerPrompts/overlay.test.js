const assert = require("assert");
const { flaggedLibraryIds, writeFlag } = require("../../dinnerPrompts/overlay");

describe("overlay.flaggedLibraryIds", () => {
  it("returns ids of all docs with flagged: true", async () => {
    const fakeOverlay = {
      where: (field, op, val) => ({
        get: async () => {
          assert.strictEqual(field, "flagged");
          assert.strictEqual(op, "==");
          assert.strictEqual(val, true);
          return {
            docs: [
              { id: "courage-001" },
              { id: "silliness-005" },
            ],
          };
        },
      }),
    };
    const ids = await flaggedLibraryIds({ overlayCollection: fakeOverlay });
    assert.deepStrictEqual(ids.sort(), ["courage-001", "silliness-005"]);
  });
});

describe("overlay.writeFlag", () => {
  it("writes a flagged doc with reason and timestamp", async () => {
    let written;
    const fakeRef = { set: async (data) => { written = data; } };
    const fakeOverlay = { doc: (id) => { assert.strictEqual(id, "courage-001"); return fakeRef; } };
    const now = new Date("2026-04-16T12:00:00Z");
    await writeFlag({ overlayCollection: fakeOverlay, libraryId: "courage-001", reason: "too dark", now });
    assert.strictEqual(written.flagged, true);
    assert.strictEqual(written.flaggedReason, "too dark");
    assert.ok(written.flaggedAt instanceof Date);
  });
});
