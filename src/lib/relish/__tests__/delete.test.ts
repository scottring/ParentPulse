import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, type Book } from "../model";
import { newJournalDraft, writeJournalPage } from "../journal";
import { advanceGame, changeLiving, livingOf, newGame } from "../living";
import { bookPages } from "../pages";
import { underWay } from "../catalog";
import { keepNotes } from "../game-notes";
import { deletable, deletePage, deletePersonNote, discardUnderWay } from "../delete";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

const kept = (b: Book, text: string) => writeJournalPage(b, { ...newJournalDraft(), text }, 0, "kept");
const family = [
  { id: "owner", name: "Scott", audience: "adult" as const },
  { id: "k", name: "Kaleb", audience: "6-8" as const },
];

describe("deleting pages", () => {
  it("deletes a journal page by its Your book id, and only that one", () => {
    const book = kept(kept(emptyBook("Scott"), "First"), "Second");
    const [first] = bookPages(book);
    expect(deletable(first.id)).toBe(true);
    const after = deletePage(book, first.id);
    expect(bookPages(after).map((p) => p.text)).toEqual(["Second"]);
    expect(isBook(after)).toBe(true);
    expect(() => deletePage(after, first.id)).toThrow(/already gone/);
  });

  it("every page Your book lists can be deleted", () => {
    let book = kept(emptyBook("Scott"), "A page");
    book = {
      ...book,
      album: [{ id: "a1", title: "T", text: "Words", fromName: "Scott", sourceDate: "2026-11-01T00:00:00Z", createdAt: "2026-11-01T00:00:00Z" }],
      connections: { received: [{ id: "r1", title: "From Iris", text: "Hi", fromName: "Iris", acceptedAt: "2026-11-02T00:00:00Z" } as never] },
    };
    // A finished round leaves a play record.
    book = changeLiving(book, (x) => ({
      ...x,
      plays: [{ id: "g0", kind: "joy", players: family, playedAt: "2026-11-04T00:00:00Z" }],
    }));
    const pages = bookPages(book);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const p of pages) {
      expect(deletable(p.id)).toBe(true);
      expect(bookPages(deletePage(book, p.id)).some((x) => x.id === p.id)).toBe(false);
    }
    expect(deletePage(book, "album:a1").album).toEqual([]);
    expect(deletePage(book, "passage:r1").connections!.received).toEqual([]);
  });

  it("a kept game page and its round go together", () => {
    const base = changeLiving(emptyBook("Scott"), (x) => ({
      ...x,
      sharedPages: [{ id: "s1", kind: "story", title: "Our story", text: "Once", players: family, approvedBy: ["owner", "k"], createdAt: "2026-11-03T00:00:00Z" }],
      plays: [{ id: "g1", kind: "story", players: family, playedAt: "2026-11-03T00:00:00Z", pageId: "s1" }],
    }));
    const viaPage = livingOf(deletePage(base, "game:s1"));
    expect(viaPage.sharedPages).toEqual([]);
    expect(viaPage.plays).toEqual([]);
    const viaRecord = livingOf(deletePage(base, "play:g1"));
    expect(viaRecord.sharedPages).toEqual([]);
    expect(viaRecord.plays).toEqual([]);
  });

  it("refuses ids it doesn't know", () => {
    expect(deletable("family:x")).toBe(false);
    expect(() => deletePage(emptyBook("S"), "family:x")).toThrow();
    expect(() => deletePage(emptyBook("S"), "journal:")).toThrow();
  });
});

describe("cancelling what's under way", () => {
  it("ends a game in progress without recording it", () => {
    const book = changeLiving(emptyBook("Scott"), (x) => ({
      ...x,
      game: advanceGame(newGame("match", family), { type: "start", firstId: "owner" }),
    }));
    const [item] = underWay(book);
    expect(item.kind).toBe("game");
    const after = discardUnderWay(book, item);
    expect(livingOf(after).game).toBeUndefined();
    expect(livingOf(after).plays || []).toEqual([]);
    expect(underWay(after)).toEqual([]);
  });

  it("discards a draft", () => {
    const book = writeJournalPage(emptyBook("Scott"), { ...newJournalDraft(), text: "half a thought" }, 0, "draft");
    const [item] = underWay(book);
    expect(item.kind).toBe("draft");
    expect(discardUnderWay(book, item).journal).toEqual([]);
  });
});

describe("notes", () => {
  it("removes one kept note", () => {
    const book = keepNotes(emptyBook("Scott"), [
      { person: "Kaleb", kind: "likes", text: "Kaleb likes tacos.", from: "said" },
      { person: "Kaleb", kind: "likes", text: "Kaleb likes Lego.", from: "said" },
    ]);
    const kaleb = book.people[0];
    const after = deletePersonNote(book, kaleb.id, kaleb.notes![0].id);
    expect(after.people[0].notes!.map((n) => n.text)).toEqual(["Kaleb likes Lego."]);
    expect(() => deletePersonNote(after, kaleb.id, kaleb.notes![0].id)).toThrow();
  });
});
