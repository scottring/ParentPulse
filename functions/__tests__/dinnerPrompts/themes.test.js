const assert = require("assert");
const { pickTheme, THEMES } = require("../../dinnerPrompts/themes");

describe("themes.pickTheme", () => {
  it("returns a theme from the fixed vocabulary", () => {
    const theme = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    assert.ok(THEMES.includes(theme), `expected one of ${THEMES.join(",")}, got ${theme}`);
  });

  it("is deterministic for the same household + ISO week + audience", () => {
    const a = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    const b = pickTheme({ householdId: "h1", date: new Date("2026-04-15"), audience: "kid" });
    assert.strictEqual(a, b, "same ISO week should produce same theme");
  });

  it("can differ across households in the same week", () => {
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      seen.add(pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "kid" }));
    }
    assert.ok(seen.size > 1, "expected variation across households");
  });

  it("uses a different salt for adult vs kid so Friday adult theme can differ from kid theme", () => {
    const kid = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    const adult = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "adult" });
    let differenceFound = false;
    for (let i = 0; i < 20; i++) {
      const k = pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "kid" });
      const a = pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "adult" });
      if (k !== a) { differenceFound = true; break; }
    }
    assert.ok(differenceFound, "kid and adult themes should differ for at least one household");
  });
});
