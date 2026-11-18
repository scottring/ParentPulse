import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, sampleBook, type Book } from "../model";
import { createVault, unlockVault } from "../vault";
import { bookPages } from "../pages";
import { pageKind } from "../catalog";
import { cardPeople, isManual, manualSources, type ManualCard } from "../manual";
import { isJournal, renameJournalPage, writeJournalPage } from "../journal";
import { finishTracker, keepToolPage, startTracker, toggleMark } from "../tools";
import {
  advanceGame,
  changeLiving,
  finishGame,
  isLiving,
  keepGame,
  livingOf,
  newGame,
  recordRound,
  turnPlan,
  type Game,
  type Player,
} from "../living";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

// Your book as a compendium: play records, exercise pages and per-person
// insights, all stored as optional fields that older books simply lack.

const pass = "long testing-only passphrase";
const family = (): Book => ({
  ...emptyBook("Alex"),
  people: [
    { id: "ella", name: "Ella", role: "Daughter", color: "rose", note: "", lessons: [] },
    { id: "kaleb", name: "Kaleb", role: "Son", color: "ochre", note: "", lessons: [] },
  ],
});
const players: Player[] = [
  { id: "owner", name: "Alex", audience: "adult" },
  { id: "ella", name: "Ella", audience: "6-8" },
  { id: "kaleb", name: "Kaleb" },
];
function revealed(kind: Game["kind"] = "match"): Game {
  let g = advanceGame(newGame(kind, players), { type: "start" });
  while (g.stage !== "reveal") {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "answer", answers: turnPlan(g)[g.turn].asks.map(() => 0) });
  }
  return g;
}
const withGame = (book: Book, game: Game) =>
  changeLiving(book, (l) => ({ ...l, game }));

describe("play records", () => {
  it("a finished round without a kept page leaves a record with its answers in Your book", () => {
    const game = revealed("match");
    const book = finishGame(withGame(family(), game));
    const plays = livingOf(book).plays!;
    expect(plays).toHaveLength(1);
    expect(plays[0]).toEqual({
      id: game.id,
      kind: "match",
      players: [
        { id: "owner", name: "Alex" },
        { id: "ella", name: "Ella" },
        { id: "kaleb", name: "Kaleb" },
      ],
      playedAt: livingOf(book).game!.finishedAt,
      questions: game.questions!.map((id) => ({ id, picks: [0, 0, 0] })),
    });
    // Answers are kept by question id and pick: no prompt text or ages.
    expect(JSON.stringify(plays)).not.toMatch(/choices|audience|prompt/);
    expect(isBook(book)).toBe(true);
    const page = bookPages(book).find((p) => p.id === `play:${game.id}`)!;
    expect(page.title).toBe("Same page? with Ella and Kaleb");
    expect(pageKind(page)).toEqual({ label: "Game", tone: "clay" });
    expect(page.people).toEqual(["ella", "kaleb"]);
    expect(page.record).toBe(true);
  });

  it("records once per round, and a kept page replaces the record", () => {
    let book = withGame(family(), revealed("story"));
    for (const p of players)
      book = changeLiving(book, (l) => ({
        ...l,
        game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
      }));
    book = finishGame(keepGame(book));
    expect(livingOf(book).plays).toHaveLength(1);
    expect(livingOf(book).plays![0].pageId).toBe(livingOf(book).game!.savedPageId);
    expect(changeLiving(book, recordRound)).toEqual(book);
    const games = bookPages(book).filter((p) => pageKind(p).label === "Game");
    expect(games.map((p) => p.kind)).toEqual(["Made together"]);
    // The kept page is now found under each player too.
    expect(games[0].people).toEqual(["ella", "kaleb"]);
  });

  it("a round never revealed leaves no trace", () => {
    const game = advanceGame(newGame("joy", players), { type: "start" });
    const living = recordRound({ ...livingOf(family()), game });
    expect(living.plays).toBeUndefined();
  });

  it("matches players from other books to people by name", () => {
    const game = revealed("joy");
    const book = finishGame(
      withGame(family(), {
        ...game,
        players: game.players.map((p) =>
          p.id === "ella" ? { ...p, id: "book:abc" } : p,
        ),
      }),
    );
    expect(bookPages(book).find((p) => p.record)!.people).toEqual(["ella", "kaleb"]);
  });

  it("play records are never sent for suggestions", () => {
    const before = family();
    const after = finishGame(withGame(before, revealed("match")));
    expect(manualSources(after, "personal")).toEqual(manualSources(before, "personal"));
    expect(manualSources(after, "family")).toEqual(manualSources(before, "family"));
  });

  it("validators accept books without records and reject malformed ones", () => {
    const book = finishGame(withGame(family(), revealed("match")));
    const living = livingOf(book);
    const record = living.plays![0];
    expect(isLiving({ ...living, plays: undefined })).toBe(true);
    expect(isLiving({ ...living, plays: [] })).toBe(true);
    for (const bad of [
      "nope",
      [record, record],
      [{ ...record, kind: "chess" }],
      [{ ...record, playedAt: "yesterday" }],
      [{ ...record, players: [record.players[0]] }],
      [{ ...record, players: [record.players[0], { id: "x", name: " " }] }],
      [{ ...record, pageId: 7 }],
      [{ ...record, id: "" }],
      Array.from({ length: 501 }, (_, i) => ({ ...record, id: String(i) })),
      [{ ...record, questions: "nope" }],
      [{ ...record, kind: "story", questions: record.questions }],
      [{ ...record, questions: [{ id: "a-bored", picks: [0, 1] }] }],
      [{ ...record, questions: [{ id: "a-bored", picks: [0, 1, 3] }] }],
      [{ ...record, questions: [{ id: "", picks: [0, 1, 2] }] }],
      // Only the newest rounds keep their answers.
      Array.from({ length: 101 }, (_, i) => ({ ...record, id: String(i) })),
    ])
      expect(isLiving({ ...living, plays: bad })).toBe(false);
    const namesOnly = { ...record };
    delete namesOnly.questions;
    expect(isLiving({ ...living, plays: [namesOnly] })).toBe(true);
    expect(
      isLiving({
        ...living,
        plays: [
          ...Array.from({ length: 300 }, (_, i) => ({ ...namesOnly, id: `old${i}` })),
          ...Array.from({ length: 100 }, (_, i) => ({ ...record, id: String(i) })),
        ],
      }),
    ).toBe(true);
  });

  it("drops the answers of rounds older than the newest hundred, keeping their names and dates", () => {
    let living = livingOf(family());
    for (let i = 0; i < 102; i++)
      living = recordRound({ ...living, game: advanceGame(revealed("match"), { type: "finish" }) });
    const plays = living.plays!;
    expect(plays).toHaveLength(102);
    expect(plays.filter((r) => r.questions).length).toBe(100);
    expect(plays[0].questions).toBeUndefined();
    expect(plays[0].players).toHaveLength(3);
    expect(plays[2].questions).toHaveLength(5);
    expect(isLiving(living)).toBe(true);
  });
});

describe("exercise pages", () => {
  it("are marked as exercises, labelled with the exercise and tagged with who it was with", () => {
    const book = keepToolPage(family(), {
      title: "What helps when I’m upset",
      text: "Helps me: a walk.",
      toolId: "helps-upset",
      people: ["ella", "ghost", "ella"],
    });
    const entry = book.journal![0];
    expect(entry.source).toEqual({ kind: "exercise", toolId: "helps-upset" });
    expect(entry.people).toEqual(["ella"]);
    expect(isBook(book)).toBe(true);
    const page = bookPages(book)[0];
    expect(page.kind).toBe("Exercise");
    expect(page.exercise).toBe("What helps when I’m upset");
    expect(pageKind(page)).toEqual({ label: "Exercise", tone: "sage" });
    expect(page.people).toEqual(["ella"]);
  });

  it("“No one in particular” keeps no tags; the person an exercise is about is always included", () => {
    const alone = keepToolPage(family(), { title: "x", text: "y", toolId: "helps-upset" });
    expect(alone.journal![0].people).toBeUndefined();
    const about = keepToolPage(family(), {
      title: "x",
      text: "y",
      toolId: "soft-start",
      personId: "kaleb",
      people: ["ella", "kaleb"],
    });
    expect(about.journal![0].people).toEqual(["kaleb", "ella"]);
  });

  it("a finished habit keeps its exercise and who it was with", () => {
    let book = startTracker(family(), "hellos", "ella");
    const run = book.tools!.trackers[0];
    book = toggleMark(book, run.id, "2026-11-18");
    book = finishTracker(book, run.id);
    expect(book.journal![0]).toMatchObject({
      source: { kind: "exercise", toolId: "hellos" },
      people: ["ella"],
    });
  });

  it("editing or renaming an exercise page keeps where it came from", () => {
    let book = keepToolPage(family(), { title: "x", text: "y", toolId: "helps-upset" });
    const entry = book.journal![0];
    book = writeJournalPage(book, { ...entry, text: "edited", source: undefined }, 1, "kept");
    expect(book.journal![0].source).toEqual(entry.source);
    book = renameJournalPage(book, entry.id, "A new name");
    expect(book.journal![0].source).toEqual(entry.source);
    expect(pageKind(bookPages(book)[0]).label).toBe("Exercise");
  });

  it("older exercise pages (no source) still read as exercises by their title", () => {
    const old = writeJournalPage(
      family(),
      { id: "old", title: "What helps when I’m upset", text: "y", style: "moss", createdAt: "2026-10-01T00:00:00Z" },
      0,
      "kept",
    );
    expect(old.journal![0].source).toBeUndefined();
    expect(pageKind(bookPages(old)[0]).label).toBe("Exercise");
  });

  it("the journal validator accepts pages with or without a source and rejects bad ones", () => {
    const book = keepToolPage(family(), { title: "x", text: "y", toolId: "helps-upset" });
    const entry = book.journal![0];
    const { source: _source, ...plain } = entry;
    void _source;
    expect(isJournal([plain])).toBe(true);
    expect(isJournal([entry])).toBe(true);
    // An exercise that no longer exists never stops a book from opening.
    expect(isJournal([{ ...entry, source: { kind: "exercise", toolId: "retired" } }])).toBe(true);
    expect(pageKind(bookPages({ ...book, journal: [{ ...entry, source: { kind: "exercise", toolId: "retired" } }] })[0]).label).toBe("Exercise");
    for (const source of [
      null,
      "exercise",
      { kind: "game", toolId: "helps-upset" },
      { kind: "exercise" },
      { kind: "exercise", toolId: "" },
      { kind: "exercise", toolId: "x".repeat(101) },
    ])
      expect(isJournal([{ ...entry, source }])).toBe(false);
  });
});

describe("insights about a person", () => {
  const tagged = (id: string, people: string[]) =>
    writeJournalPage(
      family(),
      { id, title: id, text: id, style: "sky", createdAt: "2026-10-01T00:00:00Z", people },
      0,
      "kept",
    ).journal![0];
  const card = (ids: string[], scope: ManualCard["scope"] = "personal"): ManualCard => ({
    id: ids.join("+"),
    scope,
    status: "kept",
    createdAt: "2026-10-02T00:00:00Z",
    title: "t",
    observation: "o",
    tryThis: "",
    sourceIds: ids,
    sources: ids.map((id) => ({ id, title: id, text: id })),
  });
  const book: Book = {
    ...family(),
    journal: [
      tagged("a", ["ella"]),
      tagged("b", ["ella", "kaleb"]),
      tagged("c", ["kaleb"]),
      tagged("d", []),
    ],
  };
  it("a card is about a person when more than half its source pages are tagged with them", () => {
    const cards = [
      card(["journal:a"]),
      card(["journal:a", "journal:b"]),
      card(["journal:a", "journal:b", "journal:c"]),
      card(["journal:a", "journal:d"]),
      card(["journal:d"]),
      card(["journal:a", "journal:gone"]),
    ];
    expect(cardPeople(book, cards)).toEqual({
      "journal:a": ["ella"],
      "journal:a+journal:b": ["ella"],
      "journal:a+journal:b+journal:c": ["ella", "kaleb"],
      "journal:a+journal:d": [],
      "journal:d": [],
      "journal:a+journal:gone": [],
    });
  });
  it("family insights from a game page are about its players; reading them changes nothing stored", () => {
    let played = withGame(family(), revealed("story"));
    for (const p of players)
      played = changeLiving(played, (l) => ({
        ...l,
        game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
      }));
    played = keepGame(played);
    const page = livingOf(played).sharedPages[0];
    const familyCard = card([`game:${page.id}`], "family");
    const withManual: Book = {
      ...played,
      manual: { automatic: { personal: false, family: false }, fingerprints: {}, cards: [familyCard] },
    };
    expect(isManual(withManual.manual)).toBe(true);
    const before = JSON.stringify(withManual);
    expect(cardPeople(withManual)).toEqual({ [familyCard.id]: ["ella", "kaleb"] });
    expect(JSON.stringify(withManual)).toBe(before);
  });
  it("the sample book has one insight about Anna and one about Leo", () => {
    expect(Object.values(cardPeople(sampleBook()))).toEqual([["anna"], ["leo"]]);
  });
});

describe("storage compatibility", () => {
  it("old-shape books (the sample and an empty book) still open", () => {
    expect(isBook(sampleBook())).toBe(true);
    expect(isBook(emptyBook("A"))).toBe(true);
    expect(livingOf(sampleBook()).plays).toBeUndefined();
  });

  it("new-shape books survive an encrypt/decrypt round trip unchanged", async () => {
    const book = keepToolPage(finishGame(withGame(family(), revealed("match"))), {
      title: "What helps when I’m upset",
      text: "Helps me: a walk.",
      toolId: "helps-upset",
      people: ["kaleb"],
    });
    const { envelope } = await createVault(book, pass);
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("Kaleb");
    expect((await unlockVault(raw, pass)).book).toEqual(book);
  });
});
