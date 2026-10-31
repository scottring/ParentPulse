import type { Book } from "./model";
import { isAudience, youngestAudience, type Audience } from "./profiles";
import { childPlayContent, childStoryRounds } from "./play-content";

export const threads = {
  listen: {
    title: "Listen with a little more room",
    notice: "When did someone try to tell you something?",
    practice: "Ask before offering an answer.",
    instruction:
      "In an ordinary conversation, ask: “Would you like listening or ideas?” Then make room for the answer.",
  },
  ask: {
    title: "Say what I need more clearly",
    notice: "When did you wish someone understood what you needed?",
    practice: "Offer one clear, small request.",
    instruction:
      "Try: “What would help me right now is…” Let the other person answer in their own words.",
  },
  joy: {
    title: "Make room for little joys",
    notice: "What brought a little lightness to your day?",
    practice: "Make time for one small joy.",
    instruction:
      "Choose something small that brings you or someone you love a little joy. Make an invitation, without an obligation.",
  },
} as const;
export type ThreadId = keyof typeof threads;
export type SessionKind = "begin" | "notice" | "practice" | "reflect";
export type Outcome = "helped" | "adjust" | "time";
export const outcomes: Record<Outcome, string> = {
  helped: "Something helped",
  adjust: "I learned what I would change",
  time: "I need a little more time",
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
export type Game = {
  audience?: Audience;
  contentVersion?: 1;
  id: string;
  kind: "joy" | "story";
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
  kind: "joy" | "story";
  title: string;
  text: string;
  players: Player[];
  approvedBy: string[];
  createdAt: string;
};
export type LivingState = {
  version: 1;
  thread?: ThreadId;
  visit?: Visit;
  entries: LivingEntry[];
  sharedPages: SharedPage[];
  game?: Game;
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
    title: "A direction and one small moment",
    time: "About 3 minutes",
    end: "Choose a direction, then keep one sentence about a real moment. That is enough for this visit.",
    next: "Another day, make room for another perspective or play a short game together.",
  },
  notice: {
    title: "One moment, put into words",
    time: "About 2 minutes",
    end: "Keep one sentence about a moment you noticed. You do not need to solve it or share it.",
    next: "When you have a little room, choose one small thing to try in ordinary life.",
  },
  practice: {
    title: "One small thing to take into life",
    time: "About 1 minute here",
    end: "Name an ordinary opportunity to try the practice. Then close the book and let life provide the moment.",
    next: "After you try it, return to notice what happened. There is no deadline.",
  },
  reflect: {
    title: "Let one experience teach you",
    time: "About 2 minutes",
    end: "Choose what fits the experience. A sentence is optional; an unresolved feeling is a valid ending.",
    next: "On another visit, keep exploring this thread or choose a new direction.",
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
    throw new Error("Begin a new visit first.");
  return changeLiving(book, (x) => ({
    ...x,
    thread,
    visit: { ...v, thread, step: 1, updatedAt: now() },
  }));
}
export function updateDraft(book: Book, visitId: string, draft: Draft): Book {
  const v = livingOf(book).visit;
  if (!v || v.id !== visitId || v.status === "complete")
    throw new Error("This visit is no longer open.");
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
    throw new Error("Open the current visit before keeping it.");
  const stamp = now();
  let entry: LivingEntry;
  let summary: string;
  if (v.kind === "begin" || v.kind === "notice") {
    if (!draft.text.trim())
      throw new Error(
        "One sentence is enough. Add a moment before keeping it.",
      );
    entry = {
      id: id(),
      kind: "notice",
      thread: v.thread,
      text: draft.text.trim(),
      perspective: draft.perspective.trim(),
      createdAt: stamp,
    };
    summary =
      v.kind === "begin"
        ? "You chose a thread and kept one moment in your edition."
        : "You kept one moment. It does not need an answer today.";
  } else if (v.kind === "practice") {
    if (!draft.opportunity.trim())
      throw new Error("Choose a moment when you could try this.");
    entry = {
      id: id(),
      kind: "practice",
      thread: v.thread,
      text: draft.opportunity.trim(),
      createdAt: stamp,
    };
    summary =
      "You chose a moment to try: " +
      draft.opportunity.trim() +
      ". The practice is still ahead of you.";
  } else {
    if (!draft.outcome || !Object.hasOwn(outcomes, draft.outcome))
      throw new Error("Choose what fits your experience.");
    const practice = pendingPractice(book);
    if (!practice?.triedAt)
      throw new Error(
        "Mark the practice as tried before reflecting, or pause until you have had a chance.",
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
    summary =
      "You kept what this experience taught you: " +
      outcomes[draft.outcome].toLowerCase() +
      ".";
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
  if (!entry) throw new Error("This practice is no longer available.");
  return changeLiving(book, (l) => ({
    ...l,
    entries: l.entries.map((e) =>
      e.id === entryId ? { ...e, triedAt: now() } : e,
    ),
  }));
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
export const turnCount = (g: Game) =>
  g.kind === "joy" ? g.players.length : Math.max(3, g.players.length);
export const gamePlayer = (g: Game) => g.players[g.turn % g.players.length];
export function newGame(
  kind: Game["kind"],
  players: Player[],
  editionAudience?: Audience,
): Game {
  if (
    !["joy", "story"].includes(kind) ||
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
        ["joy", "story"].includes(String(p.kind)) &&
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
      !["joy", "story"].includes(String(g.kind)) ||
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
    const total =
        g.kind === "joy" ? g.players.length : Math.max(3, g.players.length),
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
