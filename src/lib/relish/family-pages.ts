/** Pages in Our family book: their shape, checks and the changes made to them. */
import type { Book } from "./model";

export const familyPageKinds = ["passage", "page", "game", "highlights"] as const;
export type FamilyPageKind = (typeof familyPageKinds)[number];
export type FamilyPage = {
  id: string;
  kind: FamilyPageKind;
  title?: string;
  text: string;
  /** Under a passage: who said it and when, e.g. "Kaleb, at bedtime". */
  caption?: string;
  /** Who added it, and from which book (so they can take it out). */
  byName: string;
  byBookId: string;
  /** The activity it came from (a game kind or an exercise id), for its picture. */
  activity?: string;
  /**
   * Who the page @-mentions, by name (mentions.ts). Optional: older pages
   * have none, and "@Name" in the words is read too.
   */
  mentions?: string[];
  /**
   * The private entry it was shared from (an opaque id, never its words), so
   * the writer's own journal can say "One line shared to Our family journal".
   */
  sourceId?: string;
  createdAt: string;
};
export const FAMILY_TEXT_LIMIT = 8000;
const MAX_PAGES = 2000;
const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const optional = (v: unknown, max: number) => v === undefined || str(v, max);

export function isFamilyPage(value: unknown): value is FamilyPage {
  if (!value || typeof value !== "object") return false;
  const p = value as FamilyPage;
  return (
    str(p.id, 100) &&
    !!p.id &&
    familyPageKinds.includes(p.kind) &&
    optional(p.title, 120) &&
    str(p.text, FAMILY_TEXT_LIMIT) &&
    !!p.text.trim() &&
    optional(p.caption, 200) &&
    str(p.byName, 200) &&
    str(p.byBookId, 100) &&
    optional(p.activity, 60) &&
    (p.mentions === undefined ||
      (Array.isArray(p.mentions) &&
        p.mentions.length <= 30 &&
        p.mentions.every((n) => str(n, 80) && !!n.trim()))) &&
    optional(p.sourceId, 100) &&
    typeof p.createdAt === "string" &&
    Number.isFinite(Date.parse(p.createdAt))
  );
}
export function isFamilyPages(value: unknown): value is FamilyPage[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_PAGES &&
    new Set(value.map((p) => p?.id)).size === value.length &&
    value.every(isFamilyPage)
  );
}

/** Pages from several places, one per id, newest first. */
export function mergeFamilyPages(...lists: FamilyPage[][]): FamilyPage[] {
  const seen = new Map<string, FamilyPage>();
  for (const page of lists.flat()) if (!seen.has(page.id)) seen.set(page.id, page);
  return [...seen.values()].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function addFamilyPage<B extends Pick<Book, "familyPages">>(book: B, page: FamilyPage): B {
  if (!isFamilyPage(page)) throw new Error("This page couldn’t be added. Try a shorter passage.");
  const pages = book.familyPages || [];
  if (pages.some((p) => p.id === page.id)) return book;
  if (pages.length >= MAX_PAGES) throw new Error("Our family journal is full.");
  return { ...book, familyPages: [...pages, page] };
}
export function removeFamilyPage<B extends Pick<Book, "familyPages">>(book: B, id: string): B {
  const pages = book.familyPages || [];
  if (!pages.some((p) => p.id === id)) return book;
  return { ...book, familyPages: pages.filter((p) => p.id !== id) };
}
export function newFamilyPage(
  data: Omit<FamilyPage, "id" | "createdAt"> & Partial<Pick<FamilyPage, "id" | "createdAt">>,
): FamilyPage {
  const page: FamilyPage = {
    ...data,
    id: data.id ?? crypto.randomUUID(),
    createdAt: data.createdAt ?? new Date().toISOString(),
    text: data.text.trim().slice(0, FAMILY_TEXT_LIMIT),
  };
  for (const key of ["title", "caption", "activity", "sourceId"] as const)
    if (!page[key]?.trim()) delete page[key];
  if (!page.mentions?.length) delete page.mentions;
  return page;
}
