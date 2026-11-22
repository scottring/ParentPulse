/**
 * Table mode (2026-11-22): the phone stands up on the table, half folded,
 * with its outer screen toward the family. One big card at a time; a tap
 * anywhere moves on and nobody types.
 *
 * Tonight's cards reuse what already exists: the family plan's small thing
 * to try (family-plan.ts) and Day's highlights' three questions (tools.ts),
 * taken in turn by everyone at the table. Spot it! reuses the game itself.
 * Nobody's answers are saved; the finish card offers one note to Our family
 * journal, which the family can skip.
 */
import { newFamilyPage, type FamilyPage } from "./family-pages";
import {
  dayOf,
  goals,
  invitationsFor,
  isPlaced,
  momentOf,
  places,
  type FamilyPlan,
  type GoalId,
  type PlaceId,
} from "./family-plan";
import { highlightsTool, namesList } from "./tools";

/** What the start card (and the Tonight widget) shows. */
export type TableTonight = {
  /** "Tonight at dinner · day 3 of 14" */
  when: string;
  /** "Hearing each other out" */
  title: string;
  /** "Let someone finish a story. Then ask one question about it." */
  prompt: string;
  /** Where it happens, for the note: "at dinner". Empty when it has no place. */
  at: string;
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Tonight at dinner", "Today in the car", "This week" for a goal with no place. */
function whenLine(goal: GoalId, place: PlaceId) {
  if (goal !== "own" && !isPlaced(goal)) return "This week";
  return place === "car" ? "Today in the car" : `Tonight ${places[place].at}`;
}
/** "At dinner, let someone finish…" → "Let someone finish…": the place is said above it. */
function withoutLead(invitation: string, goal: GoalId, place: PlaceId) {
  const lead = `${places[place].lead}, `;
  if (goal !== "own" && isPlaced(goal) && invitation.startsWith(lead))
    return sentence(invitation.slice(lead.length));
  return sentence(invitation);
}
/** A goal and place that hasn't started yet: what Activities is previewing. */
export function tonightPreview(
  goal: Exclude<GoalId, "own">,
  place: PlaceId,
  invitation = invitationsFor(goal, place)[0],
): TableTonight {
  return {
    when: whenLine(goal, place),
    title: goals[goal].label,
    prompt: withoutLead(invitation, goal, place),
    at: isPlaced(goal) ? places[place].at : "",
  };
}
/**
 * Tonight's activity: the family plan while it's running, with its day, or
 * otherwise the suggestion a family's first visit opens on (hearing each
 * other out at dinner).
 */
export function tonightFor(plan: FamilyPlan | undefined, now = new Date()): TableTonight {
  if (!plan || momentOf(plan, now) !== "back") return tonightPreview("hearing", "dinner");
  const placed = plan.goal === "own" || isPlaced(plan.goal);
  return {
    when: `${whenLine(plan.goal, plan.place)} · day ${Math.min(dayOf(plan, now), plan.days)} of ${plan.days}`,
    title: plan.goalLabel,
    prompt: withoutLead(plan.invitation, plan.goal, plan.place),
    at: placed && plan.goal !== "own" ? places[plan.place].at : "",
  };
}

/** Day's highlights' questions as a card asks them: "What was the best part of today?" */
export function tableQuestion(ask: string) {
  const q = ask.trim();
  return /^what\b/i.test(q) ? sentence(q) : `What was the ${q}`;
}
export type TableTurn = { who: string; question: string };
/**
 * One turn each, in the order given, and the three questions taken in turn:
 * the first person gets the best part of today, the next the hardest, and so
 * on. Names are deduplicated; at most twelve people take a turn.
 */
export function tableTurns(names: string[]): TableTurn[] {
  const asks = highlightsTool().questions.map((q) => tableQuestion(q.ask));
  const people = names
    .map((n) => n.trim())
    .filter((n, i, all) => n && all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
    .slice(0, 12);
  return people.map((who, i) => ({ who, question: asks[i % asks.length] }));
}
/** "Leo, Anna and Alex told their stories at dinner." */
export function tableNoteText(names: string[], at: string) {
  const who = namesList(names);
  return at ? `${who} told their stories ${at}.` : `${who} told their stories.`;
}
/**
 * The one note Table mode offers Our family journal. Its id comes from the
 * sitting, so keeping it twice never adds a second page.
 */
export function tableNotePage(
  sitting: string,
  names: string[],
  tonight: Pick<TableTonight, "title" | "at">,
  me: { name: string; bookId: string },
  now = new Date(),
): FamilyPage {
  return newFamilyPage({
    id: `table-${sitting}`.slice(0, 100),
    kind: "page",
    title: tonight.title.slice(0, 120),
    text: tableNoteText(names, tonight.at),
    byName: me.name,
    byBookId: me.bookId,
    createdAt: now.toISOString(),
  });
}
