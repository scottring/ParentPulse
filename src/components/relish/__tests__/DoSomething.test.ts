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
import {
  beginVisit,
  chooseThread,
  livingOf,
  newGame,
} from "@/lib/relish/living";
import LivingBook from "../LivingBook";
import { within } from "@testing-library/react";
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
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
  return {
    stored: () => stored,
    fail: (value: boolean) => {
      fail = value;
    },
    lock,
    unmount: mounted.unmount,
  };
}
it("opens free writing in one click, keeps the latest words before leaving, and resumes the same page", async () => {
  const app = open();
  expect(screen.getByRole("heading", { name: "What feels right?" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Think it through/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Same page\?/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Jot something down/ }));
  const input = screen.getByRole("textbox", { name: "Your journal entry" });
  fireEvent.change(input, {
    target: { value: "A small adventure, still unfolding" },
  });
  expect(
    (screen.getByRole("button", { name: "Do something" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  app.fail(true);
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "What feels right?" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBe(
    input,
  );
  app.fail(false);
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
  await screen.findByRole("heading", { name: "What feels right?" });
  expect(app.stored().journal?.[0].text).toBe(
    "A small adventure, still unfolding",
  );
  fireEvent.click(screen.getByRole("button", { name: "Your book" }));
  fireEvent.click(screen.getByRole("button", { name: /Keep writing|Keep going/ }));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Your journal entry",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("A small adventure, still unfolding");
  fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
  await screen.findByText("Entry saved");
  fireEvent.click(
    screen.getByRole("button", { name: "Choose another activity" }),
  );
  await screen.findByRole("heading", { name: "What feels right?" });
  expect(app.stored().journal).toHaveLength(1);
  expect(app.stored().journal?.[0].status).toBe("kept");
});
it("filters by time and mood, and the chosen filter stays pressed", () => {
  open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  fireEvent.click(screen.getByRole("button", { name: "Something’s hard" }));
  expect(
    screen
      .getByRole("button", { name: "Something’s hard" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByRole("button", { name: /Think it through/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Rewrite the opener/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Jot something down/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Same page\?/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "With the kids" }));
  expect(screen.getByRole("button", { name: /Same page\?/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Rewrite the opener/ })).toBeNull();
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
    screen.getByRole("button", { name: /Think it through.*Paused/ }),
  );
  const text = await screen.findByRole("textbox", { name: "Your moment" });
  fireEvent.change(text, {
    target: { value: "We laughed at the same silly thing" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pause here" }));
  await screen.findByRole("heading", { name: "What feels right?" });
  const paused = app.stored();
  expect(livingOf(paused).visit?.status).toBe("paused");
  app.unmount();
  const reopened = open(paused);
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
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
  await screen.findByRole("heading", { name: /Hi Robin/ });
  // Coming back: the plan, in their words, and whether they had a chance.
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
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
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
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
  fireEvent.click(screen.getByRole("button", { name: /Guess my small joy/ }));
  expect(livingOf(app.stored()).game?.id).toBe(game.id);
  expect(screen.queryByRole("button", { name: "Do something" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Jot something down/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "End game" }));
  expect(app.lock).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "What feels right?" })).toBeTruthy();
  expect(livingOf(app.stored()).game?.id).toBe(game.id);
  expect(
    screen.getByRole("button", { name: /Guess my small joy.*Round in progress/ }),
  ).toBeTruthy();
});
