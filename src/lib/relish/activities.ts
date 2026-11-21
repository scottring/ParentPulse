/**
 * Home and Activities (2026-11-21): what Home lists as still going, which
 * activity is featured this week, the situation shelves, the words on each
 * card, and the gentle nudges for a habit that slipped a day.
 *
 * Everything here reads saved state only. Nothing is sent anywhere: a
 * reminder is something Home shows, never a notification, and Relish never
 * nudges anyone else in the family.
 */
import type { Book } from "./model";
import { doItems, gameNames, underWay, type DoItem, type UnderWay } from "./catalog";
import type { Audience } from "./profiles";
import {
  activeTrackers,
  todayKey,
  toolById,
  type TrackerRun,
  type TrackerTool,
} from "./tools";
import { goals, invitationsFor, type GoalId, type PlaceId } from "./family-plan";
import type { GameKind } from "./living";

const DAY = 86_400_000;
/** Untouched this long, something under way leaves Home (Journal and Activities still have it). */
export const STALE_DAYS = 14;
/** From this many idle days, Home says when it was last touched. */
export const IDLE_NOTE_DAYS = 3;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** Whole calendar days between a time and now. */
export function idleDays(iso: string, now = new Date()) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(new Date(at))) / DAY));
}
export type HomeItem = UnderWay & { idle: number };
/**
 * What Home lists as still going: newest first, and only what was touched in
 * the last STALE_DAYS days. Older things stay in Journal and Activities.
 */
export function homeUnderWay(book: Book, now = new Date(), limit = 4): HomeItem[] {
  return underWay(book, 12, now)
    .map((g) => ({ ...g, idle: idleDays(g.at, now) }))
    .filter((g) => g.idle < STALE_DAYS)
    .slice(0, limit);
}
/** "last touched 9 days ago"; nothing for something touched recently. */
export function idleLine(item: Pick<HomeItem, "idle">) {
  if (item.idle < IDLE_NOTE_DAYS) return "";
  return `last touched ${item.idle} days ago`;
}
/** "tucks away into Journal tomorrow", near the end of its time on Home. */
export function leavingLine(item: Pick<HomeItem, "idle" | "kind">) {
  const left = STALE_DAYS - item.idle;
  if (left > 3) return "";
  const where = item.kind === "draft" ? "Journal" : "Activities";
  return left <= 1 ? `moves to ${where} tomorrow` : `moves to ${where} in ${left} days`;
}

// ── Featured this week ──────────────────────────────────────────────────────

/** Monday-started weeks since 1970, in local time. */
export function weekIndex(date = new Date()) {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY,
  );
  // 1970-01-01 was a Thursday: shift so weeks start on Monday.
  return Math.floor((day + 3) / 7);
}
/** The activities that take a turn as this week's featured one (on your own). */
export const featuredMe = [
  "unseen",
  "helps-upset",
  "soft-start",
  "hellos",
  "drains-fills",
  "repair",
  "thanks-week",
  "thought-court",
  "load",
  "kindness-bingo",
  "game:story",
];
/**
 * This week's featured activity to do on your own: the same all week, a different
 * one next week. `shift` is "Show me another". Things already under way are
 * skipped; they have their own row.
 */
export function featuredFor(
  audience: Audience,
  going: Pick<UnderWay, "key">[] = [],
  date = new Date(),
  shift = 0,
): DoItem | undefined {
  const items = doItems(audience);
  const busy = new Set(going.map((g) => g.key));
  const list = featuredMe
    .map((key) => items.find((i) => i.key === key))
    // An adult's features something to do on your own; a child's can be a game.
    .filter((i): i is DoItem => !!i && !busy.has(i.key))
    .filter((i) => audience !== "adult" || i.action.kind !== "game");
  if (!list.length) return undefined;
  return list[(weekIndex(date) + shift) % list.length];
}
/** Its big line and its small one, from the activity's own description. */
export function featuredWords(item: DoItem) {
  const sentences = item.blurb.match(/[^.?!]+[.?!]+["”]?/g) ?? [item.blurb];
  const lead = sentences[0].trim();
  const rest = sentences.slice(1).join(" ").trim();
  return { lead, rest };
}

// ── Cards: what you'll do, with whom, how long, and the action ──────────────

/** The button on each card says what happens next. */
const actionWords: Record<string, string> = {
  write: "Write it down",
  think: "Think it through",
  "helps-upset": "Start sorting",
  "drains-fills": "Sort your week",
  iceberg: "Look underneath",
  load: "See the split",
  "soft-start": "Find your first sentence",
  "thought-court": "Weigh the thought",
  unseen: "Start noticing",
  repair: "Plan what to say",
  hellos: "Start ten hellos",
  "thanks-week": "Start the week",
  "repair-bingo": "Open the bingo card",
  "kindness-bingo": "Open the card",
  "day-highlights": "Ask the three questions",
  "game:story": "Start a story",
};
export function actionLabel(item: Pick<DoItem, "key" | "title" | "action">) {
  if (actionWords[item.key]) return actionWords[item.key];
  if (item.action.kind === "game") return `Play ${item.title}`;
  return "Start";
}
/** The action for something already under way: "Keep sorting", "Mark today". */
export function resumeLabel(g: UnderWay) {
  if (g.kind === "game") return `Resume ${gameNames[g.key.slice(5) as GameKind] ?? "the game"}`;
  if (g.kind === "exercise") {
    const tool = toolById(g.toolId);
    return tool?.kind === "sort" ? "Keep sorting" : "Keep going";
  }
  return g.label;
}
/** Who it's for and roughly how long: only times the activity actually states. */
export function whoLine(item: DoItem, together = isTogether(item)) {
  const time = item.time;
  if (item.action.kind === "game")
    return item.action.game === "spot"
      ? "Everyone in the car · one phone, read aloud"
      : `Two or more · one phone, passed around · ${time}`;
  if (item.key === "day-highlights") return `Everyone in the car · ${time}`;
  if (item.type === "Habit") return `${together ? "Everyone" : "You"} · ${time}`;
  return `You · ${time}`;
}

// ── Shelves by situation ────────────────────────────────────────────────────

/** Done together: games, and activities for the car or the whole family. */
export const isTogether = (item: Pick<DoItem, "type" | "tags" | "key">) =>
  item.type === "Game" ||
  item.tags.includes("trip") ||
  item.key === "kindness-bingo" ||
  item.key === "repair-bingo";

/** A two-week family plan offered as a card. */
export type PlanCard = {
  key: string;
  goal: Exclude<GoalId, "own">;
  place: PlaceId;
  title: string;
  line: string;
  who: string;
  action: string;
};
export function planCard(goal: Exclude<GoalId, "own">, place: PlaceId, action: string): PlanCard {
  const first = invitationsFor(goal, place)[0];
  return {
    key: `plan:${goal}`,
    goal,
    place,
    title: goals[goal].label,
    line: first.charAt(0).toUpperCase() + first.slice(1),
    who: goals[goal].placed ? "Everyone at the table · for two weeks" : "Everyone · for two weeks",
    action,
  };
}
export type Shelf = { id: string; title: string; cards: (DoItem | PlanCard)[] };
export const isPlanCard = (c: DoItem | PlanCard): c is PlanCard => "goal" in c;

/** Activities' segmented filter (2026-11-21): one page, both kinds. */
export type ActsFilter = "all" | "solo" | "together";
export const actsFilters: { id: ActsFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "solo", label: "On my own" },
  { id: "together", label: "Together" },
];
/** Done together: a game, a plan for the family, or a together activity. */
export const togetherCard = (c: DoItem | PlanCard) => isPlanCard(c) || isTogether(c);
/** "On your own" or "Together", on every card. */
export const kindLabel = (c: DoItem | PlanCard) => (togetherCard(c) ? "Together" : "On your own");

/**
 * One set of situation shelves for everyone (Scott, 2026-11-21): each shelf
 * mixes what you do on your own with what you do together, and each card says
 * which. Before this, Just me and Our family had separate shelves.
 */
const shelfList: { id: string; title: string; keys: string[] }[] = [
  { id: "dinner", title: "At dinner", keys: ["game:match", "game:joy", "plan:laughing", "thanks-week"] },
  {
    id: "hard",
    title: "Something felt hard",
    keys: ["repair", "soft-start", "plan:disagree", "repair-bingo", "thought-court", "think"],
  },
  { id: "car", title: "In the car", keys: ["game:spot", "game:story", "day-highlights"] },
  { id: "thin", title: "Feeling stretched thin", keys: ["drains-fills", "load", "helps-upset"] },
  { id: "daily", title: "A small thing each day", keys: ["hellos", "unseen", "kindness-bingo"] },
];
const plans: Record<string, PlanCard> = {
  "plan:laughing": planCard("laughing", "dinner", "Try it at dinner"),
  "plan:disagree": planCard("disagree", "dinner", "Try it this week"),
  "plan:mornings": planCard("mornings", "dinner", "Try it this week"),
  "plan:oneonone": planCard("oneonone", "dinner", "Try it this week"),
};
/**
 * The collection by recognizable situations, narrowed by the filter. Only
 * what this book's age can do appears; anything not on a named shelf is
 * under "More to try", so a child's book (or an adult's) never loses an
 * activity. Plan cards are for an adult's family only.
 */
export function shelvesFor(
  audience: Audience,
  filter: ActsFilter = "all",
  skip: string[] = [],
  { plansOk = audience === "adult" }: { plansOk?: boolean } = {},
): Shelf[] {
  const items = doItems(audience).filter((i) => i.key !== "write" && !skip.includes(i.key));
  const find = (key: string): DoItem | PlanCard | undefined =>
    key.startsWith("plan:") ? (plansOk && !skip.includes(key) ? plans[key] : undefined) : items.find((i) => i.key === key);
  const fits = (c: DoItem | PlanCard) =>
    filter === "all" || (filter === "together") === togetherCard(c);
  const named = shelfList.map((s) => ({
    id: s.id,
    title: s.title,
    cards: s.keys.map(find).filter((c): c is DoItem | PlanCard => !!c),
  }));
  const used = new Set(named.flatMap((s) => s.cards.map((c) => c.key)));
  const rest: (DoItem | PlanCard)[] = items.filter((i) => !used.has(i.key));
  if (plansOk) rest.push(plans["plan:mornings"], plans["plan:oneonone"]);
  return [...named, { id: "more", title: "More to try", cards: rest }]
    .map((s) => ({ ...s, cards: s.cards.filter(fits) }))
    .filter((s) => s.cards.length);
}

// ── A habit that slipped a day ──────────────────────────────────────────────

export type DaysTracker = TrackerTool & { mode: "days"; target: number };
const dayKeyBefore = (now: Date, n: number) =>
  todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12));
function daysRuns(book: Book) {
  return activeTrackers(book).flatMap((run) => {
    const tool = toolById(run.toolId);
    return tool?.kind === "tracker" && tool.mode === "days" && run.marks.length < tool.target
      ? [{ run, tool: tool as DaysTracker }]
      : [];
  });
}
/**
 * A day-by-day habit where yesterday went unmarked and today hasn't been
 * marked yet ("Yesterday slipped by. Today's still yours."). A missed day
 * resets nothing; this only offers today back.
 */
export function missedDay(book: Book, now = new Date()) {
  const today = todayKey(now);
  const yesterday = dayKeyBefore(now, 1);
  return daysRuns(book).find(
    ({ run }) =>
      run.marks.length > 0 &&
      todayKey(new Date(run.startedAt)) < yesterday &&
      !run.marks.some((m) => m.key === today || m.key === yesterday),
  );
}
/** A habit whose "Remind me tonight" time has come, today, and isn't marked yet. */
export function reminderDue(book: Book, now = new Date()) {
  const today = todayKey(now);
  return daysRuns(book).find(
    ({ run }) =>
      !!run.remindAt &&
      Date.parse(run.remindAt) <= now.getTime() &&
      todayKey(new Date(run.remindAt)) === today &&
      !run.marks.some((m) => m.key === today),
  );
}
/** Which of the habit's days are marked, in order: [true, true, false, …]. */
export function markedDays(run: TrackerRun, tool: DaysTracker) {
  return Array.from({ length: tool.target }, (_, i) => i < run.marks.length);
}
