// @vitest-environment node
import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import {
  newJournalDraft,
  writeJournalPage,
  JOURNAL_TEXT_LIMIT,
} from "../journal";
import { createVault, unlockVault } from "../vault";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
describe("private journal pages", () => {
  it("preserves old books and keeps drafts separate from guided sessions", () => {
    const original = emptyBook("A");
    expect(isBook(original)).toBe(true);
    const draft = {
      ...newJournalDraft(),
      text: "One word\n\n  and a little space.  ",
    };
    const next = writeJournalPage(original, draft, 0, "draft");
    expect(isBook(next)).toBe(true);
    expect(next.journal?.[0].text).toBe(draft.text);
    expect(next.living).toEqual(original.living);
    expect(next.moments).toEqual(original.moments);
    expect(original.journal).toBeUndefined();
  });
  it("keeps and edits the same page while rejecting stale writes", () => {
    const draft = { ...newJournalDraft(), text: "First thought" };
    const first = writeJournalPage(emptyBook("A"), draft, 0, "draft");
    const kept = writeJournalPage(
      first,
      { ...draft, title: "A good day", style: "blush" },
      1,
      "kept",
    );
    const edited = writeJournalPage(
      kept,
      { ...draft, text: "Another thought" },
      2,
      "kept",
    );
    expect(edited.journal).toHaveLength(1);
    expect(edited.journal?.[0]).toMatchObject({
      id: draft.id,
      createdAt: draft.createdAt,
      revision: 3,
      text: "Another thought",
      status: "kept",
    });
    expect(() => writeJournalPage(edited, draft, 2, "kept")).toThrow("changed");
    expect(() => writeJournalPage(edited, draft, 3, "draft")).toThrow(
      "unfinished",
    );
    expect(() =>
      writeJournalPage(edited, { ...draft, text: " \n " }, 3, "kept"),
    ).toThrow("few words");
  });
  it("rejects malformed, duplicate and oversized pages on import", () => {
    const book = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), text: "Hello" },
      0,
      "kept",
    );
    const entry = book.journal![0];
    for (const patch of [
      { status: "published" },
      { revision: 0 },
      { style: "unknown" },
      { text: "" },
      { updatedAt: "bad" },
      { text: "x".repeat(JOURNAL_TEXT_LIMIT + 1) },
    ]) {
      expect(isBook({ ...book, journal: [{ ...entry, ...patch }] })).toBe(
        false,
      );
    }
    expect(isBook({ ...book, journal: [entry, entry] })).toBe(false);
  });
  it("encrypts unfinished and kept pages and restores both from a backup", async () => {
    const draft = {
      ...newJournalDraft(),
      title: "PRIVATE DRAFT TITLE",
      text: "PRIVATE UNFINISHED WORDS",
    };
    const kept = {
      ...newJournalDraft(),
      title: "PRIVATE KEPT TITLE",
      text: "PRIVATE KEPT WORDS",
    };
    const book = writeJournalPage(
      writeJournalPage(emptyBook("A"), draft, 0, "draft"),
      kept,
      0,
      "kept",
    );
    const pass = "journal test-only passphrase";
    const { envelope } = await createVault(book, pass);
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("PRIVATE");
    expect((await unlockVault(raw, pass)).book).toEqual(book);
  });
});
