// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { livingOf, newGame } from "@/lib/relish/living";
import { toolsOf } from "@/lib/relish/tools";
import LivingBook from "../LivingBook";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);
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
  fireEvent.click(screen.getByRole("button", { name: "Choose an exercise" }));
  await screen.findByRole("heading", { name: "Try an exercise" });
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
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
  await screen.findByRole("heading", { name: "Page kept" });
  const page = app.stored().journal![0];
  expect(page.status).toBe("kept");
  expect(page.title).toBe("What helps when I’m upset");
  expect(page.text).toContain("Helps me: Talking it through; A long shower.");
  expect(page.text).toContain("Doesn’t help: Music.");
  expect(page.text).toContain("The one to try first next time: A long shower.");
  fireEvent.click(screen.getByRole("button", { name: "Choose another exercise" }));
  await screen.findByRole("heading", { name: "Try an exercise" });
});
it("builds a soft opener only once every part is filled in", async () => {
  const app = open(adult());
  fireEvent.click(screen.getByRole("button", { name: "Choose an exercise" }));
  fireEvent.click(await screen.findByRole("button", { name: /Rewrite the opener/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Who will you say this to?" }), {
    target: { value: "sam" },
  });
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
  await screen.findByRole("heading", { name: "Page kept" });
  expect(app.stored().journal![0]).toMatchObject({
    title: "Rewrite the opener · Sam",
    people: ["sam"],
  });
});
it("runs a day-by-day checklist across visits and finishes into a page", async () => {
  const app = open(adult());
  fireEvent.click(screen.getByRole("button", { name: "Choose an exercise" }));
  fireEvent.click(await screen.findByRole("button", { name: /Ten real hellos/ }));
  const start = screen.getByRole("button", { name: /Start/ }) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Who will you greet?" }), {
    target: { value: "sam" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Start/ }));
  fireEvent.click(await screen.findByRole("button", { name: "I did it today" }));
  await screen.findByRole("button", { name: /Done today/ });
  expect(toolsOf(app.stored()).trackers[0].marks).toHaveLength(1);
  app.unmount();
  const again = open(app.stored());
  expect(screen.getByText("You have 1 exercise in progress.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continue an exercise" }));
  fireEvent.click(await screen.findByRole("button", { name: /Ten real hellos · Sam/ }));
  expect(screen.getByText(/1 of 10 days/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Finish and keep a page" }));
  await screen.findByRole("heading", { name: "Page kept" });
  const stored = again.stored();
  expect(toolsOf(stored).trackers[0].finishedAt).toBeTruthy();
  expect(stored.journal![0].title).toBe("Ten real hellos · Sam");
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
  fireEvent.click(screen.getByRole("button", { name: "Choose an exercise" }));
  await screen.findByRole("heading", { name: "Try an exercise" });
  expect(screen.getByRole("button", { name: /What helps when I’m upset/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Kindness spotting/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Rewrite the opener/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Repair bingo/ })).toBeNull();
});
it("plays Same page? with hidden answers and a shared reveal", async () => {
  const book = emptyBook("Robin");
  const game = newGame("match", [
    { id: "a", name: "Robin" },
    { id: "b", name: "Sam" },
  ]);
  const app = open({ ...book, living: { ...livingOf(book), game } });
  fireEvent.click(screen.getByRole("button", { name: "Continue our game" }));
  expect(screen.getByRole("heading", { name: "Same page?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Let’s play/ }));
  const choices = await screen.findAllByRole("button", { name: /./ });
  const options = choices.filter((b) => b.closest(".lb-choices"));
  expect(options).toHaveLength(3);
  fireEvent.click(options[0]);
  await screen.findByRole("heading", { name: "Over to Sam." });
  expect(screen.queryByText(options[0].textContent!)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "I’m Sam · ready" }));
  const second = (await screen.findAllByRole("button")).filter((b) =>
    b.closest(".lb-choices"),
  );
  fireEvent.click(second[0]);
  expect((await screen.findAllByText(/Same page: everyone chose/)).length).toBeGreaterThan(0);
  expect(livingOf(app.stored()).game?.stage).toBe("reveal");
});
