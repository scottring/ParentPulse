// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook } from "@/lib/relish/model";
import {
  beginVisit,
  chooseThread,
  completeVisit,
  livingOf,
  newGame,
  advanceGame,
  turnPlan,
} from "@/lib/relish/living";
import LivingBook from "../LivingBook";
import GroupPlay from "../GroupPlay";
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
const initial = () =>
  chooseThread(beginVisit(emptyBook("Private Owner")), "listen");
function completeBook() {
  const b = initial();
  return completeVisit(b, livingOf(b).visit!.id, {
    text: "A confidential sample sentence",
    opportunity: "",
    outcome: "",
    perspective: "",
  });
}
describe("living-book interaction boundaries", () => {
  it("never shows completion when the save fails, and a retry keeps the visit", async () => {
    let fail = true;
    function Harness() {
      const [book, setBook] = useState(initial);
      return createElement(LivingBook, {
        vault: {
          book,
          mode: "open",
          editions: [],
          editionId: "original",
          shelf: () => {},
          select: () => {},
          remove: async () => {},
          busy: false,
          error: "",
          open: async () => {},
          lock: () => {},
          backup: async () => {},
          photos: { add: vi.fn(), load: vi.fn() },
          save: async (change) => {
            if (fail) throw new Error("Storage is full");
            setBook((b) => (typeof change === "function" ? change(b) : change));
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Activities" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Think it through/ }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("Your page is kept.")).toBeNull();
    fail = false;
    fireEvent.click(
      screen.getByRole("button", { name: /^Think it through/ }),
    );
    const textbox = await screen.findByRole("textbox", { name: "Your moment" });
    fireEvent.change(textbox, { target: { value: "One sample moment" } });
    fail = true;
    fireEvent.click(screen.getByRole("button", { name: /Keep my page/ }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Your page is kept.")).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Keep my page/ }));
    await screen.findByText("Your page is kept.");
  });
  it("keeps private content off the game screen and ends the game without locking", async () => {
    const lock = vi.fn();
    function Harness() {
      const [book, setBook] = useState(completeBook);
      return createElement(LivingBook, {
        vault: {
          book,
          mode: "open",
          editions: [],
          editionId: "original",
          shelf: () => {},
          select: () => {},
          remove: async () => {},
          busy: false,
          error: "",
          open: async () => {},
          lock,
          backup: async () => {},
          photos: { add: vi.fn(), load: vi.fn() },
          save: async (change) => {
            setBook((b) => (typeof change === "function" ? change(b) : change));
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(screen.getAllByText("A confidential sample sentence").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Activities" }));
    fireEvent.click(screen.getByRole("button", { name: /Same page\?/ }));
    fireEvent.click(screen.getByRole("button", { name: "+ Someone visiting" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Their name/ }), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /^Start/ }));
    await screen.findByRole("button", { name: "End game" });
    expect(screen.queryByText("A confidential sample sentence")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Menu/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "End game" }));
    expect(lock).not.toHaveBeenCalled();
    await screen.findByRole("heading", { name: "What feels right?" });
  });
  it("does not render the chooser’s answer on a handoff or another person’s turn", () => {
    const g = advanceGame(
      advanceGame(
        newGame("joy", [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ]),
        { type: "start" },
      ),
      { type: "choice", choice: 0 },
    );
    const props = {
      book: emptyBook("A"),
      game: g,
      busy: false,
      onAction: vi.fn(),
      onKeep: vi.fn(),
      onPause: vi.fn(),
      onFinish: vi.fn(),
      onCancel: vi.fn(),
    };
    const { rerender } = render(createElement(GroupPlay, props));
    expect(screen.queryByText("A silly song")).toBeNull();
    rerender(
      createElement(GroupPlay, {
        ...props,
        game: advanceGame(g, { type: "ready" }),
      }),
    );
    expect(screen.queryByText(/A chose/)).toBeNull();
    expect(screen.getAllByText("A silly song")).toHaveLength(1);
  });
  it("a small joy round shows everyone's joy, who guessed it, and the tally", () => {
    let g = advanceGame(
      newGame("joy", [
        { id: "a", name: "Iris", audience: "adult" },
        { id: "b", name: "Kaleb", audience: "adult" },
      ]),
      { type: "start" },
    );
    g = advanceGame(g, { type: "choice", choice: 0 });
    g = advanceGame(advanceGame(g, { type: "ready" }), { type: "choice", choice: 1 });
    const plan = turnPlan(g);
    // Iris guesses Kaleb's right; Kaleb passes.
    g = advanceGame(advanceGame(g, { type: "ready" }), {
      type: "choice",
      choice: plan[2].asks[0].choices.indexOf("Making something together"),
    });
    g = advanceGame(advanceGame(g, { type: "ready" }), { type: "choice", choice: null });
    render(
      createElement(GroupPlay, {
        book: emptyBook("Iris"),
        game: g,
        busy: false,
        onAction: vi.fn(),
        onKeep: vi.fn(),
        onPause: vi.fn(),
        onFinish: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(screen.getByRole("heading", { name: "What lights each of you up" })).toBeTruthy();
    expect(screen.getByText("Iris knew the most: 1 of 1.")).toBeTruthy();
    // A pass is a pass, never a score of 0.
    expect(screen.getByText("Iris 1 of 1 · Kaleb passed")).toBeTruthy();
    expect(screen.getByText("Kaleb’s small joy")).toBeTruthy();
    expect(screen.getByText("Making something together")).toBeTruthy();
    expect(screen.getByText("guessed it ✓")).toBeTruthy();
    expect(screen.getByText("passed")).toBeTruthy();
    expect(screen.getByText(/This round is kept in Iris’s book/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Finish round/ })).toBeTruthy();
    // A shared page is a quiet offer: approvals appear only when asked for.
    expect(screen.queryByRole("button", { name: "Keep in our Family pages" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create a shared page" }));
    expect(
      (screen.getByRole("button", { name: "Keep in our Family pages" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
