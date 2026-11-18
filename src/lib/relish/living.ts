import type { Book } from "./model";
import { isAudience, youngestAudience, type Audience } from "./profiles";
import {
  childPlayContent,
  childStoryRounds,
  samePageBank,
  samePagePrompts,
  samePageQuestion,
  type SameQuestion,
} from "./play-content";

// Adult topics are situations a parent would recognize from their own week.
// Each keeps its original stored id (listen / ask / joy), so books written
// before these words changed read on without a migration.
export const threads = {
  listen: {
    title: "I jumped in with advice",
    lead: "Someone wanted to talk, and I went straight to fixing it.",
    notice: "What were they telling you, and what did you say?",
    practice: "Ask before you offer an answer.",
    instruction:
      "Next time someone brings you something, try: “Do you want ideas, or do you want me to listen?” Then go with their answer.",
    planExample: "Ask “ideas or listening?” when they talk about school",
  },
  ask: {
    title: "I wish I’d asked for what I needed",
    lead: "I went along with it, or let it build, instead of saying what would help.",
    notice: "What did you need in that moment, and what happened instead?",
    practice: "Ask for one small, specific thing.",
    instruction:
      "Try: “What would help me right now is…” Keep it small, and let the other person answer in their own words.",
    planExample: "Ask for a little quiet after dinner",
  },
  joy: {
    title: "I’d like more moments like that one",
    lead: "Something went well, and I want to remember it and make room for it again.",
    notice: "What happened? Write down the moment you’d like more of.",
    practice: "Make room for one more like it.",
    instruction:
      "Pick one small way to set it up again. Offer it as an invitation, not an obligation.",
    planExample: "Suggest another walk to the creek on Saturday",
  },
} as const;
export type ThreadId = keyof typeof threads;
export type SessionKind = "begin" | "notice" | "practice" | "reflect";
export type Outcome = "helped" | "adjust" | "time";
export const outcomes: Record<Outcome, string> = {
  helped: "It helped, even a little",
  adjust: "I learned what I’d change",
  time: "Too soon to tell",
};
export type Draft = {
  text: string;
  opportunity: string;
  outcome: "" | Outcome;
  perspective: string;
};
export type Visit = {
  id: string;
  kind: SessionKind;
  status: "active" | "paused" | "complete";
  step: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  thread?: ThreadId;
  draft: Draft;
  summary?: string;
};
export type LivingEntry = {
  id: string;
  kind: "notice" | "practice" | "reflection";
  thread: ThreadId;
  text: string;
  perspective?: string;
  outcome?: Outcome;
  sourceId?: string;
  triedAt?: string;
  createdAt: string;
};
export type Player = { id: string; name: string; audience?: Audience };
export type GameKind = "joy" | "story" | "match";
export const gameKinds: GameKind[] = ["joy", "story", "match"];
export type Game = {
  audience?: Audience;
  /** 1: one answer per turn in `choices`. 2: turns of several answers in `answers`. */
  contentVersion?: 1 | 2;
  id: string;
  kind: GameKind;
  players: Player[];
  stage: "ready" | "choose" | "handoff" | "reveal" | "kept" | "finished";
  turn: number;
  /** contentVersion 1 (or none): one answer per turn. Empty from version 2. */
  choices: (number | null)[];
  /** contentVersion 2: each finished turn's answers, one per question asked. */
  answers?: (number | null)[][];
  /** contentVersion 2 Same page?: the question ids, fixed when the round starts. */
  questions?: string[];
  approvals: boolean[];
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  savedPageId?: string;
};
export type SharedPage = {
  id: string;
  kind: GameKind;
  title: string;
  text: string;
  players: Player[];
  approvedBy: string[];
  createdAt: string;
};
/**
 * A trace that a round was played, kept or not: the game kind, the players'
 * names (as stored on the game) and the date. Rounds from contentVersion 2 also
 * remember their answers, so later rounds with the same players can look back.
 * Records live only in the book the game was played in and are never sent to
 * AI. `id` is the game's id.
 */
export type PlayRecord = {
  id: string;
  kind: GameKind;
  players: { id: string; name: string }[];
  playedAt: string;
  /** The shared page kept for this round, when every player approved one. */
  pageId?: string;
  /** Same page?: each question's id and each player's pick, in `players` order. */
  questions?: { id: string; picks: (number | null)[] }[];
};
export const PLAY_LIMIT = 500;
/** Play records keep answers for the newest rounds only. */
export const ANSWERS_KEPT = 100;
export type LivingState = {
  version: 1;
  thread?: ThreadId;
  visit?: Visit;
  entries: LivingEntry[];
  sharedPages: SharedPage[];
  game?: Game;
  /** Optional: books from before play records simply have none. */
  plays?: PlayRecord[];
};
export const freshLiving = (): LivingState => ({
  version: 1,
  entries: [],
  sharedPages: [],
});
export const livingOf = (book: Book): LivingState =>
  book.living ?? freshLiving();
export const isThread = (id: unknown): id is ThreadId =>
  typeof id === "string" && Object.hasOwn(threads, id);
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
export const plans: Record<
  SessionKind,
  { title: string; time: string; end: string; next: string }
> = {
  begin: {
    title: "Write down one moment",
    time: "About 3 minutes",
    end: "Pick what happened, write it down, and save it. That can be the whole thing.",
    next: "If you want, make a small plan to try next time.",
  },
  notice: {
    title: "Write down another moment",
    time: "About 2 minutes",
    end: "Write it down and save it.",
    next: "If you want, make a small plan to try next time.",
  },
  practice: {
    title: "Make a small plan",
    time: "About 1 minute",
    end: "Write what you’ll try and when, then save the plan.",
    next: "Next time you open Think it through, it will ask how it went.",
  },
  reflect: {
    title: "How did it go?",
    time: "About 2 minutes",
    end: "Say whether you tried it and how it went, then save.",
    next: "Write about another moment whenever one comes up.",
  },
};
export function nextKind(book: Book): SessionKind {
  const l = livingOf(book);
  if (!l.thread) return "begin";
  const practice = pendingPractice(book);
  if (practice) return "reflect";
  const latest = l.entries.filter((e) => e.thread === l.thread).at(-1);
  return latest?.kind === "notice" ? "practice" : "notice";
}
export function pendingPractice(book: Book) {
  const l = livingOf(book);
  return l.entries.findLast(
    (e) =>
      e.kind === "practice" &&
      e.thread === l.thread &&
      !l.entries.some((r) => r.kind === "reflection" && r.sourceId === e.id),
  );
}
export function changeLiving(
  book: Book,
  fn: (l: LivingState) => LivingState,
): Book {
  return { ...book, living: fn(livingOf(book)) };
}
export function beginVisit(book: Book, kind = nextKind(book)): Book {
  const l = livingOf(book);
  if (l.visit && l.visit.status !== "complete")
    return changeLiving(book, (x) => ({
      ...x,
      visit: { ...l.visit!, status: "active", updatedAt: now() },
    }));
  if (kind !== "begin" && !l.thread) kind = "begin";
  const stamp = now();
  return changeLiving(book, (x) => ({
    ...x,
    visit: {
      id: id(),
      kind,
      status: "active",
      step: 0,
      startedAt: stamp,
      updatedAt: stamp,
      thread: x.thread,
      draft: { text: "", opportunity: "", outcome: "", perspective: "" },
    },
  }));
}
export function chooseThread(book: Book, thread: ThreadId): Book {
  if (!isThread(thread)) throw new Error("Choose a direction.");
  const l = livingOf(book),
    v = l.visit;
  if (!v || v.kind !== "begin" || v.status !== "active")
    throw new Error("Start again from Think it through.");
  return changeLiving(book, (x) => ({
    ...x,
    thread,
    visit: { ...v, thread, step: 1, updatedAt: now() },
  }));
}
export function updateDraft(book: Book, visitId: string, draft: Draft): Book {
  const v = livingOf(book).visit;
  if (!v || v.id !== visitId || v.status === "complete")
    throw new Error("This page has changed. Open Think it through again.");
  return changeLiving(book, (x) => ({
    ...x,
    visit: { ...v, draft, updatedAt: now() },
  }));
}
export function pauseVisit(book: Book): Book {
  const v = livingOf(book).visit;
  if (!v || v.status === "complete") return book;
  return changeLiving(book, (x) => ({
    ...x,
    visit: { ...v, status: "paused", updatedAt: now() },
  }));
}
export function completeVisit(book: Book, visitId: string, draft: Draft): Book {
  const l = livingOf(book),
    v = l.visit;
  if (!v || v.id !== visitId || v.status === "complete" || !v.thread)
    throw new Error("This page has changed. Open Think it through again.");
  const stamp = now();
  let entry: LivingEntry;
  let summary: string;
  if (v.kind === "begin" || v.kind === "notice") {
    if (!draft.text.trim())
      throw new Error("One sentence is enough. Write a few words first.");
    entry = {
      id: id(),
      kind: "notice",
      thread: v.thread,
      text: draft.text.trim(),
      perspective: draft.perspective.trim(),
      createdAt: stamp,
    };
    summary = "One moment kept.";
  } else if (v.kind === "practice") {
    if (!draft.opportunity.trim())
      throw new Error("Write what you’ll try, in a few words.");
    entry = {
      id: id(),
      kind: "practice",
      thread: v.thread,
      text: draft.opportunity.trim(),
      createdAt: stamp,
    };
    summary = "Plan kept: " + draft.opportunity.trim();
  } else {
    if (!draft.outcome || !Object.hasOwn(outcomes, draft.outcome))
      throw new Error("Choose how it went.");
    const practice = pendingPractice(book);
    if (!practice?.triedAt)
      throw new Error(
        "Say you tried it first, or come back after you’ve had a chance.",
      );
    entry = {
      id: id(),
      kind: "reflection",
      thread: v.thread,
      text: draft.text.trim(),
      outcome: draft.outcome,
      sourceId: practice.id,
      createdAt: stamp,
    };
    summary = "How it went: " + outcomes[draft.outcome].toLowerCase() + ".";
  }
  return changeLiving(book, (x) => ({
    ...x,
    entries: [...x.entries, entry],
    visit: {
      ...v,
      status: "complete",
      updatedAt: stamp,
      completedAt: stamp,
      summary,
      draft: { text: "", opportunity: "", outcome: "", perspective: "" },
    },
  }));
}
/**
 * Sets a waiting plan aside without trying it. Stored as a reflection on the
 * plan (no outcome), so it stops being "pending" with no schema change.
 */
export function letGoPractice(book: Book): Book {
  const practice = pendingPractice(book);
  if (!practice) throw new Error("There’s no plan waiting.");
  const stamp = now();
  const entry: LivingEntry = {
    id: id(),
    kind: "reflection",
    thread: practice.thread,
    text: "Let this plan go without trying it.",
    sourceId: practice.id,
    createdAt: stamp,
  };
  return changeLiving(book, (x) => ({
    ...x,
    entries: [...x.entries, entry],
    visit:
      x.visit && x.visit.status !== "complete"
        ? {
            ...x.visit,
            status: "complete",
            updatedAt: stamp,
            completedAt: stamp,
            summary: "Plan let go.",
            draft: { text: "", opportunity: "", outcome: "", perspective: "" },
          }
        : x.visit,
  }));
}
export function markTried(book: Book, entryId: string): Book {
  const entry = livingOf(book).entries.find(
    (e) => e.id === entryId && e.kind === "practice",
  );
  if (!entry) throw new Error("This plan is no longer in your book.");
  return changeLiving(book, (l) => ({
    ...l,
    entries: l.entries.map((e) =>
      e.id === entryId ? { ...e, triedAt: now() } : e,
    ),
  }));
}
/**
 * Sets aside an open visit that holds no words yet (say, a plan nobody has
 * had a chance to try) and starts a fresh moment. The earlier plan stays in
 * the book; nothing written is ever dropped.
 */
export function beginNewMoment(book: Book): Book {
  const v = livingOf(book).visit;
  if (v && v.status !== "complete") {
    const d = v.draft;
    if (d.text.trim() || d.opportunity.trim() || d.perspective.trim())
      throw new Error("Save or pause what you’ve written first.");
    book = changeLiving(book, (x) => ({ ...x, visit: undefined }));
  }
  return beginVisit(book, "begin");
}
/** The latest entry kept by a finished visit, for its ending page. */
export function lastEntry(book: Book) {
  return livingOf(book).entries.at(-1);
}
export const joyChoices = [
  "An unhurried walk",
  "Making something together",
  "A little quiet company",
  "A wonderfully silly game",
];
const storyOpening = {
  prompt: "On an ordinary walk, we found…",
  choices: [
    "a tiny door in a tree",
    "a map tucked inside a sandwich",
    "a cloud that had forgotten how to float",
  ],
};
const storyFriend = {
  prompt: "A new friend appeared. It was…",
  choices: [
    "a fox who spoke only in rhymes",
    "a very shy dragon",
    "a snail with an enormous suitcase",
  ],
};
const storyEnding = {
  prompt: "Together, we decided to…",
  choices: [
    "build a home for lost things",
    "throw a party for the moon",
    "invent a kindness nobody had tried before",
  ],
};
const middle = [
  {
    prompt: "We brought along…",
    choices: [
      "a jar of borrowed sunlight",
      "a very small umbrella",
      "a pocket full of brave ideas",
    ],
  },
  {
    prompt: "At a fork in the path, we chose…",
    choices: [
      "the trail that smelled like cinnamon",
      "a bridge made of questions",
      "to ask someone for directions",
    ],
  },
  {
    prompt: "When things got tricky, we…",
    choices: [
      "listened to the quietest voice",
      "made a wonderfully ridiculous plan",
      "took a break and shared a snack",
    ],
  },
];
export const storyRounds = (count: number, audience?: Audience) =>
  audience && audience !== "adult"
    ? childStoryRounds(count, audience)
    : [
        storyOpening,
        storyFriend,
        ...Array.from(
          { length: Math.max(0, count - 3) },
          (_, i) => middle[i % middle.length],
        ),
        storyEnding,
      ];
export const turnCount = (g: Game) => turnPlan(g).length;

// ── Rounds ──────────────────────────────────────────────────────────────────
// A round is a fixed list of turns (turnPlan). Each turn belongs to one player
// and asks one or more questions; the device is passed between turns, so a
// player only ever sees their own answers until the reveal.
//
// Rounds started before five-question Same page? (contentVersion 1, or none
// for adult books) keep one answer per turn in `choices` and play on exactly
// as before. Rounds from contentVersion 2 keep each turn's answers in
// `answers`, and their questions and choices are frozen: a later content
// change starts a new version rather than editing this one.
const isV2 = (g: Pick<Game, "contentVersion">) => g.contentVersion === 2;
/** The kinds that start new rounds at contentVersion 2. */
const roundKinds: GameKind[] = ["match"];
export const SAME_PAGE_COUNT = 5;
export type Ask = { prompt: string; choices: string[]; about?: string };
export type Turn = { player: Player; asks: Ask[] };
const young = (a?: Audience) => a === "under-6" || a === "6-8";
const list = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// The question for a one-question "Same page?" round is fixed by the game's
// ID, so it survives reload, sync and restore without another stored field.
export function samePageRound(g: Pick<Game, "id" | "audience">) {
  const prompts = samePagePrompts(g.audience ?? "under-6");
  let n = 0;
  for (const ch of g.id) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return prompts[n % prompts.length];
}
/** This round's Same page? questions, in the order they're asked. */
export function samePageQuestions(
  g: Pick<Game, "id" | "audience" | "contentVersion" | "questions">,
): SameQuestion[] {
  return isV2(g)
    ? (g.questions || [])
        .map(samePageQuestion)
        .filter((q): q is SameQuestion => !!q)
    : [samePageRound(g)];
}
export const joyOptions = (g: Pick<Game, "audience">) =>
  g.audience && g.audience !== "adult"
    ? childPlayContent(g.audience).joys
    : joyChoices;

/** Every turn of this round, in order: who plays it and what they're asked. */
export function turnPlan(g: Game): Turn[] {
  const n = g.players.length;
  if (g.kind === "match") {
    const asks = samePageQuestions(g).map((q) => ({
      prompt: q.prompt,
      choices: q.choices,
    }));
    return g.players.map((player) => ({ player, asks }));
  }
  if (g.kind === "joy") {
    const options = joyOptions(g),
      chooser = g.players[0];
    const first: Turn = {
      player: chooser,
      asks: [
        {
          prompt: young(g.audience)
            ? "What would you like to do?"
            : "What would brighten an ordinary afternoon for you?",
          choices: options,
        },
      ],
    };
    // The chooser passing ends the round: there's nothing to guess.
    if (g.choices[0] === null) return [first];
    return [
      first,
      ...g.players.slice(1).map((player) => ({
        player,
        asks: [
          {
            prompt: young(g.audience)
              ? `What do you think ${chooser.name} would like?`
              : `What would brighten ${chooser.name}’s ordinary afternoon?`,
            choices: options,
            about: chooser.id,
          },
        ],
      })),
    ];
  }
  return storyRounds(n, g.audience).map((r, i) => ({
    player: g.players[i % n],
    asks: [{ prompt: r.prompt, choices: r.choices }],
  }));
}
/** Each finished turn's answers, one per question asked in that turn. */
export function turnAnswers(g: Game): (number | null)[][] {
  return isV2(g) ? g.answers || [] : g.choices.map((c) => [c]);
}
export const gamePlayer = (g: Game) =>
  turnPlan(g)[g.turn]?.player ?? g.players[g.turn % g.players.length];

// ── Same page? results ──────────────────────────────────────────────────────
export type SamePageLine = {
  question: SameQuestion;
  /** Each player's pick, in the round's player order; null is a pass. */
  picks: (number | null)[];
  answered: number;
  same: boolean;
};
export function samePageResult(g: Game) {
  const answers = turnAnswers(g);
  const lines: SamePageLine[] = samePageQuestions(g).map((question, q) => {
    const picks = g.players.map((_, p) => answers[p]?.[q] ?? null);
    const given = picks.filter((x): x is number => x !== null);
    return {
      question,
      picks,
      answered: given.length,
      same: given.length >= 2 && given.every((x) => x === given[0]),
    };
  });
  const counted = lines.filter((l) => l.answered >= 2);
  return {
    lines,
    /** Questions at least two people answered. */
    counted: counted.length,
    matched: counted.filter((l) => l.same).length,
    differ: counted.filter((l) => !l.same).map((l) => l.question.topic),
  };
}
/** How one question's answers compare, e.g. "2 of 3 chose “take turns”." */
export function pickAgreement(choices: string[], picks: (number | null)[]) {
  const answers = picks.filter((c): c is number => c !== null);
  if (answers.length < 2) return "";
  const counts = new Map<number, number>();
  for (const c of answers) counts.set(c, (counts.get(c) || 0) + 1);
  const [top, most] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const choice = choices[top];
  if (most === answers.length) return `Same page: everyone chose “${choice}”.`;
  if (most === 1) return "Everyone chose something different. Worth a conversation.";
  return `${most} of ${answers.length} chose “${choice}”.`;
}
/** "You matched on 3 of 5." for a five-question round. */
export function samePageSummary(g: Game) {
  const r = samePageResult(g);
  if (!r.counted) return "";
  if (r.lines.length === 1) return pickAgreement(r.lines[0].question.choices, r.lines[0].picks);
  return r.matched === r.counted
    ? `You matched on all ${r.counted}.`
    : `You matched on ${r.matched} of ${r.counted}.`;
}
export const samePageAgreement = samePageSummary;
const playersKey = (players: Pick<Player, "name">[]) =>
  players
    .map((p) => p.name.trim().toLocaleLowerCase())
    .sort()
    .join("\n");
/** Earlier Same page? rounds this book remembers for exactly these players, oldest first. */
function earlierSamePage(l: LivingState, g: Game) {
  const key = playersKey(g.players);
  return (l.plays || []).filter(
    (r) =>
      r.kind === "match" &&
      r.id !== g.id &&
      !!r.questions?.length &&
      playersKey(r.players) === key,
  );
}
function recordTally(r: PlayRecord) {
  let matched = 0,
    counted = 0;
  const differ: string[] = [];
  for (const q of r.questions || []) {
    const given = q.picks.filter((x): x is number => x !== null);
    if (given.length < 2) continue;
    counted++;
    if (given.every((x) => x === given[0])) matched++;
    else {
      const topic = samePageQuestion(q.id)?.topic;
      if (topic) differ.push(topic);
    }
  }
  return { matched, counted, differ };
}
/**
 * A light look back over earlier rounds with the same players, worked out from
 * the answers this book remembers. Empty when there are none.
 */
export function samePageTrend(l: LivingState, g: Game, includeThisRound = false) {
  const earlier = earlierSamePage(l, g)
    .map((r) => ({ ...recordTally(r), playedAt: r.playedAt }))
    .filter((t) => t.counted);
  if (!earlier.length) return "";
  const recent = earlier.slice(-5);
  const line =
    recent.length === 1
      ? `Last time, on ${shortDate(recent[0].playedAt)}, you matched on ${recent[0].matched} of ${recent[0].counted}.`
      : `Over your last ${recent.length} rounds together, you matched on ${recent.reduce((n, t) => n + t.matched, 0)} of ${recent.reduce((n, t) => n + t.counted, 0)}.`;
  const differ = [
    ...earlier.flatMap((t) => t.differ),
    ...(includeThisRound ? samePageResult(g).differ : []),
  ];
  const counts = new Map<string, number>();
  for (const t of differ) counts.set(t, (counts.get(t) || 0) + 1);
  const [topic, times] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return topic && times >= 2 ? `${line} You differ most on ${topic}.` : line;
}
/** What Your book shows for a remembered round, worked out from its answers. */
export function playMemory(r: PlayRecord): {
  summary: string;
  sections: { label: string; text: string }[];
} {
  if (r.kind === "match" && r.questions?.length) {
    const t = recordTally(r);
    const summary = t.counted
      ? [
          t.matched === t.counted
            ? `You matched on all ${t.counted}.`
            : `You matched on ${t.matched} of ${t.counted}.`,
          t.differ.length ? `Different on ${list(t.differ)}.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "Not enough answers to compare.";
    const sections = r.questions.flatMap((q) => {
      const question = samePageQuestion(q.id);
      if (!question) return [];
      return [
        {
          label: question.prompt,
          text: r.players
            .map((p, i) =>
              q.picks[i] === null || q.picks[i] === undefined
                ? `${p.name} passed`
                : `${p.name}: ${question.choices[q.picks[i]!]}`,
            )
            .join(" · "),
        },
      ];
    });
    return { summary, sections };
  }
  return { summary: "", sections: [] };
}
/** The question ids these players were asked most recently, newest first. */
export function recentQuestions(l: LivingState, players: Pick<Player, "name">[]) {
  const key = playersKey(players);
  return (l.plays || [])
    .filter((r) => r.kind === "match" && playersKey(r.players) === key)
    .toReversed()
    .flatMap((r) => (r.questions || []).map((q) => q.id));
}
const random = (n: number) => {
  const x = new Uint32Array(1);
  crypto.getRandomValues(x);
  return x[0] % n;
};
function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** Five questions for this age range, preferring ones these players haven't had lately. */
function chooseQuestions(audience: Audience, recent: string[]) {
  const bank = samePageBank(audience);
  const fresh = shuffled(bank.filter((q) => !recent.includes(q.id)));
  const stale = bank
    .filter((q) => recent.includes(q.id))
    .sort((a, b) => recent.indexOf(b.id) - recent.indexOf(a.id));
  return [...fresh, ...stale].slice(0, SAME_PAGE_COUNT).map((q) => q.id);
}

export function newGame(
  kind: Game["kind"],
  players: Player[],
  editionAudience?: Audience,
  options: { recent?: string[] } = {},
): Game {
  if (
    !gameKinds.includes(kind) ||
    players.length < 2 ||
    players.length > 12 ||
    new Set(players.map((p) => p.id)).size !== players.length ||
    players.some(
      (p) =>
        !p.name.trim() || (p.audience !== undefined && !isAudience(p.audience)),
    ) ||
    (editionAudience !== undefined && !isAudience(editionAudience))
  )
    throw new Error("Choose between 2 and 12 different players.");
  const stamp = now();
  const audience = youngestAudience([
    ...players,
    ...(editionAudience ? [{ audience: editionAudience }] : []),
  ]);
  const rounds = roundKinds.includes(kind);
  return {
    id: id(),
    kind,
    contentVersion: rounds ? 2 : 1,
    audience,
    players: players.map((p) => ({ ...p })),
    stage: "ready",
    turn: 0,
    choices: [],
    ...(rounds ? { answers: [] } : {}),
    ...(rounds && kind === "match"
      ? { questions: chooseQuestions(audience, options.recent || []) }
      : {}),
    approvals: players.map(() => false),
    startedAt: stamp,
    updatedAt: stamp,
  };
}
/** Notes the round left open (if it reached its reveal) and starts a new one. */
export function startGame(
  l: LivingState,
  kind: Game["kind"],
  players: Player[],
  editionAudience?: Audience,
): LivingState {
  const before = recordRound(l);
  return {
    ...before,
    game: newGame(kind, players, editionAudience, {
      recent: kind === "match" ? recentQuestions(before, players) : [],
    }),
  };
}
export function gameText(g: Game): string {
  if (g.kind === "match") {
    const r = samePageResult(g);
    if (!r.lines.some((l) => l.answered)) return "";
    const said = (line: SamePageLine) =>
      g.players
        .map((p, i) =>
          line.picks[i] === null ? "" : `${p.name}: ${line.question.choices[line.picks[i]!]}.`,
        )
        .filter(Boolean)
        .join(" ");
    if (r.lines.length === 1)
      return [r.lines[0].question.prompt, said(r.lines[0]), samePageSummary(g)]
        .filter(Boolean)
        .join(" ");
    return [
      [samePageSummary(g), r.differ.length ? `Different on ${list(r.differ)}.` : ""]
        .filter(Boolean)
        .join(" "),
      ...r.lines
        .filter((l) => l.answered)
        .map((l) => `${l.question.prompt} ${said(l)}`),
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (g.kind === "joy")
    return Number.isInteger(g.choices[0])
      ? `A small joy for ${g.players[0].name}: ${joyOptions(g)[g.choices[0]!].toLowerCase()}.`
      : "";
  const rounds = storyRounds(g.players.length, g.audience);
  return g.choices
    .map((c, i) =>
      c === null
        ? ""
        : `${rounds[i].prompt.replace(/…$/, "")} ${rounds[i].choices[c]}.`,
    )
    .filter(Boolean)
    .join(" ");
}
export type GameAction =
  | { type: "start"; firstId?: string }
  | { type: "ready" | "finish" }
  /** One answer, for a turn with one question; null passes the whole turn. */
  | { type: "choice"; choice: number | null }
  /** Every answer in a turn with several questions; null passes one. */
  | { type: "answer"; answers: (number | null)[] }
  | { type: "approve"; playerId: string };
export function advanceGame(g: Game, action: GameAction): Game {
  const stamp = now();
  if (action.type === "start" && g.stage === "ready") {
    const first = action.firstId || g.players[0].id;
    if (!g.players.some((p) => p.id === first))
      throw new Error("Choose a player from this group.");
    return {
      ...g,
      players: [
        g.players.find((p) => p.id === first)!,
        ...g.players.filter((p) => p.id !== first),
      ],
      stage: "choose",
      approvals: g.players.map(() => false),
      updatedAt: stamp,
    };
  }
  if (action.type === "ready" && g.stage === "handoff")
    return { ...g, stage: "choose", updatedAt: stamp };
  if ((action.type === "choice" || action.type === "answer") && g.stage === "choose") {
    const asks = turnPlan(g)[g.turn]?.asks || [];
    const answers =
      action.type === "answer"
        ? action.answers
        : asks.length === 1 || action.choice === null
          ? asks.map(() => action.choice)
          : [];
    if (
      !asks.length ||
      !Array.isArray(answers) ||
      answers.length !== asks.length ||
      answers.some(
        (a, j) =>
          a !== null &&
          (!Number.isInteger(a) || a < 0 || a >= asks[j].choices.length),
      )
    )
      throw new Error("Choose an available answer.");
    const turn = g.turn + 1;
    const next: Game = isV2(g)
      ? { ...g, answers: [...(g.answers || []), [...answers]], turn }
      : { ...g, choices: [...g.choices, answers[0]], turn };
    return {
      ...next,
      stage: turn >= turnCount(next) ? "reveal" : "handoff",
      updatedAt: stamp,
    };
  }
  if (action.type === "approve" && g.stage === "reveal" && gameText(g)) {
    const index = g.players.findIndex((p) => p.id === action.playerId);
    if (index < 0) throw new Error("This person is not playing.");
    return {
      ...g,
      approvals: g.approvals.map((x, i) => (i === index ? !x : x)),
      updatedAt: stamp,
    };
  }
  if (action.type === "finish" && ["reveal", "kept"].includes(g.stage))
    return { ...g, stage: "finished", finishedAt: stamp, updatedAt: stamp };
  throw new Error("That action is not available at this point in the game.");
}
export function keepGame(book: Book): Book {
  const l = livingOf(book),
    g = l.game;
  if (!g || g.stage !== "reveal" || !gameText(g) || !g.approvals.every(Boolean))
    throw new Error("Every player must approve these exact words first.");
  const page: SharedPage = {
    id: id(),
    kind: g.kind,
    title:
      g.kind === "joy"
        ? "A small joy, learned together"
        : g.kind === "match"
          ? "Are we on the same page?"
          : "Our unlikely adventure",
    text: gameText(g),
    players: g.players,
    approvedBy: g.players.map((p) => p.id),
    createdAt: now(),
  };
  return changeLiving(book, (x) => ({
    ...x,
    sharedPages: [...x.sharedPages, page],
    game: { ...g, stage: "kept", savedPageId: page.id, updatedAt: now() },
  }));
}

/** What a finished round remembers: its answers, for contentVersion 2 rounds. */
function roundMemory(g: Game): Partial<PlayRecord> {
  if (!isV2(g)) return {};
  if (g.kind === "match")
    return {
      questions: samePageResult(g).lines.map((l) => ({
        id: l.question.id,
        picks: l.picks,
      })),
    };
  return {};
}
const memoryOf = (r: PlayRecord) =>
  r.questions !== undefined;
/** Answers stay on the newest ANSWERS_KEPT rounds; older records keep only names and a date. */
function trimMemory(plays: PlayRecord[]) {
  let kept = 0;
  return plays
    .toReversed()
    .map((r) => {
      if (!memoryOf(r) || ++kept <= ANSWERS_KEPT) return r;
      const rest = { ...r };
      delete rest.questions;
      return rest;
    })
    .toReversed();
}
/**
 * Notes that the open round was played, once per game, as soon as it has
 * reached its reveal (whether or not a page was kept). Newer rounds also keep
 * their answers, so later rounds can look back. Rounds that never reached the
 * reveal leave no trace.
 */
export function recordRound(l: LivingState): LivingState {
  const g = l.game;
  if (!g || !["reveal", "kept", "finished"].includes(g.stage)) return l;
  const plays = l.plays || [];
  const previous = plays.find((r) => r.id === g.id);
  const record: PlayRecord = {
    id: g.id,
    kind: g.kind,
    players: g.players.map((p) => ({ id: p.id, name: p.name })),
    playedAt: previous?.playedAt || g.finishedAt || g.updatedAt,
    ...(g.savedPageId ? { pageId: g.savedPageId } : {}),
    ...roundMemory(g),
  };
  if (previous && JSON.stringify(previous) === JSON.stringify(record)) return l;
  return {
    ...l,
    plays: trimMemory(
      previous
        ? plays.map((r) => (r.id === g.id ? record : r))
        : [...plays, record].slice(-PLAY_LIMIT),
    ),
  };
}
/** Ends the open round and notes that it was played. */
export function finishGame(book: Book): Book {
  return changeLiving(book, (x) => {
    if (!x.game) throw new Error("No game is open.");
    return recordRound({ ...x, game: advanceGame(x.game, { type: "finish" }) });
  });
}

// Imported encrypted backups are untrusted structured data. Reject invalid states
// before they can reach navigation, turn indexing, or completion transitions.
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 10000): v is string =>
  typeof v === "string" && v.length <= max;
const date = (v: unknown) => str(v, 40) && Number.isFinite(Date.parse(v));
const optional = (v: unknown, test: (v: unknown) => boolean) =>
  v === undefined || test(v);
const player = (p: unknown): p is Player =>
  obj(p) &&
  str(p.id, 100) &&
  !!p.id &&
  str(p.name, 80) &&
  !!p.name.trim() &&
  optional(p.audience, isAudience);
export function isLiving(value: unknown): value is LivingState {
  if (
    !obj(value) ||
    value.version !== 1 ||
    !optional(value.thread, isThread) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(value.sharedPages)
  )
    return false;
  if (
    !value.entries.every(
      (e) =>
        obj(e) &&
        str(e.id, 100) &&
        ["notice", "practice", "reflection"].includes(String(e.kind)) &&
        isThread(e.thread) &&
        str(e.text) &&
        date(e.createdAt) &&
        optional(e.perspective, (x) => str(x)) &&
        optional(
          e.outcome,
          (x) => typeof x === "string" && Object.hasOwn(outcomes, x),
        ) &&
        optional(e.sourceId, (x) => str(x, 100)) &&
        optional(e.triedAt, date),
    )
  )
    return false;
  if (new Set(value.entries.map((e) => e.id)).size !== value.entries.length)
    return false;
  if (
    !value.sharedPages.every(
      (p) =>
        obj(p) &&
        str(p.id, 100) &&
        gameKinds.includes(p.kind as GameKind) &&
        str(p.title, 200) &&
        str(p.text) &&
        date(p.createdAt) &&
        Array.isArray(p.players) &&
        p.players.length >= 2 &&
        p.players.length <= 12 &&
        p.players.every(player) &&
        new Set(p.players.map((x) => x.id)).size === p.players.length &&
        Array.isArray(p.approvedBy) &&
        p.approvedBy.length === p.players.length &&
        p.players.every((x) => (p.approvedBy as unknown[]).includes(x.id)),
    )
  )
    return false;
  if (value.plays !== undefined) {
    if (
      !Array.isArray(value.plays) ||
      value.plays.length > PLAY_LIMIT ||
      new Set(value.plays.map((r) => (obj(r) ? r.id : r))).size !==
        value.plays.length ||
      !value.plays.every(
        (r) =>
          obj(r) &&
          str(r.id, 100) &&
          !!r.id &&
          gameKinds.includes(r.kind as GameKind) &&
          date(r.playedAt) &&
          optional(r.pageId, (x) => str(x, 100) && !!x) &&
          Array.isArray(r.players) &&
          r.players.length >= 2 &&
          r.players.length <= 12 &&
          r.players.every(player) &&
          new Set(r.players.map((x) => x.id)).size === r.players.length &&
          optional(
            r.questions,
            (q) =>
              r.kind === "match" &&
              Array.isArray(q) &&
              q.length <= 10 &&
              q.every(
                (x) =>
                  obj(x) &&
                  str(x.id, 60) &&
                  !!x.id &&
                  Array.isArray(x.picks) &&
                  x.picks.length === (r.players as unknown[]).length &&
                  x.picks.every(
                    (c) => c === null || (Number.isInteger(c) && c >= 0 && c < 3),
                  ),
              ),
          ),
      ) ||
      value.plays.filter((r) => memoryOf(r as PlayRecord)).length > ANSWERS_KEPT
    )
      return false;
  }
  const v = value.visit;
  if (v !== undefined) {
    if (
      !obj(v) ||
      !str(v.id, 100) ||
      typeof v.kind !== "string" ||
      !Object.hasOwn(plans, v.kind) ||
      !["active", "paused", "complete"].includes(String(v.status)) ||
      !Number.isInteger(v.step) ||
      !(v.step === 0 || (v.kind === "begin" && v.step === 1)) ||
      !date(v.startedAt) ||
      !date(v.updatedAt) ||
      !optional(v.thread, isThread) ||
      !optional(v.completedAt, date) ||
      !optional(v.summary, (x) => str(x)) ||
      !obj(v.draft)
    )
      return false;
    if (
      !str(v.draft.text) ||
      !str(v.draft.opportunity, 500) ||
      !str(v.draft.perspective) ||
      !(
        v.draft.outcome === "" ||
        (typeof v.draft.outcome === "string" &&
          Object.hasOwn(outcomes, v.draft.outcome))
      )
    )
      return false;
    if (v.status === "complete" && (!v.completedAt || !v.summary || !v.thread))
      return false;
    if ((v.kind !== "begin" || v.step === 1) && !v.thread) return false;
  }
  if (value.game !== undefined && !isGame(value.game, value.sharedPages))
    return false;
  return true;
}

const stages = ["ready", "choose", "handoff", "reveal", "kept", "finished"];
function isGame(g: unknown, sharedPages: unknown[]): boolean {
  if (
    !obj(g) ||
    !str(g.id, 100) ||
    !optional(g.audience, isAudience) ||
    (g.audience === undefined
      ? g.contentVersion !== undefined
      : g.contentVersion !== 1 && g.contentVersion !== 2) ||
    !gameKinds.includes(g.kind as GameKind) ||
    !stages.includes(String(g.stage)) ||
    !Array.isArray(g.players) ||
    g.players.length < 2 ||
    g.players.length > 12 ||
    !g.players.every(player) ||
    new Set(g.players.map((p) => p.id)).size !== g.players.length ||
    !Array.isArray(g.approvals) ||
    g.approvals.length !== g.players.length ||
    !g.approvals.every((x) => typeof x === "boolean") ||
    !date(g.startedAt) ||
    !date(g.updatedAt) ||
    !optional(g.finishedAt, date) ||
    !optional(g.savedPageId, (x) => str(x, 100)) ||
    !Number.isInteger(g.turn) ||
    (g.turn as number) < 0 ||
    !Array.isArray(g.choices)
  )
    return false;
  const v2 = g.contentVersion === 2;
  if (v2) {
    if (!Array.isArray(g.answers) || g.choices.length) return false;
    if (g.kind === "match") {
      const bank = samePageBank(g.audience as Audience);
      if (
        !Array.isArray(g.questions) ||
        g.questions.length !== SAME_PAGE_COUNT ||
        new Set(g.questions).size !== g.questions.length ||
        !g.questions.every((q) => bank.some((x) => x.id === q))
      )
        return false;
    } else if (g.questions !== undefined) return false;
  } else if (g.answers !== undefined || g.questions !== undefined) return false;
  const game = g as Game;
  const given = v2 ? (g.answers as unknown[]) : g.choices.map((c) => [c]);
  if (given.length !== game.turn) return false;
  // Each turn's answers must fit what that turn asked, given the turns before it.
  for (let i = 0; i < given.length; i++) {
    const before: Game = v2
      ? { ...game, answers: (given as (number | null)[][]).slice(0, i) }
      : { ...game, choices: game.choices.slice(0, i) };
    const asks = turnPlan(before)[i]?.asks;
    const answers = given[i];
    if (
      !asks ||
      !Array.isArray(answers) ||
      answers.length !== asks.length ||
      !answers.every(
        (c, j) =>
          c === null ||
          (Number.isInteger(c) && c >= 0 && c < asks[j].choices.length),
      )
    )
      return false;
  }
  const done = game.turn === turnCount(game);
  if (
    game.turn > turnCount(game) ||
    ["reveal", "kept", "finished"].includes(game.stage) !== done ||
    (game.stage === "ready" && game.turn !== 0) ||
    (game.stage === "handoff" && game.turn === 0)
  )
    return false;
  if (
    ["ready", "choose", "handoff"].includes(game.stage) &&
    game.approvals.some(Boolean)
  )
    return false;
  if (game.stage === "finished" && !game.finishedAt) return false;
  if (game.stage === "kept" && !game.savedPageId) return false;
  if (
    game.savedPageId &&
    (!game.approvals.every(Boolean) ||
      !sharedPages.some((p) => obj(p) && p.id === game.savedPageId))
  )
    return false;
  return true;
}
