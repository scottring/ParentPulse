import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { invitationsFor, startPlan } from "../family-plan";
import { isFamilyPage } from "../family-pages";
import {
  tableNotePage,
  tableNoteText,
  tableQuestion,
  tableTurns,
  tonightFor,
  tonightPreview,
} from "../table-mode";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const start = new Date(2026, 10, 20, 18, 30);
const plan = (goal: "hearing" | "mornings" = "hearing", place: "dinner" | "car" = "dinner") =>
  startPlan({
    goal,
    goalLabel: goal === "hearing" ? "Hearing each other out" : "Calmer mornings",
    invitation: invitationsFor(goal, place)[0],
    place,
    days: 14,
    intention: "",
    now: start,
  });

describe("tonight's activity", () => {
  it("is the family plan while it runs, with its day and without repeating the place", () => {
    expect(tonightFor(plan(), new Date(2026, 10, 22, 19))).toEqual({
      when: "Tonight at dinner · day 3 of 14",
      title: "Hearing each other out",
      prompt: "Let someone finish a story. Then ask one question about it.",
      at: "at dinner",
      own: false,
    });
  });
  it("says where and when for each kind of plan", () => {
    expect(tonightFor(plan("hearing", "car"), new Date(2026, 10, 20, 19)).when).toBe(
      "Today in the car · day 1 of 14",
    );
    const mornings = tonightFor(plan("mornings"), new Date(2026, 10, 21, 7));
    expect(mornings.when).toBe("This week · day 2 of 14");
    expect(mornings.prompt).toBe("The night before, lay out clothes and bags together.");
    expect(mornings.at).toBe("");
  });
  it("falls back to the first-visit suggestion without a plan or once the plan is over", () => {
    const suggestion = tonightPreview("hearing", "dinner");
    expect(tonightFor(undefined)).toEqual(suggestion);
    expect(tonightFor(plan(), new Date(2026, 11, 10))).toEqual(suggestion);
    expect(suggestion.when).toBe("Tonight at dinner");
  });
});

describe("question cards", () => {
  it("asks Day's highlights' questions as whole questions", () => {
    expect(tableQuestion("best part of today?")).toBe("What was the best part of today?");
    expect(tableQuestion("what are you looking forward to?")).toBe("What are you looking forward to?");
  });
  it("gives everyone one turn, rotating the questions, without repeats", () => {
    const turns = tableTurns(["Alex", "Leo", " anna ", "June", "leo"]);
    expect(turns.map((t) => t.who)).toEqual(["Alex", "Leo", "anna", "June"]);
    expect(turns.map((t) => t.question)).toEqual([
      "What was the best part of today?",
      "What was the hardest part of today?",
      "What are you looking forward to?",
      "What was the best part of today?",
    ]);
    expect(tableTurns(Array.from({ length: 20 }, (_, i) => `P${i}`))).toHaveLength(12);
  });
});

describe("the one note", () => {
  it("says who told their stories, never what they said", () => {
    expect(tableNoteText(["Leo", "Anna", "Alex"], "at dinner")).toBe(
      "Leo, Anna and Alex told their stories at dinner.",
    );
    expect(tableNoteText(["Leo"], "")).toBe("Leo told their stories.");
  });
  it("is a valid family page whose id comes from the sitting", () => {
    const tonight = tonightFor(undefined);
    const me = { name: "Alex", bookId: "sample" };
    const page = tableNotePage("sit-1", ["Leo", "Alex"], tonight, me);
    expect(isFamilyPage(page)).toBe(true);
    expect(page).toMatchObject({
      id: "table-sit-1",
      kind: "page",
      title: "Hearing each other out",
      text: "Leo and Alex told their stories at dinner.",
      byName: "Alex",
    });
    expect(tableNotePage("sit-1", ["Leo"], tonight, me).id).toBe(page.id);
  });
});
