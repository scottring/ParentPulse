// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { newJournalDraft, writeJournalPage } from "@/lib/relish/journal";
import {
  beginVisit,
  chooseThread,
  livingOf,
  newGame,
} from "@/lib/relish/living";
import LivingBook from "../LivingBook";
import { within } from "@testing-library/react";
import { myJournal } from "./bookHarness";
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
function open(book = emptyBook("Robin")) {
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
      },
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
/** Activities' filter: Everything, On my own or Together. */
const show = (name: "Everything" | "On my own" | "Together") =>
  fireEvent.click(within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name }));
const toFamily = () => show("Together");
it("opens free writing in one click, keeps the latest words before leaving, and resumes the same page", async () => {
  const app = open();
  expect(screen.getByRole("main", { name: "Activities" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Think it through/ })).toBeTruthy();
  myJournal();
  // No profile reads as a young child's journal: "+ Make a page".
  fireEvent.click(screen.getByRole("button", { name: /Write today’s entry|Make a page/ }));
  const input = screen.getByRole("textbox", { name: "Your journal entry" });
  fireEvent.change(input, {
    target: { value: "A small adventure, still unfolding" },
  });
  expect(
    (screen.getByRole("button", { name: "Activities" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  app.fail(true);
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("main", { name: "Activities" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBe(
    input,
  );
  app.fail(false);
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  await screen.findByRole("main", { name: "Activities" });
  expect(app.stored().journal?.[0].text).toBe(
    "A small adventure, still unfolding",
  );
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: /Keep writing|Keep going/ }));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Your journal entry",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("A small adventure, still unfolding");
  fireEvent.click(screen.getByRole("button", { name: "Save to my journal" }));
  await screen.findByText("Entry saved");
  fireEvent.click(
    screen.getByRole("button", { name: "Choose another activity" }),
  );
  await screen.findByRole("main", { name: "Activities" });
  expect(app.stored().journal).toHaveLength(1);
  expect(app.stored().journal?.[0].status).toBe("kept");
});
it("one page for both kinds: a featured activity, the filter, and shelves that mix them", () => {
  open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  const main = screen.getByRole("main", { name: "Activities" });
  // Without a family, the featured activity is one to do on your own.
  expect(within(main).getByText(/Featured this week · on your own/)).toBeTruthy();
  expect(within(main).getByRole("button", { name: "Show me another" })).toBeTruthy();
  const titles = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(titles().slice(0, 3)).toEqual(["At dinner", "Something felt hard", "In the car"]);
  // Each shelf mixes both kinds, and each card says which.
  const dinner = screen.getByRole("list", { name: "At dinner" });
  const same = within(dinner).getByRole("button", { name: "Same page?: Play Same page?" }).closest("article")!;
  expect(same.querySelector(".ha-kind")?.textContent).toBe("Together");
  const thanks = within(dinner).getByRole("button", { name: /A week of specific thanks/ }).closest("article")!;
  expect(thanks.querySelector(".ha-kind")?.textContent).toBe("On your own");
  const hard = screen.getByRole("list", { name: "Something felt hard" });
  expect(within(hard).getByRole("button", { name: /Plan a repair: Plan what to say/ })).toBeTruthy();
  const car = screen.getByRole("list", { name: "In the car" });
  expect(within(car).getByText("Everyone in the car · one phone, read aloud")).toBeTruthy();
  // On my own: no games.
  show("On my own");
  expect(screen.queryByRole("button", { name: /Same page\?/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Plan a repair: Plan what to say/ })).toBeTruthy();
  expect(
    within(screen.getByRole("group", { name: "Show" }))
      .getByRole("button", { name: "On my own" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  // Together: games and together activities only.
  show("Together");
  expect(screen.queryByRole("button", { name: /Plan a repair/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Spot it!: Play Spot it!" })).toBeTruthy();
});
it("with a family, the family plan can be featured, and Together always shows it", () => {
  open({
    ...emptyBook("Robin"),
    profile: { kind: "adult" },
    people: [{ id: "kid", name: "Kit", role: "Child", color: "rose", note: "", lessons: [] }],
  });
  show("Together");
  expect(screen.getByRole("heading", { level: 1, name: "Hearing each other out" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try this tonight" })).toBeTruthy();
  // Plan cards sit on the shelves too, labelled Together.
  const card = screen.getByRole("button", { name: /Laughing together/ }).closest("article")!;
  expect(card.querySelector(".ha-kind")?.textContent).toBe("Together");
  show("On my own");
  expect(screen.queryByRole("button", { name: "Try this tonight" })).toBeNull();
  expect(screen.getByText(/Featured this week · on your own/)).toBeTruthy();
});
it("returns a paused child reflection to Do something and resumes its saved step and words after reopening", async () => {
  const child: Book = {
    ...emptyBook("Robin"),
    profile: {
      kind: "child",
      ageBand: "9-12",
      parentLock: { salt: "a".repeat(32), verifier: "b".repeat(64) },
    },
  };
  const app = open(chooseThread(beginVisit(child), "listen"));
  fireEvent.click(
    screen.getByRole("button", { name: /Think it through.*Continue writing/ }),
  );
  const text = await screen.findByRole("textbox", { name: "Your moment" });
  fireEvent.change(text, {
    target: { value: "We laughed at the same silly thing" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pause here" }));
  await screen.findByRole("main", { name: "Activities" });
  const paused = app.stored();
  expect(livingOf(paused).visit?.status).toBe("paused");
  app.unmount();
  const reopened = open(paused);
  fireEvent.click(screen.getByRole("button", { name: /Think it through.*Continue writing/ }));
  const resumed = await screen.findByRole("textbox", { name: "Your moment" });
  expect((resumed as HTMLTextAreaElement).value).toBe(
    "We laughed at the same silly thing",
  );
  expect(livingOf(reopened.stored()).visit?.id).toBe(
    livingOf(paused).visit?.id,
  );
  expect(livingOf(reopened.stored()).visit?.step).toBe(1);
  expect(screen.queryByText("Ask AI")).toBeNull();
});
it("saves one moment, stops cleanly, and recalls the plan in the writer's words next time", async () => {
  const app = open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  await waitFor(() => expect(livingOf(app.stored()).visit?.kind).toBe("begin"));
  expect(screen.getByText(/Step 1 of 2/)).toBeTruthy();
  // One heading for the choice, and situations rather than topics.
  expect(screen.getAllByRole("heading", { name: "What happened?" })).toHaveLength(1);
  expect(screen.queryByText(/session/i)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /I jumped in with advice/ }));
  // The question sits on the active page.
  await screen.findByRole("heading", {
    name: "What were they telling you, and what did you say?",
  });
  const input = screen.getByRole("textbox", { name: "Your moment" });
  fireEvent.change(input, { target: { value: "Kit told me about recess and I fixed it" } });
  fireEvent.click(screen.getByRole("button", { name: /Save this moment/ }));
  await screen.findByRole("heading", { name: "That moment is kept." });
  // A complete ending: the plan is offered, not required.
  expect(screen.getByRole("button", { name: /Done for now/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Make a small plan/ }));
  const plan = await screen.findByRole("textbox", { name: /What you’ll try/ });
  fireEvent.change(plan, { target: { value: "Ask “ideas or listening?”" } });
  fireEvent.click(screen.getByRole("button", { name: "+ after dinner" }));
  expect((plan as HTMLTextAreaElement).value).toBe("Ask “ideas or listening?” after dinner");
  fireEvent.click(screen.getByRole("button", { name: /Save my plan/ }));
  await screen.findByRole("heading", { name: "Your plan is kept." });
  fireEvent.click(screen.getByRole("button", { name: /Done for now/ }));
  await screen.findByRole("heading", { name: /^Welcome/ });
  // Coming back: the plan, in their words, and whether they had a chance.
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  await screen.findByRole("heading", { name: "Did you get a chance to try it?" });
  expect(screen.getByText("“Ask “ideas or listening?” after dinner”")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Yes, I tried it/ }));
  await screen.findByRole("heading", { name: "How did it go?" });
  fireEvent.click(screen.getByRole("button", { name: "It helped, even a little" }));
  fireEvent.click(screen.getByRole("button", { name: /Save how it went/ }));
  await screen.findByRole("heading", { name: "It helped, even a little" });
  const entries = livingOf(app.stored()).entries;
  expect(entries.map((e) => e.kind)).toEqual(["notice", "practice", "reflection"]);
  expect(entries[1].text).toBe("Ask “ideas or listening?” after dinner");
});
it("lets an untried plan wait while a different moment is written", async () => {
  const app = open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  fireEvent.click(await screen.findByRole("button", { name: /I wish I’d asked/ }));
  fireEvent.change(await screen.findByRole("textbox", { name: "Your moment" }), {
    target: { value: "I said yes to one more errand" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save this moment/ }));
  await screen.findByRole("heading", { name: "That moment is kept." });
  fireEvent.click(screen.getByRole("button", { name: /Make a small plan/ }));
  fireEvent.change(await screen.findByRole("textbox", { name: /What you’ll try/ }), {
    target: { value: "Ask for a little quiet after dinner" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Save my plan/ }));
  await screen.findByRole("heading", { name: "Your plan is kept." });
  fireEvent.click(screen.getByRole("button", { name: /Done for now/ }));
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Write about a different moment instead" }),
  );
  await screen.findByRole("heading", { name: "What happened?" });
  const l = livingOf(app.stored());
  expect(l.visit?.kind).toBe("begin");
  expect(l.entries.find((e) => e.kind === "practice")?.text).toBe(
    "Ask for a little quiet after dinner",
  );
});
it("starts a game from a sheet with the family already filled in", async () => {
  const app = open({
    ...emptyBook("Robin"),
    profile: { kind: "adult" },
    people: [
      { id: "kid", name: "Kit", role: "Child", color: "rose", note: "", lessons: [] },
      { id: "nb", name: "Neighbor", role: "Friend", color: "sage", note: "", lessons: [] },
    ],
  });
  toFamily();
  fireEvent.click(screen.getByRole("button", { name: /Guess my small joy/ }));
  const sheet = screen.getByRole("dialog", { name: "Guess my small joy" });
  expect(within(sheet).getByRole("button", { name: "✓ Robin" })).toBeTruthy();
  expect(within(sheet).getByRole("button", { name: "✓ Kit" })).toBeTruthy();
  expect(within(sheet).queryByRole("button", { name: /Neighbor/ })).toBeNull();
  fireEvent.click(within(sheet).getByRole("button", { name: "+ Someone visiting" }));
  fireEvent.change(within(sheet).getByRole("textbox", { name: /Their name/ }), {
    target: { value: "Gran" },
  });
  fireEvent.click(within(sheet).getByRole("button", { name: "Add" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "✓ Kit" }));
  expect(
    within(sheet).getByRole("button", { name: "Kit" }).getAttribute("aria-pressed"),
  ).toBe("false");
  fireEvent.click(within(sheet).getByRole("button", { name: /Start/ }));
  await waitFor(() => expect(livingOf(app.stored()).game?.kind).toBe("joy"));
  expect(livingOf(app.stored()).game?.players.map((p) => p.name)).toEqual([
    "Robin",
    "Gran",
  ]);
});
it("resumes the same group round full-screen and ends the game without locking", () => {
  const book = emptyBook("Robin");
  const game = newGame("joy", [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
  ]);
  const app = open({ ...book, living: { ...livingOf(book), game } });
  toFamily();
  fireEvent.click(screen.getByRole("button", { name: /Guess my small joy.*Resume Guess my small joy/ }));
  expect(livingOf(app.stored()).game?.id).toBe(game.id);
  expect(screen.queryByRole("button", { name: "Activities" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "End game" }));
  expect(app.lock).not.toHaveBeenCalled();
  expect(screen.getByRole("main", { name: "Activities" })).toBeTruthy();
  expect(livingOf(app.stored()).game?.id).toBe(game.id);
  expect(
    screen.getByRole("button", { name: /Guess my small joy.*Resume Guess my small joy/ }),
  ).toBeTruthy();
});
it("a paused Same page? waits in the Pick up line, under Together", async () => {
  const book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
  const game = newGame("match", [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
  ]);
  const app = open({ ...book, living: { ...livingOf(book), game } });
  // Pick up: one line beside the filter; a game is something done together.
  expect(screen.getByRole("button", { name: /Same page\?: Resume Same page\?/ })).toBeTruthy();
  show("On my own");
  expect(screen.queryByRole("button", { name: /Resume Same page\?/ })).toBeNull();
  toFamily();
  fireEvent.click(screen.getByRole("button", { name: /things under way/ }));
  const row = screen.getByRole("region", { name: "Pick up where you left off" });
  expect(within(row).getByRole("button", { name: /Let .*go/ })).toBeTruthy();
  fireEvent.click(within(row).getByRole("button", { name: /Same page\?.*Resume Same page\?/ }));
  expect(await screen.findByRole("heading", { name: "Same page?" })).toBeTruthy();
  expect(livingOf(app.stored()).game?.id).toBe(game.id);
});
it("shows no resume row when nothing is under way, and every card says what, who, how long and what next", () => {
  open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  expect(screen.queryByRole("region", { name: "Pick up where you left off" })).toBeNull();
  const daily = screen.getByRole("list", { name: "A small thing each day" });
  const go = within(daily).getByRole("button", { name: "Ten real hellos: Start ten hellos" });
  const card = go.closest("article")!;
  expect(card.querySelectorAll(".ha-card-line")).toHaveLength(1);
  expect(card.querySelector(".ha-card-who")?.textContent).toBe(
    "You · under a minute a day, 10 days",
  );
  expect(within(card).getByRole("heading", { name: "Ten real hellos" })).toBeTruthy();
});
it("starting a new round from the grid warns it ends the paused one", () => {
  const book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
  const game = newGame("match", [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
  ]);
  open({ ...book, living: { ...livingOf(book), game } });
  toFamily();
  const grid = screen.getByRole("list", { name: "At dinner" });
  fireEvent.click(within(grid).getByRole("button", { name: /Same page\?/ }));
  const sheet = screen.getByRole("dialog", { name: "Same page?" });
  expect(within(sheet).getByText("This ends your unfinished round of Same page?.")).toBeTruthy();
});
it("continues an unfinished journal page from Home, and Activities leaves drafts to Journal", () => {
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    { ...newJournalDraft(), text: "Kit asked about the moon" },
    0,
    "draft",
  );
  open(book);
  expect(screen.queryByText(/Pick up:/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  const lately = screen.getByRole("region", { name: "Lately" });
  expect(within(lately).getByText(/Kit asked about the moon/)).toBeTruthy();
  expect(within(lately).getByText("Only you · draft")).toBeTruthy();
  fireEvent.click(within(lately).getByRole("button", { name: /Keep writing/ }));
  expect(
    (screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value,
  ).toBe("Kit asked about the moon");
});
