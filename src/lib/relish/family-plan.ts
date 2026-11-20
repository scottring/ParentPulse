/**
 * What a family chose to try together, and how it went: the three moments of
 * Our family Home (docs/relish-design/RELISH-DESIGN.md, "Family Home across
 * three visits").
 *
 * First visit: choose something you'd like more of; Relish offers one small
 * thing to try. Coming back: "How did it go?", then keep a line someone said.
 * Looking back, once the time is up: the family's own words, then what next.
 *
 * The plan lives in the writer's own book. The lines a family keeps, and the
 * look-back, are added to Our family book as ordinary pages, which is how
 * they reach a partner's book.
 */

export const goalIds = ["hearing", "laughing", "mornings", "disagree", "oneonone", "own"] as const;
export type GoalId = (typeof goalIds)[number];
export const placeIds = ["dinner", "car", "bedtime"] as const;
export type PlaceId = (typeof placeIds)[number];
export const lengths = [7, 14, 30] as const;
export type PlanLength = (typeof lengths)[number];
export const answers = ["helped", "mixed", "missed"] as const;
export type Answer = (typeof answers)[number];
export const nextSteps = ["keep", "new", "finish"] as const;
export type NextStep = (typeof nextSteps)[number];

export const places: Record<PlaceId, { label: string; lead: string; at: string; noun: string }> = {
  dinner: { label: "At dinner", lead: "At dinner", at: "at dinner", noun: "dinner" },
  car: { label: "In the car", lead: "In the car", at: "in the car", noun: "the car" },
  bedtime: { label: "At bedtime", lead: "At bedtime", at: "at bedtime", noun: "bedtime" },
};
export const lengthLabels: Record<PlanLength, string> = {
  7: "1 week",
  14: "2 weeks",
  30: "A month",
};
export const answerLabels: Record<Answer, string> = {
  helped: "It helped",
  mixed: "A bit mixed",
  missed: "We didn’t get to it",
};
export const nextLabels: Record<NextStep, string> = {
  keep: "Keep trying this",
  new: "Choose something new",
  finish: "Finish for now",
};

/** One small thing to try. Without a fixed `lead`, it starts with the place. */
type Invitation = { text: string; lead?: string };
type Goal = {
  label: string;
  invitations: Invitation[];
  /** "You wanted …" on a return visit. {at} is the place, e.g. "at dinner". */
  wanted: string;
  /** In the family's words, recalled on the look-back. {noun} is e.g. "dinner". */
  intention: string;
  /** The look-back question. */
  differs: string;
  /** Places make sense for this goal (mornings and disagreements have their own). */
  placed: boolean;
};
export const goals: Record<Exclude<GoalId, "own">, Goal> = {
  hearing: {
    label: "Hearing each other out",
    invitations: [
      { text: "let someone finish a story. Then ask one question about it." },
      { text: "each person shares one good thing and one hard thing. Nobody fixes anything." },
    ],
    wanted: "You wanted everyone to get a turn {at}.",
    intention: "We’d like {noun} to be a time when everyone gets heard.",
    differs: "Does {noun} feel any different?",
    placed: true,
  },
  laughing: {
    label: "Laughing together",
    invitations: [
      { text: "each person tells one thing that made them laugh today." },
      { text: "tell a silly story together, one sentence each." },
    ],
    wanted: "You wanted more laughing together {at}.",
    intention: "We’d like more laughing together {at}.",
    differs: "Are you laughing together more?",
    placed: true,
  },
  mornings: {
    label: "Calmer mornings",
    invitations: [
      { lead: "The night before", text: "lay out clothes and bags together." },
      { lead: "In the morning", text: "give one five-minute warning before it’s time to go." },
    ],
    wanted: "You wanted calmer mornings.",
    intention: "We’d like mornings to feel calmer.",
    differs: "Do mornings feel any calmer?",
    placed: false,
  },
  disagree: {
    label: "Kinder ways to disagree",
    invitations: [
      { lead: "When you disagree", text: "say back what you heard before you answer." },
      { lead: "Together", text: "pick a family word that means “let’s pause and try again.”" },
    ],
    wanted: "You wanted kinder ways to disagree.",
    intention: "We’d like to disagree more kindly.",
    differs: "Do disagreements feel any kinder?",
    placed: false,
  },
  oneonone: {
    label: "Time one on one",
    invitations: [
      { lead: "This week", text: "spend ten minutes with one child doing what they choose." },
      { lead: "This week", text: "take a short walk with one child, phones at home." },
    ],
    wanted: "You wanted more time one on one.",
    intention: "We’d like each child to get time with us on their own.",
    differs: "Does each child feel they get time with you?",
    placed: false,
  },
};
export const goalChoices: { id: GoalId; label: string }[] = [
  ...(Object.keys(goals) as Exclude<GoalId, "own">[]).map((id) => ({ id, label: goals[id].label })),
  { id: "own", label: "In our own words…" },
];

export type KeptLine = {
  /** Also the id of the passage in Our family book. */
  id: string;
  text: string;
  who: string;
  /** Where it was said, e.g. "at dinner". */
  at: string;
  date: string;
};
export type CheckIn = { day: string; answer: Answer };
export type FamilyPlan = {
  id: string;
  goal: GoalId;
  /** What they'd like more of, as shown: a goal's label or their own words. */
  goalLabel: string;
  /** The small thing to try, as one sentence. */
  invitation: string;
  place: PlaceId;
  days: PlanLength;
  /** In their own words; recalled on the look-back. */
  intention: string;
  startedAt: string;
  checkIns: CheckIn[];
  kept: KeptLine[];
};

const DAY = 86_400_000;
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fill = (s: string, place: PlaceId) =>
  s.replaceAll("{at}", places[place].at).replaceAll("{noun}", places[place].noun);

/** The goal's small things, worded for the place. */
export function invitationsFor(goal: Exclude<GoalId, "own">, place: PlaceId): string[] {
  return goals[goal].invitations.map(
    (i) => `${i.lead ?? places[place].lead}, ${i.text}`,
  );
}
export const isPlaced = (goal: GoalId) => goal !== "own" && goals[goal].placed;
export const defaultIntention = (goal: GoalId, place: PlaceId) =>
  goal === "own" ? "" : fill(goals[goal].intention, place);

/** The local calendar day, e.g. "2026-11-20". */
export function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Day 1 is the day they started. */
export function dayOf(plan: FamilyPlan, now = new Date()) {
  return Math.floor((startOfDay(now) - startOfDay(new Date(plan.startedAt))) / DAY) + 1;
}
export type Moment = "first" | "back" | "lookback";
export function momentOf(plan: FamilyPlan | undefined, now = new Date()): Moment {
  if (!plan) return "first";
  return dayOf(plan, now) > plan.days ? "lookback" : "back";
}
export const todaysAnswer = (plan: FamilyPlan, now = new Date()) =>
  plan.checkIns.find((c) => c.day === dayKey(now))?.answer;

/** "You wanted everyone to get a turn at dinner." */
export function wantedLine(plan: FamilyPlan) {
  if (plan.goal === "own") return `You wanted ${plan.goalLabel.replace(/[.!]+$/, "").replace(/^./, (c) => c.toLowerCase())}.`;
  return fill(goals[plan.goal].wanted, plan.place);
}
export function differsLine(plan: FamilyPlan) {
  return plan.goal === "own" ? "Does anything feel different?" : fill(goals[plan.goal].differs, plan.place);
}
/** "Nov 6 – Nov 20" */
export function spanLine(plan: FamilyPlan) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const start = new Date(plan.startedAt);
  return `${fmt(start)} – ${fmt(new Date(start.getTime() + (plan.days - 1) * DAY))}`;
}
export function lengthWords(days: PlanLength) {
  return days === 7 ? "a week" : days === 14 ? "two weeks" : "a month";
}

export function startPlan(data: {
  goal: GoalId;
  goalLabel: string;
  invitation: string;
  place: PlaceId;
  days: PlanLength;
  intention: string;
  now?: Date;
  id?: string;
}): FamilyPlan {
  const plan: FamilyPlan = {
    id: data.id ?? crypto.randomUUID(),
    goal: data.goal,
    goalLabel: data.goalLabel.trim().slice(0, 120),
    invitation: sentence(data.invitation.trim()).slice(0, 300),
    place: data.place,
    days: data.days,
    intention: data.intention.trim().slice(0, 300),
    startedAt: (data.now ?? new Date()).toISOString(),
    checkIns: [],
    kept: [],
  };
  if (!isFamilyPlan(plan)) throw new Error("Choose what you’d like more of and one small thing to try.");
  return plan;
}
/** Today's answer; answering again the same day changes it. */
export function checkIn(plan: FamilyPlan, answer: Answer, now = new Date()): FamilyPlan {
  const day = dayKey(now);
  return {
    ...plan,
    checkIns: [...plan.checkIns.filter((c) => c.day !== day), { day, answer }].slice(-MAX_LIST),
  };
}
export function keepLine(plan: FamilyPlan, line: KeptLine): FamilyPlan {
  if (!isKeptLine(line)) throw new Error("That line couldn’t be kept. Try a shorter one.");
  if (plan.kept.some((k) => k.id === line.id)) return plan;
  return { ...plan, kept: [...plan.kept, line].slice(-MAX_LIST) };
}
export const movePlace = (plan: FamilyPlan, place: PlaceId): FamilyPlan => {
  if (!isPlaced(plan.goal) || plan.goal === "own") return plan;
  const i = invitationsFor(plan.goal, plan.place).indexOf(plan.invitation);
  const next = invitationsFor(plan.goal, place);
  return {
    ...plan,
    place,
    invitation: next[i >= 0 ? i : 0],
    intention: plan.intention === defaultIntention(plan.goal, plan.place)
      ? defaultIntention(plan.goal, place)
      : plan.intention,
  };
};
/** "Keep trying this": the same plan for another stretch, starting today. */
export const againPlan = (plan: FamilyPlan, now = new Date()): FamilyPlan => ({
  ...plan,
  id: crypto.randomUUID(),
  startedAt: now.toISOString(),
  checkIns: [],
  kept: [],
});

/**
 * The line to give the most space on the look-back: the latest said by
 * someone other than the writer, or else the latest. The rest, newest first.
 */
export function featuredLine(plan: FamilyPlan, owner: string) {
  const newest = plan.kept.toReversed();
  const featured =
    newest.find((k) => k.who.trim().toLowerCase() !== owner.trim().toLowerCase()) ?? newest[0];
  return { featured, others: newest.filter((k) => k !== featured) };
}
/** When nothing was kept, their own answers lead: "It helped" on 5 days. */
export function answerSummary(plan: FamilyPlan) {
  const counts = answers
    .map((a) => ({ a, n: plan.checkIns.filter((c) => c.answer === a).length }))
    .filter((x) => x.n);
  if (!counts.length) return "";
  return counts
    .map(({ a, n }) => `“${answerLabels[a]}” ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`}`)
    .join(", ");
}
/** The look-back as a page for Our family book. */
export function lookBackPage(plan: FamilyPlan, choice: NextStep, helped: string) {
  const lines = [
    plan.intention && `We said: “${plan.intention}”`,
    `We tried: ${plan.invitation}`,
    ...plan.kept.map((k) => `“${k.text}” — ${k.who}, ${k.at}`),
    !plan.kept.length && answerSummary(plan) && `We said ${answerSummary(plan)}.`,
    helped.trim() && `What helped: ${helped.trim()}`,
    `Next: ${nextLabels[choice]}.`,
  ].filter(Boolean);
  return {
    title: `Looking back: ${plan.goalLabel}`,
    text: lines.join("\n\n"),
  };
}

const MAX_LIST = 400;
const str = (v: unknown, max: number, empty = false) =>
  typeof v === "string" && v.length <= max && (empty || !!v.trim());
const iso = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
const isKeptLine = (k: unknown): k is KeptLine => {
  const x = k as KeptLine;
  return (
    !!x &&
    typeof x === "object" &&
    str(x.id, 100) &&
    str(x.text, 2000) &&
    str(x.who, 120) &&
    str(x.at, 60, true) &&
    iso(x.date)
  );
};
export function isFamilyPlan(value: unknown): value is FamilyPlan {
  const p = value as FamilyPlan;
  return (
    !!p &&
    typeof p === "object" &&
    str(p.id, 100) &&
    goalIds.includes(p.goal) &&
    str(p.goalLabel, 120) &&
    str(p.invitation, 300) &&
    placeIds.includes(p.place) &&
    lengths.includes(p.days) &&
    str(p.intention, 300, true) &&
    iso(p.startedAt) &&
    Array.isArray(p.checkIns) &&
    p.checkIns.length <= MAX_LIST &&
    p.checkIns.every(
      (c) => !!c && /^\d{4}-\d{2}-\d{2}$/.test(c.day) && answers.includes(c.answer),
    ) &&
    Array.isArray(p.kept) &&
    p.kept.length <= MAX_LIST &&
    p.kept.every(isKeptLine)
  );
}
