import type { Book } from "./model";

export const journalStyles = {
  sky: { label: "Sky", note: "Room to wander." },
  moss: { label: "Moss", note: "Let it grow wild." },
  blush: { label: "Blush", note: "A little heart on the page." },
} as const;
export type JournalStyle = keyof typeof journalStyles;
export type JournalDraft = {
  id: string;
  title: string;
  text: string;
  style: JournalStyle;
  createdAt: string;
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
    (e.status !== "kept" || !!e.text.trim())
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
  if (status === "kept" && !draft.text.trim())
    throw new Error("Add a few words before keeping this page.");
  const entries = book.journal || [];
  const previous = entries.find((e) => e.id === draft.id);
  if ((previous?.revision || 0) !== expectedRevision)
    throw new Error(
      "This page changed. Reopen its latest version before editing.",
    );
  if (previous?.status === "kept" && status === "draft")
    throw new Error("A kept page cannot become an unfinished draft.");
  const entry: JournalEntry = {
    id: draft.id,
    title: draft.title,
    text: draft.text,
    style: draft.style,
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
