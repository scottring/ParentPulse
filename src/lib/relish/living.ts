import type { Book } from "./model";
import { isAudience, youngestAudience, type Audience } from "./profiles";
import {
  adultJoysMore,
  childPlayContent,
  childStoryRounds,
  samePageBank,
  samePagePrompts,
  samePageQuestion,
  SPOT_SIZE,
  spotBank,
  spotSquare,
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
/** One player's own line about a finished round. */
export type Reflection = { playerId: string; text: string };
export const REFLECTION_LIMIT = 280;
export type GameKind = "joy" | "story" | "match" | "spot";
export const gameKinds: GameKind[] = ["joy", "story", "match", "spot"];
/**
 * Spot it!: the card's squares (ids from play-content) and, for each square,
 * who spotted it: a player's index in `players`, SPOT_ALL for "We all did",
 * or null while it's still waiting.
 */
export type SpotCard = {
  squares: string[];
  marks: (number | null)[];
  /**
   * The family's own words for a square, in place of the card's: own[i] is
   * shown instead of square i. Absent (or null) keeps the card's square.
   */
  own?: (string | null)[];
};
export const SPOT_ALL = -1;
/** A Spot it! square in your own words: a few words, like the card's. */
export const SQUARE_LIMIT = 40;
/** "Where were you headed?" — a few words, e.g. "Grandma’s". */
export const PLACE_LIMIT = 60;
/** Same page? in your own words: an answer or a guess, a few words long. */
export const SAID_LIMIT = 80;
/** How close a guess came, as the person who answered judged it. */
export type SaidMark = "got" | "close" | "not";
export const saidMarks: SaidMark[] = ["got", "close", "not"];
export type SaidGuess = { playerId: string; text: string | null; mark?: SaidMark };
/**
 * One question of a Same page? round from contentVersion 3: whose turn it was
 * to answer (`by`), their own words (null for a pass) and each other player's
 * guess in turn order (text null for a pass; no guesses when the answer passed).
 */
export type Said = { by: string; answer: string | null; guesses: SaidGuess[] };
/**
 * Guess my small joy and One story (contentVersion 2): an answer in the
 * player's own words instead of one from the list. Its place in `answers`
 * (turn, then question in that turn) holds null, so a round read without it
 * sees a pass. Text is at most SAID_LIMIT long.
 */
export type OwnAnswer = {
  turn: number;
  ask: number;
  text: string;
  /** A guess at a small joy written in its own words: how close it came, judged by whoever picked it. */
  mark?: SaidMark;
};
export type Game = {
  audience?: Audience;
  /**
   * 1: one answer per turn in `choices`. 2: turns of several answers in
   * `answers`. 3 (Same page? only): answers in the players' own words in `said`.
   */
  contentVersion?: 1 | 2 | 3;
  id: string;
  kind: GameKind;
  players: Player[];
  /**
   * "judge": contentVersion 3 Same page?, everyone sees one answer and its
   * guesses; or a small joy round where someone wrote their own, before the reveal.
   */
  stage: "ready" | "choose" | "handoff" | "judge" | "reveal" | "kept" | "finished";
  turn: number;
  /** contentVersion 1 (or none): one answer per turn. Empty from version 2. */
  choices: (number | null)[];
  /** contentVersion 2: each finished turn's answers, one per question asked. */
  answers?: (number | null)[][];
  /** contentVersion 2 joy and story: answers written in the players' own words. */
  own?: OwnAnswer[];
  /** Same page? from contentVersion 2: the question ids, fixed when the round starts. */
  questions?: string[];
  /** contentVersion 3 Same page?: each question played so far, in order. */
  said?: Said[];
  /** contentVersion 2 story: the title the group picked at the end. */
  title?: string;
  /** After the reveal, each player may add one line of their own. */
  reflections?: Reflection[];
  /** Spot it!: the card and who spotted what. */
  spot?: SpotCard;
  /** Spot it!: where the car was headed, when someone said. */
  place?: string;
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
  /** Same page? in your own words: each question's id, answer and guesses. */
  said?: (Said & { id: string })[];
  /** Guess my small joy: each player's own pick, in `players` order. */
  joys?: (string | null)[];
  /** Guess my small joy: guesses[guesser][target], null for a pass or no guess. */
  guesses?: (string | null)[][];
  /** Guess my small joy: which players wrote their own joy, when anyone did. */
  ownJoys?: boolean[];
  /** Guess my small joy: marks[guesser][target] for guesses at a joy someone wrote. */
  marks?: (SaidMark | null)[][];
  /** One story: its lines in order, and the title the group picked. */
  story?: string[];
  title?: string;
  /** Each player's own line about the round, when they wrote one. */
  reflections?: Reflection[];
  /** Spot it!: the card, with marks by index into `players`. */
  spot?: SpotCard;
  /** Spot it!: where the car was headed. */
  place?: string;
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
//
// Same page? rounds from contentVersion 3 are played in the players' own
// words: one player answers, everyone else guesses, then the one who answered
// judges the guesses before the next question (see `said`).
const isV2 = (g: Pick<Game, "contentVersion">) => g.contentVersion === 2;
/** A Same page? round answered in the players' own words (contentVersion 3). */
export const ownWords = (g: Pick<Game, "kind" | "contentVersion">) =>
  g.kind === "match" && g.contentVersion === 3;
/** The words written for question `ask` of turn `turn`, if any (joy and story). */
export const ownAnswer = (g: Pick<Game, "own">, turn: number, ask: number) =>
  g.own?.find((o) => o.turn === turn && o.ask === ask);
/** The kinds that start new rounds at contentVersion 2. */
const roundKinds: GameKind[] = ["match", "joy", "story", "spot"];
/** A story runs at least this many turns, so two players go around more than once. */
export const STORY_TURNS = 5;
export const TITLE_LIMIT = 60;
export const SAME_PAGE_COUNT = 5;
/** In your own words, everyone answers at least once, and a round has at least three questions. */
export const SAID_MIN = 3;
export const saidCount = (players: number) => Math.max(SAID_MIN, players);
/** Who answers question q: players take turns, in round order. */
export const sharerOf = <P>(players: P[], q: number) => players[q % players.length];
/** Who guesses question q: everyone else, starting with the next player. */
export function guessersOf<P>(players: P[], q: number) {
  const n = players.length,
    s = q % n;
  return Array.from({ length: n - 1 }, (_, k) => players[(s + 1 + k) % n]);
}
/** Trims an answer or guess to a few words; "" when nothing is left. */
export const cleanSaid = (text: string) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SAID_LIMIT)
    .trim();
export type Ask = {
  prompt: string;
  /** The list to pick from; with `write: "only"`, ideas to tap. */
  choices: string[];
  /**
   * "also": pick from the list or write your own. "only": answer in your own
   * words (a guess at a joy someone wrote), with the list as ideas.
   */
  write?: "also" | "only";
  /** Whose answer this question is about (a joy guess). */
  about?: string;
  /** A short line under the question. */
  hint?: string;
};
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
  return isV2(g) || g.contentVersion === 3
    ? (g.questions || [])
        .map(samePageQuestion)
        .filter((q): q is SameQuestion => !!q)
    : [samePageRound(g)];
}
/** One-chooser rounds offer four small joys; everyone-guessed rounds offer ten. */
export function joyOptions(g: Pick<Game, "audience" | "contentVersion">) {
  const all =
    g.audience && g.audience !== "adult"
      ? childPlayContent(g.audience).joys
      : [...joyChoices, ...adultJoysMore];
  return all.slice(0, isV2(g) ? 10 : 4);
}
/** A repeatable shuffle, so a guess's options survive reload and sync. */
function seededShuffle<T>(items: T[], seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** The four joys offered when guessing someone's: theirs and three others. */
function guessOptions(g: Game, target: Player, pick: number) {
  const all = joyOptions(g);
  const seed = `${g.id}:${target.id}`;
  const others = seededShuffle(
    all.filter((_, i) => i !== pick),
    seed,
  ).slice(0, 3);
  return seededShuffle([all[pick], ...others], `${seed}:order`);
}

/** Every turn of this round, in order: who plays it and what they're asked. */
export function turnPlan(g: Game): Turn[] {
  const n = g.players.length;
  // Spot it! has no turns: anyone calls out, and the holder taps the card.
  if (g.kind === "spot") return [];
  if (ownWords(g)) {
    // Each question: one player answers, then everyone else guesses. A pass
    // leaves nothing to guess, so that question has no guessing turns.
    const said = g.said || [];
    return samePageQuestions(g).flatMap((q, i) => {
      const sharer = sharerOf(g.players, i);
      const ask = { prompt: q.prompt, choices: q.choices };
      const share: Turn = { player: sharer, asks: [ask] };
      if (said[i]?.answer === null) return [share];
      return [
        share,
        ...guessersOf(g.players, i).map((player) => ({
          player,
          asks: [{ ...ask, about: sharer.id }],
        })),
      ];
    });
  }
  if (g.kind === "match") {
    const asks = samePageQuestions(g).map((q) => ({
      prompt: q.prompt,
      choices: q.choices,
    }));
    return g.players.map((player) => ({ player, asks }));
  }
  if (g.kind === "joy" && isV2(g)) {
    // First everyone picks their own in private, then each person guesses
    // everyone else's. Until every pick is in, the guessing turns are
    // provisional; nobody sees them before then.
    // Someone who writes their own joy is guessed in words: dropped into a
    // list of four, it would be the one nobody had seen before.
    const options = joyOptions(g);
    const answers = g.answers || [];
    const picks = g.players.map((_, i) =>
      i < answers.length
        ? ownAnswer(g, i, 0)
          ? ("own" as const)
          : (answers[i][0] ?? null)
        : 0,
    );
    const picking: Turn[] = g.players.map((player) => ({
      player,
      asks: [
        {
          prompt: young(g.audience)
            ? "What would you like to do most?"
            : "What would brighten an ordinary afternoon for you?",
          choices: options,
          write: "also",
          about: player.id,
          hint: "Pick in private. Everyone guesses after.",
        },
      ],
    }));
    const guessing: Turn[] = g.players.flatMap((player, i) => {
      const asks = g.players.flatMap((target, j): Ask[] => {
        const pick = picks[j];
        if (j === i || pick === null) return [];
        const prompt = young(g.audience)
          ? `What do you think ${target.name} picked?`
          : `What do you think brightens ${target.name}’s afternoon?`;
        return [
          pick === "own"
            ? {
                prompt,
                choices: options,
                write: "only",
                about: target.id,
                hint: `${target.name} wrote their own. Guess in your own words.`,
              }
            : { prompt, choices: guessOptions(g, target, pick), about: target.id },
        ];
      });
      return asks.length ? [{ player, asks }] : [];
    });
    return [...picking, ...guessing];
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
  return storyRounds(isV2(g) ? Math.max(STORY_TURNS, n) : n, g.audience).map((r, i) => ({
    player: g.players[i % n],
    asks: [
      isV2(g)
        ? { prompt: r.prompt, choices: r.choices, write: "also" as const }
        : { prompt: r.prompt, choices: r.choices },
    ],
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
  if (ownWords(g)) return saidTrend(l, g);
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
// ── Same page? in your own words ────────────────────────────────────────────
export type SaidLine = {
  question: SameQuestion;
  sharer: Pick<Player, "id" | "name">;
  /** The sharer's own words; null for a pass. */
  answer: string | null;
  guesses: { player: Pick<Player, "id" | "name">; text: string | null; mark?: SaidMark }[];
};
/** Each question with the sharer's answer and every guess, by name. */
export function saidLines(
  players: Pick<Player, "id" | "name">[],
  said: (Said & { id: string })[],
): SaidLine[] {
  const named = (id: string) => players.find((p) => p.id === id);
  return said.flatMap((s) => {
    const question = samePageQuestion(s.id),
      sharer = named(s.by);
    if (!question || !sharer) return [];
    return [
      {
        question,
        sharer,
        answer: s.answer,
        guesses: s.guesses.flatMap((x) => {
          const player = named(x.playerId);
          return player
            ? [{ player, text: x.text, ...(x.mark ? { mark: x.mark } : {}) }]
            : [];
        }),
      },
    ];
  });
}
/** This round's questions so far, each with its id. */
const saidSoFar = (g: Game) =>
  (g.said || []).map((s, i) => ({ ...s, id: g.questions?.[i] || "" }));
export const saidResult = (g: Game) => saidLines(g.players, saidSoFar(g));
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
/** Right guesses out of the judged ones, across every question. */
function saidCounts(lines: SaidLine[]) {
  const judged = lines.flatMap((l) => l.guesses).filter((x) => x.text !== null && x.mark);
  return { got: judged.filter((x) => x.mark === "got").length, judged: judged.length };
}
/** "You got 3 of 5 right." Empty when no guess was judged. */
export function saidRoundLine(lines: SaidLine[]) {
  const { got, judged } = saidCounts(lines);
  if (!judged) return "";
  if (got === judged) return judged === 1 ? "You got it right." : `You got all ${judged} right.`;
  return `You got ${got} of ${judged} right.`;
}
/** Who knew whom best: "Anna got 2 of 3; Leo was close twice; June passed." */
export function saidTally(lines: SaidLine[], players: Pick<Player, "id" | "name">[]) {
  const parts = players.flatMap((p) => {
    const mine = lines.flatMap((l) => l.guesses.filter((x) => x.player.id === p.id));
    if (!mine.length) return [];
    const guessed = mine.filter((x) => x.text !== null);
    if (!guessed.length) return [`${p.name} passed`];
    const judged = guessed.filter((x) => x.mark);
    if (!judged.length) return [];
    const got = judged.filter((x) => x.mark === "got").length,
      close = judged.filter((x) => x.mark === "close").length;
    if (got)
      return [
        `${p.name} got ${got} of ${judged.length}${close ? ` and was close ${times(close)}` : ""}`,
      ];
    if (close) return [`${p.name} was close ${times(close)}`];
    return [`${p.name} didn’t get ${judged.length === 1 ? "it" : "any"} this time`];
  });
  // A line of passes alone says nothing new.
  return parts.every((x) => x.endsWith(" passed")) ? "" : `${parts.join("; ")}.`;
}
/** One guess, said aloud: "Anna got it", "Leo was close with “pasta”". */
export function guessWords(x: SaidLine["guesses"][number]) {
  if (x.text === null) return `${x.player.name} passed`;
  if (x.mark === "got") return `${x.player.name} got it`;
  if (x.mark === "close") return `${x.player.name} was close with “${x.text}”`;
  return `${x.player.name} guessed “${x.text}”`;
}
/** A question as it reads in a shared page or Your book. */
function saidWords(l: SaidLine) {
  if (l.answer === null) return `${l.sharer.name} passed.`;
  return [
    `${l.sharer.name} said “${l.answer}”.`,
    ...l.guesses.map((x) => `${guessWords(x)}.`),
  ].join(" ");
}
function saidSummary(lines: SaidLine[], players: Pick<Player, "id" | "name">[]) {
  if (!lines.some((l) => l.answer !== null)) return "Everyone passed.";
  return (
    [saidRoundLine(lines), saidTally(lines, players)].filter(Boolean).join(" ") ||
    "Answered in your own words."
  );
}
/** Earlier own-words rounds with exactly these players: right guesses out of judged ones. */
function saidTrend(l: LivingState, g: Game) {
  const key = playersKey(g.players);
  const earlier = (l.plays || [])
    .filter(
      (r) =>
        r.kind === "match" &&
        r.id !== g.id &&
        !!r.said?.length &&
        playersKey(r.players) === key,
    )
    .map((r) => ({ ...saidCounts(saidLines(r.players, r.said!)), playedAt: r.playedAt }))
    .filter((t) => t.judged);
  if (!earlier.length) return "";
  const recent = earlier.slice(-5);
  if (recent.length === 1)
    return `Last time, on ${shortDate(recent[0].playedAt)}, you got ${recent[0].got} of ${recent[0].judged} right.`;
  return `Over your last ${recent.length} rounds together, you got ${recent.reduce((n, t) => n + t.got, 0)} of ${recent.reduce((n, t) => n + t.judged, 0)} right.`;
}

/** Each player's own line about the round, labelled with their name. */
export function reflectionSections(r: Pick<PlayRecord, "players" | "reflections">) {
  return (r.reflections || []).flatMap((x) => {
    const name = r.players.find((p) => p.id === x.playerId)?.name;
    return name ? [{ label: `${name} remembers`, text: x.text }] : [];
  });
}
/** What Your book shows for a remembered round: its result and each player's line. */
export function playMemory(r: PlayRecord) {
  const memory = roundSummary(r);
  return { ...memory, sections: [...memory.sections, ...reflectionSections(r)] };
}
function roundSummary(r: PlayRecord): {
  summary: string;
  sections: { label: string; text: string }[];
} {
  if (r.kind === "match" && r.said?.length) {
    const lines = saidLines(r.players, r.said);
    return {
      summary: saidSummary(lines, r.players),
      sections: lines.map((l) => ({ label: l.question.prompt, text: saidWords(l) })),
    };
  }
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
  if (r.kind === "spot" && r.spot) {
    const result = spotResult(r.players, r.spot);
    const spotted = result.squares.filter((x) => x.by !== null && x.text);
    const missed = result.squares.filter((x) => x.by === null && x.text);
    return {
      summary: result.spotted
        ? `${spotSummary(r.players, r.spot)} ${result.spotted} of ${r.spot.squares.length} spotted.`
        : "Nothing spotted this time.",
      sections: [
        ...(spotted.length
          ? [
              {
                label: "Spotted",
                text: spotted
                  .map((x) => `${x.text}: ${x.by === SPOT_ALL ? "everyone" : x.who}`)
                  .join(" · "),
              },
            ]
          : []),
        ...(missed.length
          ? [{ label: "Still out there", text: missed.map((x) => x.text).join(" · ") }]
          : []),
      ],
    };
  }
  if (r.kind === "story" && r.story) {
    return {
      summary: r.title
        ? `“${r.title}”, told together.`
        : r.story.length
          ? "A story, told together."
          : "Everyone passed.",
      sections: r.story.length ? [{ label: "The story", text: r.story.join(" ") }] : [],
    };
  }
  if (r.kind === "joy" && r.joys) {
    const players = r.players as Player[];
    const result = joyLines(players, r.joys, r.guesses || [], r.ownJoys, r.marks);
    return {
      summary: tallyLine(result) || "Everyone passed.",
      sections: result.lines.map((l) => ({
        label: `${l.player.name}’s small joy`,
        text: `${l.pick}. ${knewLine(l)}`,
      })),
    };
  }
  return { summary: "", sections: [] };
}
/** The question ids these players were asked most recently, newest first. */
export function recentQuestions(l: LivingState, players: Pick<Player, "name">[]) {
  const key = playersKey(players);
  return (l.plays || [])
    .filter((r) => r.kind === "match" && playersKey(r.players) === key)
    .toReversed()
    .flatMap((r) => [
      ...(r.questions || []).map((q) => q.id),
      ...(r.said || []).map((q) => q.id),
    ]);
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
/** A round's questions for this age range, preferring ones these players haven't had lately. */
function chooseQuestions(audience: Audience, recent: string[], count = SAME_PAGE_COUNT) {
  const bank = samePageBank(audience);
  const fresh = shuffled(bank.filter((q) => !recent.includes(q.id)));
  const stale = bank
    .filter((q) => recent.includes(q.id))
    .sort((a, b) => recent.indexOf(b.id) - recent.indexOf(a.id));
  return [...fresh, ...stale].slice(0, count).map((q) => q.id);
}

// ── Spot it! ────────────────────────────────────────────────────────────────
// One phone, held by a passenger who reads aloud and taps. There are no turns
// and nothing is private: the card fills in as people call things out.
const spotRows = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
/** Full lines of three on the card (rows, columns and diagonals). */
export function spotLines(card: SpotCard) {
  return spotRows.filter((row) => row.every((i) => card.marks[i] !== null && card.marks[i] !== undefined))
    .length;
}
/** Each square with who spotted it, and how many each player spotted. */
export function spotResult(players: Pick<Player, "id" | "name">[], card: SpotCard) {
  const squares = card.squares.map((id, i) => {
    const by = card.marks[i] ?? null;
    const own = card.own?.[i] || "";
    return {
      id,
      text: own || spotSquare(id)?.text || "",
      /** The family wrote this square themselves. */
      own: !!own,
      by,
      who:
        by === null
          ? ""
          : by === SPOT_ALL
            ? "Everyone"
            : players[by]?.name || "",
    };
  });
  const spotted = squares.filter((x) => x.by !== null).length;
  const together = squares.filter((x) => x.by === SPOT_ALL).length;
  const tally = players.map((player, i) => ({
    player,
    count: squares.filter((x) => x.by === i).length,
  }));
  return { squares, spotted, together, tally };
}
/** "Anna spotted the most: 4." */
export function spotSummary(players: Pick<Player, "id" | "name">[], card: SpotCard) {
  const { spotted, together, tally } = spotResult(players, card);
  if (!spotted) return "Nothing spotted this time.";
  const best = Math.max(0, ...tally.map((t) => t.count));
  if (!best) return `You spotted ${together} together.`;
  const top = tally.filter((t) => t.count === best);
  return top.length === 1
    ? `${top[0].player.name} spotted the most: ${best}.`
    : `${list(top.map((t) => t.player.name))} each spotted ${best}.`;
}
/** A square in your own words: one line, a few words. "" when nothing is left. */
export const cleanSquare = (text: string) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SQUARE_LIMIT)
    .trim();
/** The card with square i in the family's own words ("" goes back to the card's). */
function writeSquare(card: SpotCard, i: number, text: string): SpotCard {
  const own = card.squares.map((_, k) => (k === i ? text || null : card.own?.[k] ?? null));
  const next: SpotCard = { ...card, own };
  if (!own.some(Boolean)) delete next.own;
  return next;
}
/** "Grandma’s" from "on the way to Grandma’s", trimmed to fit. */
export function cleanPlace(text: string) {
  return String(text || "")
    .trim()
    .replace(/^(on (the|our) way to|headed to|heading to|going to|to)\s+/i, "")
    .replace(/[.\s]+$/, "")
    .slice(0, PLACE_LIMIT)
    .trim();
}
/** The square ids on recent cards, newest first, so a new card feels fresh. */
export function recentSquares(l: LivingState) {
  return (l.plays || [])
    .filter((r) => r.kind === "spot")
    .toReversed()
    .flatMap((r) => r.spot?.squares || []);
}
function chooseSquares(audience: Audience, recent: string[]) {
  const bank = spotBank(audience);
  const fresh = shuffled(bank.filter((q) => !recent.includes(q.id)));
  const stale = shuffled(bank.filter((q) => recent.includes(q.id)));
  return [...fresh, ...stale].slice(0, SPOT_SIZE).map((q) => q.id);
}

// ── Guess my small joy results ──────────────────────────────────────────────
/**
 * How one guess went. A guess at a joy picked from the list is right or not;
 * a guess at a joy someone wrote is judged by them, and stays "open" when
 * judging was skipped (unless it matches word for word).
 */
export type JoyGuessResult = "right" | "close" | "missed" | "open" | "passed";
export type JoyLine = {
  player: Player;
  pick: string;
  /** The pick was written in the player's own words. */
  own: boolean;
  guesses: {
    player: Player;
    guess: string | null;
    right: boolean;
    result: JoyGuessResult;
    mark?: SaidMark;
  }[];
};
/** Each picked joy with everyone's guesses, and each guesser's tally. */
export function joyResult(g: Game) {
  const plan = turnPlan(g),
    answers = turnAnswers(g);
  const n = g.players.length;
  const v2 = isV2(g);
  const ownJoys = g.players.map((_, i) => v2 && !!ownAnswer(g, i, 0));
  const picks = g.players.map((_, i) => {
    if (!v2 && i > 0) return null;
    const own = v2 ? ownAnswer(g, i, 0) : undefined;
    if (own) return own.text;
    const a = answers[i]?.[0];
    return a === null || a === undefined ? null : plan[i].asks[0].choices[a];
  });
  // guesses[guesser][target], as text; null for a pass or no guess.
  const guesses: (string | null)[][] = g.players.map(() =>
    g.players.map(() => null),
  );
  const marks: (SaidMark | null)[][] = g.players.map(() =>
    g.players.map(() => null),
  );
  answers.forEach((turn, k) => {
    if (v2 ? k < n : k === 0) return;
    const guesser = g.players.indexOf(plan[k].player);
    plan[k].asks.forEach((ask, j) => {
      const target = g.players.findIndex((p) => p.id === ask.about);
      if (target < 0) return;
      const own = v2 ? ownAnswer(g, k, j) : undefined;
      if (own) {
        guesses[guesser][target] = own.text;
        marks[guesser][target] = own.mark ?? null;
      } else if (turn[j] !== null && turn[j] !== undefined)
        guesses[guesser][target] = ask.choices[turn[j]!];
    });
  });
  return {
    picks,
    guesses,
    ownJoys,
    marks,
    ...joyLines(g.players, picks, guesses, ownJoys, marks),
  };
}
const sameWords = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
function joyGuess(
  pick: string,
  guess: string | null,
  own: boolean,
  mark: SaidMark | null | undefined,
): JoyGuessResult {
  if (guess === null) return "passed";
  if (mark) return mark === "got" ? "right" : mark === "close" ? "close" : "missed";
  if (own ? sameWords(guess, pick) : guess === pick) return "right";
  return own ? "open" : "missed";
}
function joyLines(
  players: Player[],
  picks: (string | null)[],
  guesses: (string | null)[][],
  ownJoys: boolean[] = [],
  marks: (SaidMark | null)[][] = [],
) {
  const lines: JoyLine[] = players.flatMap((player, t) =>
    picks[t] === null || picks[t] === undefined
      ? []
      : [
          {
            player,
            pick: picks[t]!,
            own: !!ownJoys[t],
            guesses: players.flatMap((p, i) => {
              if (i === t) return [];
              const guess = guesses[i]?.[t] ?? null,
                mark = marks[i]?.[t] ?? null;
              const result = joyGuess(picks[t]!, guess, !!ownJoys[t], mark);
              return [
                {
                  player: p,
                  guess,
                  right: result === "right",
                  result,
                  ...(mark ? { mark } : {}),
                },
              ];
            }),
          },
        ],
  );
  const mine = (player: Player) =>
    lines.flatMap((l) => l.guesses.filter((x) => x.player.id === player.id));
  const tally = players
    .map((player) => {
      const results = mine(player).map((x) => x.result);
      const count = (r: JoyGuessResult) => results.filter((x) => x === r).length;
      return {
        player,
        right: count("right"),
        close: count("close"),
        /** Guesses with an answer: a pass is not a wrong guess, nor is one left unjudged. */
        of: count("right") + count("close") + count("missed"),
        /** Guesses made, judged or not. */
        guessed: results.filter((x) => x !== "passed").length,
        /** Joys this player could have guessed. */
        could: lines.filter((l) => l.player.id !== player.id).length,
      };
    })
    .filter((t) => t.could > 0);
  return { lines, tally };
}
/** "Anna knew the most: 2 of 2." */
function tallyLine({ lines, tally }: ReturnType<typeof joyLines>) {
  if (!lines.length) return "";
  const best = Math.max(0, ...tally.map((t) => t.right));
  if (!best) {
    const close = tally.filter((t) => t.close > 0).map((t) => t.player.name);
    if (close.length)
      return `Nobody got it exactly, but ${list(close)} came close.`;
    return "Nobody guessed right this time. Now you know a little more.";
  }
  const top = tally.filter((t) => t.right === best);
  const of = top[0].of;
  if (top.length === 1)
    return `${top[0].player.name} knew the most: ${best} of ${of}.`;
  return top.every((t) => t.of === of)
    ? `${list(top.map((t) => t.player.name))} each guessed ${best} of ${of}.`
    : `${list(top.map((t) => t.player.name))} each guessed ${best} right.`;
}
export const joySummary = (g: Game) => tallyLine(joyResult(g));
/**
 * Every guesser's score, with a pass said as a pass and a near miss as close:
 * "Ella 1 of 2 · Kaleb got close · Leo passed".
 */
export function joyTally(g: Game) {
  return joyTallyOf(joyResult(g).tally);
}
function joyTallyOf(tally: ReturnType<typeof joyLines>["tally"]) {
  return tally
    .flatMap((t) => {
      if (!t.guessed) return [`${t.player.name} passed`];
      // Only guesses nobody judged: nothing to score.
      if (!t.of) return [];
      if (t.right)
        return [
          `${t.player.name} ${t.right} of ${t.of}${t.close ? ` and close ${times(t.close)}` : ""}`,
        ];
      if (t.close)
        return [`${t.player.name} got close${t.close > 1 ? ` ${times(t.close)}` : ""}`];
      return [`${t.player.name} ${t.right} of ${t.of}`];
    })
    .join(" · ");
}
/**
 * The joys someone wrote in their own words, each with the guesses at it:
 * what the person who wrote it judges before the reveal.
 */
export function joyJudging(g: Game) {
  if (g.kind !== "joy" || !isV2(g)) return [];
  return joyResult(g).lines.flatMap((l) =>
    l.own && l.guesses.length
      ? [
          {
            player: l.player,
            pick: l.pick,
            guesses: l.guesses.map((x) => ({ player: x.player, text: x.guess, mark: x.mark })),
          },
        ]
      : [],
  );
}
/** Guesses at a written joy still waiting for Got it, Close or Not quite. */
export const joyJudgePending = (g: Game) =>
  joyJudging(g).some((t) => t.guesses.some((x) => x.text !== null && !x.mark));
/**
 * One question's answers grouped by choice, so the reveal can say what the
 * family chose: [{ choice: "pizza", names: ["Alex", "Anna"] }, …].
 */
export function pickGroups(line: SamePageLine, players: Pick<Player, "name">[]) {
  const groups: { choice: string; names: string[] }[] = [];
  line.picks.forEach((c, i) => {
    if (c === null) return;
    const choice = line.question.choices[c];
    const found = groups.find((x) => x.choice === choice);
    if (found) found.names.push(players[i].name);
    else groups.push({ choice, names: [players[i].name] });
  });
  return {
    groups,
    passed: players.filter((_, i) => line.picks[i] === null).map((p) => p.name),
  };
}
const knewLine = (l: JoyLine) => {
  const knew = l.guesses.filter((x) => x.right).map((x) => x.player.name);
  const close = l.guesses.filter((x) => x.result === "close").map((x) => x.player.name);
  const near = close.length
    ? `${list(close)} ${close.length === 1 ? "was" : "were"} close.`
    : "";
  if (knew.length) return [`${list(knew)} guessed it.`, near].filter(Boolean).join(" ");
  return near || "Nobody guessed it.";
};

// ── One story results ───────────────────────────────────────────────────────
/** The story as it was told: each line that wasn't passed, and who added it. */
export function storyLines(g: Game) {
  const plan = turnPlan(g);
  return turnAnswers(g).flatMap((turn, i) => {
    const ask = plan[i]?.asks[0],
      part = storyPart(g, i, ask, turn[0]);
    if (!ask || !part) return [];
    // Written lines keep their own ending: "…we found a goose!".
    const end = /[.!?…]$/.test(part) ? "" : ".";
    return [{ player: plan[i].player, text: `${ask.prompt.replace(/…$/, "")} ${part}${end}` }];
  });
}
/** What turn i added to the story: its choice, or the words written instead; "" for a pass. */
function storyPart(g: Game, i: number, ask: Ask | undefined, c: number | null | undefined) {
  const own = isV2(g) ? ownAnswer(g, i, 0) : undefined;
  if (own) return own.text;
  return ask && c !== null && c !== undefined ? ask.choices[c] || "" : "";
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A few titles worked out from the story's own lines, to pick from. */
export function storyTitles(g: Game) {
  const plan = turnPlan(g),
    answers = turnAnswers(g);
  const from = (i: number) => {
    const part = plan[i] ? storyPart(g, i, plan[i].asks[0], answers[i]?.[0]) : "";
    if (!part) return "";
    return capital(`the ${part.replace(/[.!?…]+$/, "").replace(/^(a|an|the|some) /i, "")}`);
  };
  return [
    from(0),
    from(1),
    young(g.audience) ? "Our big adventure" : "Our unlikely adventure",
  ].filter((t, i, all) => t && t.length <= TITLE_LIMIT && all.indexOf(t) === i);
}

export function newGame(
  kind: Game["kind"],
  players: Player[],
  editionAudience?: Audience,
  options: { recent?: string[]; recentSquares?: string[] } = {},
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
  // New Same page? rounds are answered in the players' own words.
  const words = kind === "match";
  return {
    id: id(),
    kind,
    contentVersion: words ? 3 : rounds ? 2 : 1,
    audience,
    players: players.map((p) => ({ ...p })),
    stage: "ready",
    turn: 0,
    choices: [],
    ...(words
      ? {
          questions: chooseQuestions(
            audience,
            options.recent || [],
            saidCount(players.length),
          ),
          said: [],
        }
      : rounds
        ? { answers: [] }
        : {}),
    ...(kind === "spot"
      ? {
          spot: {
            squares: chooseSquares(audience, options.recentSquares || []),
            marks: Array.from({ length: SPOT_SIZE }, () => null),
          },
        }
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
      recentSquares: kind === "spot" ? recentSquares(before) : [],
    }),
  };
}
export function gameText(g: Game): string {
  if (g.kind === "spot") {
    if (!g.spot) return "";
    const r = spotResult(g.players, g.spot);
    if (!r.spotted) return "";
    return [
      [
        g.place ? `On the way to ${g.place}.` : "",
        `${r.spotted} of ${g.spot.squares.length} spotted.`,
        spotSummary(g.players, g.spot),
      ]
        .filter(Boolean)
        .join(" "),
      ...r.squares
        .filter((x) => x.by !== null && x.text)
        .map((x) => `${x.text}: ${x.by === SPOT_ALL ? "everyone" : x.who}.`),
    ].join("\n");
  }
  if (ownWords(g)) {
    const lines = saidResult(g);
    if (!lines.some((l) => l.answer !== null)) return "";
    return [
      saidSummary(lines, g.players),
      ...lines.map((l) => `${l.question.prompt} ${saidWords(l)}`),
    ].join("\n");
  }
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
  if (g.kind === "joy" && isV2(g)) {
    const { lines } = joyResult(g);
    if (!lines.length) return "";
    return [
      joySummary(g),
      ...lines.map(
        (l) =>
          `${l.player.name}’s small joy: ${l.own ? l.pick : l.pick.toLowerCase()}. ${knewLine(l)}`,
      ),
    ].join("\n");
  }
  if (g.kind === "joy")
    return Number.isInteger(g.choices[0])
      ? `A small joy for ${g.players[0].name}: ${joyOptions(g)[g.choices[0]!].toLowerCase()}.`
      : "";
  return storyLines(g)
    .map((l) => l.text)
    .join(" ");
}
export type GameAction =
  /** Spot it! can say where the car is headed as it starts. */
  | { type: "start"; firstId?: string; place?: string }
  | { type: "ready" | "finish" }
  /**
   * One answer, for a turn with one question; null passes the whole turn.
   * `text` is an answer in your own words instead (with choice null).
   */
  | { type: "choice"; choice: number | null; text?: string }
  /**
   * Every answer in a turn with several questions; null passes one.
   * texts[j] is question j answered in your own words (with answers[j] null).
   */
  | { type: "answer"; answers: (number | null)[]; texts?: (string | null)[] }
  /** Same page? in your own words: an answer or a guess; null passes. */
  | { type: "say"; text: string | null }
  /**
   * The one who answered says how close a guess came; null clears it. In a
   * small joy round, `about` is whose joy the guess was about.
   */
  | { type: "judge"; playerId: string; mark: SaidMark | null; about?: string }
  /** On to the next question; `skip` leaves guesses unjudged. */
  | { type: "next"; skip?: boolean }
  | { type: "approve"; playerId: string }
  /** A story's title, picked together after the last line; "" clears it. */
  | { type: "title"; title: string }
  /** One player's own line about the round; "" takes it back. */
  | { type: "reflect"; playerId: string; text: string }
  /** Spot it! setup: a fresh square in place of this one. */
  | { type: "swap"; square: number }
  /** Spot it!: this square in your own words, before or during play; "" puts the card's back. */
  | { type: "write"; square: number; text: string }
  /** Spot it!: who spotted this square (a player index or SPOT_ALL); null clears it. */
  | { type: "spot"; square: number; by: number | null }
  /** Spot it!: where the car is headed; "" clears it. */
  | { type: "place"; place: string }
  /** Spot it!: done spotting, show the card. */
  | { type: "done" };
export function advanceGame(g: Game, action: GameAction): Game {
  const stamp = now();
  if (g.kind === "spot" && g.spot) {
    const card = g.spot;
    const square = "square" in action ? action.square : -1;
    const onCard = Number.isInteger(square) && square >= 0 && square < card.squares.length;
    if (action.type === "swap" && g.stage === "ready") {
      if (!onCard) throw new Error("Choose a square on the card.");
      const pool = spotBank(g.audience ?? "under-6").filter(
        (q) => !card.squares.includes(q.id),
      );
      if (!pool.length) throw new Error("There are no more squares to swap in.");
      const squares = card.squares.map((id, i) =>
        i === square ? pool[random(pool.length)].id : id,
      );
      return { ...g, spot: writeSquare({ ...card, squares }, square, ""), updatedAt: stamp };
    }
    if (action.type === "write" && (g.stage === "ready" || g.stage === "choose")) {
      if (!onCard) throw new Error("Choose a square on the card.");
      const text = cleanSquare(action.text);
      const shown = spotResult(g.players, card).squares;
      if (
        text &&
        shown.some((x, i) => i !== square && x.text.toLocaleLowerCase() === text.toLocaleLowerCase())
      )
        throw new Error("That one is already on the card.");
      if (text === (card.own?.[square] || "")) return g;
      // Something new to spot: whoever spotted the old square hasn't spotted this.
      const written = writeSquare(card, square, text);
      const marks = card.marks.map((m, i) => (i === square ? null : m));
      return { ...g, spot: { ...written, marks }, updatedAt: stamp };
    }
    if (action.type === "spot" && g.stage === "choose") {
      const by = action.by;
      if (
        !onCard ||
        !(
          by === null ||
          by === SPOT_ALL ||
          (Number.isInteger(by) && by >= 0 && by < g.players.length)
        )
      )
        throw new Error("Choose who spotted it.");
      const marks = card.marks.map((m, i) => (i === square ? by : m));
      return { ...g, spot: { ...card, marks }, updatedAt: stamp };
    }
    if (action.type === "place" && g.stage !== "finished") {
      const place = cleanPlace(action.place);
      const next = { ...g, updatedAt: stamp };
      if (place) next.place = place;
      else delete next.place;
      return next;
    }
    if (action.type === "done" && g.stage === "choose")
      return { ...g, stage: "reveal", updatedAt: stamp };
    if (action.type === "start" && g.stage === "ready" && action.place !== undefined) {
      const started = advanceGame(g, { type: "start", firstId: action.firstId });
      return advanceGame(started, { type: "place", place: action.place });
    }
  }
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
  if (ownWords(g) && ["say", "judge", "next", "choice", "answer"].includes(action.type))
    return advanceWords(g, action, stamp);
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
          (asks[j].write === "only" ||
            !Number.isInteger(a) ||
            a < 0 ||
            a >= asks[j].choices.length),
      )
    )
      throw new Error("Choose an available answer.");
    const texts =
      action.type === "answer"
        ? action.texts
        : action.text !== undefined
          ? [action.text]
          : undefined;
    const written: OwnAnswer[] = [];
    if (texts !== undefined) {
      if (!Array.isArray(texts) || texts.length !== asks.length)
        throw new Error("Choose an available answer.");
      texts.forEach((t, j) => {
        if (t === null || t === undefined) return;
        if (!asks[j].write || answers[j] !== null)
          throw new Error("Choose an available answer.");
        const text = cleanSaid(t);
        if (!text) throw new Error("Write a few words, or pass.");
        written.push({ turn: g.turn, ask: j, text });
      });
    }
    const turn = g.turn + 1;
    const next: Game = isV2(g)
      ? { ...g, answers: [...(g.answers || []), [...answers]], turn }
      : { ...g, choices: [...g.choices, answers[0]], turn };
    if (written.length) next.own = [...(g.own || []), ...written];
    const over = turn >= turnCount(next);
    return {
      ...next,
      // Joys someone wrote are judged before the reveal.
      stage: over ? (joyJudging(next).length ? "judge" : "reveal") : "handoff",
      updatedAt: stamp,
    };
  }
  if (action.type === "judge" && g.kind === "joy" && g.stage === "judge") {
    const plan = turnPlan(g);
    const k = (g.own || []).findIndex((o) => {
      const ask = plan[o.turn]?.asks[o.ask];
      return (
        ask?.write === "only" &&
        ask.about === action.about &&
        plan[o.turn].player.id === action.playerId
      );
    });
    if (k < 0) throw new Error("Choose a guess to judge.");
    if (action.mark !== null && !saidMarks.includes(action.mark))
      throw new Error("Choose Got it, Close or Not quite.");
    const own = g.own!.map((o, i) => {
      if (i !== k) return o;
      const marked = { ...o };
      if (action.mark) marked.mark = action.mark;
      else delete marked.mark;
      return marked;
    });
    return { ...g, own, updatedAt: stamp };
  }
  if (action.type === "next" && g.kind === "joy" && g.stage === "judge") {
    if (!action.skip && joyJudgePending(g))
      throw new Error("Judge each guess, or skip judging.");
    return { ...g, stage: "reveal", updatedAt: stamp };
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
  if (
    action.type === "title" &&
    g.kind === "story" &&
    isV2(g) &&
    ["reveal", "kept"].includes(g.stage)
  ) {
    const title = String(action.title || "").trim().slice(0, TITLE_LIMIT);
    const next = { ...g, updatedAt: stamp };
    if (title) next.title = title;
    else delete next.title;
    return next;
  }
  if (action.type === "reflect" && ["reveal", "kept"].includes(g.stage)) {
    if (!g.players.some((p) => p.id === action.playerId))
      throw new Error("This person is not playing.");
    const text = String(action.text || "").trim().slice(0, REFLECTION_LIMIT);
    const others = (g.reflections || []).filter((r) => r.playerId !== action.playerId);
    // Kept in player order, so the round reads the same however it was written.
    const reflections = g.players.flatMap((p) =>
      p.id === action.playerId
        ? text
          ? [{ playerId: p.id, text }]
          : []
        : others.filter((r) => r.playerId === p.id),
    );
    const next = { ...g, updatedAt: stamp };
    if (reflections.length) next.reflections = reflections;
    else delete next.reflections;
    return next;
  }
  if (action.type === "finish" && ["reveal", "kept"].includes(g.stage))
    return { ...g, stage: "finished", finishedAt: stamp, updatedAt: stamp };
  throw new Error("That action is not available at this point in the game.");
}
/** Same page? in your own words: answering, guessing and judging. */
function advanceWords(g: Game, action: GameAction, stamp: string): Game {
  const said = [...(g.said || [])],
    count = (g.questions || []).length,
    others = g.players.length - 1;
  const last = said.at(-1);
  const q = said.length - 1;
  if (action.type === "say" && g.stage === "choose") {
    const text = action.text === null ? null : cleanSaid(action.text);
    if (text === "") throw new Error("Write a few words, or pass.");
    const turn = g.turn + 1;
    if (last && last.answer !== null && last.guesses.length < others) {
      const guesser = guessersOf(g.players, q)[last.guesses.length];
      said[q] = { ...last, guesses: [...last.guesses, { playerId: guesser.id, text }] };
      const judging = said[q].guesses.length === others;
      return { ...g, said, turn, stage: judging ? "judge" : "handoff", updatedAt: stamp };
    }
    if (said.length >= count) throw new Error("Every question has been answered.");
    said.push({ by: sharerOf(g.players, said.length).id, answer: text, guesses: [] });
    // A pass leaves nothing to guess: on to the next person's question.
    const over = text === null && said.length >= count;
    return { ...g, said, turn, stage: over ? "reveal" : "handoff", updatedAt: stamp };
  }
  if (action.type === "judge" && g.stage === "judge" && last) {
    const k = last.guesses.findIndex((x) => x.playerId === action.playerId);
    if (k < 0 || last.guesses[k].text === null) throw new Error("Choose a guess to judge.");
    if (action.mark !== null && !saidMarks.includes(action.mark))
      throw new Error("Choose Got it, Close or Not quite.");
    const guesses = last.guesses.map((x, i) => {
      if (i !== k) return x;
      const next = { ...x };
      if (action.mark) next.mark = action.mark;
      else delete next.mark;
      return next;
    });
    said[q] = { ...last, guesses };
    return { ...g, said, updatedAt: stamp };
  }
  if (action.type === "next" && g.stage === "judge" && last) {
    if (!action.skip && last.guesses.some((x) => x.text !== null && !x.mark))
      throw new Error("Judge each guess, or skip judging.");
    return { ...g, stage: said.length >= count ? "reveal" : "handoff", updatedAt: stamp };
  }
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
          : g.kind === "spot"
            ? g.place
              ? `Spot it! on the way to ${g.place}`
              : "Our road-trip card"
            : g.title || "Our unlikely adventure",
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
  if (ownWords(g))
    return {
      said: saidSoFar(g).map((s) => ({
        id: s.id,
        by: s.by,
        answer: s.answer,
        guesses: s.guesses.map((x) => ({ ...x })),
      })),
    };
  if (!isV2(g)) return {};
  if (g.kind === "match")
    return {
      questions: samePageResult(g).lines.map((l) => ({
        id: l.question.id,
        picks: l.picks,
      })),
    };
  if (g.kind === "joy") {
    const { picks, guesses, ownJoys, marks } = joyResult(g);
    // Only rounds where someone wrote their own need to say so.
    return {
      joys: picks,
      guesses,
      ...(ownJoys.some(Boolean) ? { ownJoys, marks } : {}),
    };
  }
  if (g.kind === "spot")
    return g.spot
      ? {
          spot: {
            squares: [...g.spot.squares],
            marks: [...g.spot.marks],
            ...(g.spot.own ? { own: [...g.spot.own] } : {}),
          },
          ...(g.place ? { place: g.place } : {}),
        }
      : {};
  return {
    story: storyLines(g).map((l) => l.text),
    ...(g.title ? { title: g.title } : {}),
  };
}
const memoryOf = (r: PlayRecord) =>
  r.questions !== undefined ||
  r.said !== undefined ||
  r.joys !== undefined ||
  r.guesses !== undefined ||
  r.story !== undefined ||
  r.title !== undefined ||
  r.reflections !== undefined ||
  r.spot !== undefined ||
  r.place !== undefined;
/** Answers stay on the newest ANSWERS_KEPT rounds; older records keep only names and a date. */
function trimMemory(plays: PlayRecord[]) {
  let kept = 0;
  return plays
    .toReversed()
    .map((r) => {
      if (!memoryOf(r) || ++kept <= ANSWERS_KEPT) return r;
      const rest = { ...r };
      delete rest.questions;
      delete rest.said;
      delete rest.joys;
      delete rest.guesses;
      delete rest.ownJoys;
      delete rest.marks;
      delete rest.story;
      delete rest.title;
      delete rest.reflections;
      delete rest.spot;
      delete rest.place;
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
    ...(g.reflections?.length ? { reflections: g.reflections } : {}),
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
          ) &&
          optional(
            r.said,
            (x) =>
              r.kind === "match" &&
              r.questions === undefined &&
              Array.isArray(x) &&
              x.length <= 12 &&
              x.every(
                (line) =>
                  obj(line) &&
                  str(line.id, 60) &&
                  !!line.id &&
                  saidFits(line, r.players as Player[]),
              ),
          ) &&
          optional(
            r.joys,
            (j) =>
              r.kind === "joy" &&
              Array.isArray(j) &&
              j.length === (r.players as unknown[]).length &&
              j.every((x) => x === null || str(x, 80)),
          ) &&
          optional(
            r.guesses,
            (q) =>
              r.kind === "joy" &&
              Array.isArray(q) &&
              q.length === (r.players as unknown[]).length &&
              q.every(
                (row) =>
                  Array.isArray(row) &&
                  row.length === (r.players as unknown[]).length &&
                  row.every((x) => x === null || str(x, 80)),
              ),
          ) &&
          // Without joys (an older version trimmed them) these say nothing, but harm nothing.
          optional(
            r.ownJoys,
            (o) =>
              r.kind === "joy" &&
              Array.isArray(o) &&
              o.length === (r.players as unknown[]).length &&
              o.every((x) => typeof x === "boolean"),
          ) &&
          optional(
            r.marks,
            (q) =>
              r.kind === "joy" &&
              Array.isArray(q) &&
              q.length === (r.players as unknown[]).length &&
              q.every(
                (row) =>
                  Array.isArray(row) &&
                  row.length === (r.players as unknown[]).length &&
                  row.every((x) => x === null || saidMarks.includes(x as SaidMark)),
              ),
          ) &&
          optional(
            r.story,
            (lines) =>
              r.kind === "story" &&
              Array.isArray(lines) &&
              lines.length <= 20 &&
              lines.every((x) => str(x, 300) && !!x.trim()),
          ) &&
          optional(
            r.title,
            (t) => r.kind === "story" && str(t, TITLE_LIMIT) && !!t.trim(),
          ) &&
          optional(r.reflections, (x) =>
            reflectionsFit(x, r.players as Player[]),
          ) &&
          // Records never check square ids against today's content, so a
          // retired square can't stop a book from opening.
          optional(
            r.spot,
            (x) =>
              r.kind === "spot" &&
              spotCardFits(x, (r.players as unknown[]).length, (id) => str(id, 60) && !!id),
          ) &&
          optional(r.place, (x) => r.kind === "spot" && placeFits(x)),
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

const stages = ["ready", "choose", "handoff", "judge", "reveal", "kept", "finished"];
const saidText = (x: unknown) => str(x, SAID_LIMIT) && !!x.trim();
/**
 * One own-words question: an answer or pass by someone playing, and at most
 * one guess from each other player. A pass has no guesses; only a guess that
 * was made can be judged.
 */
function saidFits(value: unknown, players: Player[]) {
  if (
    !obj(value) ||
    !players.some((p) => p.id === value.by) ||
    !(value.answer === null || saidText(value.answer)) ||
    !Array.isArray(value.guesses) ||
    value.guesses.length > players.length - 1 ||
    (value.answer === null && value.guesses.length)
  )
    return false;
  const ids = value.guesses.map((x) => (obj(x) ? x.playerId : x));
  return (
    new Set(ids).size === ids.length &&
    value.guesses.every(
      (x) =>
        obj(x) &&
        x.playerId !== value.by &&
        players.some((p) => p.id === x.playerId) &&
        (x.text === null || saidText(x.text)) &&
        (x.mark === undefined ||
          (x.text !== null && saidMarks.includes(x.mark as SaidMark))),
    )
  );
}
/** An own-words round: each question in turn order, and a stage that fits how far it got. */
function wordsGameFits(g: Record<string, unknown>, sharedPages: unknown[]) {
  const game = g as Game,
    players = game.players,
    n = players.length;
  const bank = samePageBank(game.audience as Audience);
  if (
    game.kind !== "match" ||
    g.answers !== undefined ||
    g.own !== undefined ||
    game.choices.length ||
    g.title !== undefined ||
    g.spot !== undefined ||
    g.place !== undefined ||
    !Array.isArray(g.questions) ||
    g.questions.length !== saidCount(n) ||
    new Set(g.questions).size !== g.questions.length ||
    !g.questions.every((q) => bank.some((x) => x.id === q)) ||
    !Array.isArray(g.said) ||
    g.said.length > g.questions.length
  )
    return false;
  const said = g.said as Said[];
  const complete = (s: Said) => s.answer === null || s.guesses.length === n - 1;
  for (let i = 0; i < said.length; i++) {
    const s = said[i];
    if (
      !saidFits(s, players) ||
      s.by !== sharerOf(players, i).id ||
      !s.guesses.every((x, k) => x.playerId === guessersOf(players, i)[k].id) ||
      (i < said.length - 1 && !complete(s)) ||
      (!complete(s) && s.guesses.some((x) => x.mark))
    )
      return false;
  }
  if (game.turn !== said.reduce((t, s) => t + 1 + s.guesses.length, 0)) return false;
  const last = said.at(-1);
  const done = said.length === g.questions.length && (!last || complete(last));
  const fits =
    game.stage === "ready"
      ? said.length === 0
      : game.stage === "choose" || game.stage === "handoff"
        ? !done && (game.stage === "choose" || game.turn > 0)
        : game.stage === "judge"
          ? !!last && last.answer !== null && last.guesses.length === n - 1
          : done;
  return fits && stageFits(game, sharedPages);
}
const placeFits = (x: unknown) => str(x, PLACE_LIMIT) && !!x.trim();
const squareText = (x: unknown) => str(x, SQUARE_LIMIT) && !!x.trim();
/**
 * Nine different squares, each mark a player's index, SPOT_ALL or null, and
 * any square in the family's own words a few words long.
 */
function spotCardFits(
  value: unknown,
  playerCount: number,
  knownSquare: (id: unknown) => boolean,
) {
  return (
    obj(value) &&
    Array.isArray(value.squares) &&
    value.squares.length === SPOT_SIZE &&
    new Set(value.squares).size === SPOT_SIZE &&
    value.squares.every(knownSquare) &&
    Array.isArray(value.marks) &&
    value.marks.length === SPOT_SIZE &&
    value.marks.every(
      (m) =>
        m === null ||
        m === SPOT_ALL ||
        (Number.isInteger(m) && m >= 0 && m < playerCount),
    ) &&
    optional(
      value.own,
      (own) =>
        Array.isArray(own) &&
        own.length === SPOT_SIZE &&
        own.every((x) => x === null || squareText(x)),
    )
  );
}
/** At most one non-empty line per player, each from someone who played. */
function reflectionsFit(value: unknown, players: Player[]) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= players.length &&
    new Set(value.map((r) => (obj(r) ? r.playerId : r))).size === value.length &&
    value.every(
      (r) =>
        obj(r) &&
        players.some((p) => p.id === r.playerId) &&
        str(r.text, REFLECTION_LIMIT) &&
        !!r.text.trim(),
    )
  );
}
function isGame(g: unknown, sharedPages: unknown[]): boolean {
  if (
    !obj(g) ||
    !str(g.id, 100) ||
    !optional(g.audience, isAudience) ||
    (g.audience === undefined
      ? g.contentVersion !== undefined
      : g.contentVersion !== 1 && g.contentVersion !== 2 && g.contentVersion !== 3) ||
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
  if (
    g.reflections !== undefined &&
    (!reflectionsFit(g.reflections, g.players as Player[]) ||
      !["reveal", "kept", "finished"].includes(String(g.stage)))
  )
    return false;
  if (g.contentVersion === 3) return wordsGameFits(g, sharedPages);
  const v2 = g.contentVersion === 2;
  // Only own-words Same page? keeps words in `said`; only it and small joy
  // rounds where someone wrote their own judge.
  if ((g.stage === "judge" && !(v2 && g.kind === "joy")) || g.said !== undefined)
    return false;
  // Words in place of a choice: newer small joy and story rounds only.
  if (g.own !== undefined && !(v2 && (g.kind === "joy" || g.kind === "story")))
    return false;
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
    if (
      g.title !== undefined &&
      (g.kind !== "story" ||
        !str(g.title, TITLE_LIMIT) ||
        !g.title.trim() ||
        !["reveal", "kept", "finished"].includes(String(g.stage)))
    )
      return false;
  } else if (
    g.answers !== undefined ||
    g.questions !== undefined ||
    g.title !== undefined
  )
    return false;
  if (g.kind === "spot") {
    // No turns: the card is the whole state, and it can end at any time.
    const card = g.spot as SpotCard;
    if (
      !v2 ||
      g.turn !== 0 ||
      (g.answers as unknown[]).length ||
      g.stage === "handoff" ||
      !spotCardFits(g.spot, g.players.length, (id) => typeof id === "string" && !!spotSquare(id)) ||
      (g.stage === "ready" && card.marks.some((m) => m !== null)) ||
      !optional(g.place, placeFits)
    )
      return false;
    return stageFits(g as Game, sharedPages);
  }
  if (g.spot !== undefined || g.place !== undefined) return false;
  const game = g as Game;
  const given = v2 ? (g.answers as unknown[]) : g.choices.map((c) => [c]);
  if (given.length !== game.turn) return false;
  const own = g.own === undefined ? [] : g.own;
  if (!Array.isArray(own) || !own.every(ownFits)) return false;
  const placed = own.map((o) => `${o.turn}:${o.ask}`);
  if (new Set(placed).size !== placed.length) return false;
  const judging = ["judge", "reveal", "kept", "finished"].includes(game.stage);
  // Each turn's answers must fit what that turn asked, given the turns before it.
  for (let i = 0; i < given.length; i++) {
    const before: Game = v2
      ? {
          ...game,
          answers: (given as (number | null)[][]).slice(0, i),
          own: own.filter((o) => o.turn < i),
        }
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
          (asks[j].write !== "only" &&
            Number.isInteger(c) &&
            c >= 0 &&
            c < asks[j].choices.length),
      ) ||
      // Words go only where a question took them, in place of a choice;
      // only a guess at a written joy is judged, and only once guessing is over.
      !own
        .filter((o) => o.turn === i)
        .every(
          (o) =>
            o.ask < asks.length &&
            !!asks[o.ask].write &&
            answers[o.ask] === null &&
            (o.mark === undefined || (asks[o.ask].write === "only" && judging)),
        )
    )
      return false;
  }
  if (own.some((o) => o.turn >= given.length)) return false;
  const done = game.turn === turnCount(game);
  if (
    game.turn > turnCount(game) ||
    judging !== done ||
    (game.stage === "judge" && !joyJudging(game).length) ||
    (game.stage === "ready" && game.turn !== 0) ||
    (game.stage === "handoff" && game.turn === 0)
  )
    return false;
  return stageFits(game, sharedPages);
}
/** One answer in your own words: where it goes, a few words, and how close it came. */
function ownFits(o: unknown): o is OwnAnswer {
  return (
    obj(o) &&
    Number.isInteger(o.turn) &&
    (o.turn as number) >= 0 &&
    Number.isInteger(o.ask) &&
    (o.ask as number) >= 0 &&
    saidText(o.text) &&
    (o.mark === undefined || saidMarks.includes(o.mark as SaidMark))
  );
}
/** What every stage needs, whatever the game: approvals, finishing and a kept page. */
function stageFits(game: Game, sharedPages: unknown[]) {
  if (
    ["ready", "choose", "handoff", "judge"].includes(game.stage) &&
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
