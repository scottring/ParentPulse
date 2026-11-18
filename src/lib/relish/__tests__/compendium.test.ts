import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, sampleBook, type Book } from "../model";
import { createVault, unlockVault } from "../vault";
import { bookPages } from "../pages";
import { pageKind } from "../catalog";
import { manualSources } from "../manual";
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
    g = advanceGame(g, { type: "choice", choice: 0 });
  }
  return g;
}
const withGame = (book: Book, game: Game) =>
  changeLiving(book, (l) => ({ ...l, game }));

describe("play records", () => {
  it("a finished round without a kept page leaves a names-only record in Your book", () => {
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
    });
    // No answers, prompts, story text or ages are stored in the record.
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
    ])
      expect(isLiving({ ...living, plays: bad })).toBe(false);
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
