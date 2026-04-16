const assert = require("assert");
const { pickFromLibrary } = require("../../dinnerPrompts/library");

const fakeLibrary = [
  { id: "kid-courage-1", text: "Brave?", themes: ["courage"], audiences: ["kid"] },
  { id: "adult-courage-1", text: "Brave adult?", themes: ["courage"], audiences: ["adult"] },
  { id: "kid-grat-1", text: "Grateful?", themes: ["gratitude"], audiences: ["kid"] },
  { id: "any-kind-1", text: "Kind?", themes: ["kindness"], audiences: ["kid", "adult"] },
];

describe("library.pickFromLibrary — basic filter", () => {
  it("returns a prompt matching audience and theme", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "kid-courage-1");
  });

  it("respects audience boundary", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "adult",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "adult-courage-1");
  });

  it("matches multi-audience prompts for either audience", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "adult",
      theme: "kindness",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "any-kind-1");
  });
});

describe("library.pickFromLibrary — exclusion", () => {
  it("excludes recently served prompt ids", () => {
    const lib = [
      { id: "a", text: "A", themes: ["courage"], audiences: ["kid"] },
      { id: "b", text: "B", themes: ["courage"], audiences: ["kid"] },
    ];
    const result = pickFromLibrary({
      library: lib,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: ["a"],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "b");
  });

  it("excludes flagged prompt ids", () => {
    const lib = [
      { id: "a", text: "A", themes: ["courage"], audiences: ["kid"] },
      { id: "b", text: "B", themes: ["courage"], audiences: ["kid"] },
    ];
    const result = pickFromLibrary({
      library: lib,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: ["b"],
      now: new Date(),
    });
    assert.strictEqual(result.id, "a");
  });
});
