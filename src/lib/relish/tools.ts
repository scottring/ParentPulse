import type { Book } from "./model";
import { writeJournalPage, JOURNAL_TITLE_LIMIT, SOURCE_NAME_LIMIT } from "./journal";
import { isAudience, type Audience } from "./profiles";
import type { DayQuestion } from "./play-content";
import type { Tag } from "./catalog";
import { outcomes, type Outcome } from "./living";

// Interactive exercises: card sorts, sentence builders and day-by-day trackers.
// A finished exercise becomes an ordinary kept journal page, so it appears in
// Your pages, syncs with the book and follows the existing analysis consent.
// Only multi-day trackers keep their own state between visits.

const kids: Audience[] = ["under-6", "6-8", "9-12", "13-17"];
const everyone: Audience[] = [...kids, "adult"];

type Base = {
  id: string;
  title: string;
  blurb: string;
  time: string;
  end: string;
  audiences: Audience[];
  /** Filters in Do something: "1" and "5" minutes, "kids", "hard". */
  tags: Tag[];
  /** Compact time for cards, e.g. "3 min". */
  short: string;
  aboutPerson?: { label: string; required?: boolean };
};
export type Pile = { id: string; label: string };
export type SortTool = Base & {
  kind: "sort";
  subject?: { label: string; placeholder: string };
  piles: Pile[];
  cards: (audience: Audience) => string[];
  picks: { pile: string; label: string }[];
  closing?: string;
};
export type Field = {
  id: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  optional?: boolean;
};
export type BuilderTool = Base & {
  kind: "builder";
  fields: Field[];
  verdict?: { label: string; choices: string[] };
  compose: (values: Record<string, string>) => string;
  composeLabel: string;
  checks?: (values: Record<string, string>) => { ok: boolean; text: string }[];
};
export type TrackerTool = Base & {
  kind: "tracker";
  instruction: string;
  /** How long it might keep going, apart from today's effort in `time`. */
  span: string;
} & (
    | {
        mode: "days";
        target: number;
        notePrompt?: string;
        /** Said when the last day is marked: "Ten hellos" → "Ten hellos with Kaleb." */
        doneLine?: string;
      }
    | { mode: "squares"; squares: string[] }
  );
/** Day's highlights: the same three questions for each person in the car. */
export type HighlightsTool = Base & {
  kind: "highlights";
  questions: { id: DayQuestion; ask: string; label: string }[];
};
export type Tool = SortTool | BuilderTool | TrackerTool | HighlightsTool;

const clean = (v: string | undefined) => (v || "").trim().replace(/[.\s]+$/, "");
const blamey = /\byou (always|never)\b/i;

export const tools: Tool[] = [
  {
    kind: "sort",
    id: "helps-upset",
    tags: ["5"],
    short: "3 min",
    title: "What helps when I’m upset",
    blurb: "Sort what helps when you’re upset. You’ll leave with your own list and one thing to try first.",
    time: "About 3 minutes",
    end: "Sort the cards, choose one to try first, then keep the page.",
    audiences: everyone,
    piles: [
      { id: "helps", label: "Helps me" },
      { id: "sometimes", label: "Sometimes" },
      { id: "no", label: "Doesn’t help" },
    ],
    cards: (a) =>
      a === "adult"
        ? [
            "Being left alone for a while",
            "Talking it through",
            "A hug or a hand on my shoulder",
            "Moving my body",
            "Writing it down",
            "Being asked what I need",
            "Someone fixing the problem",
            "A distraction or a joke",
            "Music",
            "Something to eat or drink",
          ]
        : [
            "A hug",
            "Some quiet time alone",
            "Talking about it",
            "Drawing or writing",
            "Moving my body",
            "A snack or a drink",
            "A grown-up sitting with me",
            "A funny distraction",
            "Music",
          ],
    picks: [{ pile: "helps", label: "The one to try first next time" }],
    closing: "Show this page to the people who help you, if you want to.",
  },
  {
    kind: "sort",
    id: "drains-fills",
    tags: ["5"],
    short: "4 min",
    title: "Drains and fills",
    blurb: "Sort your week by how each part leaves you. Pick one to shrink and one to grow.",
    time: "About 4 minutes",
    end: "Sort the cards, choose one drain and one fill, then keep the page.",
    audiences: ["9-12", "13-17", "adult"],
    piles: [
      { id: "drain", label: "Drains me" },
      { id: "fill", label: "Fills me up" },
      { id: "neither", label: "Neither" },
    ],
    cards: (a) =>
      a === "adult"
        ? [
            "The morning rush",
            "Commuting",
            "Email and messages",
            "Cooking dinner",
            "Bedtime routine",
            "Exercise",
            "Time with friends",
            "Scrolling my phone",
            "Household admin",
            "Time outside",
            "Meetings",
            "Time alone",
          ]
        : [
            "Getting ready in the morning",
            "School",
            "Homework",
            "Sports or practice",
            "Time with friends",
            "Screens",
            "Chores",
            "Time outside",
            "Reading",
            "Family dinner",
            "Time alone",
          ],
    picks: [
      { pile: "drain", label: "One drain to shrink this week" },
      { pile: "fill", label: "One fill to make room for" },
    ],
  },
  {
    kind: "sort",
    id: "iceberg",
    tags: ["hard", "5"],
    short: "4 min",
    title: "What’s under the behavior?",
    blurb: "Name what happened, sort the likely reasons, and pick one guess to test.",
    time: "About 4 minutes",
    end: "Describe what happened, sort the reasons, choose one to test, then keep the page. In a few days, Relish asks how it went.",
    audiences: ["adult"],
    aboutPerson: { label: "Who is this about?" },
    subject: { label: "What happened?", placeholder: "A meltdown at homework time" },
    piles: [
      { id: "likely", label: "Likely" },
      { id: "maybe", label: "Maybe" },
      { id: "no", label: "Not this time" },
    ],
    cards: () => [
      "Tired",
      "Hungry",
      "Needed connection",
      "Too much at once",
      "Missing a skill they haven’t learned yet",
      "Something happened at school or work",
      "A change of plans",
      "Wanted some control",
      "A big feeling without words for it",
      "Noise, clothes, crowds or other sensory overload",
    ],
    picks: [{ pile: "likely", label: "One guess to test this week" }],
    closing: "Try responding to the guess, not the behavior, and notice what changes.",
  },
  {
    kind: "sort",
    id: "load",
    tags: ["5"],
    short: "5 min",
    title: "Who carries what",
    blurb: "Sort household jobs by who carries them now, including the noticing and planning. You’ll see the split on one page.",
    time: "About 5 minutes",
    end: "Sort the jobs, choose one to talk about, then keep the page.",
    audiences: ["adult"],
    aboutPerson: { label: "Who do you share the load with?" },
    piles: [
      { id: "me", label: "Mostly me" },
      { id: "them", label: "Mostly them" },
      { id: "both", label: "Shared" },
    ],
    cards: () => [
      "Noticing we’re low on groceries",
      "Planning the week’s meals",
      "Booking doctor and dentist visits",
      "Tracking school forms and deadlines",
      "Remembering birthdays and gifts",
      "Laundry, from start to put away",
      "Arranging childcare and playdates",
      "Paying bills",
      "Planning holidays and trips",
      "Keeping in touch with family",
      "Noticing a child is struggling",
      "Bedtime",
      "Morning drop-off",
      "Cleaning the kitchen",
    ],
    picks: [{ pile: "me", label: "One job to talk about sharing" }],
    closing:
      "This is your view. The other person can sort the same list in their own book; compare when you’re both ready.",
  },
  {
    kind: "builder",
    id: "soft-start",
    tags: ["hard", "5"],
    short: "3 min",
    title: "Rewrite the opener",
    blurb: "Have a hard conversation coming up? Find a first sentence you can actually use.",
    time: "About 3 minutes",
    end: "Fill in the three parts, check the sentence, then keep the page. In a couple of days, Relish asks how it went.",
    audiences: ["adult"],
    aboutPerson: { label: "Who will you say this to?" },
    fields: [
      {
        id: "raw",
        label: "What you said, or want to say, as it comes",
        placeholder: "You never help with bedtime.",
        multiline: true,
        optional: true,
      },
      { id: "feel", label: "I feel…", placeholder: "worn out" },
      {
        id: "about",
        label: "about…",
        placeholder: "doing bedtime alone four nights in a row",
      },
      {
        id: "need",
        label: "and what would help is…",
        placeholder: "trading off on weeknights",
      },
    ],
    composeLabel: "Your opener",
    compose: (v) =>
      `I feel ${clean(v.feel)} about ${clean(v.about)}, and what would help is ${clean(v.need)}.`,
    checks: (v) => [
      { ok: !!clean(v.feel), text: "Starts with how you feel" },
      {
        ok: !!clean(v.about) && !blamey.test(v.about) && !blamey.test(v.need),
        text: "Describes a situation, not their character (no “you always” or “you never”)",
      },
      { ok: !!clean(v.need), text: "Asks for something you want, not only what to stop" },
    ],
  },
  {
    kind: "builder",
    id: "thought-court",
    tags: ["hard", "5"],
    short: "4 min",
    title: "Put a thought on trial",
    blurb: "Weigh the evidence for a harsh thought about yourself, then write a fairer one to keep.",
    time: "About 4 minutes",
    end: "Give the evidence, reach a verdict, write a fairer thought, then keep the page.",
    audiences: ["13-17", "adult"],
    fields: [
      { id: "thought", label: "The thought on trial", placeholder: "I’m failing as a parent." },
      {
        id: "for",
        label: "Evidence for it",
        placeholder: "I lost my temper twice this week.",
        multiline: true,
      },
      {
        id: "against",
        label: "Evidence against it",
        placeholder: "I apologized both times, and we read together every night.",
        multiline: true,
      },
      {
        id: "fairer",
        label: "A fairer way to say it",
        placeholder: "I’m having a hard week, and I’m still showing up.",
      },
    ],
    verdict: {
      label: "The verdict",
      choices: ["Mostly true", "Partly true", "Not a fair charge"],
    },
    composeLabel: "The fairer thought",
    compose: (v) => `${clean(v.fairer)}.`,
  },
  {
    kind: "builder",
    id: "unseen",
    tags: ["1"],
    short: "2 min",
    title: "Notice the unseen work",
    blurb: "Name one thing someone does that nobody thanks them for. You’ll leave with what to say to them.",
    time: "About 2 minutes",
    end: "Fill in both parts, then keep the page and say it to them.",
    audiences: ["9-12", "13-17", "adult"],
    aboutPerson: { label: "Who is this for?", required: true },
    fields: [
      { id: "noticed", label: "I noticed you…", placeholder: "always know when we need more milk" },
      {
        id: "without",
        label: "Without it…",
        placeholder: "breakfast would fall apart twice a week",
      },
    ],
    composeLabel: "What to say",
    compose: (v) => `I noticed you ${clean(v.noticed)}. Without it, ${clean(v.without)}. Thank you.`,
  },
  {
    kind: "builder",
    id: "repair",
    tags: ["hard", "5"],
    short: "3 min",
    title: "Plan a repair",
    blurb: "After a rough moment, plan what to say so the next conversation goes better.",
    time: "About 3 minutes",
    end: "Fill in the four parts, then keep the page. In a couple of days, Relish asks whether you got to say it.",
    audiences: ["adult"],
    aboutPerson: { label: "Who is the repair with?", required: true },
    fields: [
      { id: "sorry", label: "I’m sorry I…", placeholder: "snapped at you about the shoes" },
      {
        id: "wish",
        label: "What I wish I’d done…",
        placeholder: "taken a breath and helped you find them",
      },
      { id: "next", label: "Next time I’ll…", placeholder: "say “I need a minute” before I get loud" },
      { id: "invite", label: "Can we…", placeholder: "start tomorrow morning with a fresh try" },
    ],
    composeLabel: "What to say",
    compose: (v) =>
      `I’m sorry I ${clean(v.sorry)}. I wish I’d ${clean(v.wish)}. Next time I’ll ${clean(v.next)}. Can we ${clean(v.invite)}?`,
  },
  {
    kind: "tracker",
    id: "hellos",
    tags: ["1"],
    short: "1 min a day",
    mode: "days",
    target: 10,
    title: "Ten real hellos",
    blurb: "Make one hello or goodbye a day last long enough to land, for ten days.",
    time: "Under a minute",
    span: "10 days, at your pace",
    end: "Tick each day you do it. Keep a page whenever you’re ready.",
    audiences: ["adult"],
    aboutPerson: { label: "Who will you greet?", required: true },
    instruction:
      "When one of you comes home or heads out, pause what you’re doing. Give your hello or goodbye six seconds of your full attention.",
    doneLine: "Ten hellos",
  },
  {
    kind: "tracker",
    id: "thanks-week",
    tags: ["1"],
    short: "1 min a day",
    mode: "days",
    target: 7,
    title: "A week of specific thanks",
    blurb: "Thank one person for one specific thing each day, for a week.",
    time: "About a minute",
    span: "7 days, at your pace",
    end: "Tick each day and note what you said. Keep a page whenever you’re ready.",
    audiences: ["9-12", "13-17", "adult"],
    aboutPerson: { label: "Who will you thank?", required: true },
    instruction:
      "Each day, thank them for one specific thing: “When you ___, it mattered because ___.” No “but,” and nothing asked in return.",
    notePrompt: "What did you thank them for?",
    doneLine: "A week of thanks",
  },
  {
    kind: "tracker",
    id: "repair-bingo",
    tags: ["hard"],
    short: "1–2 weeks",
    mode: "squares",
    title: "Repair bingo",
    blurb: "After a tense moment, mark the repair move you tried. Find out which ones land.",
    time: "A moment, when friction happens",
    span: "A week or two",
    end: "Mark a square each time a repair move helps. Keep a page whenever you’re ready.",
    audiences: ["adult"],
    aboutPerson: { label: "Who is this with?" },
    instruction:
      "After a tense moment, try one of these. Mark it when it helped, even a little.",
    squares: [
      "A joke that broke the tension",
      "“Let me try that again”",
      "“You’re right about…”",
      "A touch on the arm",
      "A break, then coming back",
      "“I can see why you’d feel that way”",
      "Saying sorry first",
      "Making them a cup of something",
      "“What do you need right now?”",
    ],
  },
  {
    kind: "tracker",
    id: "kindness-bingo",
    tags: ["1"],
    short: "1 week",
    mode: "squares",
    title: "Kindness spotting",
    blurb: "Spot kind things people in your family do. Try to fill a line.",
    time: "A moment, when you spot one",
    span: "About a week",
    end: "Mark a square when you spot one. Keep a page whenever you’re ready.",
    audiences: kids,
    instruction: "When you see someone do one of these, mark it.",
    squares: [
      "Someone shared",
      "Someone helped clean up",
      "Someone said thank you",
      "Someone waited their turn",
      "Someone gave a hug",
      "Someone included a friend",
      "Someone said sorry",
      "Someone was patient",
      "Someone cheered someone on",
    ],
  },
  {
    kind: "highlights",
    id: "day-highlights",
    tags: ["trip"],
    short: "5–10 min",
    title: "Day’s highlights",
    blurb: "End of a driving day? Everyone answers three quick questions out loud. Keep the day as a trip page.",
    time: "About a minute each",
    end: "Ask everyone the three questions, read the day back, then keep it as a trip page.",
    audiences: everyone,
    questions: [
      { id: "best", ask: "best part of today?", label: "Best part" },
      { id: "hard", ask: "hardest part of today?", label: "Hardest part" },
      { id: "next", ask: "what are you looking forward to?", label: "Looking forward to" },
    ],
  },
];

export const toolGroups: { kind: Tool["kind"]; title: string; note: string }[] = [
  { kind: "sort", title: "Sort it out", note: "Tap a pile for each card." },
  { kind: "builder", title: "Think it through", note: "Fill in the blanks and see the result." },
  { kind: "tracker", title: "Keep it going", note: "A small thing to do for several days." },
];

export const toolById = (id: string) => tools.find((t) => t.id === id);
export const toolsFor = (audience: Audience) =>
  tools.filter((t) => t.audiences.includes(audience));

// ── Results as journal pages ────────────────────────────────────────────────

export type SortResult = {
  subject?: string;
  placed: Record<string, string>; // card → pile id
  picks: Record<string, string>; // pile id → card
};

export function sortPage(tool: SortTool, r: SortResult, about?: string) {
  const lines: string[] = [];
  if (about) lines.push(`About ${about}.`);
  if (r.subject?.trim()) lines.push(`What happened: ${r.subject.trim()}`);
  for (const pile of tool.piles) {
    const cards = Object.keys(r.placed).filter((c) => r.placed[c] === pile.id);
    if (cards.length) lines.push(`${pile.label}: ${cards.join("; ")}.`);
  }
  for (const pick of tool.picks)
    if (r.picks[pick.pile]) lines.push(`${pick.label}: ${r.picks[pick.pile]}.`);
  if (tool.closing) lines.push(tool.closing);
  return lines.join("\n\n");
}

export function builderComplete(tool: BuilderTool, values: Record<string, string>) {
  return (
    tool.fields.every((f) => f.optional || !!clean(values[f.id])) &&
    (!tool.verdict || tool.verdict.choices.includes(values.verdict || ""))
  );
}

export function builderPage(
  tool: BuilderTool,
  values: Record<string, string>,
  about?: string,
) {
  const lines: string[] = [];
  if (about) lines.push(`With ${about}.`);
  for (const f of tool.fields)
    if (values[f.id]?.trim()) lines.push(`${f.label} ${values[f.id].trim()}`);
  if (tool.verdict && values.verdict)
    lines.push(`${tool.verdict.label}: ${values.verdict}.`);
  lines.push(`${tool.composeLabel}: ${tool.compose(values)}`);
  return lines.join("\n\n");
}

export type ToolPage = {
  title: string;
  text: string;
  /** The exercise this page came from. */
  toolId?: string;
  /** Who the exercise was about, when it asks. */
  personId?: string;
  /** Who it was with, for exercises not about anyone; empty is no one in particular. */
  people?: string[];
  /** For exercises that check back later: the plan, in the person's own words. */
  plan?: string;
  /** Day's highlights: the trip and the day's place, kept with the page. */
  trip?: string;
  place?: string;
};
export function keepToolPage(book: Book, page: ToolPage): Book {
  if (!page.text.trim()) throw new Error("Finish the exercise before keeping a page.");
  const people = [page.personId, ...(page.people || [])].filter(
    (id, i, all): id is string =>
      !!id && all.indexOf(id) === i && book.people.some((p) => p.id === id),
  );
  const journalId = crypto.randomUUID();
  const kept = writeJournalPage(
    book,
    {
      id: journalId,
      title: page.title.slice(0, JOURNAL_TITLE_LIMIT),
      text: page.text,
      style: "moss",
      createdAt: new Date().toISOString(),
      people: people.length ? people : undefined,
      ...(page.toolId
        ? {
            source: {
              kind: "exercise" as const,
              toolId: page.toolId,
              ...(page.trip ? { trip: page.trip } : {}),
              ...(page.place ? { place: page.place } : {}),
            },
          }
        : {}),
    },
    0,
    "kept",
  );
  const days = page.toolId ? checkBackDays[page.toolId] : undefined;
  const plan = (page.plan || "").trim().slice(0, PLAN_LIMIT);
  if (!days || !plan) return kept;
  const created = new Date();
  const checkBack: CheckBack = {
    id: crypto.randomUUID(),
    toolId: page.toolId!,
    pageId: journalId,
    plan,
    ...(page.personId && people.includes(page.personId) ? { personId: page.personId } : {}),
    createdAt: created.toISOString(),
    dueAt: new Date(created.getTime() + days * DAY).toISOString(),
  };
  return change(kept, (s) => ({
    ...s,
    checkBacks: trimCheckBacks([...(s.checkBacks || []), checkBack]),
  }));
}

// ── Check-backs ─────────────────────────────────────────────────────────────
// A few days after keeping a plan from one of these exercises, Relish asks
// about it in the person's own words: "You planned to say … Did you get a
// chance?" It is the same loop Think it through uses for its plans.

const DAY = 86_400_000;
/** The exercises that check back, and how many days after keeping. */
export const checkBackDays: Record<string, number> = {
  repair: 2,
  "soft-start": 2,
  iceberg: 3,
};
export const PLAN_LIMIT = 1500;
export const CHECK_BACK_LIMIT = 60;
export type CheckBack = {
  id: string;
  toolId: string;
  /** The kept journal page the plan came from. */
  pageId: string;
  /** The plan in the person's own words, as it was kept. */
  plan: string;
  personId?: string;
  createdAt: string;
  /** Asked about from this time on; "Not yet" moves it later. */
  dueAt: string;
  /** Unset while it's still waiting for an answer. */
  status?: "tried" | "let-go";
  outcome?: Outcome;
  note?: string;
  answeredAt?: string;
};
export type CheckBackAnswer =
  | { kind: "tried"; outcome?: Outcome; note?: string }
  | { kind: "later" }
  | { kind: "let-go" };
/** Plans still waiting for an answer, oldest first. */
export const openCheckBacks = (book: Book) =>
  (toolsOf(book).checkBacks || [])
    .filter((c) => !c.status)
    .toSorted((a, b) => a.dueAt.localeCompare(b.dueAt));
/** Plans it's time to ask about. */
export const dueCheckBacks = (book: Book, now = new Date()) =>
  openCheckBacks(book).filter((c) => Date.parse(c.dueAt) <= now.getTime());
/** Answered plans make room first; plans still waiting are never dropped. */
function trimCheckBacks(list: CheckBack[]) {
  let extra = list.length - CHECK_BACK_LIMIT;
  return list.filter((c) => !(extra > 0 && c.status && extra-- > 0));
}
/** The words Relish uses to ask about a plan, built from what the person wrote. */
export function checkBackWords(book: Book, c: CheckBack) {
  const name = book.people.find((p) => p.id === c.personId)?.name;
  if (c.toolId === "iceberg")
    return {
      lead: `You guessed it was “${c.plan}”${name ? ` for ${name}` : ""}, and planned to respond to that instead of the behavior.`,
      ask: "Did you get a chance to try it?",
    };
  return {
    lead:
      c.toolId === "repair"
        ? `You planned to say${name ? ` to ${name}` : ""}:`
        : `You planned to start the conversation${name ? ` with ${name}` : ""} like this:`,
    quote: c.plan,
    ask: "Did you get a chance to say it?",
  };
}
export function answerCheckBack(
  book: Book,
  id: string,
  answer: CheckBackAnswer,
  now = new Date(),
): Book {
  const c = openCheckBacks(book).find((x) => x.id === id);
  if (!c) throw new Error("This plan has already been answered.");
  const stamp = now.toISOString();
  let next: CheckBack;
  if (answer.kind === "later")
    next = { ...c, dueAt: new Date(now.getTime() + 2 * DAY).toISOString() };
  else if (answer.kind === "let-go")
    next = { ...c, status: "let-go", answeredAt: stamp };
  else {
    if (answer.outcome !== undefined && !Object.hasOwn(outcomes, answer.outcome))
      throw new Error("Choose how it went.");
    const note = (answer.note || "").trim().slice(0, NOTE_LIMIT);
    next = {
      ...c,
      status: "tried",
      answeredAt: stamp,
      ...(answer.outcome ? { outcome: answer.outcome } : {}),
      ...(note ? { note } : {}),
    };
  }
  return change(book, (s) => ({
    ...s,
    checkBacks: (s.checkBacks || []).map((x) => (x.id === id ? next : x)),
  }));
}
/** What a kept exercise page shows once its plan has been answered. */
export function checkBackSection(book: Book, journalId: string) {
  const c = (toolsOf(book).checkBacks || []).find(
    (x) => x.pageId === journalId && x.status === "tried",
  );
  if (!c) return undefined;
  return {
    label: "How it went",
    text: [c.outcome ? outcomes[c.outcome] + "." : "I tried it.", c.note || ""]
      .filter(Boolean)
      .join(" "),
  };
}

// ── Trackers ────────────────────────────────────────────────────────────────

export type Mark = { key: string; at: string; note?: string };
export type TrackerRun = {
  id: string;
  toolId: string;
  personId?: string;
  startedAt: string;
  marks: Mark[];
  finishedAt?: string;
  pageId?: string;
};
export type ToolsState = {
  version: 1;
  trackers: TrackerRun[];
  /** Optional: books from before check-backs simply have none. */
  checkBacks?: CheckBack[];
  /** Day's highlights under way: saved after every answer. */
  day?: DayRun;
};
export const TRACKER_LIMIT = 40;
export const NOTE_LIMIT = 500;

export const toolsOf = (book: Book): ToolsState =>
  book.tools ?? { version: 1, trackers: [] };
export const activeTrackers = (book: Book) =>
  toolsOf(book).trackers.filter((t) => !t.finishedAt);
/** One exercise's habits under way, in the order they were started (stable). */
export const activeFor = (book: Book, toolId: string) =>
  activeTrackers(book).filter((t) => t.toolId === toolId);
/**
 * Habits under way, one entry per exercise. A habit about someone can run
 * with several people at once: one tracker each.
 */
export function runningByTool(book: Book) {
  const groups: { toolId: string; runs: TrackerRun[] }[] = [];
  for (const run of activeTrackers(book)) {
    const group = groups.find((g) => g.toolId === run.toolId);
    if (group) group.runs.push(run);
    else groups.push({ toolId: run.toolId, runs: [run] });
  }
  return groups;
}
/** "4 of 10", "Kaleb 4 of 10 · Ella 2 of 10", or "with 4 people". */
export function runsStatus(book: Book, runs: TrackerRun[]) {
  const counts = runs.map((run) => {
    const p = trackerProgress(run);
    return `${p.done} of ${p.total}`;
  });
  if (runs.length <= 1) return counts[0] ?? "";
  if (runs.length > 3) return `with ${runs.length} people`;
  return runs
    .map((run, i) => {
      const name = book.people.find((p) => p.id === run.personId)?.name;
      return name ? `${name} ${counts[i]}` : counts[i];
    })
    .join(" · ");
}
/** "Ella", "Ella and Kaleb", "Ella, Kaleb and Leo". */
export function namesList(names: string[]) {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function trackerTool(id: string): TrackerTool {
  const tool = toolById(id);
  if (!tool || tool.kind !== "tracker") throw new Error("This exercise is not available.");
  return tool;
}
const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function hasBingo(run: TrackerRun) {
  const marked = new Set(run.marks.map((m) => Number(m.key)));
  return lines.some((line) => line.every((i) => marked.has(i)));
}
export function trackerProgress(run: TrackerRun) {
  const tool = trackerTool(run.toolId);
  if (tool.mode === "days")
    return {
      done: run.marks.length,
      total: tool.target,
      complete: run.marks.length >= tool.target,
    };
  return {
    done: run.marks.length,
    total: tool.squares.length,
    complete: hasBingo(run),
  };
}

function change(book: Book, fn: (s: ToolsState) => ToolsState): Book {
  return { ...book, tools: fn(toolsOf(book)) };
}

/**
 * A habit about someone can run with several people at once, one tracker
 * each; any other habit runs once at a time.
 */
const sameRun = (tool: TrackerTool, a: { personId?: unknown }, b: { personId?: unknown }) =>
  !tool.aboutPerson || (a.personId ?? "") === (b.personId ?? "");

export function startTracker(book: Book, toolId: string, personId?: string): Book {
  const tool = trackerTool(toolId);
  if (activeFor(book, toolId).some((t) => sameRun(tool, t, { personId })))
    throw new Error(
      tool.aboutPerson && personId
        ? "This exercise is already in progress with them."
        : "This exercise is already in progress.",
    );
  if (personId && !book.people.some((p) => p.id === personId))
    throw new Error("Choose someone from your book.");
  if (tool.aboutPerson?.required && !personId)
    throw new Error("Choose who this is with first.");
  const run: TrackerRun = {
    id: crypto.randomUUID(),
    toolId,
    ...(personId ? { personId } : {}),
    startedAt: new Date().toISOString(),
    marks: [],
  };
  return change(book, (s) => ({
    ...s,
    // Keep the newest finished runs within the limit; active ones are never dropped.
    trackers: [...s.trackers, run].filter(
      (t, i, all) => !t.finishedAt || all.length - i <= TRACKER_LIMIT,
    ),
  }));
}

export function toggleMark(book: Book, runId: string, key: string, note?: string): Book {
  const run = toolsOf(book).trackers.find((t) => t.id === runId && !t.finishedAt);
  if (!run) throw new Error("This exercise has finished or changed.");
  return setMark(book, runId, key, !run.marks.some((m) => m.key === key), note);
}

/**
 * Marks (or unmarks) one day or square. Setting a mark that is already there
 * changes nothing, so a double tap can't mark the same day twice or undo it.
 */
export function setMark(
  book: Book,
  runId: string,
  key: string,
  on: boolean,
  note?: string,
): Book {
  const run = toolsOf(book).trackers.find((t) => t.id === runId && !t.finishedAt);
  if (!run) throw new Error("This exercise has finished or changed.");
  const tool = trackerTool(run.toolId);
  if (!validKey(tool, key)) throw new Error("Choose an available mark.");
  const trimmed = (note || "").trim().slice(0, NOTE_LIMIT);
  const exists = run.marks.some((m) => m.key === key);
  if (exists === on) return book;
  const marks = exists
    ? run.marks.filter((m) => m.key !== key)
    : [
        ...run.marks,
        { key, at: new Date().toISOString(), ...(trimmed ? { note: trimmed } : {}) },
      ];
  return change(book, (s) => ({
    ...s,
    trackers: s.trackers.map((t) => (t.id === runId ? { ...t, marks } : t)),
  }));
}

export function stopTracker(book: Book, runId: string): Book {
  if (!toolsOf(book).trackers.some((t) => t.id === runId && !t.finishedAt))
    throw new Error("This exercise has finished or changed.");
  return change(book, (s) => ({
    ...s,
    trackers: s.trackers.filter((t) => t.id !== runId),
  }));
}

const day = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export function trackerPage(book: Book, run: TrackerRun, memory?: string): ToolPage {
  const tool = trackerTool(run.toolId);
  const person = book.people.find((p) => p.id === run.personId)?.name;
  const title = person ? `${tool.title} · ${person}` : tool.title;
  const out: string[] = [tool.instruction];
  if (tool.mode === "days") {
    const sorted = run.marks.toSorted((a, b) => a.key.localeCompare(b.key));
    out.push(
      `${sorted.length} of ${tool.target} days: ${sorted.map((m) => day(m.key)).join(", ")}.`,
    );
    const notes = sorted.filter((m) => m.note);
    if (notes.length) out.push(notes.map((m) => `${day(m.key)}: ${m.note}`).join("\n"));
  } else {
    const marked = run.marks
      .map((m) => Number(m.key))
      .toSorted((a, b) => a - b)
      .map((i) => tool.squares[i]);
    out.push(`Marked ${marked.length} of ${tool.squares.length}: ${marked.join("; ")}.`);
    if (hasBingo(run)) out.push("Bingo: a full line.");
  }
  const remember = (memory || "").trim().slice(0, NOTE_LIMIT);
  if (remember) out.push(remember);
  return { title, text: out.join("\n\n"), toolId: run.toolId, personId: run.personId };
}

/** Keeps a page for one habit (with an optional line to remember) and ends it. */
export function finishTracker(book: Book, runId: string, memory?: string): Book {
  const run = toolsOf(book).trackers.find((t) => t.id === runId && !t.finishedAt);
  if (!run) throw new Error("This exercise has finished or changed.");
  if (!run.marks.length) throw new Error("Mark at least one day or square first.");
  const before = new Set((book.journal || []).map((e) => e.id));
  const kept = keepToolPage(book, trackerPage(book, run, memory));
  const pageId = (kept.journal || []).find((e) => !before.has(e.id))!.id;
  const stamp = new Date().toISOString();
  return change(kept, (s) => ({
    ...s,
    trackers: s.trackers.map((t) =>
      t.id === runId ? { ...t, finishedAt: stamp, pageId } : t,
    ),
  }));
}

// ── Day's highlights ────────────────────────────────────────────────────────
// At the end of a driving day, one person holds the phone and asks everyone
// the same three questions out loud. Each answer is saved as it's given, so a
// locked phone or a reload loses nothing. The day ends as an ordinary kept
// page; pages with the same trip name number on: Day 1, Day 2…

export const DAY_TOOL = "day-highlights";
export const DAY_ANSWER_LIMIT = 300;
export type DayPerson = { id: string; name: string; audience?: Audience };
export type DayRun = {
  id: string;
  startedAt: string;
  updatedAt: string;
  people: DayPerson[];
  /** answers[person][question]; "" is skipped or not asked yet. */
  answers: string[][];
  /** The question showing: person ⌊at / 3⌋, question at % 3; at the end, the read-back. */
  at: number;
};
export function highlightsTool(): HighlightsTool {
  const tool = toolById(DAY_TOOL);
  if (!tool || tool.kind !== "highlights") throw new Error("This activity is not available.");
  return tool;
}
const DAY_QUESTIONS = 3;
export const dayTotal = (run: DayRun) => run.people.length * DAY_QUESTIONS;
/** Who is being asked, and what, at this point of the run. */
export function dayStep(run: DayRun, at = run.at) {
  if (at >= dayTotal(run)) return undefined;
  const person = run.people[Math.floor(at / DAY_QUESTIONS)];
  const question = highlightsTool().questions[at % DAY_QUESTIONS];
  return {
    person,
    question,
    index: at % DAY_QUESTIONS,
    answer: run.answers[Math.floor(at / DAY_QUESTIONS)][at % DAY_QUESTIONS],
  };
}
const dayOf = (book: Book, runId: string) => {
  const run = toolsOf(book).day;
  if (!run || run.id !== runId) throw new Error("This day has changed. Open Day’s highlights again.");
  return run;
};
const withDay = (book: Book, run: DayRun | undefined) =>
  change(book, (s) => {
    const next = { ...s };
    if (run) next.day = run;
    else delete next.day;
    return next;
  });
const hasAnswers = (run: DayRun) => run.answers.some((a) => a.some((x) => x.trim()));
export function startDay(book: Book, people: DayPerson[]): Book {
  const open = toolsOf(book).day;
  if (open && hasAnswers(open))
    throw new Error("Keep or set aside the day you started first.");
  const cleaned = people.map((p) => ({
    id: String(p.id || ""),
    name: String(p.name || "").trim(),
    ...(p.audience && isAudience(p.audience) ? { audience: p.audience } : {}),
  }));
  if (
    !cleaned.length ||
    cleaned.length > 12 ||
    new Set(cleaned.map((p) => p.id)).size !== cleaned.length ||
    cleaned.some((p) => !p.id || p.id.length > 100 || !p.name || p.name.length > 80)
  )
    throw new Error("Choose between 1 and 12 people.");
  const stamp = new Date().toISOString();
  return withDay(book, {
    id: crypto.randomUUID(),
    startedAt: stamp,
    updatedAt: stamp,
    people: cleaned,
    answers: cleaned.map(() => Array.from({ length: DAY_QUESTIONS }, () => "")),
    at: 0,
  });
}
/** Saves the answer to the question showing ("" skips it) and moves on. */
export function answerDay(book: Book, runId: string, at: number, text: string): Book {
  const run = dayOf(book, runId);
  if (at !== run.at || at >= dayTotal(run))
    throw new Error("This question has changed. Open Day’s highlights again.");
  const answer = String(text || "").trim().slice(0, DAY_ANSWER_LIMIT);
  const p = Math.floor(at / DAY_QUESTIONS),
    q = at % DAY_QUESTIONS;
  return withDay(book, {
    ...run,
    answers: run.answers.map((row, i) => (i === p ? row.map((x, j) => (j === q ? answer : x)) : row)),
    at: at + 1,
    updatedAt: new Date().toISOString(),
  });
}
/** Goes back to an earlier question (or forward to the read-back); answers stay. */
export function moveDay(book: Book, runId: string, at: number): Book {
  const run = dayOf(book, runId);
  if (!Number.isInteger(at) || at < 0 || at > dayTotal(run))
    throw new Error("Choose a question from this day.");
  return withDay(book, { ...run, at, updatedAt: new Date().toISOString() });
}
/** A few words for an unfinished day: "Leo’s turn" or "ready to keep". */
export function dayStatus(run: DayRun) {
  const step = dayStep(run);
  return step ? `${step.person.name}’s turn` : "ready to read back and keep";
}
export function discardDay(book: Book, runId: string): Book {
  dayOf(book, runId);
  return withDay(book, undefined);
}
/** The day read back, grouped by person; people who skipped everything are left out. */
export function dayText(run: DayRun) {
  const questions = highlightsTool().questions;
  return run.people
    .flatMap((person, i) => {
      const lines = questions.flatMap((q, j) =>
        run.answers[i][j].trim() ? [`${q.label}: ${run.answers[i][j].trim()}`] : [],
      );
      return lines.length ? [[person.name, ...lines].join("\n")] : [];
    })
    .join("\n\n");
}
const tripKey = (s: string) => s.trim().toLocaleLowerCase();
export const cleanName = (s: string | undefined) =>
  String(s || "").trim().replace(/\s+/g, " ").slice(0, SOURCE_NAME_LIMIT).trim();
const dayPages = (book: Book) =>
  (book.journal || []).filter(
    (e) => e.status === "kept" && e.source?.kind === "exercise" && e.source.toolId === DAY_TOOL,
  );
/** Which day of this trip today is: Day 1, Day 2… counted by calendar date. */
export function tripDay(book: Book, trip: string, now = new Date()) {
  const key = tripKey(trip);
  const today = todayKey(now);
  const earlier = new Set(
    dayPages(book)
      .filter((e) => e.source?.trip && tripKey(e.source.trip) === key)
      .map((e) => todayKey(new Date(e.createdAt)))
      .filter((d) => d < today),
  );
  return earlier.size + 1;
}
/** The trip named on a recent day's page, to carry on with; "" when none. */
export function recentTrip(book: Book, now = new Date()) {
  const latest = dayPages(book)
    .filter((e) => e.source?.trip)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest || now.getTime() - Date.parse(latest.createdAt) > 14 * DAY) return "";
  return latest.source!.trip!;
}
/** "Utah · Day 2 · Moab", "Day’s highlights · Moab" or just "Day’s highlights". */
export function dayTitle(book: Book, trip: string, place: string, now = new Date()) {
  const t = cleanName(trip),
    p = cleanName(place);
  const head = t ? `${t} · Day ${tripDay(book, t, now)}` : highlightsTool().title;
  return p ? `${head} · ${p}` : head;
}
/** Keeps the day as an ordinary page in this book and clears the run. */
export function keepDay(
  book: Book,
  runId: string,
  details: { trip?: string; place?: string } = {},
  now = new Date(),
): Book {
  const run = dayOf(book, runId);
  const text = dayText(run);
  if (!text) throw new Error("Nobody answered yet. Answer a question, or set this day aside.");
  const trip = cleanName(details.trip),
    place = cleanName(details.place);
  const key = (n: string) => n.trim().toLocaleLowerCase();
  // People in this book who were in the car, so the page shows up under them.
  const people = book.people
    .filter((person) =>
      run.people.some(
        (p) => p.id !== "owner" && (p.id === person.id || p.id === `book:${person.id}` || key(p.name) === key(person.name)),
      ),
    )
    .map((person) => person.id);
  const kept = keepToolPage(book, {
    title: dayTitle(book, trip, place, now),
    text,
    toolId: DAY_TOOL,
    people,
    ...(trip ? { trip } : {}),
    ...(place ? { place } : {}),
  });
  return withDay(kept, undefined);
}

// ── Validation (imported backups and synced books are untrusted) ────────────

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const date = (v: unknown) => str(v, 40) && Number.isFinite(Date.parse(v as string));

function validKey(tool: TrackerTool, key: unknown) {
  if (typeof key !== "string") return false;
  if (tool.mode === "days") return /^\d{4}-\d{2}-\d{2}$/.test(key);
  return /^\d$/.test(key) && Number(key) < tool.squares.length;
}

function isDayRun(v: unknown) {
  if (!obj(v) || !str(v.id, 100) || !date(v.startedAt) || !date(v.updatedAt)) return false;
  const people = v.people;
  if (
    !Array.isArray(people) ||
    people.length < 1 ||
    people.length > 12 ||
    new Set(people.map((p) => (obj(p) ? p.id : p))).size !== people.length ||
    !people.every(
      (p) =>
        obj(p) &&
        str(p.id, 100) &&
        str(p.name, 80) &&
        !!p.name.trim() &&
        (p.audience === undefined || isAudience(p.audience)),
    )
  )
    return false;
  return (
    Array.isArray(v.answers) &&
    v.answers.length === people.length &&
    v.answers.every(
      (row) =>
        Array.isArray(row) &&
        row.length === DAY_QUESTIONS &&
        row.every((x) => typeof x === "string" && x.length <= DAY_ANSWER_LIMIT),
    ) &&
    Number.isInteger(v.at) &&
    (v.at as number) >= 0 &&
    (v.at as number) <= people.length * DAY_QUESTIONS
  );
}

export function isTools(value: unknown): value is ToolsState {
  if (!obj(value) || value.version !== 1 || !Array.isArray(value.trackers))
    return false;
  if (value.day !== undefined && !isDayRun(value.day)) return false;
  if (value.trackers.length > TRACKER_LIMIT + 20) return false;
  const ids = new Set<string>();
  // One active run per exercise, or per exercise and person when it is about someone.
  const active = new Set<string>();
  for (const t of value.trackers) {
    if (!obj(t) || !str(t.id, 100) || ids.has(t.id)) return false;
    ids.add(t.id);
    const tool = typeof t.toolId === "string" ? toolById(t.toolId) : undefined;
    if (!tool || tool.kind !== "tracker") return false;
    if (t.personId !== undefined && !str(t.personId, 100)) return false;
    if (!date(t.startedAt)) return false;
    if (t.finishedAt !== undefined && !date(t.finishedAt)) return false;
    if (t.pageId !== undefined && (!str(t.pageId, 100) || !t.finishedAt)) return false;
    if (!t.finishedAt) {
      const key = tool.aboutPerson ? `${tool.id}\u0000${t.personId ?? ""}` : tool.id;
      if (active.has(key)) return false;
      active.add(key);
    }
    if (!Array.isArray(t.marks) || t.marks.length > 400) return false;
    const keys = new Set<string>();
    for (const m of t.marks) {
      if (!obj(m) || !validKey(tool, m.key) || keys.has(m.key as string)) return false;
      keys.add(m.key as string);
      if (!date(m.at)) return false;
      if (m.note !== undefined && !str(m.note, NOTE_LIMIT)) return false;
    }
  }
  if (value.checkBacks !== undefined) {
    const list = value.checkBacks;
    if (!Array.isArray(list) || list.length > CHECK_BACK_LIMIT) return false;
    const seen = new Set<string>();
    for (const c of list) {
      if (!obj(c) || !str(c.id, 100) || seen.has(c.id)) return false;
      seen.add(c.id);
      if (typeof c.toolId !== "string" || !Object.hasOwn(checkBackDays, c.toolId))
        return false;
      if (!str(c.pageId, 100) || !str(c.plan, PLAN_LIMIT)) return false;
      if (c.personId !== undefined && !str(c.personId, 100)) return false;
      if (!date(c.createdAt) || !date(c.dueAt)) return false;
      if (c.status !== undefined && c.status !== "tried" && c.status !== "let-go")
        return false;
      if ((c.status === undefined) !== (c.answeredAt === undefined)) return false;
      if (c.answeredAt !== undefined && !date(c.answeredAt)) return false;
      if (
        c.outcome !== undefined &&
        (c.status !== "tried" ||
          typeof c.outcome !== "string" ||
          !Object.hasOwn(outcomes, c.outcome))
      )
        return false;
      if (c.note !== undefined && (c.status !== "tried" || !str(c.note, NOTE_LIMIT)))
        return false;
    }
  }
  return true;
}
