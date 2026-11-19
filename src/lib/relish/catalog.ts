import { PLAY_RECORD, type BookPage } from "./pages";
import {
  DAY_TOOL,
  dayStatus,
  runningByTool,
  runsStatus,
  todayKey,
  toolById,
  tools,
  toolsFor,
  toolsOf,
} from "./tools";
import { games } from "./play-content";
import { livingOf, type GameKind } from "./living";
import type { JournalEntry } from "./journal";
import type { NudgeAction } from "./nudges";
import type { Audience } from "./profiles";
import type { Book, Person } from "./model";

// Shared vocabulary for the four places: the "Do something" filters and the
// color-coded kinds that label things to do and pages kept.

export type DoFilter = "all" | "1" | "5" | "kids" | "trip" | "hard";
export const doFilters: { id: DoFilter; label: string }[] = [
  { id: "all", label: "All activities" },
  { id: "1", label: "1 min or less" },
  { id: "5", label: "5 min or less" },
  { id: "kids", label: "With the kids" },
  { id: "trip", label: "Road trip" },
  { id: "hard", label: "Something’s hard" },
];
/** Mood filters an activity is tagged with. Time filters read its time label. */
export type Tag = Exclude<DoFilter, "all" | "1" | "5">;

/**
 * An activity's time label, read. `min`/`max` are minutes for one sitting, or
 * for a habit the time each day (or each time it comes up); both are absent
 * when the length is open ("any length"). A habit also says how long it runs.
 */
export type Duration = {
  min?: number;
  max?: number;
  each?: "day" | "time";
  days?: { min: number; max: number };
};
type Range = { min: number; max: number };
const range = (m: RegExpMatchArray, scale = 1): Range | null => {
  const lo = Number(m[1]) * scale,
    hi = (m[2] ? Number(m[2]) : Number(m[1])) * scale;
  return hi >= lo ? { min: lo, max: hi } : null;
};
/** "3 min", "5–10 min", "under a minute", "any length" (an open length: {}). */
function sitting(s: string): Range | Record<string, never> | null {
  if (s === "any length") return {};
  if (s === "under a minute" || s === "a moment") return { min: 0, max: 1 };
  if (s === "about a minute" || s === "a minute") return { min: 1, max: 1 };
  const m = s.match(/^(\d+)(?:\s*[–—-]\s*(\d+))?\s*(?:min|mins|minutes?)$/);
  return m ? range(m) : null;
}
/** "10 days", "1–2 weeks", "about a week". */
function span(s: string): Range | null {
  if (s === "a week" || s === "about a week") return { min: 7, max: 7 };
  const m = s.match(/^(\d+)(?:\s*[–—-]\s*(\d+))?\s*(days?|weeks?)$/);
  return m ? range(m, m[3].startsWith("week") ? 7 : 1) : null;
}
/**
 * Reads a card's time label: "3 min", "5–10 min", "any length", or a habit's
 * "under a minute a day, 10 days" / "a moment each time, 1–2 weeks". Returns
 * null for a label it doesn't understand, which no time filter then matches.
 */
export function parseTime(label: string): Duration | null {
  const parts = label.trim().toLowerCase().replace(/\s+/g, " ").split(/\s*,\s*/);
  if (parts.length === 1) return sitting(parts[0]);
  if (parts.length !== 2) return null;
  const per = parts[0].match(/^(.+) (a day|each time)$/);
  const each = per && sitting(per[1]);
  const days = span(parts[1]);
  if (!per || !each || !("max" in each) || !days) return null;
  return { ...each, each: per[2] === "a day" ? "day" : "time", days };
}
/** Whether an activity takes no more than `minutes` (a habit: each day). */
export const fitsWithin = (d: Duration | null, minutes: number) =>
  d?.max !== undefined && d.max <= minutes;

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
export type DoItem = {
  key: string;
  type: DoType;
  /** The time shown on the card, e.g. "3 min"; the time filters read this. */
  time: string;
  duration: Duration | null;
  title: string;
  blurb: string;
  /** One sentence on a Do something card: the moment you'd reach for it. */
  line: string;
  tags: Tag[];
  action: NudgeAction;
};
/**
 * Do something's card sentences, by item key: when you'd reach for it, in
 * about twelve words. Longer blurbs stay with each activity.
 */
export const doLines: Record<string, string> = {
  write: "Something worth keeping just happened? Get it down in a minute.",
  think: "Replay a moment that didn’t go how you wanted.",
  "game:match": "Around the table? Find out how well you know each other.",
  "game:joy": "A slow evening together? Guess each other’s small joys.",
  "game:story": "Need a laugh together? Build a silly story, one part each.",
  "game:spot": "Long drive? Be first to spot things out the window.",
  "helps-upset": "Upset and not sure what helps? Find one thing to try.",
  "drains-fills": "Week feeling heavy? Find one thing to shrink and one to grow.",
  iceberg: "A behavior keeps frustrating you? Look for what’s underneath.",
  load: "Feel like you carry more at home? See the split.",
  "soft-start": "Have a hard conversation coming up? Find a first sentence.",
  "thought-court": "Can’t shake a harsh thought about yourself? Weigh the evidence.",
  unseen: "Someone keeps things running quietly? Find the words to thank them.",
  repair: "Find the words for a conversation you want to try again.",
  hellos: "Comings and goings feel rushed? Make one hello a day land.",
  "thanks-week": "Thank-yous feeling automatic? Make one specific each day.",
  "repair-bingo": "Tense moments keep coming? Track which repair moves actually help.",
  "kindness-bingo": "Spot the kind things your family does this week.",
  "day-highlights": "End of a driving day? Everyone shares the best and hardest parts.",
};
/** Card times read as part of a line: "Any length" → "any length". */
const cardTime = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
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
  "game:spot",
  "iceberg",
  "drains-fills",
  "soft-start",
  "thanks-week",
  "day-highlights",
  "load",
  "repair-bingo",
  "kindness-bingo",
];
type ItemSource = Omit<DoItem, "duration" | "line">;
/** Everything you can do in one place: writing, exercises, games, thinking. */
export function doItems(audience: Audience): DoItem[] {
  const items: ItemSource[] = [
    {
      key: "write",
      type: "Write",
      time: "1 min",
      title: "Jot something down",
      blurb: "Type it, say it out loud, or snap a photo.",
      tags: [],
      action: { kind: "journal" },
    },
    {
      key: "think",
      type: "Think",
      time: "3 min",
      title: "Think it through",
      blurb: "Something on your mind? Write down the moment. A small plan is optional.",
      tags: ["hard"],
      action: { kind: "reflect" },
    },
    ...games.map(
      (g): ItemSource => ({
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
      (t): ItemSource => ({
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
  return items
    .map((item): DoItem => {
      const time = cardTime(item.time);
      return {
        ...item,
        time,
        duration: parseTime(time),
        line: doLines[item.key] ?? item.blurb,
      };
    })
    .toSorted((a, b) => rank(a.key) - rank(b.key));
}
/** Time filters read the card's time label; mood filters read the tags. */
export function matchesFilter(item: DoItem, filter: DoFilter) {
  if (filter === "all") return true;
  if (filter === "1" || filter === "5") return fitsWithin(item.duration, Number(filter));
  return item.tags.includes(filter);
}
/** "Game · 5–10 min", "Habit · under a minute a day, 10 days". */
export const doLabel = (item: DoItem) => `${item.type} · ${item.time}`;

// ── Pick up where you left off ─────────────────────────────────────────────

export const gameNames: Record<GameKind, string> = {
  joy: "Guess my small joy",
  story: "One story, many voices",
  match: "Same page?",
  spot: "Spot it!",
};
/**
 * Something under way in this book, with what continuing it does. `key` is
 * the Do something item it continues, when there is one.
 */
export type UnderWay = {
  key: string;
  title: string;
  /** A few words on where it stands: "4 of 10", "Leo’s turn". */
  detail?: string;
  /** The link's words: "Resume game", "Continue writing", "Mark today". */
  label: string;
  at: string;
} & (
  | { kind: "game" }
  | { kind: "visit" }
  | { kind: "draft"; draft: JournalEntry }
  | { kind: "habit" | "day"; toolId: string }
);
const draftTitle = (d: JournalEntry) => {
  const words = d.title.trim() || d.text.trim().split("\n")[0];
  if (!words) return "Your unfinished page";
  return words.length > 32 ? `${words.slice(0, 30).trimEnd()}…` : words;
};
/**
 * What this book has under way, newest first and at most `limit`: an
 * unfinished game, a paused guided reflection, the newest journal draft,
 * Day’s highlights partway, and running habits. Built from saved state only.
 */
export function underWay(book: Book, limit = 4, now = new Date()): UnderWay[] {
  const found: UnderWay[] = [];
  const l = livingOf(book);
  if (l.game && l.game.stage !== "finished")
    found.push({
      kind: "game",
      key: `game:${l.game.kind}`,
      title: gameNames[l.game.kind],
      label: "Resume game",
      at: l.game.updatedAt,
    });
  if (l.visit && l.visit.status !== "complete")
    found.push({
      kind: "visit",
      key: "think",
      title: "Think it through",
      label: "Continue writing",
      at: l.visit.updatedAt,
    });
  const draft = (book.journal || [])
    .filter((e) => e.status === "draft")
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (draft)
    found.push({
      kind: "draft",
      key: "write",
      draft,
      title: draftTitle(draft),
      label: "Keep writing",
      at: draft.updatedAt,
    });
  const day = toolsOf(book).day;
  if (day)
    found.push({
      kind: "day",
      key: DAY_TOOL,
      toolId: DAY_TOOL,
      title: toolById(DAY_TOOL)?.title ?? "Day’s highlights",
      detail: dayStatus(day),
      label: "Continue",
      at: day.updatedAt,
    });
  const today = todayKey(now);
  for (const { toolId, runs } of runningByTool(book)) {
    const tool = toolById(toolId);
    if (!tool || tool.kind !== "tracker") continue;
    const due =
      tool.mode === "days" &&
      runs.some(
        (r) => r.marks.length < tool.target && !r.marks.some((m) => m.key === today),
      );
    const at = runs
      .flatMap((r) => [r.startedAt, ...r.marks.map((m) => m.at)])
      .reduce((a, b) => (b > a ? b : a), "");
    found.push({
      kind: "habit",
      key: toolId,
      toolId,
      title: tool.title,
      detail: runsStatus(book, runs),
      label: due ? "Mark today" : "Continue",
      at,
    });
  }
  return found.toSorted((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
/**
 * Whether a Do something card would only reopen what the resume row already
 * shows. A game or a journal page can start fresh; a paused reflection, a
 * running habit or a day partway through just reopens.
 */
export const onlyReopens = (item: DoItem, going: UnderWay[]) =>
  going.some((g) => g.key === item.key && g.kind !== "game" && g.kind !== "draft");
