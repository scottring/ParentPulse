// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { advanceGame, livingOf, newGame } from "@/lib/relish/living";
import { todayKey, toolsOf, type ToolsState } from "@/lib/relish/tools";
import LivingBook from "../LivingBook";
import { sameV2 } from "@/lib/relish/__tests__/same-page-v2";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
function open(book = emptyBook("Robin"), family?: { id: string; name: string; onOpen: () => void }[]) {
  let stored = book;
  let fail = false;
  const lock = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState(stored);
    return createElement(LivingBook, {
      vault: {
        book: current,
        mode: "open",
        editions: [],
        editionId: "activity-test",
        shelf: vi.fn(),
        select: vi.fn(),
        remove: vi.fn(),
        busy: false,
        error: "",
        open: vi.fn(),
        lock,
        backup: vi.fn(),
        photos: { add: vi.fn(), load: vi.fn() },
        save: async (change) => {
          if (fail) throw new Error("Storage is full");
          stored = typeof change === "function" ? change(stored) : change;
          setCurrent(stored);
        },
      },      family,
    });
  }
  const mounted = render(createElement(Harness));
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  return {
    stored: () => stored,
    fail: (value: boolean) => {
      fail = value;
    },
    lock,
    unmount: mounted.unmount,
  };
}

const adult = (): Book => ({
  ...emptyBook("Robin"),
  profile: { kind: "adult" },
  people: [
    { id: "sam", name: "Sam", role: "Partner", color: "rose", note: "", lessons: [] },
  ],
});
it("sorts cards, picks one, and keeps the result as a page in Your pages", async () => {
  const app = open(adult());
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  await screen.findByRole("heading", { name: "What helps when I’m upset" });
  // The start screen asks who it is with; no one in particular is the default.
  expect(
    (screen.getByRole("radio", { name: "No one in particular" }) as HTMLInputElement).checked,
  ).toBe(true);
  expect(document.querySelector(".ui-private")?.textContent).toContain("Your private pages");
  fireEvent.click(screen.getByRole("button", { name: /Start this exercise/ }));
  expect(screen.queryByRole("button", { name: /Keep this page/ })).toBeNull();
  const card = screen.getByRole("group", { name: "Talking it through" });
  fireEvent.click(within(card).getByRole("button", { name: "Helps me" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Music" })).getByRole("button", {
      name: "Doesn’t help",
    }),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Add your own card" }), {
    target: { value: "A long shower" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "A long shower" })).getByRole("button", {
      name: "Helps me",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /A long shower/, pressed: false }));
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByText("Kept in your book. Only you can see it.");
  const page = app.stored().journal![0];
  expect(page.status).toBe("kept");
  expect(page.title).toBe("What helps when I’m upset");
  expect(page.text).toContain("Helps me: Talking it through; A long shower.");
  expect(page.text).toContain("Doesn’t help: Music.");
  expect(page.text).toContain("The one to try first next time: A long shower.");
  // What now: the headline says what you came away with; Done for now goes Home.
  expect(screen.getByRole("heading", { name: "You have your own list for hard moments." })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Done for now" }));
  await screen.findByRole("heading", { level: 1, name: /^Welcome/ });
});
it("builds a soft opener only once every part is filled in", async () => {
  const app = open(adult());
  fireEvent.click(await screen.findByRole("button", { name: /Rewrite the opener/ }));
  expect(screen.getByText(/Your answers save as you go/)).toBeTruthy();
  expect(screen.getByRole("group", { name: "Who will you say this to?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Sam" }));
  fireEvent.click(screen.getByRole("button", { name: /Start this exercise/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "I feel…" }), {
    target: { value: "worn out" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "about…" }), {
    target: { value: "bedtime alone" },
  });
  expect(screen.queryByRole("button", { name: /Keep this page/ })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "and what would help is…" }), {
    target: { value: "trading off" },
  });
  expect(
    screen.getAllByText(
      "I feel worn out about bedtime alone, and what would help is trading off.",
    ).length,
  ).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByText("Kept in your book. Only you can see it.");
  expect(app.stored().journal![0]).toMatchObject({
    title: "Rewrite the opener · Sam",
    people: ["sam"],
  });
});
it("a kept Plan a repair page comes back in Still going, then on Home once it's due", async () => {
  const app = open(adult());
  fireEvent.click(await screen.findByRole("button", { name: /Plan a repair/ }));
  fireEvent.click(screen.getByRole("radio", { name: "Sam" }));
  fireEvent.click(screen.getByRole("button", { name: /Start this exercise/ }));
  for (const [label, value] of [
    ["I’m sorry I…", "snapped about the shoes"],
    ["What I wish I’d done…", "helped you look"],
    ["Next time I’ll…", "say I need a minute"],
    ["Can we…", "try again tomorrow"],
  ])
    fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByText("Kept in your book. Only you can see it.");
  expect(screen.getByRole("heading", { name: "You have words for a repair with Sam." })).toBeTruthy();
  // Nothing is asked about unless they choose to be reminded.
  expect(toolsOf(app.stored()).checkBacks ?? []).toHaveLength(0);
  expect(screen.getByText(/In two days Relish asks how it went/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remind me to say it" }));
  await waitFor(() => expect(toolsOf(app.stored()).checkBacks).toHaveLength(1));
  const [plan] = toolsOf(app.stored()).checkBacks!;
  expect(plan.plan).toBe(
    "I’m sorry I snapped about the shoes. I wish I’d helped you look. Next time I’ll say I need a minute. Can we try again tomorrow?",
  );
  // Not due yet: Home doesn't ask; Still going shows when it will ask.
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  await screen.findByRole("heading", { level: 1, name: /^Welcome/ });
  expect(screen.queryByRole("region", { name: /Your plan from/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  const item = await screen.findByRole("button", { name: /Your plan · Plan a repair · Sam/ });
  expect(item.textContent).toMatch(/Relish asks \w+day/);
  app.unmount();
  cleanup();

  // Two days later (stored as already due), Home asks in the person's own words.
  const later = open({
    ...app.stored(),
    tools: {
      ...toolsOf(app.stored()),
      checkBacks: [{ ...plan, dueAt: new Date(Date.now() - 1000).toISOString() }],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  const card = await screen.findByRole("region", { name: "Your plan from Plan a repair" });
  expect(within(card).getByText("You planned to say to Sam:")).toBeTruthy();
  expect(within(card).getByText(`“${plan.plan}”`)).toBeTruthy();
  expect(within(card).getByText("Did you get to say it?")).toBeTruthy();
  expect(within(card).getAllByRole("button").map((b) => b.textContent)).toEqual([
    "I said it",
    "Not yet",
    "Let it go",
  ]);
  fireEvent.click(within(card).getByRole("button", { name: "I said it" }));
  fireEvent.click(within(card).getByRole("button", { name: "It helped, even a little" }));
  fireEvent.change(within(card).getByRole("textbox"), { target: { value: "We laughed about it." } });
  fireEvent.click(within(card).getByRole("button", { name: "Save how it went" }));
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Your plan from Plan a repair" })).toBeNull(),
  );
  expect(toolsOf(later.stored()).checkBacks![0]).toMatchObject({
    status: "tried",
    outcome: "helped",
    note: "We laughed about it.",
  });
});
it("runs a day-by-day checklist across visits and finishes into a page", async () => {
  const app = open(adult());
  fireEvent.click(await screen.findByRole("button", { name: /^Ten real hellos/ }));
  const start = screen.getByRole("button", { name: /Start/ }) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  // Today's effort and the overall length are told apart, and what saves is honest.
  expect(screen.getByText(/Each day: under a minute/)).toBeTruthy();
  expect(screen.getByText("Keeps going: 10 days, at your pace")).toBeTruthy();
  expect(screen.getByText(/Each mark saves as you go/)).toBeTruthy();
  // Someone is required here, so "No one in particular" is not offered.
  expect(screen.queryByRole("radio", { name: "No one in particular" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Sam" }));
  fireEvent.click(screen.getByRole("button", { name: /Start/ }));
  // The active screen: who it's with, today's effort, the one instruction, ten marks.
  await screen.findByText("With Sam");
  expect(screen.getByText("Under a minute a day, at your own pace")).toBeTruthy();
  expect(screen.getAllByText(/six seconds of your full attention/)).toHaveLength(1);
  expect(screen.getByText("0 of 10 days")).toBeTruthy();
  expect(document.querySelectorAll(".rt-days li")).toHaveLength(10);
  // No repeated how-to-finish text, save notice or disabled finish button.
  expect(screen.queryByText(/Finished when/)).toBeNull();
  expect(screen.queryByText(/saves as you go/)).toBeNull();
  expect(screen.queryByRole("button", { name: /Finish and keep/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Mark today" }));
  await screen.findByText("1 of 10 days · Today marked");
  expect(screen.queryByRole("button", { name: "Mark today" })).toBeNull();
  expect(document.querySelectorAll('.rt-days li[data-done="true"]')).toHaveLength(1);
  // Undo, then mark again: never two marks for one day.
  fireEvent.click(screen.getByRole("button", { name: "Undo today" }));
  fireEvent.click(await screen.findByRole("button", { name: "Mark today" }));
  await screen.findByText("1 of 10 days · Today marked");
  expect(toolsOf(app.stored()).trackers[0].marks).toHaveLength(1);
  app.unmount();
  const again = open(app.stored());
  fireEvent.click(
    screen.getByRole("button", { name: /Ten real hellos · 1 of 10/ }),
  );
  expect(screen.getByText(/1 of 10 days/)).toBeTruthy();
  // Finishing early lives under Activity options.
  fireEvent.click(screen.getByRole("button", { name: /Activity options/ }));
  fireEvent.click(screen.getByRole("button", { name: "Finish and keep a page" }));
  await screen.findByText("Kept in your book. Only you can see it.");
  const stored = again.stored();
  expect(toolsOf(stored).trackers[0].finishedAt).toBeTruthy();
  expect(stored.journal![0].title).toBe("Ten real hellos · Sam");
});
const parent = (tools?: ToolsState): Book => ({
  ...emptyBook("Scott"),
  profile: { kind: "adult" },
  people: [
    { id: "ella", name: "Ella", role: "child", color: "sage", note: "", lessons: [] },
    { id: "kaleb", name: "Kaleb", role: "child", color: "ochre", note: "", lessons: [] },
  ],
  ...(tools ? { tools } : {}),
});
/** `n` marks on earlier days, so today is still open. */
const earlier = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    key: `2026-10-${String(i + 10).padStart(2, "0")}`,
    at: "2026-10-10T08:00:00.000Z",
  }));
const run = (id: string, personId: string, marks = 0) => ({
  id,
  toolId: "hellos",
  personId,
  startedAt: "2026-10-09T08:00:00.000Z",
  marks: earlier(marks),
});
it("does ten real hellos with two people at once, each marked on their own", async () => {
  const app = open(parent());
  fireEvent.click(await screen.findByRole("button", { name: /^Ten real hellos/ }));
  // Several people can be chosen for a habit about someone.
  fireEvent.click(screen.getByRole("checkbox", { name: "Ella" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Kaleb" }));
  fireEvent.click(screen.getByRole("button", { name: /Start/ }));
  await screen.findByText("With Ella and Kaleb");
  expect(toolsOf(app.stored()).trackers.map((t) => t.personId)).toEqual(["ella", "kaleb"]);
  // The instruction once; one row each with its own button.
  expect(screen.getAllByText(/six seconds of your full attention/)).toHaveLength(1);
  const rows = () => [...document.querySelectorAll<HTMLElement>(".rt-habit-row")];
  expect(rows().map((r) => r.querySelector("strong")!.textContent)).toEqual(["Ella", "Kaleb"]);
  fireEvent.click(screen.getByRole("button", { name: "Mark today for Ella" }));
  await waitFor(() => expect(within(rows()[0]).getByText(/Marked today/)).toBeTruthy());
  expect(within(rows()[0]).getByText("1 of 10 days")).toBeTruthy();
  // Kaleb's button is untouched; order stays put.
  expect(screen.getByRole("button", { name: "Mark today for Kaleb" })).toBeTruthy();
  expect(rows().map((r) => r.querySelector("strong")!.textContent)).toEqual(["Ella", "Kaleb"]);
  fireEvent.click(screen.getByRole("button", { name: "Undo today for Ella" }));
  await screen.findByRole("button", { name: "Mark today for Ella" });
  expect(toolsOf(app.stored()).trackers[0].marks).toHaveLength(0);
  // Do something names both.
  fireEvent.click(screen.getByRole("button", { name: /Back to Activities/ }));
  expect(
    await screen.findByRole("button", { name: /Ten real hellos · Ella 0 of 10 · Kaleb 0 of 10/ }),
  ).toBeTruthy();
});
it("lets one person finish first while the other carries on", async () => {
  const app = open(parent({ version: 1, trackers: [run("e", "ella", 10), run("k", "kaleb", 3)] }));
  fireEvent.click(await screen.findByRole("button", { name: /^Ten real hellos/ }));
  await screen.findByText("Ten hellos with Ella.");
  const [ella, kaleb] = [...document.querySelectorAll<HTMLElement>(".rt-habit-row")];
  expect(within(kaleb).getByText("3 of 10 days")).toBeTruthy();
  expect(within(ella).queryByRole("button", { name: /Mark today/ })).toBeNull();
  fireEvent.change(within(ella).getByRole("textbox", { name: /Anything you want to remember/ }), {
    target: { value: "She started waving from the window." },
  });
  fireEvent.click(within(ella).getByRole("button", { name: "Keep Ella’s page" }));
  await screen.findByText(/Ella’s page is kept in your book/);
  const stored = app.stored();
  expect(stored.journal![0].title).toBe("Ten real hellos · Ella");
  expect(stored.journal![0].text).toContain("She started waving from the window.");
  // Kaleb alone now: the single-person screen, his marks intact.
  expect(screen.getByText("With Kaleb")).toBeTruthy();
  expect(screen.getByText("3 of 10 days")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mark today" }));
  await screen.findByText("4 of 10 days · Today marked");
  expect(toolsOf(app.stored()).trackers.find((t) => t.id === "k")!.marks.at(-1)!.key).toBe(todayKey());
});
it("after the tenth day, offers a line to remember and keeps the page", async () => {
  const app = open(parent({ version: 1, trackers: [run("k", "kaleb", 10)] }));
  fireEvent.click(await screen.findByRole("button", { name: /^Ten real hellos/ }));
  await screen.findByText("Ten hellos with Kaleb.");
  expect(screen.getByText("10 of 10 days")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Mark today" })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: /Anything you want to remember/ }), {
    target: { value: "He hugs me at the door now." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Finish and keep a page" }));
  await screen.findByText("Kept in your book. Only you can see it.");
  expect(app.stored().journal![0].text).toContain("He hugs me at the door now.");
});
it("shows a habit started before this change unchanged, and can add someone mid-way", async () => {
  const app = open(parent({ version: 1, trackers: [run("k", "kaleb", 4)] }));
  fireEvent.click(await screen.findByRole("button", { name: /Ten real hellos · 4 of 10/ }));
  await screen.findByText("With Kaleb");
  expect(screen.getByText("4 of 10 days")).toBeTruthy();
  expect(document.querySelectorAll('.rt-days li[data-done="true"]')).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: /Activity options/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add someone" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Add someone" })).getByRole("button", { name: "Ella" }));
  await screen.findByText("With Kaleb and Ella");
  expect(toolsOf(app.stored()).trackers.map((t) => [t.personId, t.marks.length])).toEqual([
    ["kaleb", 4],
    ["ella", 0],
  ]);
  // Finishing early keeps a page for whoever has days marked.
  fireEvent.click(screen.getByRole("button", { name: /Activity options/ }));
  fireEvent.click(screen.getByRole("button", { name: "Finish and keep a page" }));
  await screen.findByText("Kept in your book. Only you can see it.");
  expect(app.stored().journal!.map((e) => e.title)).toEqual(["Ten real hellos · Kaleb"]);
  expect(toolsOf(app.stored()).trackers.filter((t) => !t.finishedAt)).toHaveLength(0);
});
it("offers children with their own books in the library, and notes the one chosen", async () => {
  const kids = [
    { id: "k", name: "Kaleb", onOpen: vi.fn() },
    { id: "e", name: "Ella", onOpen: vi.fn() },
  ];
  const app = open({ ...emptyBook("Scott"), profile: { kind: "adult" } }, kids);
  fireEvent.click(await screen.findByRole("button", { name: /^Ten real hellos/ }));
  expect(screen.queryByText(/Add someone to your book first/)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Kaleb" }));
  fireEvent.click(screen.getByRole("button", { name: /Start/ }));
  await screen.findByRole("button", { name: "Mark today" });
  const stored = app.stored();
  const kaleb = stored.people.find((p) => p.name === "Kaleb")!;
  expect(kaleb.role).toBe("child");
  expect(stored.people.map((p) => p.name)).toEqual(["Kaleb"]);
  expect(toolsOf(stored).trackers[0].personId).toBe(kaleb.id);
});
it("the journal can tag children who have their own books in the library", async () => {
  const app = open({ ...emptyBook("Scott"), profile: { kind: "adult" } }, [
    { id: "k", name: "Kaleb", onOpen: vi.fn() },
    { id: "e", name: "Ella", onOpen: vi.fn() },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Journal" }));
  fireEvent.click(await screen.findByRole("button", { name: /Tag people/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Ella" }));
  await waitFor(() => expect(app.stored().people.map((p) => p.name)).toEqual(["Ella"]));
  const ella = app.stored().people[0];
  // Now noted in the book, Ella shows once and is ticked; Kaleb is still offered.
  await waitFor(() =>
    expect((screen.getByRole("checkbox", { name: "Ella" }) as HTMLInputElement).checked).toBe(true),
  );
  expect(screen.getAllByRole("checkbox", { name: "Ella" })).toHaveLength(1);
  expect(screen.getByRole("checkbox", { name: "Kaleb" })).toBeTruthy();
  expect(ella.role).toBe("child");
});
it("an exercise with someone from the library starts after noting them in the book", async () => {
  const app = open({ ...emptyBook("Scott"), profile: { kind: "adult" } }, [
    { id: "e", name: "Ella", onOpen: vi.fn() },
  ]);
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  await screen.findByRole("heading", { name: "What helps when I’m upset" });
  fireEvent.click(screen.getByRole("radio", { name: "Ella" }));
  const before = document.body.textContent;
  fireEvent.click(screen.getByRole("button", { name: /Start/ }));
  await waitFor(() => expect(document.body.textContent).not.toBe(before));
  expect(app.stored().people.map((p) => p.name)).toEqual(["Ella"]);
});
it("offers only age-appropriate exercises in a young child's edition", async () => {
  open({
    ...emptyBook("Ella"),
    profile: {
      kind: "child",
      ageBand: "under-6",
      parentLock: { salt: "a".repeat(32), verifier: "b".repeat(64) },
    },
  });
  await screen.findByRole("main", { name: "Activities" });
  expect(screen.getByRole("button", { name: /What helps when I’m upset/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Kindness spotting/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Rewrite the opener/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Repair bingo/ })).toBeNull();
});
it("plays Same page? with hidden answers and a shared reveal", async () => {
  const book = emptyBook("Robin");
  const game = sameV2([
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
  ]);
  const app = open({ ...book, living: { ...livingOf(book), game } });
  fireEvent.click(screen.getByRole("button", { name: /Same page\?.*Resume Same page\?/ }));
  expect(screen.getByRole("heading", { name: "Same page?" })).toBeTruthy();
  expect(screen.getByText(/stay with this round in Robin’s book \(never sent to AI\)/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Let’s play/ }));
  const options = () =>
    screen.getAllByRole("button").filter((b) => b.closest(".lb-choices"));
  // Robin answers five questions one at a time, passing one.
  const first = options()[0].textContent!;
  for (let q = 1; q <= 5; q++) {
    await screen.findByText(new RegExp(`Robin’s turn · question ${q} of 5`));
    expect(options()).toHaveLength(3);
    if (q === 3) fireEvent.click(screen.getByRole("button", { name: "Pass this one" }));
    else fireEvent.click(options()[0]);
  }
  await screen.findByRole("heading", { name: "Over to Sam." });
  expect(screen.queryByText(first)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "I’m Sam · ready" }));
  for (let q = 1; q <= 5; q++) {
    await screen.findByText(new RegExp(`Sam’s turn · question ${q} of 5`));
    fireEvent.click(options()[q === 5 ? 1 : 0]);
  }
  expect(await screen.findByRole("heading", { name: "What each of you said" })).toBeTruthy();
  expect(screen.getAllByText("Same page ✓")).toHaveLength(3);
  expect(screen.getByText(/^You matched on 3 of 4\. Different on /)).toBeTruthy();
  expect(screen.getByText("passed")).toBeTruthy();
  expect(livingOf(app.stored()).game?.stage).toBe("reveal");
  expect(livingOf(app.stored()).game?.answers).toEqual([
    [0, 0, null, 0, 0],
    [0, 0, 0, 0, 1],
  ]);
  // The round is in the book as soon as it reaches the reveal, before Finish round.
  expect(livingOf(app.stored()).plays).toHaveLength(1);
  expect(livingOf(app.stored()).plays![0]).toMatchObject({ kind: "match", id: game.id });
});

it("plays Same page? in your own words: answer, guess in private, judge, then the reveal", async () => {
  const book = emptyBook("Robin");
  const game = newGame("match", [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
    { id: "c", name: "Kai", audience: "6-8" },
  ]);
  const app = open({ ...book, living: { ...livingOf(book), game } });
  // The round waiting to start is picked up from the resume band.
  fireEvent.click(screen.getByRole("button", { name: /Same page\?.*Resume Same page\?/ }));
  expect(
    screen.getByText("Take turns answering in your own words. Everyone else guesses what you said."),
  ).toBeTruthy();
  expect(screen.getByText(/Each answer stays hidden until everyone has guessed/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Let’s play/ }));
  const field = (name: RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;
  // Robin answers question 1 in their own words.
  await screen.findByText("Robin’s turn · question 1 of 3");
  expect(screen.queryByRole("group", { name: "Ideas to tap" })).toBeNull();
  const answerButton = () => screen.getByRole("button", { name: /That’s my answer/ }) as HTMLButtonElement;
  expect(answerButton().disabled).toBe(true);
  fireEvent.change(field(/Your answer/), { target: { value: "Pizza with pineapple" } });
  fireEvent.click(answerButton());
  await screen.findByRole("heading", { name: "Over to Sam." });
  expect(screen.queryByText(/Pizza with pineapple/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "I’m Sam · ready" }));
  await screen.findByRole("heading", { name: "What did Robin say?" });
  fireEvent.change(field(/Your guess/), { target: { value: "Pizza" } });
  fireEvent.click(screen.getByRole("button", { name: /That’s my guess/ }));
  await screen.findByRole("heading", { name: "Over to Kai." });
  expect(screen.queryByText("Pizza")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "I’m Kai · ready" }));
  // Kai is 6–8: the old choices are ideas to tap into the field.
  const ideas = await screen.findByRole("group", { name: "Ideas to tap" });
  expect(screen.getByText("Say it out loud and a grown-up can type it.")).toBeTruthy();
  const idea = within(ideas).getAllByRole("button")[0];
  fireEvent.click(idea);
  expect(field(/Your guess/).value).toBe(idea.textContent);
  fireEvent.click(screen.getByRole("button", { name: /That’s my guess/ }));
  // Everyone looks; Robin judges.
  expect(await screen.findByRole("heading", { name: "Robin said Pizza with pineapple" })).toBeTruthy();
  const next = () => screen.getByRole("button", { name: /Next question/ }) as HTMLButtonElement;
  expect(next().disabled).toBe(true);
  fireEvent.click(within(screen.getByRole("group", { name: "How close was Sam?" })).getByRole("button", { name: "Got it" }));
  await waitFor(() =>
    expect(livingOf(app.stored()).game?.said?.[0].guesses[0].mark).toBe("got"),
  );
  fireEvent.click(within(screen.getByRole("group", { name: "How close was Kai?" })).getByRole("button", { name: "Not quite" }));
  await waitFor(() => expect(next().disabled).toBe(false));
  fireEvent.click(next());
  // Sam passes: no guessing, on to Kai's question.
  await screen.findByRole("heading", { name: "Over to Sam." });
  fireEvent.click(screen.getByRole("button", { name: "I’m Sam · ready" }));
  await screen.findByText("Sam’s turn · question 2 of 3");
  fireEvent.click(screen.getByRole("button", { name: "Pass this one" }));
  await screen.findByRole("heading", { name: "Over to Kai." });
  expect(screen.getByText("Sam passed, so there was nothing to guess.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "I’m Kai · ready" }));
  fireEvent.change(await screen.findByRole("textbox", { name: /Your answer/ }), { target: { value: "A dog" } });
  fireEvent.click(screen.getByRole("button", { name: /That’s my answer/ }));
  for (const [name, guess] of [["Robin", "A cat"], ["Sam", null]] as const) {
    fireEvent.click(await screen.findByRole("button", { name: `I’m ${name} · ready` }));
    await screen.findByRole("heading", { name: "What did Kai say?" });
    if (guess) {
      fireEvent.change(field(/Your guess/), { target: { value: guess } });
      fireEvent.click(screen.getByRole("button", { name: /That’s my guess/ }));
    } else fireEvent.click(screen.getByRole("button", { name: "Pass this one" }));
  }
  await screen.findByRole("heading", { name: "Kai said A dog" });
  expect(screen.queryByRole("group", { name: "How close was Sam?" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip judging" }));
  expect(await screen.findByRole("heading", { name: "What you learned about each other" })).toBeTruthy();
  expect(screen.getByText("Sam got it ✓")).toBeTruthy();
  expect(screen.getByText(`Kai guessed “${idea.textContent}”`)).toBeTruthy();
  expect(screen.getByText("You got 1 of 2 right.")).toBeTruthy();
  expect(screen.getByText("Sam got 1 of 1; Kai didn’t get it this time.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  await screen.findByRole("region", { name: "Game finished" });
  const record = livingOf(app.stored()).plays![0];
  expect(record.said?.map((s) => s.answer)).toEqual(["Pizza with pineapple", null, "A dog"]);
});

it("after the reveal each player can add their own line or skip, and Finish still ends it", async () => {
  const book = emptyBook("Robin");
  let game = advanceGame(
    sameV2([
      { id: "a", name: "Robin" },
      { id: "b", name: "Sam" },
      { id: "c", name: "Kai" },
    ]),
    { type: "start" },
  );
  while (game.stage !== "reveal") {
    if (game.stage === "handoff") game = advanceGame(game, { type: "ready" });
    game = advanceGame(game, { type: "answer", answers: [0, 0, 1, 1, 2] });
  }
  const app = open({ ...book, living: { ...livingOf(book), game } });
  fireEvent.click(screen.getByRole("button", { name: /Same page\?.*Resume Same page\?/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Add a line about it" }));
  await screen.findByRole("heading", { name: "Robin, anything to remember about this round?" });
  fireEvent.change(screen.getByRole("textbox", { name: "Robin’s line" }), {
    target: { value: "We all want pancakes." },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save my line/ }));
  await screen.findByRole("heading", { name: "Sam, anything to remember about this round?" });
  expect((screen.getByRole("textbox", { name: "Sam’s line" }) as HTMLTextAreaElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  await screen.findByRole("heading", { name: "Kai, anything to remember about this round?" });
  fireEvent.change(screen.getByRole("textbox", { name: "Kai’s line" }), {
    target: { value: "Rainy days are for forts." },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save my line/ }));
  await screen.findByText("We all want pancakes.");
  expect(screen.getByText("Rainy days are for forts.")).toBeTruthy();
  expect(livingOf(app.stored()).game?.reflections).toEqual([
    { playerId: "a", text: "We all want pancakes." },
    { playerId: "c", text: "Rainy days are for forts." },
  ]);
  expect(screen.getByRole("heading", { name: "What you remember" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  await screen.findByRole("region", { name: "Game finished" });
  expect(livingOf(app.stored()).plays?.[0].reflections).toHaveLength(2);
});

it("a card sort offers one card at a time, with skip, and keeps every card changeable", async () => {
  open(adult());
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Start this exercise/ }));
  const first = screen.getByRole("group", { name: /^Sort this card: / });
  const name = first.getAttribute("aria-label")!.replace("Sort this card: ", "");
  fireEvent.click(within(first).getByRole("button", { name: "Helps me" }));
  expect(
    within(screen.getByRole("group", { name })).getByRole("button", { name: "Helps me" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  const second = screen.getByRole("group", { name: /^Sort this card: / });
  expect(second.getAttribute("aria-label")).not.toContain(name);
  const skippedName = second.getAttribute("aria-label")!;
  fireEvent.click(screen.getByRole("button", { name: "Skip this one" }));
  expect(screen.getByRole("group", { name: /^Sort this card: / }).getAttribute("aria-label")).not.toBe(
    skippedName,
  );
});

it("a card sort left partway is saved, shows under way, and reopens where it stopped", async () => {
  const app = open(adult());
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Start this exercise/ }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Talking it through" })).getByRole("button", {
      name: "Helps me",
    }),
  );
  // Leaving straight away still saves it.
  fireEvent.click(screen.getByRole("button", { name: /Back to Activities/ }));
  await waitFor(() => expect(toolsOf(app.stored()).runs).toHaveLength(1));
  expect(toolsOf(app.stored()).runs![0]).toMatchObject({
    toolId: "helps-upset",
    who: "",
    sort: { placed: { "Talking it through": expect.any(String) } },
  });
  const resume = await screen.findByRole("button", {
    name: /What helps when I’m upset · 1 of \d+ sorted.*Keep sorting/,
  });
  fireEvent.click(resume);
  expect(await screen.findByText(/Picking up where you left off/)).toBeTruthy();
  expect(
    within(screen.getByRole("group", { name: "Talking it through" })).getByRole("button", {
      name: "Helps me",
      pressed: true,
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByText("Kept in your book. Only you can see it.");
  expect(toolsOf(app.stored()).runs).toBeUndefined();
  expect(app.stored().journal![0].text).toContain("Helps me: Talking it through.");
});
it("Start over drops a saved sort", async () => {
  const app = open(adult());
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Start this exercise/ }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Music" })).getByRole("button", { name: "Helps me" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Back to Activities/ }));
  await waitFor(() => expect(toolsOf(app.stored()).runs).toHaveLength(1));
  fireEvent.click(await screen.findByRole("button", { name: /What helps when I’m upset ·.*Keep sorting/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Start over" }));
  await waitFor(() => expect(toolsOf(app.stored()).runs).toBeUndefined());
  expect(screen.queryByText(/Picking up where you left off/)).toBeNull();
});
it("Home's one writing suggestion under Write: a started one says Keep writing and reopens its draft", async () => {
  const today = new Date();
  const draft = {
    id: "laugh",
    title: "",
    text: "Sam wore rain boots on his hands.",
    style: "sky" as const,
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    revision: 1,
    status: "draft" as const,
  };
  open({
    ...adult(),
    journal: [draft],
    suggestion: { day: todayKey(today), id: "made-you-laugh", journalId: "laugh" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  const todo = await screen.findByRole("region", { name: "What would you like to do?" });
  const line = within(todo).getByRole("button", { name: /^Keep writing: .*made you laugh/ });
  // The draft also leads "Lately in your book".
  const lately = screen.getByRole("region", { name: "Lately in your book" });
  expect(within(lately).getByText("Sam wore rain boots on his hands.")).toBeTruthy();
  fireEvent.click(line);
  expect(
    (screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value,
  ).toBe("Sam wore rain boots on his hands.");
});
it("Or try: on Home notes the suggestion and opens one page, never a second blank one", async () => {
  const app = open({
    ...adult(),
    suggestion: { day: todayKey(), id: "made-you-laugh" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  const todo = await screen.findByRole("region", { name: "What would you like to do?" });
  fireEvent.click(within(todo).getByRole("button", { name: /^Or try: .*made you laugh/ }));
  await waitFor(() => expect(app.stored().suggestion?.journalId).toBeTruthy());
  expect(app.stored().suggestion).toMatchObject({ day: todayKey(), id: "made-you-laugh" });
});
