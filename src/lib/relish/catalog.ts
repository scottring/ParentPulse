import { PLAY_RECORD, type BookPage } from "./pages";
import { tools, toolsFor } from "./tools";
import { games } from "./play-content";
import type { NudgeAction } from "./nudges";
import type { Audience } from "./profiles";
import type { Person } from "./model";

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
  if (page.kind === "Made together" || page.kind === PLAY_RECORD)
    return { label: "Game", tone: "clay" };
  if (page.kind === "Received passage") return { label: "Shared", tone: "lilac" };
  if (page.kind === "Exercise") return { label: "Exercise", tone: "sage" };
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

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
/**
 * Family with their own books in the library who aren't noted in this book
 * yet (e.g. a parent's children), so they can still be chosen or tagged.
 */
export function libraryOnly(
  people: { name: string }[],
  family: { name: string }[] = [],
) {
  return family
    .map((f) => f.name.trim())
    .filter((n, i, all) => n && all.findIndex((x) => sameName(x, n)) === i)
    .filter((n) => !people.some((p) => sameName(p.name, n)));
}
/**
 * Notes a family member from the library in this book (as a child), or finds
 * them if they're already there. Returns the book and their id.
 */
export function noteFamily<B extends { people: Person[] }>(
  b: B,
  name: string,
): [B, string] {
  const found = b.people.find((p) => sameName(p.name, name));
  if (found) return [b, found.id];
  const person: Person = {
    id: crypto.randomUUID(),
    name: name.trim(),
    role: "child",
    color: ["rose", "ochre", "sage"][Math.floor(Math.random() * 3)],
    note: "",
    lessons: [],
  };
  return [{ ...b, people: [...b.people, person] }, person.id];
}

export type DoType = "Write" | "Exercise" | "Game" | "Think" | "Habit";
export const doTone: Record<DoType, Tone> = {
  Write: "sun",
  Exercise: "sage",
  Game: "clay",
  Think: "sky",
  Habit: "lilac",
};
export type DoItem = {
  key: string;
  type: DoType;
  time: string;
  title: string;
  blurb: string;
  tags: Tag[];
  action: NudgeAction;
};
// Interleaves kinds so the grid feels mixed rather than sorted by type.
const order = [
  "write",
  "unseen",
  "game:match",
  "think",
  "helps-upset",
  "game:joy",
  "thought-court",
  "hellos",
  "repair",
  "game:story",
  "iceberg",
  "drains-fills",
  "soft-start",
  "thanks-week",
  "load",
  "repair-bingo",
  "kindness-bingo",
];
/** Everything you can do in one place: writing, exercises, games, thinking. */
export function doItems(audience: Audience): DoItem[] {
  const items: DoItem[] = [
    {
      key: "write",
      type: "Write",
      time: "1 min",
      title: "Jot something down",
      blurb: "Type it, say it out loud, or snap a photo.",
      tags: ["1"],
      action: { kind: "journal" },
    },
    {
      key: "think",
      type: "Think",
      time: "3 min",
      title: "Think it through",
      blurb: "Something on your mind? Write down the moment. A small plan is optional.",
      tags: ["hard", "5"],
      action: { kind: "reflect" },
    },
    ...games.map(
      (g): DoItem => ({
        key: `game:${g.kind}`,
        type: "Game",
        time: g.short,
        title: g.title,
        blurb: g.blurb,
        tags: g.tags,
        action: { kind: "game", game: g.kind },
      }),
    ),
    ...toolsFor(audience).map(
      (t): DoItem => ({
        key: t.id,
        type: t.kind === "tracker" ? "Habit" : "Exercise",
        time: t.short,
        title: t.title,
        blurb: t.blurb,
        tags: t.tags,
        action: { kind: "exercise", id: t.id },
      }),
    ),
  ];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  return items.toSorted((a, b) => rank(a.key) - rank(b.key));
}
export const matchesFilter = (item: DoItem, filter: DoFilter) =>
  filter === "all" || item.tags.includes(filter);
