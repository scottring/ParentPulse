const assert = require("assert");
const { hasJuicySignal, THEME_KEYWORDS } = require("../../dinnerPrompts/signal");

describe("signal.hasJuicySignal — keyword match", () => {
  const now = new Date("2026-04-16T12:00:00Z");
  const recent = new Date("2026-04-15T12:00:00Z"); // within 7 days
  const old = new Date("2026-04-01T12:00:00Z");    // outside 7 days

  it("returns false when there are no recent entries", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("matches a recent journal entry containing a theme keyword", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "Mia was so brave at swim today", createdAt: recent, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, true);
    assert.deepStrictEqual(result.matchedJournalIds, ["j1"]);
  });

  it("ignores entries older than 7 days", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "brave", createdAt: old, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("exposes the theme keyword vocabulary for inspection", () => {
    assert.ok(Array.isArray(THEME_KEYWORDS.courage), "courage keywords array should exist");
    assert.ok(THEME_KEYWORDS.courage.length > 0, "should have at least one keyword");
  });
});

describe("signal.hasJuicySignal — additional rules", () => {
  const now = new Date("2026-04-16T12:00:00Z");
  const recent = new Date("2026-04-15T12:00:00Z");

  it("matches on the salient flag even without keyword match", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "We had a really long day", createdAt: recent, authorIsHouseholdMember: true, salient: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, true);
  });

  it("excludes contributions from non-household members (observers/friends)", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "Mia was brave", createdAt: recent, authorIsHouseholdMember: false },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("respects the 2-per-week synthesis cap", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "brave", createdAt: recent, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 2,
      now,
    });
    assert.strictEqual(result.matched, false);
    assert.strictEqual(result.reason, "synth-cap-reached");
  });
});
