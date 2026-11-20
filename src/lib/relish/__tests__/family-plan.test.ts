import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import {
  againPlan,
  answerSummary,
  checkIn,
  dayOf,
  differsLine,
  featuredLine,
  invitationsFor,
  isFamilyPlan,
  keepLine,
  lookBackPage,
  momentOf,
  movePlace,
  startPlan,
  todaysAnswer,
  wantedLine,
  type FamilyPlan,
} from "../family-plan";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const start = new Date(2026, 10, 6, 18, 30); // Nov 6, evening
const dinner = (): FamilyPlan =>
  startPlan({
    goal: "hearing",
    goalLabel: "Hearing each other out",
    invitation: invitationsFor("hearing", "dinner")[0],
    place: "dinner",
    days: 14,
    intention: "We’d like dinner to be a time when everyone gets heard.",
    now: start,
  });
const at = (day: number, hour = 19) => new Date(2026, 10, 5 + day, hour);
const line = (id: string, who: string, text = "Dad asked what happened next.") => ({
  id,
  text,
  who,
  at: "at dinner",
  date: at(3).toISOString(),
});

describe("a family plan", () => {
  it("words the small thing for the place", () => {
    expect(invitationsFor("hearing", "dinner")[0]).toBe(
      "At dinner, let someone finish a story. Then ask one question about it.",
    );
    expect(invitationsFor("hearing", "car")[0]).toMatch(/^In the car, let someone/);
    expect(wantedLine(dinner())).toBe("You wanted everyone to get a turn at dinner.");
    expect(differsLine(dinner())).toBe("Does dinner feel any different?");
  });

  it("is the first visit, then coming back for its days, then the look-back", () => {
    expect(momentOf(undefined)).toBe("first");
    const plan = dinner();
    expect(dayOf(plan, at(1, 23))).toBe(1);
    expect(dayOf(plan, at(4))).toBe(4);
    expect(momentOf(plan, at(14, 23))).toBe("back");
    expect(momentOf(plan, at(15, 7))).toBe("lookback");
  });

  it("keeps one answer a day; answering again changes it", () => {
    let plan = checkIn(dinner(), "mixed", at(4, 8));
    plan = checkIn(plan, "helped", at(4, 21));
    plan = checkIn(plan, "missed", at(5));
    expect(plan.checkIns).toHaveLength(2);
    expect(todaysAnswer(plan, at(4))).toBe("helped");
    expect(todaysAnswer(plan, at(6))).toBeUndefined();
    expect(answerSummary(plan)).toBe("“It helped” once, “We didn’t get to it” once");
  });

  it("features the latest line someone else said, then the rest newest first", () => {
    let plan = keepLine(dinner(), line("a", "Scott", "Kaleb told the whole recess story."));
    plan = keepLine(plan, line("b", "Ella"));
    plan = keepLine(plan, line("c", "Scott", "We did it in the car."));
    plan = keepLine(plan, line("b", "Ella")); // the same line twice is kept once
    const { featured, others } = featuredLine(plan, "Scott");
    expect(featured?.id).toBe("b");
    expect(others.map((k) => k.id)).toEqual(["c", "a"]);
    expect(featuredLine(keepLine(dinner(), line("x", "Scott")), "scott").featured?.id).toBe("x");
  });

  it("moves to another place, rewording what they're trying and the default intention", () => {
    const moved = movePlace(dinner(), "car");
    expect(moved.invitation).toBe(invitationsFor("hearing", "car")[0]);
    expect(moved.intention).toBe("We’d like the car to be a time when everyone gets heard.");
    const own = { ...dinner(), intention: "Fewer interruptions." };
    expect(movePlace(own, "bedtime").intention).toBe("Fewer interruptions.");
  });

  it("starts again with nothing carried over", () => {
    const plan = keepLine(checkIn(dinner(), "helped", at(2)), line("a", "Ella"));
    const again = againPlan(plan, at(16));
    expect(again.id).not.toBe(plan.id);
    expect(again.checkIns).toEqual([]);
    expect(again.kept).toEqual([]);
    expect(momentOf(again, at(16))).toBe("back");
  });

  it("writes the look-back as a page in the family's words", () => {
    const plan = keepLine(dinner(), line("b", "Ella"));
    const page = lookBackPage(plan, "keep", "Asking one question back.");
    expect(page.title).toBe("Looking back: Hearing each other out");
    expect(page.text).toContain("“Dad asked what happened next.” — Ella, at dinner");
    expect(page.text).toContain("What helped: Asking one question back.");
    expect(page.text).toContain("Next: Keep trying this.");
  });

  it("is checked when a book loads", () => {
    const book = { ...emptyBook("Scott"), familyPlan: dinner() };
    expect(isBook(book)).toBe(true);
    expect(isFamilyPlan({ ...dinner(), goal: "nap" })).toBe(false);
    expect(isFamilyPlan({ ...dinner(), days: 3 })).toBe(false);
    expect(isFamilyPlan({ ...dinner(), checkIns: [{ day: "Nov 6", answer: "helped" }] })).toBe(false);
    expect(isBook({ ...book, familyPlan: { ...dinner(), invitation: "" } })).toBe(false);
    expect(() =>
      startPlan({ goal: "own", goalLabel: "", invitation: "x", place: "dinner", days: 7, intention: "" }),
    ).toThrow();
  });
});
