import type { Book } from "./model";
import { livingOf, type GameKind } from "./living";
import type { JournalEntry } from "./journal";
import { audienceOf, type Audience } from "./profiles";
import { exerciseProgress, exerciseRunFor, runningByTool, runsStatus, todayKey } from "./tools";

// "Try this today": a hand-written, rotating list of small suggestions.
// No AI. Each one is fitted to the book's age range and opens an existing flow.

export type NudgeAction =
  | { kind: "journal" }
  | { kind: "exercise"; id: string }
  | { kind: "game"; game: GameKind }
  | { kind: "reflect" };
export type Nudge = {
  id: string;
  /** A short name for the kids' Home banner, e.g. "Kindness spotting". */
  title?: string;
  text: string;
  why: string;
  time: string;
  cta: string;
  action: NudgeAction;
};
type Template = Omit<Nudge, "text"> & {
  audiences: Audience[];
  /** Uses {name} for one of the people in this family, when we know one. */
  withName?: string;
  /** Used when no names are known. */
  text: string;
};

const adult: Audience[] = ["adult"];
const teen: Audience[] = ["13-17"];
const tween: Audience[] = ["9-12"];
const young: Audience[] = ["6-8"];
const little: Audience[] = ["under-6"];

export const nudgeTemplates: Template[] = [
  // Adults
  {
    id: "best-weirdest",
    audiences: adult,
    time: "About 2 minutes",
    withName:
      "At dinner, ask {name}: what was the best part of today, and the weirdest?",
    text: "At dinner, ask: what was the best part of today, and the weirdest?",
    why: "Two questions, no follow-up needed. Jot down whatever comes back.",
    cta: "Jot down the answer",
    action: { kind: "journal" },
  },
  {
    id: "made-you-laugh",
    audiences: adult,
    time: "About 1 minute",
    withName: "Write down one thing {name} did this week that made you laugh.",
    text: "Write down one thing someone did this week that made you laugh.",
    why: "Small, specific moments are what you will want to remember later.",
    cta: "Write it now",
    action: { kind: "journal" },
  },
  {
    id: "same-page-tonight",
    audiences: adult,
    time: "About 5–10 minutes",
    text: "Play “Same page?” tonight: five quick questions, answered in private.",
    why: "See where you match and where you don’t. Passing is always allowed.",
    cta: "Set up the game",
    action: { kind: "game", game: "match" },
  },
  {
    id: "unseen-work",
    audiences: adult,
    time: "About 2 minutes",
    text: "Name one thing someone at home does that nobody thanks them for.",
    why: "Noticing the invisible work is often the start of sharing it.",
    cta: "Try the exercise",
    action: { kind: "exercise", id: "unseen" },
  },
  {
    id: "hard-moment",
    audiences: adult,
    time: "About 3 minutes",
    text: "Did something happen today that you keep thinking about? Write it down.",
    why: "Pick what happened and write a sentence or two. You can stop there.",
    cta: "Think it through",
    action: { kind: "reflect" },
  },
  {
    id: "soft-opener",
    audiences: adult,
    time: "About 3 minutes",
    text: "Got something hard to say? Rewrite the first sentence before you say it.",
    why: "How a conversation starts shapes how it goes.",
    cta: "Rewrite the opener",
    action: { kind: "exercise", id: "soft-start" },
  },
  {
    id: "small-joy-game",
    audiences: adult,
    time: "About 5 minutes",
    withName: "Ask {name} to play “Guess my small joy” after school.",
    text: "Play “Guess my small joy” with someone at home.",
    why: "Guessing what makes someone happy is a quiet way of paying attention.",
    cta: "Set up the game",
    action: { kind: "game", game: "joy" },
  },
  {
    id: "real-hello",
    audiences: adult,
    time: "Under a minute a day",
    text: "Make the next hello last long enough to land: eyes up, a real smile.",
    why: "Ten real hellos is a small habit that changes how a house feels.",
    cta: "Start ten real hellos",
    action: { kind: "exercise", id: "hellos" },
  },
  // Ages 13–17
  {
    id: "teen-upset",
    title: "What helps",
    audiences: teen,
    time: "About 3 minutes",
    text: "Sort what actually helps when you’re upset, and what doesn’t.",
    why: "Knowing your own list makes rough days a bit easier to handle.",
    cta: "Start sorting",
    action: { kind: "exercise", id: "helps-upset" },
  },
  {
    id: "teen-trial",
    title: "Thought on trial",
    audiences: teen,
    time: "About 4 minutes",
    text: "Put one harsh thought about yourself on trial.",
    why: "Weigh the evidence, then write a fairer version. Nobody else sees it.",
    cta: "Open the courtroom",
    action: { kind: "exercise", id: "thought-court" },
  },
  {
    id: "teen-write",
    title: "One thing to remember",
    audiences: teen,
    time: "About 1 minute",
    text: "Write down one thing from today you’d want to remember in a year.",
    why: "It can be tiny. Tiny is usually what we forget first.",
    cta: "Write it now",
    action: { kind: "journal" },
  },
  {
    id: "teen-thanks",
    title: "Specific thanks",
    audiences: teen,
    time: "About a minute a day",
    text: "Thank someone for something specific today.",
    why: "Specific thanks land better than a general one.",
    cta: "Start a week of thanks",
    action: { kind: "exercise", id: "thanks-week" },
  },
  // Ages 9–12
  {
    id: "tween-write",
    title: "Best part of the day",
    audiences: tween,
    time: "About 1 minute",
    text: "What was the best part of your day? Write it, say it, or add a photo.",
    why: "Your journal keeps it safe for later.",
    cta: "Write it now",
    action: { kind: "journal" },
  },
  {
    id: "tween-drains",
    title: "Drains and fills",
    audiences: tween,
    time: "About 4 minutes",
    text: "Sort your week: what gave you energy, and what wore you out?",
    why: "It helps to know what fills you up.",
    cta: "Start sorting",
    action: { kind: "exercise", id: "drains-fills" },
  },
  {
    id: "tween-story",
    title: "One story, many voices",
    audiences: tween,
    time: "About 10 minutes",
    text: "Build a silly story with your family. Everyone adds a part.",
    why: "No right answers. Anyone can pass.",
    cta: "Set up the game",
    action: { kind: "game", game: "story" },
  },
  {
    id: "tween-kindness",
    title: "Kindness spotting",
    audiences: tween,
    time: "About a week",
    text: "See someone do something kind? Save it here.",
    why: "Mark a square each time you spot one. The more you look, the more you see.",
    cta: "Start spotting",
    action: { kind: "exercise", id: "kindness-bingo" },
  },
  // Ages 6–8
  {
    id: "young-write",
    title: "Something that made you smile",
    audiences: young,
    time: "About 1 minute",
    text: "What made you smile today? Draw it, say it, or write it.",
    why: "A grown-up can help with the words.",
    cta: "Make a page",
    action: { kind: "journal" },
  },
  {
    id: "young-joy",
    title: "Guess my small joy",
    audiences: young,
    time: "About 5 minutes",
    text: "Play “Guess my small joy” with your family.",
    why: "Can they guess what you’d pick?",
    cta: "Set up the game",
    action: { kind: "game", game: "joy" },
  },
  {
    id: "young-upset",
    title: "What helps",
    audiences: young,
    time: "About 3 minutes",
    text: "What helps when you feel upset? Let’s sort some ideas.",
    why: "Then you’ll have your own list for tricky days.",
    cta: "Start sorting",
    action: { kind: "exercise", id: "helps-upset" },
  },
  {
    id: "young-kindness",
    title: "Kindness spotting",
    audiences: young,
    time: "About a week",
    text: "See someone do something kind? Save it here.",
    why: "Mark a square each time you see someone being kind.",
    cta: "Start spotting",
    action: { kind: "exercise", id: "kindness-bingo" },
  },
  // Under 6, with a grown-up
  {
    id: "little-story",
    title: "Story time",
    audiences: little,
    time: "About 5 minutes",
    text: "Make a story together. Everyone picks what happens next.",
    why: "A grown-up reads. Anyone can pass.",
    cta: "Set up the game",
    action: { kind: "game", game: "story" },
  },
  {
    id: "little-page",
    title: "A photo from today",
    audiences: little,
    time: "About 1 minute",
    text: "Add a photo of something you played with today.",
    why: "A grown-up can write down what you say about it.",
    cta: "Make a page",
    action: { kind: "journal" },
  },
  {
    id: "little-upset",
    title: "What helps",
    audiences: little,
    time: "About 3 minutes",
    text: "What helps when you feel sad or cross? Let’s sort it together.",
    why: "A grown-up reads each card out loud.",
    cta: "Start sorting",
    action: { kind: "exercise", id: "helps-upset" },
  },
];

/** The suggestions that fit this book, with a family name filled in when known. */
export function nudgesFor(book: Book, names: string[] = []): Nudge[] {
  const audience = audienceOf(book);
  const known = names.map((n) => n.trim()).filter(Boolean);
  let n = 0;
  return nudgeTemplates
    .filter((t) => t.audiences.includes(audience))
    .map((t) => ({
      id: t.id,
      ...(t.title ? { title: t.title } : {}),
      why: t.why,
      time: t.time,
      cta: t.cta,
      action: t.action,
      text:
        t.withName && known.length
          ? t.withName.replace("{name}", known[n++ % known.length])
          : t.text,
    }));
}

/** Rotates daily so Home opens on a different suggestion each day. */
export function nudgeStart(count: number, date = new Date()) {
  if (count <= 0) return 0;
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return day % count;
}

// ── What became of today's suggestion ───────────────────────────────────────
// Scott, 2026-11-20: he wrote something for "one thing Ella did this week that
// made you laugh", reloaded, and the card showed no sign of it. Home now
// remembers which suggestion was taken today and the page it started.

/** Today's suggestion, once acted on: which one, and the journal page it opened. */
export type SuggestionTaken = { day: string; id: string; journalId?: string };
export function isSuggestionTaken(v: unknown): v is SuggestionTaken {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as SuggestionTaken;
  return (
    typeof s.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s.day) &&
    typeof s.id === "string" &&
    s.id.length > 0 &&
    s.id.length <= 100 &&
    (s.journalId === undefined ||
      (typeof s.journalId === "string" && s.journalId.length > 0 && s.journalId.length <= 100))
  );
}
export function takeSuggestion(book: Book, id: string, journalId?: string, now = new Date()): Book {
  return { ...book, suggestion: { day: todayKey(now), id, ...(journalId ? { journalId } : {}) } };
}
/** The suggestion acted on today, so Home keeps showing it rather than rotating away. */
export function takenToday(book: Book, now = new Date()) {
  const s = book.suggestion;
  return s && s.day === todayKey(now) ? s : undefined;
}

export type NudgeStatus =
  | { state: "start" }
  | { state: "draft"; entry: JournalEntry }
  | { state: "going"; detail?: string }
  | { state: "done"; entry?: JournalEntry; pageId?: string; played?: boolean };

const onDay = (iso: string, now: Date) => todayKey(new Date(iso)) === todayKey(now);

/** Whether today's suggestion is untouched, under way, or done, from saved state only. */
export function nudgeStatus(book: Book, nudge: Nudge, now = new Date()): NudgeStatus {
  const a = nudge.action;
  if (a.kind === "journal") {
    const taken = takenToday(book, now);
    if (taken?.id !== nudge.id || !taken.journalId) return { state: "start" };
    const entry = (book.journal || []).find((e) => e.id === taken.journalId);
    if (!entry) return { state: "start" };
    if (entry.status === "kept") return { state: "done", entry, pageId: `journal:${entry.id}` };
    return entry.text.trim() || entry.photos?.length ? { state: "draft", entry } : { state: "start" };
  }
  if (a.kind === "exercise") {
    const kept = (book.journal || [])
      .filter(
        (e) =>
          e.status === "kept" &&
          e.source?.kind === "exercise" &&
          e.source.toolId === a.id &&
          onDay(e.createdAt, now),
      )
      .at(-1);
    if (kept) return { state: "done", entry: kept, pageId: `journal:${kept.id}` };
    const run = exerciseRunFor(book, a.id);
    if (run) return { state: "going", detail: exerciseProgress(book, run) };
    const habit = runningByTool(book).find((r) => r.toolId === a.id);
    if (habit) return { state: "going", detail: runsStatus(book, habit.runs) };
    return { state: "start" };
  }
  if (a.kind === "game") {
    const l = livingOf(book);
    const played = (l.plays || [])
      .filter((r) => r.kind === a.game && onDay(r.playedAt, now))
      .at(-1);
    if (played) {
      const shared = played.pageId && l.sharedPages.some((p) => p.id === played.pageId);
      return {
        state: "done",
        played: true,
        pageId: shared ? `game:${played.pageId}` : `play:${played.id}`,
      };
    }
    if (l.game && l.game.kind === a.game && l.game.stage !== "finished")
      return { state: "going" };
  }
  return { state: "start" };
}
