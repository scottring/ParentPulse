import type { Book } from "./model";
import { isAudience, youngestAudience, type Audience } from "./profiles";
import {
  childPlayContent,
  childStoryRounds,
  samePagePrompts,
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
  contentVersion?: 1;
  id: string;
  kind: GameKind;
  players: Player[];
  stage: "ready" | "choose" | "handoff" | "reveal" | "kept" | "finished";
  turn: number;
  choices: (number | null)[];
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
 * A light trace that a round was played, kept or not. It holds only the game
 * kind, the players' names (as stored on the game) and the date: never
 * answers, story text or anything private. `id` is the game's id.
 */
export type PlayRecord = {
  id: string;
  kind: GameKind;
  players: { id: string; name: string }[];
  playedAt: string;
  /** The shared page kept for this round, when every player approved one. */
  pageId?: string;
};
export const PLAY_LIMIT = 500;
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
export const turnCount = (g: Pick<Game, "kind" | "players">) =>
  g.kind === "story" ? Math.max(3, g.players.length) : g.players.length;
// The question for a "Same page?" round is fixed by the game's ID, so it
// survives reload, sync and restore without another stored field.
export function samePageRound(g: Pick<Game, "id" | "audience">) {
  const prompts = samePagePrompts(g.audience ?? "under-6");
  let n = 0;
  for (const ch of g.id) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return prompts[n % prompts.length];
}
export function samePageAgreement(g: Game) {
  const answers = g.choices.filter((c): c is number => c !== null);
  if (answers.length < 2) return "";
  const counts = new Map<number, number>();
  for (const c of answers) counts.set(c, (counts.get(c) || 0) + 1);
  const [top, most] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const choice = samePageRound(g).choices[top];
  if (most === answers.length) return `Same page: everyone chose “${choice}”.`;
  if (most === 1) return "Everyone chose something different. Worth a conversation.";
  return `${most} of ${answers.length} chose “${choice}”.`;
}
export const gamePlayer = (g: Game) => g.players[g.turn % g.players.length];
export function newGame(
  kind: Game["kind"],
  players: Player[],
  editionAudience?: Audience,
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
  return {
    id: id(),
    kind,
    contentVersion: 1,
    audience: youngestAudience([
      ...players,
      ...(editionAudience ? [{ audience: editionAudience }] : []),
    ]),
    players: players.map((p) => ({ ...p })),
    stage: "ready",
    turn: 0,
    choices: [],
    approvals: players.map(() => false),
    startedAt: stamp,
    updatedAt: stamp,
  };
}
export const joyOptions = (g: Pick<Game, "audience">) =>
  g.audience && g.audience !== "adult"
    ? childPlayContent(g.audience).joys
    : joyChoices;
export function gameText(g: Game): string {
  if (g.kind === "match") {
    const round = samePageRound(g);
    const answers = g.players
      .map((p, i) =>
        g.choices[i] === null || g.choices[i] === undefined
          ? ""
          : `${p.name}: ${round.choices[g.choices[i]!]}.`,
      )
      .filter(Boolean);
    return answers.length
      ? [round.prompt, ...answers, samePageAgreement(g)].filter(Boolean).join(" ")
      : "";
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
  | { type: "choice"; choice: number | null }
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
  if (action.type === "choice" && g.stage === "choose") {
    const max =
      g.kind === "joy"
        ? joyChoices.length
        : g.kind === "match"
          ? samePageRound(g).choices.length
          : storyRounds(g.players.length)[g.turn].choices.length;
    if (
      action.choice !== null &&
      (!Number.isInteger(action.choice) ||
        action.choice < 0 ||
        action.choice >= max)
    )
      throw new Error("Choose an available answer.");
    const turn = g.turn + 1;
    return {
      ...g,
      choices: [...g.choices, action.choice],
      turn,
      stage:
        (g.kind === "joy" && g.turn === 0 && action.choice === null) ||
        turn === turnCount(g)
          ? "reveal"
          : "handoff",
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

/**
 * Notes that the open round was played, once per game, as soon as it has
 * reached its reveal (whether or not a page was kept). Rounds that never
 * reached the reveal leave no trace.
 */
export function recordRound(l: LivingState): LivingState {
  const g = l.game;
  if (!g || !["reveal", "kept", "finished"].includes(g.stage)) return l;
  const plays = l.plays || [];
  const record: PlayRecord = {
    id: g.id,
    kind: g.kind,
    players: g.players.map((p) => ({ id: p.id, name: p.name })),
    playedAt: g.finishedAt || g.updatedAt,
    ...(g.savedPageId ? { pageId: g.savedPageId } : {}),
  };
  const previous = plays.find((r) => r.id === g.id);
  if (previous && previous.pageId === record.pageId) return l;
  return {
    ...l,
    plays: previous
      ? plays.map((r) => (r.id === g.id ? { ...previous, ...record, playedAt: previous.playedAt } : r))
      : [...plays, record].slice(-PLAY_LIMIT),
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
          new Set(r.players.map((x) => x.id)).size === r.players.length,
      )
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
  const g = value.game;
  if (g !== undefined) {
    if (
      !obj(g) ||
      !str(g.id, 100) ||
      !optional(g.audience, isAudience) ||
      (g.audience === undefined
        ? g.contentVersion !== undefined
        : g.contentVersion !== 1) ||
      !gameKinds.includes(g.kind as GameKind) ||
      !["ready", "choose", "handoff", "reveal", "kept", "finished"].includes(
        String(g.stage),
      ) ||
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
      !Array.isArray(g.choices)
    )
      return false;
    const total = turnCount(g as Pick<Game, "kind" | "players">),
      turn = g.turn as number;
    if (
      turn < 0 ||
      turn > total ||
      g.choices.length !== turn ||
      !g.choices.every(
        (c) =>
          c === null ||
          (Number.isInteger(c) && c >= 0 && c < (g.kind === "joy" ? 4 : 3)),
      )
    )
      return false;
    const done =
      turn === total ||
      (g.kind === "joy" && turn === 1 && g.choices[0] === null);
    if (
      ["reveal", "kept", "finished"].includes(String(g.stage)) !== done ||
      (g.stage === "ready" && turn !== 0) ||
      (g.stage === "handoff" && turn === 0)
    )
      return false;
    if (
      ["ready", "choose", "handoff"].includes(String(g.stage)) &&
      g.approvals.some(Boolean)
    )
      return false;
    if (g.stage === "finished" && !g.finishedAt) return false;
    if (g.stage === "kept" && !g.savedPageId) return false;
    if (
      g.savedPageId &&
      (!g.approvals.every(Boolean) ||
        !value.sharedPages.some((p) => p.id === g.savedPageId))
    )
      return false;
  }
  return true;
}
