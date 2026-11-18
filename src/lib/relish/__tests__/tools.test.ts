import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, type Book } from "../model";
import {
  advanceGame,
  changeLiving,
  gameText,
  isLiving,
  keepGame,
  livingOf,
  freshLiving,
  newGame,
  recentQuestions,
  recordRound,
  samePageAgreement,
  samePageQuestions,
  samePageResult,
  samePageRound,
  samePageSummary,
  samePageTrend,
  startGame,
  turnCount,
  type Game,
  type LivingState,
} from "../living";
import { samePageBank, samePagePrompts } from "../play-content";
import {
  activeTrackers,
  builderComplete,
  builderPage,
  finishTracker,
  hasBingo,
  isTools,
  keepToolPage,
  sortPage,
  startTracker,
  stopTracker,
  toggleMark,
  toolById,
  tools,
  toolsFor,
  toolsOf,
  trackerProgress,
  type BuilderTool,
  type SortTool,
} from "../tools";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

const withPeople = (): Book => ({
  ...emptyBook("Alex"),
  profile: { kind: "adult" },
  people: [
    { id: "anna", name: "Anna", role: "Partner", color: "rose", note: "", lessons: [] },
  ],
});

describe("exercise catalog", () => {
  it("has unique IDs and keeps adult-only exercises out of child editions", () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
    for (const band of ["under-6", "6-8", "9-12", "13-17"] as const)
      for (const t of toolsFor(band)) {
        expect(t.audiences).toContain(band);
        expect(["soft-start", "repair", "load", "iceberg", "hellos", "repair-bingo"]).not.toContain(t.id);
      }
    expect(toolsFor("under-6").map((t) => t.id)).toEqual(["helps-upset", "kindness-bingo"]);
    expect(toolsFor("adult").length).toBeGreaterThanOrEqual(10);
  });
  it("gives every square tracker a 3×3 card", () => {
    for (const t of tools)
      if (t.kind === "tracker" && t.mode === "squares") expect(t.squares).toHaveLength(9);
  });
});

describe("sorts and builders", () => {
  it("turns a sort into page text with piles in order and the chosen pick", () => {
    const tool = toolById("iceberg") as SortTool;
    const text = sortPage(
      tool,
      {
        subject: "Meltdown at homework",
        placed: { Hungry: "likely", Tired: "likely", "A change of plans": "no" },
        picks: { likely: "Hungry" },
      },
      "Leo",
    );
    expect(text).toContain("About Leo.");
    expect(text).toContain("What happened: Meltdown at homework");
    expect(text).toContain("Likely: Hungry; Tired.");
    expect(text).toContain("Not this time: A change of plans.");
    expect(text).toContain("One guess to test this week: Hungry.");
    expect(text.indexOf("Likely")).toBeLessThan(text.indexOf("Not this time"));
  });
  it("composes the soft opener and flags blame words", () => {
    const tool = toolById("soft-start") as BuilderTool;
    const values = { feel: "worn out.", about: "you never doing bedtime", need: "trading off" };
    expect(builderComplete(tool, values)).toBe(true);
    expect(tool.compose(values)).toBe(
      "I feel worn out about you never doing bedtime, and what would help is trading off.",
    );
    expect(tool.checks!(values)[1].ok).toBe(false);
    expect(tool.checks!({ ...values, about: "doing bedtime alone" })[1].ok).toBe(true);
    expect(builderComplete(tool, { feel: "tired" })).toBe(false);
  });
  it("requires a verdict for thought court", () => {
    const tool = toolById("thought-court") as BuilderTool;
    const values = { thought: "a", for: "b", against: "c", fairer: "d" };
    expect(builderComplete(tool, values)).toBe(false);
    expect(builderComplete(tool, { ...values, verdict: "Partly true" })).toBe(true);
    expect(builderPage(tool, { ...values, verdict: "Partly true" })).toContain(
      "The verdict: Partly true.",
    );
  });
  it("keeps the result as a kept journal page tagged to a person in the book", () => {
    const book = keepToolPage(withPeople(), {
      title: "Plan a repair · Anna",
      text: "I’m sorry I snapped.",
      personId: "anna",
    });
    expect(book.journal).toHaveLength(1);
    expect(book.journal![0]).toMatchObject({
      status: "kept",
      revision: 1,
      style: "moss",
      people: ["anna"],
      title: "Plan a repair · Anna",
    });
    expect(isBook(book)).toBe(true);
    const unknown = keepToolPage(withPeople(), { title: "x", text: "y", personId: "ghost" });
    expect(unknown.journal![0].people).toBeUndefined();
    expect(() => keepToolPage(withPeople(), { title: "x", text: " " })).toThrow();
  });
});

describe("trackers", () => {
  it("starts, marks days, finishes into a page and validates throughout", () => {
    let book = startTracker(withPeople(), "thanks-week", "anna");
    expect(isBook(book)).toBe(true);
    const run = activeTrackers(book)[0];
    expect(() => startTracker(book, "thanks-week", "anna")).toThrow(/already/);
    book = toggleMark(book, run.id, "2026-11-05", "For the coffee");
    book = toggleMark(book, run.id, "2026-11-06");
    expect(trackerProgress(toolsOf(book).trackers[0])).toEqual({
      done: 2,
      total: 7,
      complete: false,
    });
    book = toggleMark(book, run.id, "2026-11-06");
    expect(toolsOf(book).trackers[0].marks).toHaveLength(1);
    expect(() => toggleMark(book, run.id, "tomorrow")).toThrow();
    book = finishTracker(book, run.id);
    expect(isBook(book)).toBe(true);
    const finished = toolsOf(book).trackers[0];
    expect(finished.finishedAt).toBeTruthy();
    const page = book.journal!.find((e) => e.id === finished.pageId)!;
    expect(page.title).toBe("A week of specific thanks · Anna");
    expect(page.text).toContain("1 of 7 days");
    expect(page.text).toContain("For the coffee");
    expect(page.people).toEqual(["anna"]);
    expect(activeTrackers(book)).toHaveLength(0);
    expect(() => toggleMark(book, run.id, "2026-11-07")).toThrow();
  });
  it("requires a person when the exercise needs one, and a mark before finishing", () => {
    expect(() => startTracker(withPeople(), "hellos")).toThrow(/Choose who/);
    expect(() => startTracker(withPeople(), "hellos", "ghost")).toThrow();
    const book = startTracker(withPeople(), "repair-bingo");
    expect(() => finishTracker(book, activeTrackers(book)[0].id)).toThrow(/at least one/);
  });
  it("detects bingo lines", () => {
    let book = startTracker(withPeople(), "repair-bingo");
    const id = activeTrackers(book)[0].id;
    for (const k of ["0", "4"]) book = toggleMark(book, id, k);
    expect(hasBingo(toolsOf(book).trackers[0])).toBe(false);
    book = toggleMark(book, id, "8");
    expect(hasBingo(toolsOf(book).trackers[0])).toBe(true);
    expect(() => toggleMark(book, id, "9")).toThrow();
  });
  it("stops without keeping anything", () => {
    let book = startTracker(withPeople(), "kindness-bingo");
    book = stopTracker(book, activeTrackers(book)[0].id);
    expect(toolsOf(book).trackers).toHaveLength(0);
    expect(book.journal).toBeUndefined();
  });
  it("rejects malformed or tampered tracker state", () => {
    const ok = toolsOf(startTracker(withPeople(), "repair-bingo"));
    expect(isTools(ok)).toBe(true);
    const run = ok.trackers[0];
    const bad = [
      { version: 2, trackers: [] },
      { version: 1, trackers: [{ ...run, toolId: "soft-start" }] },
      { version: 1, trackers: [{ ...run, toolId: "nope" }] },
      { version: 1, trackers: [run, { ...run, id: "other" }] },
      { version: 1, trackers: [run, run] },
      { version: 1, trackers: [{ ...run, marks: [{ key: "12", at: run.startedAt }] }] },
      {
        version: 1,
        trackers: [
          { ...run, marks: [{ key: "1", at: run.startedAt }, { key: "1", at: run.startedAt }] },
        ],
      },
      { version: 1, trackers: [{ ...run, pageId: "x" }] },
      { version: 1, trackers: [{ ...run, startedAt: "never" }] },
    ];
    for (const b of bad) expect(isTools(b)).toBe(false);
    expect(isBook({ ...emptyBook("A"), tools: bad[1] })).toBe(false);
  });
});

describe("Same page? game", () => {
  const players = [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
    { id: "c", name: "Kai" },
  ];
  function play(turns: (number | null)[][], who = players) {
    let g = advanceGame(newGame("match", who), { type: "start", firstId: who[0].id });
    turns.forEach((answers, i) => {
      if (i > 0) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "answer", answers });
    });
    return g;
  }
  const finishInto = (living: LivingState, g: Game) =>
    recordRound({ ...living, game: advanceGame(g, { type: "finish" }) });
  it("asks each player five questions in private, then counts the matches", () => {
    const g = play([
      [0, 1, 2, 0, 1],
      [0, 1, 0, 0, null],
      [0, 2, 0, 0, 1],
    ]);
    expect(turnCount(g)).toBe(3);
    expect(g.stage).toBe("reveal");
    const r = samePageResult(g);
    expect(r.lines.map((l) => l.same)).toEqual([true, false, false, true, true]);
    expect(r.lines[4].answered).toBe(2);
    expect(r.matched).toBe(3);
    expect(r.counted).toBe(5);
    expect(samePageSummary(g)).toBe("You matched on 3 of 5.");
    expect(r.differ).toEqual([r.lines[1].question.topic, r.lines[2].question.topic]);
    const text = gameText(g);
    expect(text.split("\n")[0]).toContain("You matched on 3 of 5. Different on");
    expect(text).toContain(`${r.lines[0].question.prompt} Robin: ${r.lines[0].question.choices[0]}.`);
    expect(samePageSummary(play([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]))).toBe(
      "You matched on all 5.",
    );
    expect(samePageSummary(play([[0, 0, 0, 0, 0], [null, null, null, null, null], [null, null, null, null, null]]))).toBe("");
  });
  it("hands the device over between turns and checks every answer", () => {
    let g = advanceGame(newGame("match", players), { type: "start" });
    expect(() => advanceGame(g, { type: "choice", choice: 0 })).toThrow();
    expect(() => advanceGame(g, { type: "answer", answers: [0, 1, 2] })).toThrow();
    expect(() => advanceGame(g, { type: "answer", answers: [0, 1, 2, 3, 0] })).toThrow();
    g = advanceGame(g, { type: "choice", choice: null });
    expect(g.answers).toEqual([[null, null, null, null, null]]);
    expect(g.stage).toBe("handoff");
    expect(g.choices).toEqual([]);
    expect(() => advanceGame(g, { type: "answer", answers: [0, 0, 0, 0, 0] })).toThrow();
  });
  it("fixes five age-fitted questions when the round starts", () => {
    const g = newGame("match", players);
    expect(g.contentVersion).toBe(2);
    expect(g.questions).toHaveLength(5);
    expect(new Set(g.questions).size).toBe(5);
    expect(samePageQuestions(JSON.parse(JSON.stringify(g)))).toEqual(samePageQuestions(g));
    const kid = newGame("match", [...players.slice(0, 2), { id: "k", name: "Ella", audience: "6-8" }]);
    const young = samePageBank("6-8").map((q) => q.id);
    expect(kid.questions!.every((id) => young.includes(id))).toBe(true);
    const adult = newGame("match", players.map((p) => ({ ...p, audience: "adult" as const })));
    const grown = samePageBank("adult").map((q) => q.id);
    expect(adult.questions!.every((id) => grown.includes(id))).toBe(true);
    const ids = new Set<string>();
    for (const a of ["under-6", "6-8", "9-12", "13-17", "adult"] as const) {
      expect(samePageBank(a).length).toBeGreaterThanOrEqual(10);
      for (const q of samePageBank(a)) {
        expect(q.choices).toHaveLength(3);
        expect(q.topic).toBeTruthy();
      }
    }
    for (const bank of [samePageBank("6-8"), samePageBank("9-12"), samePageBank("adult")])
      for (const q of bank) {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
      }
  });
  it("prefers questions these players haven't had lately", () => {
    let living = freshLiving();
    living = finishInto(living, play([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]));
    const first = livingOf({ ...emptyBook("Robin"), living }).plays![0].questions!.map((q) => q.id);
    living = startGame(living, "match", players);
    const second = living.game!.questions!;
    // The young bank has 12 questions, so five fresh ones are always available.
    expect(second.some((id) => first.includes(id))).toBe(false);
    expect(recentQuestions(living, [...players].reverse())).toEqual(first);
  });
  it("looks back at earlier rounds with the same players", () => {
    let living = freshLiving();
    const g1 = play([[0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 0, 0]]);
    expect(samePageTrend(living, g1)).toBe("");
    living = finishInto(living, g1);
    const g2 = play([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]);
    expect(samePageTrend(living, g2)).toMatch(/^Last time, on .+, you matched on 3 of 5\.$/);
    // Different players don't count.
    expect(samePageTrend(living, play([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], players.slice(0, 2)))).toBe("");
    living = finishInto(living, g2);
    living = finishInto(living, play([[0, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 0, 0, 0]]));
    expect(samePageTrend(living, play([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]))).toMatch(
      /^Over your last 3 rounds together, you matched on 12 of 15\./,
    );
  });
  it("still plays and validates a one-question round started before this change", () => {
    const fresh = newGame("match", players);
    const legacy: Game = { ...fresh, contentVersion: 1, answers: undefined, questions: undefined };
    delete legacy.answers;
    delete legacy.questions;
    expect(isLiving({ ...freshLiving(), game: legacy })).toBe(true);
    let g = advanceGame(legacy, { type: "start", firstId: "a" });
    for (const [i, choice] of [1, 1, 1].entries()) {
      if (i > 0) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "choice", choice });
      expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
    }
    expect(g.stage).toBe("reveal");
    const round = samePageRound(g);
    expect(samePagePrompts("6-8")).toContainEqual(round);
    expect(samePageAgreement(g)).toBe(`Same page: everyone chose “${round.choices[1]}”.`);
    expect(gameText(g)).toContain(`Sam: ${round.choices[1]}.`);
    // An older round leaves a names-only record, as before.
    const living = finishInto(freshLiving(), g);
    expect(living.plays![0].questions).toBeUndefined();
  });
  it("keeps an approved page and rejects malformed rounds", () => {
    let book = changeLiving(emptyBook("Robin"), (l) => ({
      ...l,
      game: play([[2, 2, 0, 1, 1], [2, 2, 0, 1, 1], [0, 2, 0, 1, 1]]),
    }));
    expect(isLiving(livingOf(book))).toBe(true);
    for (const p of players)
      book = changeLiving(book, (l) => ({
        ...l,
        game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
      }));
    book = keepGame(book);
    const page = livingOf(book).sharedPages[0];
    expect(page.kind).toBe("match");
    expect(page.title).toBe("Are we on the same page?");
    expect(page.text).toContain("You matched on 4 of 5.");
    expect(isLiving(livingOf(book))).toBe(true);
    expect(isBook(book)).toBe(true);
    const g = livingOf(book).game!;
    for (const bad of [
      { ...g, turn: 2, choices: [2, 2] },
      { ...g, choices: [0] },
      { ...g, answers: g.answers!.slice(0, 2) },
      { ...g, answers: [...g.answers!.slice(0, 2), [0, 0, 0]] },
      { ...g, answers: [...g.answers!.slice(0, 2), [0, 0, 0, 0, 3]] },
      { ...g, answers: [...g.answers!.slice(0, 2), [0, 0, 0, 0, "1"]] },
      { ...g, questions: [...g.questions!.slice(0, 4), "invented"] },
      { ...g, questions: g.questions!.slice(0, 4) },
      { ...g, questions: [...g.questions!.slice(0, 4), g.questions![0]] },
      { ...g, contentVersion: 3 },
    ])
      expect(isLiving({ ...livingOf(book), game: bad })).toBe(false);
  });
});
