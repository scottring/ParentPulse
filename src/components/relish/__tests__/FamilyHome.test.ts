// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { invitationsFor, keepLine, startPlan } from "@/lib/relish/family-plan";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
import { openBook } from "./bookHarness";

const adult = (extra: Partial<Book> = {}): Book => ({
  ...emptyBook("Scott"),
  profile: { kind: "adult" },
  people: [
    { id: "ella", name: "Ella", role: "Daughter", color: "sun", note: "", lessons: [] },
    { id: "iris", name: "Iris", role: "Partner", color: "sky", note: "", lessons: [] },
  ],
  ...extra,
});
/** The family plan is featured on Activities; Together always shows it (2026-11-21). */
const toFamily = () => {
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name: "Together" }));
};
const invite = () => document.querySelector(".fh-invite")!.textContent;
const plan = (daysAgo: number) =>
  startPlan({
    goal: "hearing",
    goalLabel: "Hearing each other out",
    invitation: invitationsFor("hearing", "dinner")[0],
    place: "dinner",
    days: 14,
    intention: "We’d like dinner to be a time when everyone gets heard.",
    now: new Date(Date.now() - daysAgo * 86_400_000),
  });

it("Home is one page: a welcome, Lately from the journal, and four painted choices", () => {
  openBook(adult());
  expect(screen.getByRole("heading", { level: 1, name: "Welcome, Scott." })).toBeTruthy();
  // No Write button, no Book tab, no Just me / Our family switch in the header.
  expect(screen.queryByRole("button", { name: /^\+?\s*Write$/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Book" })).toBeNull();
  expect(screen.queryByRole("group", { name: "Whose pages" })).toBeNull();
  const todo = screen.getByRole("region", { name: "What would you like to do?" });
  expect(within(todo).getAllByRole("button").filter((b) => b.className.includes("ha-choice-main")).map((b) => b.textContent)).toEqual([
    "Write a private page",
    "Add to our family journal",
    "Do an activity",
    "Read about our family",
  ]);
  expect(within(todo).getByText("Only you see it")).toBeTruthy();
  expect(within(todo).getByText("Everyone in the family can read it")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Open the journal" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Open (my|family) journal/ })).toBeNull();
});

it("Home asks how the family plan went and sends you to it in Activities", () => {
  openBook(adult({ familyPlan: plan(3) }));
  const ask = screen.getByRole("region", { name: "How is it going?" });
  expect(within(ask).getByText("Hearing each other out · Day 4 of 14")).toBeTruthy();
  fireEvent.click(within(ask).getByRole("button", { name: "Say how it went" }));
  expect(screen.getByRole("group", { name: "How did it go?" })).toBeTruthy();
});

it("Activities in Our family features the family plan, already previewed", () => {
  openBook(adult());
  toFamily();
  expect(screen.getByRole("heading", { level: 1, name: "Hearing each other out" })).toBeTruthy();
  expect(invite()).toBe("At dinner, let someone finish a story. Then ask one question about it.");
  expect(document.querySelector(".fh-art-first")).toBeTruthy();
  // The selector sits under Adjust the plan; changing it previews another small thing.
  fireEvent.click(screen.getByRole("button", { name: "Adjust the plan" }));
  expect((screen.getByLabelText("What would you like a little more of in your family?") as HTMLSelectElement).value).toBe("hearing");
  fireEvent.change(screen.getByLabelText("What would you like a little more of in your family?"), {
    target: { value: "laughing" },
  });
  expect(invite()).toBe("At dinner, each person tells one thing that made them laugh today.");
  expect(screen.getByRole("heading", { level: 1, name: "Laughing together" })).toBeTruthy();
});

it("a plan card on a shelf previews that plan in the featured spot", async () => {
  const { stored } = openBook(adult({ familyPlan: plan(3) }));
  toFamily();
  fireEvent.click(screen.getByRole("button", { name: "Kinder ways to disagree: Try it this week" }));
  expect(screen.getByRole("heading", { level: 1, name: "Kinder ways to disagree" })).toBeTruthy();
  expect(screen.getByText(/You’re trying “Hearing each other out” now\. Starting this one replaces it\./)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep what we’re trying" }));
  expect(screen.getByRole("group", { name: "How did it go?" })).toBeTruthy();
  expect(stored().familyPlan!.goal).toBe("hearing");
});

it("first visit: choose, the small thing leads, adjust the plan, try it tonight", async () => {
  const { stored } = openBook(adult());
  toFamily();
  expect(stored().familyPlan).toBeUndefined();
  expect(invite()).toBe("At dinner, let someone finish a story. Then ask one question about it.");
  expect(screen.getByText(/Try it tonight\. Look back together in two weeks\./)).toBeTruthy();
  const adjust = screen.getByRole("button", { name: "Adjust the plan" });
  expect(adjust.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(adjust);
  fireEvent.click(screen.getByRole("button", { name: "1 week" }));
  fireEvent.click(screen.getByRole("button", { name: "In the car" }));
  expect(invite()).toMatch(/^In the car, /);
  expect(document.querySelector(".fh-art-first")).toBeNull(); // dinner has the painting
  fireEvent.click(screen.getByRole("button", { name: "At dinner" }));
  expect(document.querySelector(".fh-art-first")).toBeTruthy();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Try this tonight" }));
  });
  const saved = stored().familyPlan!;
  expect(saved.days).toBe(7);
  expect(saved.place).toBe("dinner");
  expect(saved.intention).toBe("We’d like dinner to be a time when everyone gets heard.");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "You wanted everyone to get a turn at dinner. How did it go?",
  );
});

it("coming back: three equal answers, then keep a line in Our family journal", async () => {
  const { stored } = openBook(adult({ familyPlan: plan(3) }));
  toFamily();
  expect(screen.getByText("Hearing each other out · Day 4 of 14")).toBeTruthy();
  const group = screen.getByRole("group", { name: "How did it go?" });
  expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([
    "It helped",
    "A bit mixed",
    "We didn’t get to it",
  ]);
  expect(screen.queryByRole("region", { name: "Keep a line" })).toBeNull();
  await act(async () => {
    fireEvent.click(within(group).getByRole("button", { name: "It helped" }));
  });
  expect(stored().familyPlan!.checkIns.map((c) => c.answer)).toEqual(["helped"]);
  const keep = screen.getByRole("region", { name: "Keep a line" });
  expect(within(keep).getByRole("heading", { name: "Did anyone say something worth keeping?" })).toBeTruthy();
  const button = within(keep).getByRole("button", { name: "Keep this" }) as HTMLButtonElement;
  fireEvent.change(within(keep).getByLabelText("Their words"), {
    target: { value: "“Dad asked what happened next.”" },
  });
  expect(button.disabled).toBe(true); // who said it comes first
  fireEvent.click(within(keep).getByRole("button", { name: "Ella" }));
  await act(async () => {
    fireEvent.click(button);
  });
  const family = stored().familyPages!;
  expect(family).toHaveLength(1);
  expect(family[0]).toMatchObject({
    kind: "passage",
    text: "Dad asked what happened next.",
    caption: "Ella · at dinner",
  });
  expect(stored().familyPlan!.kept[0]).toMatchObject({ id: family[0].id, who: "Ella" });
  expect(screen.getByText("Kept in Our family journal.")).toBeTruthy();
  // The kept line sits under the answers.
  expect(document.querySelector(".fh-passage-small blockquote")!.textContent).toBe(
    "“Dad asked what happened next.”",
  );
});

it("a mixed answer offers trying it somewhere else", async () => {
  const { stored } = openBook(adult({ familyPlan: plan(2) }));
  toFamily();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "A bit mixed" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "in the car" }));
  });
  expect(stored().familyPlan!.place).toBe("car");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "You wanted everyone to get a turn in the car. How did it go?",
  );
});

it("looking back: their words get the space, then what next; the look-back can go in the book", async () => {
  let p = plan(15);
  p = keepLine(p, { id: "k1", text: "Kaleb told the whole recess story.", who: "Scott", at: "at dinner", date: new Date().toISOString() });
  p = keepLine(p, { id: "k2", text: "Dad asked what happened next.", who: "Ella", at: "at dinner", date: new Date().toISOString() });
  const { stored } = openBook(adult({ familyPlan: p }));
  toFamily();
  expect(screen.getByRole("heading", { level: 1, name: "Does dinner feel any different?" })).toBeTruthy();
  expect(screen.getByText(/^Looking back · .* · two weeks of hearing each other out$/)).toBeTruthy();
  expect(screen.getByText("We’d like dinner to be a time when everyone gets heard.")).toBeTruthy();
  const featured = document.querySelector(".fh-look > .fh-passage")!;
  expect(featured.querySelector("blockquote")!.textContent).toBe("“Dad asked what happened next.”");
  expect(featured.querySelector("figcaption")!.textContent).toBe("Ella · at dinner");
  expect(within(screen.getByRole("list", { name: "More of what you kept" })).getAllByRole("listitem")).toHaveLength(1);
  const next = screen.getByRole("region", { name: "What would you like to do next?" });
  expect(within(next).getAllByRole("button").map((b) => b.textContent)).toEqual([
    "Keep trying this",
    "Choose something new",
    "Finish for now",
  ]);
  await act(async () => {
    fireEvent.click(within(next).getByRole("button", { name: "Keep trying this" }));
  });
  const page = stored().familyPages!.find((x) => x.kind === "page")!;
  expect(page.title).toBe("Looking back: Hearing each other out");
  expect(stored().familyPlan!.kept).toEqual([]);
  expect(screen.getByText("Hearing each other out · Day 1 of 14")).toBeTruthy();
});

it("Finish for now without keeping the look-back adds nothing to the book", async () => {
  const { stored } = openBook(adult({ familyPlan: plan(20) }));
  toFamily();
  fireEvent.click(screen.getByRole("checkbox", { name: "Keep this look-back in Our family journal" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Finish for now" }));
  });
  expect(stored().familyPlan).toBeUndefined();
  expect(stored().familyPages || []).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Try this tonight" })).toBeTruthy();
});
