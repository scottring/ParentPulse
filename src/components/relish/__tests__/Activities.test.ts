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
  fireEvent.click(screen.getByRole("button", { name: /Keep writing/ }));
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
    screen.getByRole("button", { name: /Think it through.*In progress/ }),
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
it("starts guided prompts directly and offers the next guided step after completion", async () => {
  const app = open({ ...emptyBook("Robin"), profile: { kind: "adult" } });
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  await waitFor(() => expect(livingOf(app.stored()).visit?.kind).toBe("begin"));
  expect(
    screen.queryByRole("button", { name: "Begin this small session" }),
  ).toBeNull();
  expect(screen.getByText(/Step 1 of 2/)).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Practice listening" }),
  );
  const input = await screen.findByRole("textbox", { name: "Your moment" });
  fireEvent.change(input, { target: { value: "We took time to listen" } });
  fireEvent.click(screen.getByRole("button", { name: /Save reflection and finish/ }));
  await screen.findByText("Session complete");
  fireEvent.click(
    screen.getByRole("button", { name: "Choose another activity" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Think it through/ }));
  await waitFor(() =>
    expect(livingOf(app.stored()).visit?.kind).toBe("practice"),
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
it("resumes the same group round and requires unlocking before returning to private activities", () => {
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
  fireEvent.click(screen.getByRole("button", { name: "Unlock my edition" }));
  expect(app.lock).toHaveBeenCalledOnce();
});
