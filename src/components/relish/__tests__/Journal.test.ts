// @vitest-environment happy-dom
import { createElement, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { newJournalDraft, writeJournalPage } from "@/lib/relish/journal";
import Journal, { JournalEditor } from "../Journal";
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
const input = () => screen.getByRole("textbox", { name: "Your journal entry" });
const fill = (text: string) =>
  fireEvent.change(input(), { target: { value: text } });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
describe("freeform journal", () => {
  it("autosaves an unfinished page, reopens it, then keeps and edits it", async () => {
    let stored = emptyBook("Robin");
    function Harness() {
      const [book, setBook] = useState(stored);
      return createElement(Journal, {
        book,
        sample: false,
        onEditingChange: vi.fn(),
        onDone: vi.fn(),
        save: async (change) => {
          stored = change(stored);
          setBook(stored);
        },
      });
    }
    const first = render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "A fresh page" }));
    fill("A secret adventure\nwith a second line");
    fireEvent.click(screen.getByRole("button", { name: "Moss" }));
    await waitFor(() =>
      expect(stored.journal?.[0]).toMatchObject({
        text: "A secret adventure\nwith a second line",
        style: "moss",
        status: "draft",
      }),
    );
    first.unmount();
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: /A page in progress/ }));
    expect((input() as HTMLTextAreaElement).value).toContain("second line");
    fill("The ending arrived.");
    fireEvent.click(screen.getByRole("button", { name: "Keep this page" }));
    await screen.findByText("That one’s a keeper.");
    expect(stored.journal).toHaveLength(1);
    expect(stored.journal?.[0].status).toBe("kept");
    fireEvent.click(screen.getByRole("button", { name: "Edit this page" }));
    fill("Actually, another ending!");
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));
    await screen.findByRole("button", { name: /Open this page/ });
    expect(stored.journal?.[0]).toMatchObject({
      text: "Actually, another ending!",
      status: "kept",
    });
  });
  it("does not claim success or leave the writer when saving fails", async () => {
    let book = emptyBook("A"),
      failing = true;
    const onKeep = vi.fn(),
      onPause = vi.fn();
    render(
      createElement(JournalEditor, {
        initial: newJournalDraft(),
        sample: false,
        onKeep,
        onPause,
        save: async (change) => {
          if (failing) throw new Error("Full");
          book = change(book);
        },
      }),
    );
    fill("Words we must not lose");
    fireEvent.click(screen.getByRole("button", { name: "Keep this page" }));
    await screen.findByRole("alert");
    expect(onKeep).not.toHaveBeenCalled();
    expect(onPause).not.toHaveBeenCalled();
    expect((input() as HTMLTextAreaElement).value).toBe(
      "Words we must not lose",
    );
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Keep this page" }));
    await waitFor(() => expect(onKeep).toHaveBeenCalledOnce());
    expect(book.journal?.[0].text).toBe("Words we must not lose");
  });
  it("flushes the newest words after a slower earlier autosave", async () => {
    let book = emptyBook("A"),
      calls = 0;
    const slow = deferred(),
      onPause = vi.fn();
    render(
      createElement(JournalEditor, {
        initial: newJournalDraft(),
        sample: false,
        onPause,
        onKeep: vi.fn(),
        save: async (change) => {
          calls++;
          if (calls === 1) await slow.promise;
          book = change(book);
        },
      }),
    );
    fill("First version");
    await waitFor(() => expect(calls).toBe(1));
    fill("Newest version");
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));
    await act(async () => slow.resolve());
    await waitFor(() => expect(onPause).toHaveBeenCalledOnce());
    expect(book.journal?.[0]).toMatchObject({
      text: "Newest version",
      status: "draft",
      revision: 2,
    });
  });
  it("cancels queued writes when the edition locks or the writer unmounts", async () => {
    let book = emptyBook("A"),
      calls = 0;
    const slow = deferred(),
      onPause = vi.fn();
    const writer = render(
      createElement(JournalEditor, {
        initial: newJournalDraft(),
        sample: false,
        onPause,
        onKeep: vi.fn(),
        save: async (change) => {
          calls++;
          if (calls === 1) await slow.promise;
          book = change(book);
        },
      }),
    );
    fill("First autosave");
    await waitFor(() => expect(calls).toBe(1));
    fill("Queued words belonging only to this edition");
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));
    writer.unmount();
    await act(async () => {
      slow.resolve();
      await slow.promise;
    });
    expect(calls).toBe(1);
    expect(onPause).not.toHaveBeenCalled();
  });
  it("offers the journal to children, protects an open editor, and puts it away during shared play", async () => {
    const lock = vi.fn();
    function Harness() {
      const initial = {
        ...writeJournalPage(
          emptyBook("Robin"),
          { ...newJournalDraft(), text: "PRIVATE JOURNAL SENTENCE" },
          0,
          "kept",
        ),
        profile: {
          kind: "child" as const,
          ageBand: "9-12" as const,
          parentLock: { salt: "a".repeat(32), verifier: "b".repeat(64) },
        },
      };
      const current = useRef<Book>(initial);
      const [book, setBook] = useState(initial);
      return createElement(LivingBook, {
        vault: {
          book,
          mode: "open",
          editions: [],
          editionId: "test",
          shelf: vi.fn(),
          select: vi.fn(),
          remove: async () => {},
          busy: false,
          error: "",
          open: async () => {},
          lock,
          backup: vi.fn(),
          save: async (change) => {
            current.current =
              typeof change === "function" ? change(current.current) : change;
            setBook(current.current as typeof initial);
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Journal" }));
    expect(screen.getByText("PRIVATE JOURNAL SENTENCE")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "A fresh page" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Play together",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.queryByText("Ask AI")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Play together" }),
    );
    expect(screen.queryByText("PRIVATE JOURNAL SENTENCE")).toBeNull();
    expect(screen.queryByRole("button", { name: "Journal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Unlock my edition" }));
    expect(lock).toHaveBeenCalledOnce();
  });
});
