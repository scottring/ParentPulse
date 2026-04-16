const assert = require("assert");
const { hashApiKey, validateApiKey } = require("../../dinnerPrompts/auth");

describe("auth.hashApiKey", () => {
  it("produces a stable sha256 hex digest", () => {
    const a = hashApiKey("abc");
    const b = hashApiKey("abc");
    assert.strictEqual(a, b);
    assert.strictEqual(a.length, 64);
  });

  it("differs for different inputs", () => {
    assert.notStrictEqual(hashApiKey("a"), hashApiKey("b"));
  });
});

describe("auth.validateApiKey", () => {
  function fakeStore(records) {
    return {
      doc: (id) => ({ get: async () => ({ exists: !!records[id], data: () => records[id] }) }),
    };
  }

  it("returns ok when key hash exists and household is allowed", async () => {
    const apiKey = "secret-key";
    const hash = hashApiKey(apiKey);
    const store = fakeStore({ [hash]: { allowed_households: ["h1"], label: "symphony-prod" } });
    const result = await validateApiKey({ apiKey, householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.label, "symphony-prod");
  });

  it("rejects when key not found", async () => {
    const store = fakeStore({});
    const result = await validateApiKey({ apiKey: "nope", householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
  });

  it("rejects when household not in allow list", async () => {
    const apiKey = "secret";
    const store = fakeStore({ [hashApiKey(apiKey)]: { allowed_households: ["h2"] } });
    const result = await validateApiKey({ apiKey, householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 403);
  });

  it("rejects when apiKey is missing", async () => {
    const result = await validateApiKey({ apiKey: null, householdId: "h1", apiKeysCollection: fakeStore({}) });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
  });
});
