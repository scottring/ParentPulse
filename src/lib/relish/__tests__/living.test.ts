import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import { createVault, unlockVault } from "../vault";
import {
  advanceGame,
  beginVisit,
  changeLiving,
  chooseThread,
  completeVisit,
  freshLiving,
  gameText,
  isLiving,
  joyOptions,
  joyResult,
  joySummary,
  playMemory,
  recordRound,
  storyLines,
  storyTitles,
  keepGame,
  livingOf,
  markTried,
  letGoPractice,
  newGame,
  nextKind,
  pauseVisit,
  pendingPractice,
  turnCount,
  turnPlan,
  updateDraft,
  type Draft,
  type Game,
} from "../living";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const draft: Draft = {
  text: "A small sample moment",
  opportunity: "a meal together",
  outcome: "time",
  perspective: "",
};
function begun() {
  return chooseThread(beginVisit(emptyBook("Alex")), "listen");
}
function completeRound(count: number, kind: Game["kind"]) {
  let g = advanceGame(
    newGame(
      kind,
      Array.from({ length: count }, (_, i) => ({
        id: String(i),
        name: `Player ${i + 1}`,
      })),
    ),
    { type: "start" },
  );
  while (g.stage !== "reveal") {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    const pick = g.turn % 2 === 0 ? 0 : null;
    g = advanceGame(g, {
      type: "answer",
      answers: turnPlan(g)[g.turn].asks.map(() => pick),
    });
    expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
  }
  return g;
}
describe("bounded living-book sessions", () => {
  it("choosing a thread does not claim a completed moment", () => {
    const book = begun();
    expect(livingOf(book).visit?.step).toBe(1);
    expect(livingOf(book).visit?.status).toBe("active");
    expect(livingOf(book).entries).toHaveLength(0);
  });
  it("keeps a paused draft, resumes the same visit, and completes once", () => {
    let book = begun();
    const id = livingOf(book).visit!.id;
    book = pauseVisit(updateDraft(book, id, draft));
    expect(livingOf(book).visit?.draft).toEqual(draft);
    book = beginVisit(book);
    expect(livingOf(book).visit?.id).toBe(id);
    expect(() => completeVisit(book, id, { ...draft, text: " " })).toThrow(
      "One sentence",
    );
    book = completeVisit(book, id, draft);
    expect(livingOf(book).visit?.status).toBe("complete");
    expect(livingOf(book).entries).toHaveLength(1);
    expect(() => completeVisit(book, id, draft)).toThrow();
    expect(() => updateDraft(book, id, draft)).toThrow();
  });
  it("does not mistake planning for trying, and accepts an unresolved reflection", () => {
    let book = begun();
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    expect(nextKind(book)).toBe("practice");
    book = beginVisit(book);
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    const plan = pendingPractice(book)!;
    expect(plan.triedAt).toBeUndefined();
    expect(nextKind(book)).toBe("reflect");
    book = beginVisit(book);
    expect(() => completeVisit(book, livingOf(book).visit!.id, draft)).toThrow(
      "Say you tried it first",
    );
    book = markTried(book, plan.id);
    book = completeVisit(book, livingOf(book).visit!.id, {
      ...draft,
      text: "",
    });
    expect(livingOf(book).entries.at(-1)?.outcome).toBe("time");
    expect(pendingPractice(book)).toBeUndefined();
  });
  it("lets an untried plan go without losing anything or changing the schema", () => {
    let book = begun();
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    book = beginVisit(book);
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    const plan = pendingPractice(book)!;
    book = beginVisit(book);
    const before = livingOf(book).entries.length;
    book = letGoPractice(book);
    expect(pendingPractice(book)).toBeUndefined();
    expect(livingOf(book).entries).toHaveLength(before + 1);
    const last = livingOf(book).entries.at(-1)!;
    expect(last.kind).toBe("reflection");
    expect(last.sourceId).toBe(plan.id);
    expect(last.outcome).toBeUndefined();
    expect(livingOf(book).visit?.status).toBe("complete");
    expect(isBook(book)).toBe(true);
    expect(() => letGoPractice(book)).toThrow("no plan");
  });
  it("encrypts a paused draft and game state through export and restore", async () => {
    let book = begun();
    book = pauseVisit(updateDraft(book, livingOf(book).visit!.id, draft));
    book = changeLiving(book, (l) => ({
      ...l,
      game: completeRound(5, "story"),
    }));
    const { envelope } = await createVault(
      book,
      "long testing-only passphrase",
    );
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("small sample");
    expect(raw).not.toContain("Player");
    expect(
      (await unlockVault(raw, "long testing-only passphrase")).book,
    ).toEqual(book);
  });
});
describe("a finite round and explicit consent", () => {
  for (const count of [2, 3, 4, 5, 12])
    for (const kind of ["joy", "story"] as const)
      it(`${count} players complete one ${kind} round with optional sharing`, () => {
        const game = completeRound(count, kind);
        expect(game.turn).toBe(turnCount(game));
        let book = changeLiving(emptyBook("Alex"), (l) => ({ ...l, game }));
        expect(() => keepGame(book)).toThrow("Every player");
        for (const p of game.players.slice(0, -1))
          book = changeLiving(book, (l) => ({
            ...l,
            game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
          }));
        expect(() => keepGame(book)).toThrow("Every player");
        book = changeLiving(book, (l) => ({
          ...l,
          game: advanceGame(l.game!, {
            type: "approve",
            playerId: game.players.at(-1)!.id,
          }),
        }));
        book = keepGame(book);
        expect(isBook(book)).toBe(true);
        expect(livingOf(book).sharedPages[0].text).toBe(gameText(game));
        expect(() => keepGame(book)).toThrow();
        const unsaved = advanceGame(game, { type: "finish" });
        expect(unsaved.stage).toBe("finished");
        expect(unsaved.savedPageId).toBeUndefined();
      });
  it("allows the chooser of an older round to pass without inventing a memory or requiring approval", () => {
    const fresh = newGame("joy", [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    const legacy: Game = { ...fresh, contentVersion: 1 };
    delete legacy.answers;
    const g = advanceGame(advanceGame(legacy, { type: "start" }), {
      type: "choice",
      choice: null,
    });
    expect(g.stage).toBe("reveal");
    expect(gameText(g)).toBe("");
    expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
    expect(advanceGame(g, { type: "finish" }).stage).toBe("finished");
    expect(() =>
      keepGame(changeLiving(emptyBook("Alex"), (l) => ({ ...l, game: g }))),
    ).toThrow();
  });
  it("lets everyone pass on a joy round without inventing a memory", () => {
    let g = advanceGame(
      newGame("joy", [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ]),
      { type: "start" },
    );
    for (let i = 0; i < 3; i++) {
      if (i) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "choice", choice: null });
    }
    expect(g.stage).toBe("reveal");
    expect(gameText(g)).toBe("");
    expect(() =>
      keepGame(changeLiving(emptyBook("Alex"), (l) => ({ ...l, game: g }))),
    ).toThrow();
  });
  it("rejects repeated turns, premature finishing, and outsider approval", () => {
    const g = newGame("joy", [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    expect(() => advanceGame(g, { type: "finish" })).toThrow();
    expect(() => advanceGame(g, { type: "choice", choice: 0 })).toThrow();
    const reveal = completeRound(3, "joy");
    expect(() =>
      advanceGame(reveal, { type: "approve", playerId: "outside" }),
    ).toThrow();
  });
});
describe("backup state validation", () => {
  it("still reads pre-living-book backups", () => {
    expect(isBook(emptyBook("Alex"))).toBe(true);
  });
  it("rejects invalid turns, unfinished completion, duplicate players and unknown threads", () => {
    const game = completeRound(3, "story");
    expect(isLiving({ ...freshLiving(), game: { ...game, turn: 99 } })).toBe(
      false,
    );
    expect(
      isLiving({
        ...freshLiving(),
        game: {
          ...game,
          players: [game.players[0], game.players[0], game.players[2]],
        },
      }),
    ).toBe(false);
    expect(isLiving({ ...freshLiving(), thread: "invented" })).toBe(false);
    expect(
      isLiving({
        ...livingOf(begun()),
        visit: { ...livingOf(begun()).visit, status: "complete" },
      }),
    ).toBe(false);
    expect(
      isLiving({
        ...freshLiving(),
        game: { ...game, stage: "kept", savedPageId: "missing" },
      }),
    ).toBe(false);
  });
});
describe("Guess my small joy: everyone is guessed about", () => {
  const trio = [
    { id: "a", name: "Iris", audience: "adult" as const },
    { id: "b", name: "Kaleb", audience: "9-12" as const },
    { id: "c", name: "Ella", audience: "9-12" as const },
  ];
  function play(picks: (number | null)[], guess: (g: Game) => (number | null)[]) {
    let g = advanceGame(newGame("joy", trio), { type: "start" });
    for (const pick of picks) {
      if (g.turn) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "choice", choice: pick });
      expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
    }
    while (g.stage !== "reveal") {
      g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "answer", answers: guess(g) });
      expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
    }
    return g;
  }
  /** Guesses each target's real pick when `right`, otherwise a wrong one. */
  const guessing = (right: (guesser: string, target: string) => boolean) => (g: Game) => {
    const turn = turnPlan(g)[g.turn];
    const picks = joyResult(g).picks;
    return turn.asks.map((ask) => {
      const target = g.players.findIndex((p) => p.id === ask.about);
      const real = ask.choices.indexOf(picks[target]!);
      return right(turn.player.id, ask.about!) ? real : (real + 1) % ask.choices.length;
    });
  };
  it("everyone picks in private, then guesses everyone else's from four options", () => {
    const g0 = advanceGame(newGame("joy", trio), { type: "start" });
    expect(g0.contentVersion).toBe(2);
    const plan = turnPlan(g0);
    expect(plan).toHaveLength(6);
    expect(plan[0].asks[0].choices).toHaveLength(10);
    const g = play([0, 4, 7], guessing((guesser, target) => guesser === "a" || target === "a"));
    const after = turnPlan(g);
    for (const turn of after.slice(3)) {
      expect(turn.asks).toHaveLength(2);
      for (const ask of turn.asks) expect(ask.choices).toHaveLength(4);
    }
    // Each guess includes the real pick and survives reload.
    const { picks, lines, tally } = joyResult(g);
    expect(picks).toEqual(joyOptions(g).filter((_, i) => [0, 4, 7].includes(i)));
    for (const turn of after.slice(3))
      for (const ask of turn.asks)
        expect(ask.choices).toContain(picks[g.players.findIndex((p) => p.id === ask.about)]);
    expect(turnPlan(JSON.parse(JSON.stringify(g)))).toEqual(after);
    expect(lines.map((l) => l.guesses.filter((x) => x.right).length)).toEqual([2, 1, 1]);
    expect(tally.map((t) => [t.player.name, t.right, t.of])).toEqual([
      ["Iris", 2, 2],
      ["Kaleb", 1, 2],
      ["Ella", 1, 2],
    ]);
    expect(joySummary(g)).toBe("Iris knew the most: 2 of 2.");
    expect(gameText(g)).toContain("Kaleb’s small joy:");
    expect(gameText(g)).toContain("Iris guessed it.");
  });
  it("skips guessing about someone who passed, and anyone with no one to guess", () => {
    const g = play([null, 2, null], guessing(() => false));
    // Only Kaleb picked: Iris and Ella guess about him; Kaleb has no one to guess.
    expect(turnPlan(g).map((t) => t.player.name)).toEqual(["Iris", "Kaleb", "Ella", "Iris", "Ella"]);
    expect(joyResult(g).lines.map((l) => l.player.name)).toEqual(["Kaleb"]);
    expect(joySummary(g)).toBe("Nobody guessed right this time. Now you know a little more.");
  });
  it("remembers picks and guesses in the play record, and Your book shows them", () => {
    const g = play([1, 2, 3], guessing((guesser) => guesser === "c"));
    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    const record = living.plays![0];
    const options = joyOptions(g);
    expect(record.joys).toEqual([options[1], options[2], options[3]]);
    expect(record.guesses![2]).toEqual([options[1], options[2], null]);
    expect(record.guesses![0][0]).toBeNull();
    expect(isLiving(living)).toBe(true);
    const memory = playMemory(record);
    expect(memory.summary).toBe("Ella knew the most: 2 of 2.");
    expect(memory.sections[0]).toEqual({
      label: "Iris’s small joy",
      text: `${options[1]}. Ella guessed it.`,
    });
    for (const bad of [
      { ...record, joys: [options[1]] },
      { ...record, joys: [1, 2, 3] },
      { ...record, guesses: [[null, null, null]] },
      { ...record, guesses: record.guesses!.map((row) => [...row, null]) },
      { ...record, kind: "match" },
      { ...record, joys: ["x".repeat(81), null, null] },
    ])
      expect(isLiving({ ...living, plays: [bad] })).toBe(false);
  });
  it("rejects guesses outside the four offered and turns of the wrong size", () => {
    const g = play([0, 1, 2], guessing(() => true));
    const answers = g.answers!;
    for (const bad of [
      [...answers.slice(0, 3), [4, 0], ...answers.slice(4)],
      [...answers.slice(0, 3), [0], ...answers.slice(4)],
      [[10], ...answers.slice(1)],
    ])
      expect(isLiving({ ...freshLiving(), game: { ...g, answers: bad } })).toBe(false);
  });
  it("offers ten age-fitted joys in each band, keeping the first four of older rounds", () => {
    for (const audience of ["under-6", "6-8", "9-12", "13-17", "adult"] as const) {
      const options = joyOptions({ audience, contentVersion: 2 });
      expect(options).toHaveLength(10);
      expect(new Set(options).size).toBe(10);
      expect(joyOptions({ audience, contentVersion: 1 })).toEqual(options.slice(0, 4));
    }
  });
});
describe("One story, many voices: an ending with a read-back and a title", () => {
  const pair = [
    { id: "a", name: "Iris", audience: "adult" as const },
    { id: "b", name: "Kaleb", audience: "adult" as const },
  ];
  function told(choices: (number | null)[]) {
    let g = advanceGame(newGame("story", pair), { type: "start" });
    choices.forEach((choice, i) => {
      if (i) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "choice", choice });
    });
    return g;
  }
  it("two players go around more than once, and the story reads back line by line", () => {
    const g = told([0, 1, null, 2, 0]);
    expect(turnCount(g)).toBe(5);
    expect(g.stage).toBe("reveal");
    const lines = storyLines(g);
    expect(lines.map((l) => l.player.name)).toEqual(["Iris", "Kaleb", "Kaleb", "Iris"]);
    expect(lines[0].text).toBe("On an ordinary walk, we found a tiny door in a tree.");
    expect(lines.at(-1)!.text).toBe("Together, we decided to build a home for lost things.");
    expect(gameText(g)).toBe(lines.map((l) => l.text).join(" "));
  });
  it("offers titles from the story's own lines, and the group's pick names the page", () => {
    let g = told([0, 1, 0, 0, 0]);
    expect(storyTitles(g)).toEqual([
      "The tiny door in a tree",
      "The very shy dragon",
      "Our unlikely adventure",
    ]);
    expect(() => advanceGame(told([0]), { type: "title", title: "Too soon" })).toThrow();
    g = advanceGame(g, { type: "title", title: "  The very shy dragon  " });
    expect(g.title).toBe("The very shy dragon");
    expect(advanceGame(g, { type: "title", title: "x".repeat(90) }).title).toHaveLength(60);
    expect(advanceGame(g, { type: "title", title: "" }).title).toBeUndefined();
    expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
    let book = changeLiving(emptyBook("Iris"), (l) => ({ ...l, game: g }));
    for (const p of pair)
      book = changeLiving(book, (l) => ({
        ...l,
        game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
      }));
    book = keepGame(book);
    expect(livingOf(book).sharedPages[0].title).toBe("The very shy dragon");
    // Choosing a title isn't allowed on other games or older rounds.
    expect(() => advanceGame(completeRound(2, "joy"), { type: "title", title: "Hi" })).toThrow();
    for (const bad of [
      { ...g, title: 7 },
      { ...g, title: " " },
      { ...g, title: "x".repeat(61) },
      { ...g, stage: "choose", turn: 4, answers: g.answers!.slice(0, 4) },
    ])
      expect(isLiving({ ...freshLiving(), game: bad })).toBe(false);
  });
  it("remembers the story and its title with the round", () => {
    const g = advanceGame(told([0, 1, 2, 0, 1]), { type: "title", title: "The fox" });
    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    const record = living.plays![0];
    expect(record.story).toEqual(storyLines(g).map((l) => l.text));
    expect(record.title).toBe("The fox");
    expect(isLiving(living)).toBe(true);
    expect(playMemory(record)).toEqual({
      summary: "“The fox”, told together.",
      sections: [{ label: "The story", text: gameText(g) }],
    });
    for (const bad of [
      { ...record, story: "a story" },
      { ...record, story: [""] },
      { ...record, story: Array.from({ length: 21 }, () => "Line.") },
      { ...record, title: "" },
      { ...record, kind: "joy" },
    ])
      expect(isLiving({ ...living, plays: [bad] })).toBe(false);
  });
});
