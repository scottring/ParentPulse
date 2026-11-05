import type { Book } from "./model";
import { writeJournalPage, JOURNAL_TITLE_LIMIT } from "./journal";
import type { Audience } from "./profiles";

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
} & (
    | { mode: "days"; target: number; notePrompt?: string }
    | { mode: "squares"; squares: string[] }
  );
export type Tool = SortTool | BuilderTool | TrackerTool;

const clean = (v: string | undefined) => (v || "").trim().replace(/[.\s]+$/, "");
const blamey = /\byou (always|never)\b/i;

export const tools: Tool[] = [
  {
    kind: "sort",
    id: "helps-upset",
    title: "What helps when I’m upset",
    blurb: "Sort what helps and what doesn’t. A page for your own manual.",
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
    closing: "Share this page with the people who help you, if you want to.",
  },
  {
    kind: "sort",
    id: "drains-fills",
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
    title: "What’s under the behavior?",
    blurb: "Name what happened, sort the likely reasons, and pick one guess to test.",
    time: "About 4 minutes",
    end: "Describe what happened, sort the reasons, choose one to test, then keep the page.",
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
    title: "Who carries what",
    blurb: "Sort household jobs by who carries them now, including the noticing and planning.",
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
      "This is your view. The other person can sort the same list in their own edition; compare when you’re both ready.",
  },
  {
    kind: "builder",
    id: "soft-start",
    title: "Rewrite the opener",
    blurb: "Turn a hard thing to say into a sentence that’s easier to hear.",
    time: "About 3 minutes",
    end: "Fill in the three parts, check the sentence, then keep the page.",
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
    title: "Put a thought on trial",
    blurb: "Weigh the evidence for a harsh thought, then write a fairer one.",
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
    title: "Notice the unseen work",
    blurb: "Name one thing someone does that nobody thanks them for.",
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
    title: "Plan a repair",
    blurb: "After a rough moment, plan what to say so the next conversation goes better.",
    time: "About 3 minutes",
    end: "Fill in the four parts, then keep the page and choose a time to say it.",
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
    mode: "days",
    target: 10,
    title: "Ten real hellos",
    blurb: "Ten days of greetings that last long enough to land.",
    time: "Under a minute a day",
    end: "Tick each day you do it. Keep a page whenever you’re ready.",
    audiences: ["adult"],
    aboutPerson: { label: "Who will you greet?", required: true },
    instruction:
      "When one of you leaves or comes home, stop what you’re doing, look at them, and make the hello or goodbye last at least six seconds.",
  },
  {
    kind: "tracker",
    id: "thanks-week",
    mode: "days",
    target: 7,
    title: "A week of specific thanks",
    blurb: "One specific thank-you a day for seven days.",
    time: "About a minute a day",
    end: "Tick each day and note what you said. Keep a page whenever you’re ready.",
    audiences: ["9-12", "13-17", "adult"],
    aboutPerson: { label: "Who will you thank?", required: true },
    instruction:
      "Each day, thank them for one specific thing: “When you ___, it mattered because ___.” No “but,” and nothing asked in return.",
    notePrompt: "What did you thank them for?",
  },
  {
    kind: "tracker",
    id: "repair-bingo",
    mode: "squares",
    title: "Repair bingo",
    blurb: "Mark each repair move you try after friction. Find out which ones land.",
    time: "Over a week or two",
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
    mode: "squares",
    title: "Kindness spotting",
    blurb: "Spot kind things people in your family do this week.",
    time: "Over a week",
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

export function keepToolPage(
  book: Book,
  page: { title: string; text: string; personId?: string },
): Book {
  if (!page.text.trim()) throw new Error("Finish the exercise before keeping a page.");
  return writeJournalPage(
    book,
    {
      id: crypto.randomUUID(),
      title: page.title.slice(0, JOURNAL_TITLE_LIMIT),
      text: page.text,
      style: "moss",
      createdAt: new Date().toISOString(),
      people:
        page.personId && book.people.some((p) => p.id === page.personId)
          ? [page.personId]
          : undefined,
    },
    0,
    "kept",
  );
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
export type ToolsState = { version: 1; trackers: TrackerRun[] };
export const TRACKER_LIMIT = 40;
export const NOTE_LIMIT = 500;

export const toolsOf = (book: Book): ToolsState =>
  book.tools ?? { version: 1, trackers: [] };
export const activeTrackers = (book: Book) =>
  toolsOf(book).trackers.filter((t) => !t.finishedAt);

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

export function startTracker(book: Book, toolId: string, personId?: string): Book {
  const tool = trackerTool(toolId);
  if (activeTrackers(book).some((t) => t.toolId === toolId))
    throw new Error("This exercise is already in progress.");
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
  const tool = trackerTool(run.toolId);
  if (!validKey(tool, key)) throw new Error("Choose an available mark.");
  const trimmed = (note || "").trim().slice(0, NOTE_LIMIT);
  const exists = run.marks.some((m) => m.key === key);
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

export function trackerPage(book: Book, run: TrackerRun) {
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
  return { title, text: out.join("\n\n"), personId: run.personId };
}

export function finishTracker(book: Book, runId: string): Book {
  const run = toolsOf(book).trackers.find((t) => t.id === runId && !t.finishedAt);
  if (!run) throw new Error("This exercise has finished or changed.");
  if (!run.marks.length) throw new Error("Mark at least one day or square first.");
  const before = new Set((book.journal || []).map((e) => e.id));
  const kept = keepToolPage(book, trackerPage(book, run));
  const pageId = (kept.journal || []).find((e) => !before.has(e.id))!.id;
  const stamp = new Date().toISOString();
  return change(kept, (s) => ({
    ...s,
    trackers: s.trackers.map((t) =>
      t.id === runId ? { ...t, finishedAt: stamp, pageId } : t,
    ),
  }));
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

export function isTools(value: unknown): value is ToolsState {
  if (!obj(value) || value.version !== 1 || !Array.isArray(value.trackers))
    return false;
  if (value.trackers.length > TRACKER_LIMIT + 20) return false;
  const ids = new Set<string>();
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
      if (active.has(tool.id)) return false;
      active.add(tool.id);
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
  return true;
}
