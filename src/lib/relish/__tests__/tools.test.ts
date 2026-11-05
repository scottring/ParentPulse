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
  newGame,
  samePageAgreement,
  samePageRound,
  turnCount,
} from "../living";
import { samePagePrompts } from "../play-content";
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
  function play(choices: (number | null)[]) {
    let g = advanceGame(newGame("match", players), { type: "start", firstId: "a" });
    choices.forEach((choice, i) => {
      if (i > 0) g = advanceGame(g, { type: "ready" });
      g = advanceGame(g, { type: "choice", choice });
    });
    return g;
  }
  it("gives everyone one private answer, then reveals agreement", () => {
    const g = play([1, 1, 1]);
    expect(turnCount(g)).toBe(3);
    expect(g.stage).toBe("reveal");
    const round = samePageRound(g);
    expect(samePageAgreement(g)).toBe(`Same page: everyone chose “${round.choices[1]}”.`);
    expect(gameText(g)).toContain(round.prompt);
    expect(gameText(g)).toContain(`Sam: ${round.choices[1]}.`);
    expect(samePageAgreement(play([0, 1, 1]))).toContain("2 of 3");
    expect(samePageAgreement(play([0, 1, 2]))).toContain("different");
    expect(samePageAgreement(play([0, null, null]))).toBe("");
  });
  it("hands the device over between private answers", () => {
    let g = advanceGame(newGame("match", players), { type: "start" });
    g = advanceGame(g, { type: "choice", choice: 2 });
    expect(g.stage).toBe("handoff");
    expect(() => advanceGame(g, { type: "choice", choice: 0 })).toThrow();
    expect(() =>
      advanceGame(advanceGame(g, { type: "ready" }), { type: "choice", choice: 3 }),
    ).toThrow();
  });
  it("keeps the same question across reload and uses age-appropriate prompts", () => {
    const g = newGame("match", players);
    expect(samePageRound(JSON.parse(JSON.stringify(g)))).toEqual(samePageRound(g));
    const kid = newGame("match", [...players.slice(0, 2), { id: "k", name: "Ella", audience: "6-8" }]);
    expect(samePagePrompts("6-8")).toContainEqual(samePageRound(kid));
    expect(samePagePrompts("adult")).not.toContainEqual(samePageRound(kid));
    for (const a of ["under-6", "6-8", "9-12", "13-17", "adult"] as const)
      for (const r of samePagePrompts(a)) expect(r.choices).toHaveLength(3);
  });
  it("keeps an approved page and validates the saved state", () => {
    let book = changeLiving(emptyBook("Robin"), (l) => ({ ...l, game: play([2, 2, 0]) }));
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
    expect(isLiving(livingOf(book))).toBe(true);
    expect(isBook(book)).toBe(true);
    const tampered = { ...livingOf(book), game: { ...livingOf(book).game!, turn: 2, choices: [2, 2] } };
    expect(isLiving(tampered)).toBe(false);
  });
});
