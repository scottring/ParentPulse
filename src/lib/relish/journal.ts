import { isPhotos, type Photo } from "./photos";
import type { Book } from "./model";

export const journalStyles = {
  sky: { label: "Sky", note: "Room to wander." },
  moss: { label: "Moss", note: "Let it grow wild." },
  blush: { label: "Blush", note: "A little heart on the page." },
} as const;
export type JournalStyle = keyof typeof journalStyles;
/** Where a page came from, when it wasn't written freehand. Optional: older pages have none. */
export type JournalSource = {
  kind: "exercise";
  toolId: string;
  /** Day's highlights: the trip it belongs to, so later days number on. */
  trip?: string;
  /** Day's highlights: where the family was that day. */
  place?: string;
};
/** A trip or place name on an exercise page. */
export const SOURCE_NAME_LIMIT = 60;
const sourceName = (v: unknown) =>
  v === undefined ||
  (typeof v === "string" && !!v.trim() && v.length <= SOURCE_NAME_LIMIT);
export type JournalDraft = {
  id: string;
  title: string;
  text: string;
  style: JournalStyle;
  createdAt: string;
  photos?: Photo[];
  people?: string[];
  source?: JournalSource;
};
export type JournalEntry = JournalDraft & {
  updatedAt: string;
  revision: number;
  status: "draft" | "kept";
};
export const JOURNAL_TEXT_LIMIT = 50_000;
export const JOURNAL_TITLE_LIMIT = 120;
const validDate = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
// A removed exercise must never stop a book from opening, so any short id is accepted.
const isSource = (v: unknown): v is JournalSource =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (v as JournalSource).kind === "exercise" &&
  typeof (v as JournalSource).toolId === "string" &&
  (v as JournalSource).toolId.length > 0 &&
  (v as JournalSource).toolId.length <= 100 &&
  sourceName((v as JournalSource).trip) &&
  sourceName((v as JournalSource).place);
function isDraft(value: unknown): value is JournalDraft {
  if (!value || typeof value !== "object") return false;
  const e = value as JournalDraft;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    e.id.length <= 100 &&
    typeof e.title === "string" &&
    e.title.length <= JOURNAL_TITLE_LIMIT &&
    typeof e.text === "string" &&
    e.text.length <= JOURNAL_TEXT_LIMIT &&
    ["sky", "moss", "blush"].includes(e.style) &&
    (e.photos === undefined || isPhotos(e.photos)) &&
    (e.source === undefined || isSource(e.source)) &&
    (e.people === undefined ||
      (Array.isArray(e.people) &&
        e.people.length <= 30 &&
        new Set(e.people).size === e.people.length &&
        e.people.every((id) => typeof id === "string" && id.length <= 100))) &&
    validDate(e.createdAt)
  );
}
function isEntry(value: unknown): value is JournalEntry {
  if (!isDraft(value)) return false;
  const e = value as JournalEntry;
  return (
    validDate(e.updatedAt) &&
    Number.isSafeInteger(e.revision) &&
    e.revision > 0 &&
    ["draft", "kept"].includes(e.status) &&
    (e.status !== "kept" || !!e.text.trim() || !!e.photos?.length)
  );
}
export function isJournal(value: unknown): value is JournalEntry[] {
  return (
    Array.isArray(value) &&
    value.every(isEntry) &&
    new Set(value.map((e) => e.id)).size === value.length
  );
}
export function newJournalDraft(): JournalDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    text: "",
    style: "sky",
    createdAt: new Date().toISOString(),
  };
}
export function writeJournalPage(
  book: Book,
  draft: JournalDraft,
  expectedRevision: number,
  status: JournalEntry["status"],
): Book {
  if (!isDraft(draft) || !["draft", "kept"].includes(status))
    throw new Error("This journal page could not be saved.");
  if (status === "kept" && !draft.text.trim() && !draft.photos?.length)
    throw new Error("Add a few words or a photo before keeping this page.");
  const entries = book.journal || [];
  const previous = entries.find((e) => e.id === draft.id);
  if ((previous?.revision || 0) !== expectedRevision)
    throw new Error(
      "This page changed. Reopen its latest version before editing.",
    );
  if (previous?.status === "kept" && status === "draft")
    throw new Error("A kept page cannot become an unfinished draft.");
  // Where a page came from never changes once it is saved.
  const source = previous ? previous.source : draft.source;
  const entry: JournalEntry = {
    id: draft.id,
    title: draft.title,
    text: draft.text,
    style: draft.style,
    photos: draft.photos?.map((p) => ({ ...p })),
    people: draft.people?.filter((id) => book.people.some((p) => p.id === id)),
    ...(source ? { source: { ...source } } : {}),
    createdAt: previous?.createdAt || draft.createdAt,
    updatedAt: new Date().toISOString(),
    revision: expectedRevision + 1,
    status,
  };
  return {
    ...book,
    journal: previous
      ? entries.map((e) => (e.id === entry.id ? entry : e))
      : [...entries, entry],
  };
}
/** Renames a kept or draft page without touching its words, photos or tags. */
export function renameJournalPage(book: Book, id: string, title: string): Book {
  const next = title.trim();
  if (next.length > JOURNAL_TITLE_LIMIT)
    throw new Error(`Keep the title under ${JOURNAL_TITLE_LIMIT} characters.`);
  const entries = book.journal || [];
  const previous = entries.find((e) => e.id === id);
  if (!previous) throw new Error("This page could not be found.");
  if (previous.title === next) return book;
  const entry: JournalEntry = {
    ...previous,
    title: next,
    updatedAt: new Date().toISOString(),
    revision: previous.revision + 1,
  };
  return {
    ...book,
    journal: entries.map((e) => (e.id === id ? entry : e)),
  };
}
