import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import {
  advanceGame,
  freshLiving,
  gameText,
  isLiving,
  joyJudging,
  joyOptions,
  joyResult,
  joySummary,
  joyTally,
  newGame,
  playMemory,
  recordRound,
  SAID_LIMIT,
  SQUARE_LIMIT,
  spotResult,
  storyLines,
  storyTitles,
  turnPlan,
  type Game,
} from "../living";
import { spotSquare } from "../play-content";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

const trio = [
  { id: "a", name: "Iris", audience: "adult" as const },
  { id: "b", name: "Kaleb", audience: "9-12" as const },
  { id: "c", name: "Ella", audience: "9-12" as const },
];
const valid = (game: Game) => isLiving({ ...freshLiving(), game });
const through = (g: Game) => JSON.parse(JSON.stringify(g)) as Game;

/** Picks in turn order: a number from the list, a string written, or null to pass. */
function picked(picks: (number | string | null)[]) {
  let g = advanceGame(newGame("joy", trio), { type: "start" });
  for (const pick of picks) {
    if (g.turn) g = advanceGame(g, { type: "ready" });
    g = advanceGame(
      g,
      typeof pick === "string"
        ? { type: "choice", choice: null, text: pick }
        : { type: "choice", choice: pick },
    );
    expect(valid(g)).toBe(true);
  }
  return g;
}
/** One guessing turn: each ask answered by `answer` (a choice index, words or null). */
function guess(g: Game, answer: (ask: ReturnType<typeof turnPlan>[number]["asks"][number]) => number | string | null) {
  const asks = turnPlan(g)[g.turn].asks;
  const given = asks.map(answer);
  const next = advanceGame(advanceGame(g, { type: "ready" }), {
    type: "answer",
    answers: given.map((x) => (typeof x === "number" ? x : null)),
    texts: given.map((x) => (typeof x === "string" ? x : null)),
  });
  expect(valid(next)).toBe(true);
  return next;
}

describe("Guess my small joy: a joy in your own words", () => {
  it("an old round, saved before own words, still loads, plays and finishes as before", () => {
    let g = picked([0, 1, 2]);
    // As stored by the earlier version: no `own`, picks by index only.
    expect("own" in g).toBe(false);
    g = through(g);
    expect(valid(g)).toBe(true);
    while (g.stage !== "reveal")
      g = guess(through(g), (ask) => ask.choices.indexOf(joyResult(g).picks[trio.findIndex((p) => p.id === ask.about)]!));
    expect(joySummary(g)).toBe("Iris, Kaleb and Ella each guessed 2 of 2.");
    expect(joyTally(g)).toBe("Iris 2 of 2 · Kaleb 2 of 2 · Ella 2 of 2");
    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    const record = living.plays![0];
    expect(Object.keys(record).sort()).toEqual(["guesses", "id", "joys", "kind", "playedAt", "players"]);
    expect(isLiving(living)).toBe(true);
    // A round saved mid-guess before this change: guesses as indexes.
    const mid = through(picked([3, null, 5]));
    expect(turnPlan(mid)[3].asks.every((a) => a.write === undefined)).toBe(true);
    expect(valid(mid)).toBe(true);
  });

  it("someone writes their own, the others guess in words, they judge, and the tally reads it", () => {
    let g = picked([0, "Riding horses at Grandma’s", 2]);
    const options = joyOptions(g);
    // Kaleb's joy is guessed in words, with the list as ideas; the others stay multiple choice.
    const plan = turnPlan(g);
    const aboutKaleb = plan[3].asks.find((a) => a.about === "b")!;
    expect(aboutKaleb.write).toBe("only");
    expect(aboutKaleb.choices).toEqual(options);
    const aboutElla = plan[3].asks.find((a) => a.about === "c")!;
    expect(aboutElla.write).toBeUndefined();
    expect(aboutElla.choices).toHaveLength(4);
    expect(aboutElla.choices).toContain(options[2]);
    // A written joy can't be guessed with a number, and a list joy can't be guessed in words.
    expect(() =>
      advanceGame(advanceGame(g, { type: "ready" }), {
        type: "answer",
        answers: plan[3].asks.map(() => 0),
      }),
    ).toThrow();
    // Iris: Kaleb in words, Ella right. Kaleb: Iris wrong, Ella right. Ella: Iris right, Kaleb in words.
    g = guess(g, (ask) => (ask.about === "b" ? "horses" : ask.choices.indexOf(options[2])));
    g = guess(g, (ask) =>
      ask.about === "a"
        ? ask.choices.findIndex((c) => c !== options[0])
        : ask.choices.indexOf(options[2]),
    );
    g = guess(g, (ask) => (ask.about === "b" ? "Baking" : ask.choices.indexOf(options[0])));
    expect(g.stage).toBe("judge");
    expect(gameText(g)).toBeTruthy();
    const judging = joyJudging(g);
    expect(judging.map((j) => [j.player.name, j.pick])).toEqual([["Kaleb", "Riding horses at Grandma’s"]]);
    expect(judging[0].guesses.map((x) => [x.player.name, x.text])).toEqual([
      ["Iris", "horses"],
      ["Ella", "Baking"],
    ]);
    expect(() => advanceGame(g, { type: "next" })).toThrow("Judge each guess");
    expect(() => advanceGame(g, { type: "judge", playerId: "a", about: "c", mark: "got" })).toThrow();
    expect(() =>
      advanceGame(g, { type: "judge", playerId: "a", about: "b", mark: "sort of" as never }),
    ).toThrow();
    g = advanceGame(g, { type: "judge", playerId: "a", about: "b", mark: "got" });
    g = advanceGame(g, { type: "judge", playerId: "c", about: "b", mark: "close" });
    expect(valid(g)).toBe(true);
    g = advanceGame(g, { type: "next" });
    expect(g.stage).toBe("reveal");
    expect(valid(through(g))).toBe(true);

    const { lines, tally } = joyResult(g);
    const kaleb = lines.find((l) => l.player.name === "Kaleb")!;
    expect(kaleb.own).toBe(true);
    expect(kaleb.guesses.map((x) => [x.player.name, x.result])).toEqual([
      ["Iris", "right"],
      ["Ella", "close"],
    ]);
    expect(tally.map((t) => [t.player.name, t.right, t.close, t.of])).toEqual([
      ["Iris", 2, 0, 2],
      ["Kaleb", 1, 0, 2],
      ["Ella", 1, 1, 2],
    ]);
    expect(joySummary(g)).toBe("Iris knew the most: 2 of 2.");
    expect(joyTally(g)).toBe("Iris 2 of 2 · Kaleb 1 of 2 · Ella 1 of 2 and close once");
    // Their own words keep their capitals; list joys read as before.
    expect(gameText(g)).toContain("Kaleb’s small joy: Riding horses at Grandma’s. Iris guessed it. Ella was close.");
    expect(gameText(g)).toContain(`Iris’s small joy: ${options[0].toLowerCase()}.`);

    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    const record = living.plays![0];
    expect(record.joys).toEqual([options[0], "Riding horses at Grandma’s", options[2]]);
    expect(record.guesses![0][1]).toBe("horses");
    expect(record.ownJoys).toEqual([false, true, false]);
    expect(record.marks![0][1]).toBe("got");
    expect(record.marks![2][1]).toBe("close");
    expect(isLiving(living)).toBe(true);
    const memory = playMemory(record);
    expect(memory.summary).toBe("Iris knew the most: 2 of 2.");
    expect(memory.sections[1]).toEqual({
      label: "Kaleb’s small joy",
      text: "Riding horses at Grandma’s. Iris guessed it. Ella was close.",
    });
    for (const bad of [
      { ...record, ownJoys: [true] },
      { ...record, ownJoys: ["yes", false, false] },
      { ...record, marks: [[null, "maybe", null], [null, null, null], [null, null, null]] },
      { ...record, marks: [[null]] },
      { ...record, kind: "story", joys: undefined, guesses: undefined },
    ])
      expect(isLiving({ ...living, plays: [bad] })).toBe(false);
  });

  it("near misses read sensibly when nobody got it exactly, and skipping judging scores nothing", () => {
    let g = picked(["Pancakes", null, null]);
    g = guess(g, () => "Waffles");
    g = guess(g, () => null);
    expect(g.stage).toBe("judge");
    const skipped = advanceGame(g, { type: "next", skip: true });
    expect(skipped.stage).toBe("reveal");
    expect(joyTally(skipped)).toBe("Ella passed");
    expect(joySummary(skipped)).toBe("Nobody guessed right this time. Now you know a little more.");
    g = advanceGame(g, { type: "judge", playerId: "b", about: "a", mark: "close" });
    g = advanceGame(g, { type: "next" });
    expect(joyTally(g)).toBe("Kaleb got close · Ella passed");
    expect(joySummary(g)).toBe("Nobody got it exactly, but Kaleb came close.");
    // The same words count as right even unjudged.
    let exact = picked(["Pancakes", null, null]);
    exact = guess(exact, () => "pancakes ");
    exact = guess(exact, () => "Toast");
    exact = advanceGame(exact, { type: "next", skip: true });
    expect(joyTally(exact)).toBe("Kaleb 1 of 1");
  });

  it("a round where only list joys were picked never stops to judge", () => {
    let g = picked([0, 1, null]);
    while (g.stage !== "reveal") g = guess(g, () => 0);
    expect(joyJudging(g)).toEqual([]);
  });

  it("rejects words that are too long, blank, misplaced or judged too early", () => {
    const start = advanceGame(newGame("joy", trio), { type: "start" });
    expect(() => advanceGame(start, { type: "choice", choice: null, text: "   " })).toThrow("Write a few words");
    expect(() => advanceGame(start, { type: "choice", choice: 1, text: "Both" })).toThrow();
    const long = advanceGame(start, { type: "choice", choice: null, text: "x".repeat(200) });
    expect(long.own![0].text).toHaveLength(SAID_LIMIT);
    let g = picked(["Pancakes", 1, 2]);
    g = guess(g, () => 0);
    g = guess(g, (ask) => (ask.about === "a" ? "x" : 0));
    const own = g.own!;
    for (const bad of [
      { ...g, own: [{ ...own[0], text: "x".repeat(SAID_LIMIT + 1) }, own[1]] },
      { ...g, own: [{ ...own[0], text: "  " }, own[1]] },
      { ...g, own: [{ ...own[0], text: 7 }, own[1]] },
      { ...g, own: "Pancakes" },
      { ...g, own: [own[0], own[0], own[1]] },
      // Words where a list joy was chosen.
      { ...g, own: [...own, { turn: 1, ask: 0, text: "Also this" }] },
      // Words for a guess at a list joy.
      { ...g, own: [...own, { turn: 3, ask: 1, text: "Hmm" }] },
      // A turn that hasn't happened.
      { ...g, own: [...own, { turn: 9, ask: 0, text: "Later" }] },
      // Judged before guessing is over, or a pick judged.
      { ...g, own: [own[0], { ...own[1], mark: "got" }] },
      { ...g, own: [{ ...own[0], mark: "got" }, own[1]] },
      { ...g, own: [own[0], { ...own[1], mark: "maybe" }] },
      // A number for a guess that must be in words.
      { ...g, answers: g.answers!.map((a, i) => (i === 4 ? [0, a[1]] : a)) },
      { ...g, stage: "judge" },
    ])
      expect(valid(bad as Game)).toBe(false);
    // Judging only happens when someone wrote their own.
    let listOnly = picked([0, 1, 2]);
    while (listOnly.stage !== "reveal") listOnly = guess(listOnly, () => 0);
    expect(valid({ ...listOnly, stage: "judge" })).toBe(false);
    // Same page? and Spot it! never take words this way.
    const match = advanceGame(newGame("match", trio), { type: "start" });
    expect(valid({ ...match, own: [] })).toBe(false);
    const spot = advanceGame(newGame("spot", trio), { type: "start" });
    expect(valid({ ...spot, own: [] })).toBe(false);
  });
});

describe("One story: a line in your own words", () => {
  const pair = [
    { id: "a", name: "Iris", audience: "adult" as const },
    { id: "b", name: "Kaleb", audience: "adult" as const },
  ];
  it("a written line becomes the line, and can name the story", () => {
    let g = advanceGame(newGame("story", pair), { type: "start" });
    expect(turnPlan(g)[0].asks[0].write).toBe("also");
    g = advanceGame(g, { type: "choice", choice: null, text: "a goose wearing a scarf!" });
    for (const choice of [1, null, 2, 0]) {
      g = advanceGame(advanceGame(g, { type: "ready" }), { type: "choice", choice });
      expect(valid(g)).toBe(true);
    }
    expect(g.stage).toBe("reveal");
    const lines = storyLines(g);
    expect(lines[0]).toEqual({
      player: g.players[0],
      text: "On an ordinary walk, we found a goose wearing a scarf!",
    });
    expect(lines).toHaveLength(4);
    expect(storyTitles(g)[0]).toBe("The goose wearing a scarf");
    expect(gameText(g)).toContain("we found a goose wearing a scarf! A new friend appeared.");
    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    expect(living.plays![0].story![0]).toBe("On an ordinary walk, we found a goose wearing a scarf!");
    expect(isLiving(living)).toBe(true);
    // Lines without their own ending get a full stop, like the list's.
    let plain = advanceGame(newGame("story", pair), { type: "start" });
    plain = advanceGame(plain, { type: "choice", choice: null, text: "  a  sock that hums " });
    expect(storyLines(plain)[0].text).toBe("On an ordinary walk, we found a sock that hums.");
  });
  it("older story rounds play on without words", () => {
    const fresh = advanceGame(newGame("story", pair), { type: "start" });
    const legacy: Game = { ...fresh, contentVersion: 1, audience: "adult" };
    delete legacy.answers;
    expect(turnPlan(legacy)[0].asks[0].write).toBeUndefined();
    expect(() => advanceGame(legacy, { type: "choice", choice: null, text: "a goose" })).toThrow();
    expect(valid({ ...legacy, own: [] })).toBe(false);
  });
});

describe("Spot it!: a square in your own words", () => {
  const car = [
    { id: "owner", name: "Alex", audience: "adult" as const },
    { id: "leo", name: "Leo", audience: "6-8" as const },
  ];
  it("changes a square before and during play, and marks keep working", () => {
    let g = newGame("spot", car);
    const original = g.spot!.squares[2];
    g = advanceGame(g, { type: "write", square: 2, text: "  A   purple car " });
    expect(g.spot!.own).toEqual([null, null, "A purple car", null, null, null, null, null, null]);
    expect(g.spot!.squares[2]).toBe(original);
    expect(spotResult(g.players, g.spot!).squares[2]).toMatchObject({ text: "A purple car", own: true });
    expect(valid(g)).toBe(true);
    // Something already on the card can't go on twice.
    const other = spotSquare(g.spot!.squares[0])!.text;
    expect(() => advanceGame(g, { type: "write", square: 3, text: other.toUpperCase() })).toThrow("already");
    expect(advanceGame(g, { type: "write", square: 2, text: "x".repeat(90) }).spot!.own![2]).toHaveLength(SQUARE_LIMIT);
    g = advanceGame(g, { type: "start" });
    g = advanceGame(g, { type: "spot", square: 2, by: 1 });
    g = advanceGame(g, { type: "spot", square: 5, by: 0 });
    // Changing a spotted square clears who spotted it; other marks stay.
    const changed = advanceGame(g, { type: "write", square: 5, text: "A llama" });
    expect(changed.spot!.marks[5]).toBeNull();
    expect(changed.spot!.marks[2]).toBe(1);
    expect(valid(changed)).toBe(true);
    // The same words again change nothing.
    expect(advanceGame(changed, { type: "write", square: 5, text: "A llama" })).toBe(changed);
    // "" puts the card's square back.
    const back = advanceGame(changed, { type: "write", square: 5, text: "" });
    expect(back.spot!.own).toEqual([null, null, "A purple car", null, null, null, null, null, null]);
    g = advanceGame(changed, { type: "done" });
    expect(gameText(g)).toContain("A purple car: Leo.");
    expect(() => advanceGame(g, { type: "write", square: 1, text: "Too late" })).toThrow();
    const living = recordRound({ ...freshLiving(), game: advanceGame(g, { type: "finish" }) });
    const record = living.plays![0];
    expect(record.spot!.own![5]).toBe("A llama");
    expect(isLiving(living)).toBe(true);
    expect(playMemory(record).sections[0].text).toContain("A purple car: Leo");
    expect(playMemory(record).sections[1].text).toContain("A llama");
    for (const bad of [
      { ...record.spot!, own: ["x".repeat(SQUARE_LIMIT + 1), ...record.spot!.own!.slice(1)] },
      { ...record.spot!, own: [" ", ...record.spot!.own!.slice(1)] },
      { ...record.spot!, own: ["A llama"] },
      { ...record.spot!, own: "A llama" },
    ])
      expect(isLiving({ ...living, plays: [{ ...record, spot: bad }] })).toBe(false);
  });
  it("swapping a written square deals a fresh one from the card", () => {
    let g = newGame("spot", car);
    g = advanceGame(g, { type: "write", square: 0, text: "A goat" });
    g = advanceGame(g, { type: "swap", square: 0 });
    expect(g.spot!.own).toBeUndefined();
    expect(spotResult(g.players, g.spot!).squares[0].own).toBe(false);
    expect(valid(g)).toBe(true);
  });
});
