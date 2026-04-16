const assert = require("assert");
const { collectRecentSignals } = require("../../dinnerPrompts/signalSources");

describe("signalSources.collectRecentSignals", () => {
  it("collects journal entries and manual answers within window, marks household membership", async () => {
    const now = new Date("2026-04-16T12:00:00Z");
    const recentTs = new Date("2026-04-15T12:00:00Z");

    const householdMemberIds = ["user-1", "user-2"];

    const journalSnap = {
      docs: [
        { id: "j1", data: () => ({ text: "Mia was brave", createdAt: recentTs, authorId: "user-1" }) },
        { id: "j2", data: () => ({ text: "Friend visited", createdAt: recentTs, authorId: "friend-9" }) },
      ],
    };
    const contributionsSnap = {
      docs: [
        {
          id: "c1",
          data: () => ({
            authorId: "user-2",
            updatedAt: recentTs,
            answers: { core: { brave_moments: { text: "tried something scary" } } },
          }),
        },
      ],
    };

    const fakeJournals = { where: () => ({ where: () => ({ get: async () => journalSnap }) }) };
    const fakeContributions = { where: () => ({ where: () => ({ get: async () => contributionsSnap }) }) };

    const result = await collectRecentSignals({
      householdId: "h1",
      householdMemberIds,
      journalsCollection: fakeJournals,
      contributionsCollection: fakeContributions,
      now,
      windowDays: 7,
    });

    assert.strictEqual(result.journalEntries.length, 2);
    const j1 = result.journalEntries.find(e => e.id === "j1");
    const j2 = result.journalEntries.find(e => e.id === "j2");
    assert.strictEqual(j1.authorIsHouseholdMember, true);
    assert.strictEqual(j2.authorIsHouseholdMember, false);

    assert.strictEqual(result.manualAnswers.length, 1);
    assert.strictEqual(result.manualAnswers[0].authorIsHouseholdMember, true);
    assert.ok(result.manualAnswers[0].text.includes("scary"));
  });
});
