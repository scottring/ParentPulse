import type { BookPage } from "./pages";
import { tools } from "./tools";

// Shared vocabulary for the four places: the "Do something" filters and the
// color-coded kinds that label things to do and pages kept.

export type DoFilter = "all" | "1" | "5" | "kids" | "hard";
export const doFilters: { id: DoFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "1", label: "1 minute" },
  { id: "5", label: "5 minutes" },
  { id: "kids", label: "With the kids" },
  { id: "hard", label: "Something’s hard" },
];
export type Tag = Exclude<DoFilter, "all">;

/** Color families from the approved mockups. */
export type Tone = "sun" | "sage" | "clay" | "sky" | "lilac";

export type PageKind = {
  label: "Journal" | "Exercise" | "Game" | "Reflection" | "Shared" | "Photo";
  tone: Tone;
};
const isExercisePage = (title: string) =>
  tools.some((t) => title === t.title || title.startsWith(`${t.title} · `));

/** How a kept page is labeled and colored in Home and Your book. */
export function pageKind(page: BookPage): PageKind {
  if (page.kind === "Made together") return { label: "Game", tone: "clay" };
  if (page.kind === "Received passage") return { label: "Shared", tone: "lilac" };
  if (page.kind === "Journal entry") {
    if (isExercisePage(page.title)) return { label: "Exercise", tone: "sage" };
    if (!page.text.trim() && page.photos.length)
      return { label: "Photo", tone: "sky" };
    return { label: "Journal", tone: "sun" };
  }
  return { label: "Reflection", tone: "sky" };
}

type Role = { role: string };
const childRoles = ["child", "son", "daughter", "kid"];
const familyRoles = [
  ...childRoles,
  "partner",
  "parent",
  "sibling",
  "mother",
  "father",
  "spouse",
  "wife",
  "husband",
];
/** People noted in a book who are the writer's children. */
export const isChild = (p: Role) =>
  childRoles.includes(p.role.trim().toLowerCase());
/** People noted in a book who are close family (used to pre-fill games). */
export const isFamily = (p: Role) =>
  familyRoles.includes(p.role.trim().toLowerCase());
