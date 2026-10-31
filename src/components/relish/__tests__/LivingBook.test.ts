// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import {
  beginVisit,
  chooseThread,
  completeVisit,
  livingOf,
  newGame,
  advanceGame,
  freshLiving,
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
          backup: () => {},
          save: async (change) => {
            if (fail) throw new Error("Storage is full");
            setBook((b) => (typeof change === "function" ? change(b) : change));
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(
      screen.getByRole("button", { name: "Continue where I paused" }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("This visit is complete")).toBeNull();
    fail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Continue where I paused" }),
    );
    const textbox = await screen.findByRole("textbox", { name: "Your moment" });
    fireEvent.change(textbox, { target: { value: "One sample moment" } });
    fail = true;
    fireEvent.click(screen.getByRole("button", { name: /Keep this moment/ }));
    await screen.findByRole("alert");
    expect(screen.queryByText("This visit is complete")).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Keep this moment/ }));
    await screen.findByText("This visit is complete");
  });
  it("puts private content away for shared play and locks before returning to it", async () => {
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
          backup: () => {},
          save: async (change) => {
            setBook((b) => (typeof change === "function" ? change(b) : change));
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Just browse" }));
    expect(screen.getByText("A confidential sample sentence")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Play together" }));
    expect(screen.queryByText("A confidential sample sentence")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Privacy and settings" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Unlock my edition" }));
    expect(lock).toHaveBeenCalledOnce();
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
      onCreate: vi.fn(),
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
});
