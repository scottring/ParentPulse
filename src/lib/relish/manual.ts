import type { Book } from "./model";
import { bookPages } from "./pages";
import { livingOf } from "./living";
export type ManualScope = "personal" | "family";
export type ManualSource = { id: string; title: string; text: string };
export type ManualIdea = {
  title: string;
  observation: string;
  tryThis: string;
  sourceIds: string[];
};
export type ManualCard = ManualIdea & {
  id: string;
  scope: ManualScope;
  status: "suggested" | "kept" | "dismissed";
  createdAt: string;
  sources: ManualSource[];
};
export type ManualState = {
  automatic: { personal: boolean; family: boolean };
  fingerprints: Partial<Record<ManualScope, string>>;
  cards: ManualCard[];
};
export const manualOf = (book: Book): ManualState =>
  book.manual || {
    automatic: { personal: false, family: false },
    fingerprints: {},
    cards: [],
  };
export function manualSources(book: Book, scope: ManualScope): ManualSource[] {
  const pages =
    scope === "personal"
      ? bookPages(book).map((p) => ({
          id: p.id,
          title: p.title,
          text: [
            p.from ? `From ${p.from}:` : "",
            p.text,
            ...p.sections.map((s) => `${s.label}: ${s.text}`),
          ]
            .filter(Boolean)
            .join("\n"),
        }))
      : [
          ...(book.album || []).map((p) => ({
            id: `album:${p.id}`,
            title: p.title,
            text: p.text,
            date: p.createdAt,
          })),
          ...livingOf(book).sharedPages.map((p) => ({
            id: `game:${p.id}`,
            title: p.title,
            text: p.text,
            date: p.createdAt,
          })),
        ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return pages
    .filter((p) => p.text.trim())
    .slice(-6)
    .map((p) => ({
      id: p.id,
      title: p.title.slice(0, 120),
      text: p.text.slice(0, 1800),
    }));
}
export const sourceSignature = (sources: ManualSource[]) =>
  JSON.stringify(sources);
export async function sourceFingerprint(sources: ManualSource[]) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sourceSignature(sources)),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function isManualSources(
  value: unknown,
  scope: ManualScope,
): value is ManualSource[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 6 &&
    new Set(value.map((s) => s?.id)).size === value.length &&
    value.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        s.id.length <= 150 &&
        (scope !== "family" || /^(album|game):/.test(s.id)) &&
        typeof s.title === "string" &&
        s.title.length <= 120 &&
        typeof s.text === "string" &&
        s.text.trim().length > 0 &&
        s.text.length <= 1800,
    )
  );
}
export function isManualIdeas(
  value: unknown,
  ids: string[],
): value is ManualIdea[] {
  return (
    Array.isArray(value) &&
    value.length <= 3 &&
    value.every(
      (i) =>
        i &&
        typeof i.title === "string" &&
        i.title.length > 0 &&
        i.title.length <= 100 &&
        typeof i.observation === "string" &&
        i.observation.length > 0 &&
        i.observation.length <= 600 &&
        typeof i.tryThis === "string" &&
        i.tryThis.length <= 400 &&
        Array.isArray(i.sourceIds) &&
        i.sourceIds.length > 0 &&
        i.sourceIds.length <= 6 &&
        new Set(i.sourceIds).size === i.sourceIds.length &&
        i.sourceIds.every(
          (id: unknown) => typeof id === "string" && ids.includes(id),
        ),
    )
  );
}
export function isManual(value: unknown): value is ManualState {
  if (!value || typeof value !== "object") return false;
  const m = value as ManualState;
  return (
    !!m.automatic &&
    typeof m.automatic.personal === "boolean" &&
    typeof m.automatic.family === "boolean" &&
    !!m.fingerprints &&
    [m.fingerprints.personal, m.fingerprints.family].every(
      (f) =>
        f === undefined || (typeof f === "string" && /^[a-f0-9]{64}$/.test(f)),
    ) &&
    Array.isArray(m.cards) &&
    m.cards.length <= 500 &&
    new Set(m.cards.map((c) => c?.id)).size === m.cards.length &&
    m.cards.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        c.id.length <= 100 &&
        ["personal", "family"].includes(c.scope) &&
        ["suggested", "kept", "dismissed"].includes(c.status) &&
        Number.isFinite(Date.parse(c.createdAt)) &&
        isManualSources(c.sources, c.scope) &&
        isManualIdeas(
          [c],
          c.sources.map((s) => s.id),
        ),
    )
  );
}
export function addManualIdeas(
  book: Book,
  scope: ManualScope,
  sources: ManualSource[],
  ideas: ManualIdea[],
  fingerprint: string,
): Book {
  if (sourceSignature(manualSources(book, scope)) !== sourceSignature(sources))
    throw new Error(
      "New pages arrived. The guide will read them together next.",
    );
  const manual = manualOf(book);
  if (!manual.automatic[scope] || manual.fingerprints[scope] === fingerprint)
    return book;
  if (
    !isManualIdeas(
      ideas,
      sources.map((s) => s.id),
    )
  )
    throw new Error(
      "These suggestions couldn’t be checked against your pages.",
    );
  const cards = ideas.map((idea) => ({
    ...idea,
    id: crypto.randomUUID(),
    scope,
    status: "suggested" as const,
    createdAt: new Date().toISOString(),
    sources: sources.filter((s) => idea.sourceIds.includes(s.id)),
  }));
  if (manual.cards.length + cards.length > 500)
    throw new Error(
      "Your manual is full. Keep your backup and contact support before adding more suggestions.",
    );
  return {
    ...book,
    manual: {
      ...manual,
      fingerprints: { ...manual.fingerprints, [scope]: fingerprint },
      cards: [...manual.cards, ...cards],
    },
  };
}
export function reviewManualIdea(
  book: Book,
  id: string,
  status: "kept" | "dismissed",
): Book {
  const m = manualOf(book);
  return {
    ...book,
    manual: {
      ...m,
      cards: m.cards.map((c) => (c.id === id ? { ...c, status } : c)),
    },
  };
}
