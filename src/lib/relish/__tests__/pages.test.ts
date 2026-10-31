import { describe, it, expect } from "vitest";
import { emptyBook, isBook, sampleBook } from "../model";
import { bookPages, keepAlbumPassage } from "../pages";
import { newJournalDraft, writeJournalPage } from "../journal";
import { livingOf } from "../living";
describe("one continuous book", () => {
  it("interleaves sources by original date; edits do not move pages and drafts stay out", () => {
    let book = writeJournalPage(
      emptyBook("A"),
      {
        ...newJournalDraft(),
        text: "journal",
        createdAt: "2026-10-02T00:00:00Z",
      },
      0,
      "kept",
    );
    book = writeJournalPage(
      book,
      { ...newJournalDraft(), text: "unfinished" },
      0,
      "draft",
    );
    book.living = {
      ...livingOf(book),
      entries: [
        {
          id: "same",
          kind: "notice",
          thread: "listen",
          text: "noticed",
          createdAt: "2026-10-01T00:00:00Z",
        },
        {
          id: "practice",
          kind: "practice",
          thread: "listen",
          text: "try",
          createdAt: "2026-10-03T00:00:00Z",
        },
      ],
    } as typeof book.living;
    book.connections = {
      received: [
        {
          id: "same",
          title: "From another book",
          text: "welcome",
          from: "b",
          fromName: "B",
          createdAt: "2026-09-01T00:00:00Z",
          acceptedAt: "2026-10-04T00:00:00Z",
        },
      ],
    };
    expect(bookPages(book).map((p) => p.text)).toEqual([
      "noticed",
      "journal",
      "try",
      "welcome",
    ]);
    book = writeJournalPage(
      book,
      { ...book.journal![0], text: "edited" },
      1,
      "kept",
    );
    expect(bookPages(book).map((p) => p.text)).toEqual([
      "noticed",
      "edited",
      "try",
      "welcome",
    ]);
    expect(new Set(bookPages(book).map((p) => p.id)).size).toBe(4);
  });
  it("copies only chosen words and photos to the album, leaving tags and the rest private", () => {
    const photo = {
      id: crypto.randomUUID(),
      width: 500,
      height: 500,
      caption: "Chosen photo",
    };
    const book = writeJournalPage(
      emptyBook("A"),
      {
        ...newJournalDraft(),
        text: "Public sentence. PRIVATE SENTENCE.",
        photos: [photo],
      },
      0,
      "kept",
    );
    const next = keepAlbumPassage(
      book,
      bookPages(book)[0],
      "Our moment",
      "Public sentence.",
      [],
    );
    expect(next.album?.[0].text).toBe("Public sentence.");
    expect(JSON.stringify(next.album)).not.toContain("PRIVATE");
    expect(next.album?.[0].photos).toEqual([]);
    expect(next.journal).toBe(book.journal);
    expect(isBook(next)).toBe(true);
    expect(() =>
      keepAlbumPassage(book, bookPages(book)[0], "Oops", "a", [
        { ...photo, id: crypto.randomUUID() },
      ]),
    ).toThrow("Choose photos");
  });
  it("accepts photo-only pages and rejects malformed photos in imported books", () => {
    const photo = {
      id: crypto.randomUUID(),
      width: 400,
      height: 300,
      caption: "",
    };
    const book = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), photos: [photo] },
      0,
      "kept",
    );
    expect(isBook(book)).toBe(true);
    expect(
      isBook({
        ...book,
        journal: [
          {
            ...book.journal![0],
            photos: [{ ...photo, id: "https://tracking.invalid/photo" }],
          },
        ],
      }),
    ).toBe(false);
    expect(isBook({ ...book, album: [{ text: "bad" }] })).toBe(false);
  });
});

it("the fictional continuous-book example remains a valid encrypted-book payload", () => { expect(isBook(sampleBook())).toBe(true); });
