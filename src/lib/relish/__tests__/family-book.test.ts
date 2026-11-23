// @vitest-environment node
import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import { unlockVault } from "../vault";
import {
  FAMILY_LABEL,
  changeFamilyBook,
  isFamilyHead,
  loadFamilyPages,
} from "../family-book";
import {
  addFamilyPage,
  isFamilyPages,
  mergeFamilyPages,
  newFamilyPage,
  removeFamilyPage,
  type FamilyPage,
} from "../family-pages";
import { isEditionProfile } from "../profiles";
import { fakeLibrary } from "./family-remote";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const page = (id: string, text = `Words ${id}`, at = "2026-11-12T20:00:00Z"): FamilyPage =>
  newFamilyPage({
    id,
    kind: "passage",
    text,
    caption: "Kaleb, at bedtime",
    byName: "Scott",
    byBookId: "r-scott",
    createdAt: at,
  });

describe("family pages", () => {
  it("validates pages and the family profile inside a book", () => {
    const book = { ...emptyBook("Our family"), profile: { kind: "family" as const }, familyPages: [page("a")] };
    expect(isEditionProfile({ kind: "family" })).toBe(true);
    expect(isEditionProfile({ kind: "family", extra: 1 })).toBe(false);
    expect(isBook(book)).toBe(true);
    expect(isFamilyPages([page("a"), page("a")])).toBe(false);
    expect(isFamilyPages([{ ...page("a"), kind: "secret" }])).toBe(false);
    expect(isFamilyPages([{ ...page("a"), text: "  " }])).toBe(false);
    expect(isBook({ ...book, familyPages: [{ ...page("a"), createdAt: "soon" }] })).toBe(false);
  });
  it("adds and removes by id, and merges newest first without duplicates", () => {
    const one = addFamilyPage(emptyBook("A"), page("a"));
    expect(addFamilyPage(one, page("a"))).toBe(one);
    expect(removeFamilyPage(one, "a").familyPages).toEqual([]);
    expect(removeFamilyPage(one, "missing")).toBe(one);
    expect(
      mergeFamilyPages(
        [page("old", "x", "2026-09-01T00:00:00Z")],
        [page("new", "y", "2026-11-01T00:00:00Z"), page("old", "z", "2026-09-01T00:00:00Z")],
      ).map((p) => p.id),
    ).toEqual(["new", "old"]);
  });
});

describe("the account's family book", () => {
  it("is created on the first page, as an account book holding only encrypted words", async () => {
    const lib = fakeLibrary([
      { id: "r-scott", label: "Scott", revision: "1", updatedAt: 0, manifest: {} as never, accountManaged: true },
    ]);
    expect((await loadFamilyPages(lib.remote)).pages).toEqual([]);
    await changeFamilyBook(lib.remote, { add: page("a", "When I’m big I’ll still hold your hand.") });
    const [head] = [...lib.heads.values()];
    expect(head.label).toBe(FAMILY_LABEL);
    expect(isFamilyHead(head)).toBe(true);
    expect(lib.raw.get(head.id)).not.toContain("hold your hand");
    const opened = await unlockVault(lib.raw.get(head.id)!, await lib.remote.secret(head.id));
    expect(opened.book.profile).toEqual({ kind: "family" });
    expect((await loadFamilyPages(lib.remote)).pages.map((p) => p.text)).toEqual([
      "When I’m big I’ll still hold your hand.",
    ]);
  });
  it("re-reads and re-applies when another device saved first", async () => {
    const lib = fakeLibrary();
    await changeFamilyBook(lib.remote, { add: page("a") });
    // Another device adds "b" between this device's read and its write.
    lib.beforeNextUpload(() => changeFamilyBook(lib.remote, { add: page("b") }));
    await changeFamilyBook(lib.remote, { add: page("c") });
    expect(lib.calls.conflicts).toBe(1);
    expect((await loadFamilyPages(lib.remote)).pages.map((p) => p.id).toSorted()).toEqual(["a", "b", "c"]);
  });
  it("gives up after three conflicting tries and says so", async () => {
    const lib = fakeLibrary();
    await changeFamilyBook(lib.remote, { add: page("a") });
    const again = () =>
      lib.beforeNextUpload(async () => {
        await changeFamilyBook(lib.remote, { add: page(crypto.randomUUID()) });
        again();
      });
    again();
    await expect(changeFamilyBook(lib.remote, { add: page("late") })).rejects.toThrow(
      /Another device/,
    );
    lib.beforeNextUpload(async () => {});
  });
  it("reads two raced copies together, writes to the smaller id, and removes from both", async () => {
    const a = fakeLibrary(),
      b = fakeLibrary();
    // Two devices each created a family book before seeing the other's.
    await changeFamilyBook(a.remote, { add: page("from-a") });
    await changeFamilyBook(b.remote, { add: page("from-b") });
    const lib = fakeLibrary();
    for (const source of [a, b])
      for (const [id, head] of source.heads) {
        lib.heads.set(id, head);
        lib.raw.set(id, source.raw.get(id)!);
        lib.secrets.set(id, source.secrets.get(id)!);
      }
    expect((await loadFamilyPages(lib.remote)).pages.map((p) => p.id).toSorted()).toEqual(["from-a", "from-b"]);
    const smaller = [...lib.heads.keys()].toSorted()[0];
    const before = lib.heads.get(smaller)!.revision;
    await changeFamilyBook(lib.remote, { add: page("new") });
    expect(lib.heads.get(smaller)!.revision).not.toBe(before);
    // A page in both copies is taken out of both.
    await changeFamilyBook(lib.remote, { add: page("from-a") });
    await changeFamilyBook(lib.remote, { remove: "from-a" });
    await changeFamilyBook(lib.remote, { remove: "from-b" });
    expect((await loadFamilyPages(lib.remote)).pages.map((p) => p.id)).toEqual(["new"]);
  });
  it("never writes into another account book that shares the label", async () => {
    const lib = fakeLibrary();
    await changeFamilyBook(lib.remote, { add: page("a") });
    const [head] = [...lib.heads.values()];
    // Replace the family book's contents with an ordinary adult book.
    const { createVault } = await import("../vault");
    const { envelope } = await createVault(
      { ...emptyBook("Our family book"), profile: { kind: "adult" } },
      await lib.remote.secret(head.id),
    );
    lib.raw.set(head.id, JSON.stringify({ ...envelope, media: [] }));
    expect((await loadFamilyPages(lib.remote)).pages).toEqual([]);
    await expect(changeFamilyBook(lib.remote, { add: page("b") })).rejects.toThrow(
      /couldn’t be read/,
    );
  });
});
