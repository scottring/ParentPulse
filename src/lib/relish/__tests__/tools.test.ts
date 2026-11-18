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
  answerCheckBack,
  builderComplete,
  checkBackWords,
  dueCheckBacks,
  openCheckBacks,
  builderPage,
  finishTracker,
  hasBingo,
  namesList,
  runningByTool,
  runsStatus,
  setMark,
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
import { bookPages } from "../pages";
import { createVault, unlockVault } from "../vault";
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
    expect(toolsFor("under-6").map((t) => t.id)).toEqual(["helps-upset", "kindness-bingo", "day-highlights"]);
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

describe("a habit with several people", () => {
  const family = (): Book => ({
    ...withPeople(),
    people: [
      ...withPeople().people,
      { id: "ella", name: "Ella", role: "child", color: "sage", note: "", lessons: [] },
      { id: "kaleb", name: "Kaleb", role: "child", color: "ochre", note: "", lessons: [] },
    ],
  });
  const both = () => startTracker(startTracker(family(), "hellos", "ella"), "hellos", "kaleb");
  it("runs one tracker per person, each marked and finished on its own", () => {
    let book = both();
    expect(isBook(book)).toBe(true);
    const [ella, kaleb] = activeTrackers(book);
    expect([ella.personId, kaleb.personId]).toEqual(["ella", "kaleb"]);
    // The same person twice is still refused.
    expect(() => startTracker(book, "hellos", "ella")).toThrow(/already in progress with them/);
    book = setMark(book, ella.id, "2026-11-18", true);
    // Marking twice the same day changes nothing; neither does unmarking twice.
    expect(setMark(book, ella.id, "2026-11-18", true)).toBe(book);
    expect(toolsOf(book).trackers.find((t) => t.id === kaleb.id)!.marks).toHaveLength(0);
    for (let d = 1; d <= 9; d++) book = setMark(book, ella.id, `2026-11-0${d}`, true);
    expect(trackerProgress(toolsOf(book).trackers[0]).complete).toBe(true);
    book = setMark(book, kaleb.id, "2026-11-18", true);
    expect(runsStatus(book, activeTrackers(book))).toBe("Ella 10 of 10 · Kaleb 1 of 10");
    book = finishTracker(book, ella.id, "  She ran to the door every time.  ");
    expect(isBook(book)).toBe(true);
    const page = book.journal![0];
    expect(page.title).toBe("Ten real hellos · Ella");
    expect(page.people).toEqual(["ella"]);
    expect(page.text).toContain("10 of 10 days");
    expect(page.text.endsWith("She ran to the door every time.")).toBe(true);
    // Kaleb carries on, still in the order he was started.
    expect(activeTrackers(book).map((t) => t.personId)).toEqual(["kaleb"]);
    expect(runsStatus(book, activeTrackers(book))).toBe("1 of 10");
    // Ella can start again later; her finished run is kept with its page.
    expect(() => startTracker(book, "hellos", "ella")).not.toThrow();
  });
  it("groups habits for Do something and Your book, and names people plainly", () => {
    let book = both();
    book = startTracker(book, "thanks-week", "anna");
    expect(runningByTool(book).map((g) => [g.toolId, g.runs.length])).toEqual([
      ["hellos", 2],
      ["thanks-week", 1],
    ]);
    book = startTracker(book, "hellos", "anna");
    const people = { ...book, people: [...book.people, { id: "leo", name: "Leo", role: "child", color: "rose", note: "", lessons: [] }] };
    const four = startTracker(people, "hellos", "leo");
    expect(runsStatus(four, runningByTool(four)[0].runs)).toBe("with 4 people");
    expect(namesList(["Ella"])).toBe("Ella");
    expect(namesList(["Ella", "Kaleb"])).toBe("Ella and Kaleb");
    expect(namesList(["Ella", "Kaleb", "Leo"])).toBe("Ella, Kaleb and Leo");
  });
  it("keeps a habit that isn't about anyone to one at a time", () => {
    const book = startTracker(family(), "kindness-bingo", "ella");
    expect(() => startTracker(book, "kindness-bingo", "kaleb")).toThrow(/already in progress/);
    const run = activeTrackers(book)[0];
    expect(isTools({ version: 1, trackers: [run, { ...run, id: "other", personId: "kaleb" }] })).toBe(false);
  });
  it("accepts the old one-tracker shape and the new several-people shape, and rejects duplicates", () => {
    // A book from before: one active hellos tracker, no new fields anywhere.
    const old = {
      version: 1,
      trackers: [
        {
          id: "run-1",
          toolId: "hellos",
          personId: "kaleb",
          startedAt: "2026-11-10T08:00:00.000Z",
          marks: [
            { key: "2026-11-10", at: "2026-11-10T08:00:00.000Z" },
            { key: "2026-11-12", at: "2026-11-12T08:00:00.000Z" },
          ],
        },
      ],
    };
    expect(isTools(old)).toBe(true);
    expect(isBook({ ...family(), tools: old })).toBe(true);
    // It carries on unchanged and can take a second person.
    const book = startTracker({ ...family(), tools: old as never }, "hellos", "ella");
    expect(toolsOf(book).trackers[0]).toEqual(old.trackers[0]);
    expect(isTools(toolsOf(book))).toBe(true);
    const [kaleb, ella] = toolsOf(book).trackers;
    const bad = [
      { version: 1, trackers: [kaleb, { ...kaleb, id: "again" }] },
      { version: 1, trackers: [ella, { ...ella, id: "again" }] },
      { version: 1, trackers: [kaleb, { ...ella, id: kaleb.id }] },
      { version: 1, trackers: [kaleb, { ...ella, personId: 7 }] },
      { version: 1, trackers: [kaleb, { ...ella, marks: [{ key: "soon", at: ella.startedAt }] }] },
    ];
    for (const b of bad) expect(isTools(b)).toBe(false);
    // A finished run for the same person alongside an active one is fine.
    expect(
      isTools({ version: 1, trackers: [{ ...kaleb, id: "done", finishedAt: kaleb.startedAt }, kaleb, ella] }),
    ).toBe(true);
  });
  it("survives an encrypt and unlock round trip", async () => {
    let book = both();
    const [ella] = activeTrackers(book);
    book = setMark(book, ella.id, "2026-11-18", true, "Hug at the door");
    const { envelope } = await createVault(book, "long testing-only passphrase");
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("Hug at the door");
    const back = (await unlockVault(raw, "long testing-only passphrase")).book;
    expect(back).toEqual(book);
    expect(activeTrackers(back).map((t) => t.personId)).toEqual(["ella", "kaleb"]);
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

describe("check-backs on kept plans", () => {
  const withSam = (): Book => ({
    ...emptyBook("Robin"),
    people: [{ id: "sam", name: "Sam", role: "Son", color: "rose", note: "", lessons: [] }],
  });
  const repairPlan =
    "I’m sorry I snapped. I wish I’d taken a breath. Next time I’ll say I need a minute. Can we start fresh tomorrow?";
  const keep = (book: Book, toolId: string, plan?: string) =>
    keepToolPage(book, {
      title: toolId,
      text: `Page for ${toolId}`,
      toolId,
      personId: "sam",
      ...(plan !== undefined ? { plan } : {}),
    });
  const DAY = 86_400_000;
  it("keeping a plan from these three exercises asks about it a few days later", () => {
    let book = keep(withSam(), "repair", repairPlan);
    book = keep(book, "soft-start", "I feel worn out about bedtime, and what would help is trading off.");
    book = keep(book, "iceberg", "Tired");
    book = keep(book, "helps-upset", "Music");
    book = keep(book, "repair", " ");
    const list = toolsOf(book).checkBacks!;
    expect(list.map((c) => c.toolId)).toEqual(["repair", "soft-start", "iceberg"]);
    const [repair, , iceberg] = list;
    expect(repair.pageId).toBe(book.journal!.find((e) => e.source?.toolId === "repair")!.id);
    expect(repair.personId).toBe("sam");
    expect(Date.parse(repair.dueAt) - Date.parse(repair.createdAt)).toBe(2 * DAY);
    expect(Date.parse(iceberg.dueAt) - Date.parse(iceberg.createdAt)).toBe(3 * DAY);
    const kept = Date.parse(repair.createdAt);
    expect(dueCheckBacks(book, new Date(kept + DAY))).toHaveLength(0);
    expect(dueCheckBacks(book, new Date(kept + 2 * DAY)).map((c) => c.toolId)).toEqual([
      "repair",
      "soft-start",
    ]);
    expect(dueCheckBacks(book, new Date(kept + 3 * DAY))).toHaveLength(3);
    expect(checkBackWords(book, repair)).toEqual({
      lead: "You planned to say to Sam:",
      quote: repairPlan,
      ask: "Did you get a chance to say it?",
    });
    expect(checkBackWords(book, iceberg).lead).toBe(
      "You guessed it was “Tired” for Sam, and planned to respond to that instead of the behavior.",
    );
    expect(isBook(book)).toBe(true);
  });
  it("Yes saves how it went with the plan; Not yet asks again later; Let it go sets it aside", () => {
    let book = keep(keep(keep(withSam(), "repair", repairPlan), "soft-start", "Opener"), "iceberg", "Tired");
    const [repair, opener, iceberg] = toolsOf(book).checkBacks!;
    const now = new Date(Date.parse(repair.dueAt) + 1000);
    book = answerCheckBack(book, repair.id, { kind: "tried", outcome: "helped", note: " She laughed. " }, now);
    expect(toolsOf(book).checkBacks![0]).toMatchObject({
      status: "tried",
      outcome: "helped",
      note: "She laughed.",
      answeredAt: now.toISOString(),
    });
    const page = bookPages(book).find((p) => p.id === `journal:${repair.pageId}`)!;
    expect(page.sections).toEqual([{ label: "How it went", text: "It helped, even a little. She laughed." }]);
    book = answerCheckBack(book, opener.id, { kind: "later" }, now);
    expect(Date.parse(toolsOf(book).checkBacks![1].dueAt)).toBe(now.getTime() + 2 * DAY);
    expect(dueCheckBacks(book, now).map((c) => c.id)).toEqual([]);
    book = answerCheckBack(book, iceberg.id, { kind: "let-go" }, new Date(Date.parse(iceberg.dueAt)));
    expect(openCheckBacks(book).map((c) => c.id)).toEqual([opener.id]);
    expect(() => answerCheckBack(book, repair.id, { kind: "let-go" })).toThrow("already");
    expect(() =>
      answerCheckBack(book, opener.id, { kind: "tried", outcome: "great" as never }),
    ).toThrow();
    expect(isBook(book)).toBe(true);
  });
  it("validators accept books without check-backs and reject malformed ones", () => {
    expect(isTools({ version: 1, trackers: [] })).toBe(true);
    const fresh = keep(withSam(), "repair", repairPlan);
    const c = toolsOf(fresh).checkBacks![0];
    expect(isTools(toolsOf(fresh))).toBe(true);
    for (const bad of [
      "nope",
      [c, c],
      [{ ...c, toolId: "hellos" }],
      [{ ...c, plan: "" }],
      [{ ...c, plan: "x".repeat(1501) }],
      [{ ...c, dueAt: "soon" }],
      [{ ...c, status: "done", answeredAt: c.createdAt }],
      [{ ...c, status: "tried" }],
      [{ ...c, answeredAt: c.createdAt }],
      [{ ...c, outcome: "helped" }],
      [{ ...c, status: "tried", answeredAt: c.createdAt, outcome: "great" }],
      [{ ...c, note: "Hi" }],
      Array.from({ length: 61 }, (_, i) => ({ ...c, id: String(i) })),
    ])
      expect(isTools({ ...toolsOf(fresh), checkBacks: bad })).toBe(false);
  });
  it("answered plans make room first, and a check-back survives an encrypt/decrypt round trip", async () => {
    let book = withSam();
    for (let i = 0; i < 60; i++) {
      book = keep(book, "repair", `Plan ${i}`);
      if (i < 59) book = answerCheckBack(book, toolsOf(book).checkBacks!.at(-1)!.id, { kind: "let-go" });
    }
    book = keep(book, "iceberg", "Hungry");
    const list = toolsOf(book).checkBacks!;
    expect(list).toHaveLength(60);
    expect(list[0].plan).toBe("Plan 1");
    expect(openCheckBacks(book).map((c) => c.plan)).toEqual(["Plan 59", "Hungry"]);
    const { envelope } = await createVault(book, "long testing-only passphrase");
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("Hungry");
    expect((await unlockVault(raw, "long testing-only passphrase")).book).toEqual(book);
  });
});
