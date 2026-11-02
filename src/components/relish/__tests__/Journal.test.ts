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
    fireEvent.click(screen.getByRole("button", { name: /Keep writing:/ }));
    expect((input() as HTMLTextAreaElement).value).toContain("second line");
    fill("The ending arrived.");
    fireEvent.click(screen.getByRole("button", { name: "Keep this page" }));
    await screen.findByText("That one’s a keeper.");
    expect(stored.journal).toHaveLength(1);
    expect(stored.journal?.[0].status).toBe("kept");
    fireEvent.click(screen.getByRole("button", { name: "Edit this page" }));
    fill("Actually, another ending!");
    fireEvent.click(screen.getByRole("button", { name: "Save for later" }));
    await screen.findByRole("button", { name: /A page of my own/ });
    expect(stored.journal?.[0]).toMatchObject({
      text: "Actually, another ending!",
      status: "kept",
    });
  });
  it("opens quick capture directly and keeps one draft through outer/inner resizes", async () => {
    let book = emptyBook("Robin");
    const draft = newJournalDraft();
    const props = {
      initialDraft: draft,
      book,
      sample: true,
      onEditingChange: vi.fn(),
      onDone: vi.fn(),
      save: async (change: (b: Book) => Book) => {
        book = change(book);
      },
    };
    const view = render(createElement(Journal, props));
    const original = input();
    fill("A moment from the outside screen");
    for (const width of [669, 951, 382, 594, 385]) {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      fireEvent(window, new Event("resize"));
      view.rerender(createElement(Journal, { ...props, book }));
      expect(input()).toBe(original);
      expect((input() as HTMLTextAreaElement).value).toBe(
        "A moment from the outside screen",
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Keep this page" }));
    await waitFor(() => expect(book.journal?.[0].status).toBe("kept"));
    view.rerender(createElement(Journal, { ...props, book }));
    await screen.findByText("That one’s a keeper.");
    expect(book.journal).toHaveLength(1);
    expect(book.journal?.[0]).toMatchObject({
      id: draft.id,
      text: "A moment from the outside screen",
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
  it("lets children leave the journal for shared play without exposing private pages", async () => {
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
          photos: { add: vi.fn(), load: vi.fn() },
          save: async (change) => {
            current.current =
              typeof change === "function" ? change(current.current) : change;
            setBook(current.current as typeof initial);
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Your pages" }));
    expect(screen.getByText("PRIVATE JOURNAL SENTENCE")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "A fresh page" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Play together",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(screen.queryByText("Ask AI")).toBeNull();
    fill("Another private moment");
    fireEvent.click(screen.getByRole("button", { name: "Play together" }));
    await screen.findByRole("heading", { name: "Together at the table" });
    expect(screen.queryByText("PRIVATE JOURNAL SENTENCE")).toBeNull();
    expect(screen.queryByText("Another private moment")).toBeNull();
    expect(screen.queryByRole("button", { name: "Your pages" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Unlock my edition" }));
    expect(lock).toHaveBeenCalledOnce();
  });
});

describe("journal header navigation", () => {
  function setup(
    options: {
      beforeSave?: () => Promise<void>;
      addPhoto?: () => Promise<import("@/lib/relish/photos").Photo>;
    } = {},
  ) {
    let stored: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
    const account = vi.fn(),
      lock = vi.fn(),
      shelf = vi.fn(),
      interaction = vi.fn();
    const save = vi.fn(async (change: Book | ((book: Book) => Book)) => {
      await options.beforeSave?.();
      stored = typeof change === "function" ? change(stored) : change;
    });
    function Harness() {
      const [book, setBook] = useState(stored);
      const [busy, setBusy] = useState(false);
      return createElement(LivingBook, {
        onAccount: account,
        onInteraction: interaction,
        syncStatus: "Local only",
        vault: {
          book,
          mode: "open",
          editions: [],
          editionId: "test",
          shelf,
          select: vi.fn(),
          remove: async () => {},
          busy,
          error: "",
          open: async () => {},
          lock,
          backup: vi.fn(),
          photos: {
            add: options.addPhoto || vi.fn(),
            load: vi.fn(async () => new Blob()),
          },
          save: async (change) => {
            setBusy(true);
            try {
              await save(change);
              setBook(stored);
            } finally {
              setBusy(false);
            }
          },
        },
      });
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole("button", { name: "Your pages" }));
    fireEvent.click(screen.getByRole("button", { name: "A fresh page" }));
    return { account, lock, shelf, interaction, save, book: () => stored };
  }
  it("keeps the header available on a blank page and leaves without creating an empty entry", async () => {
    const qa = setup();
    for (const name of [
      "Activities",
      "Your pages",
      "Play together",
      "Sign in",
      "Editions",
      "Connect editions",
      "Privacy and settings",
      "Lock",
    ]) {
      expect(
        (screen.getAllByRole("button", { name })[0] as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    }
    fireEvent.click(screen.getByRole("button", { name: "Activities" }));
    await screen.findByRole("heading", { name: "Activities" });
    expect(qa.save).not.toHaveBeenCalled();
    expect(qa.book().journal || []).toHaveLength(0);
    expect(qa.interaction).toHaveBeenLastCalledWith(false);
  });
  it("keeps the newest words as a draft when navigating before the autosave timer", async () => {
    const qa = setup();
    fill("These words were just typed.");
    fireEvent.click(screen.getByRole("button", { name: "Your pages" }));
    const resume = await screen.findByRole("button", { name: /Keep writing:/ });
    expect(qa.book().journal?.[0]).toMatchObject({
      text: "These words were just typed.",
      status: "draft",
    });
    fireEvent.click(resume);
    expect((input() as HTMLTextAreaElement).value).toBe(
      "These words were just typed.",
    );
  });
  it("saves before opening sign-in, keeps the editor mounted, and keeps incoming sync paused", async () => {
    const qa = setup();
    const editor = input();
    fill("My draft stays here while I sign in.");
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[0]);
    await waitFor(() => expect(qa.account).toHaveBeenCalledOnce());
    expect(input()).toBe(editor);
    expect(qa.book().journal?.[0].text).toBe(
      "My draft stays here while I sign in.",
    );
    expect(qa.interaction).toHaveBeenLastCalledWith(true);
    fill("And I can carry on afterward.");
    fireEvent.click(screen.getByRole("button", { name: "Editions" }));
    await waitFor(() => expect(qa.shelf).toHaveBeenCalledOnce());
    expect(qa.book().journal?.[0].text).toBe("And I can carry on afterward.");
  });
  it("waits for a slow autosave and then keeps the newest words before locking exactly once", async () => {
    const slow = deferred();
    let calls = 0;
    const qa = setup({
      beforeSave: async () => {
        if (++calls === 1) await slow.promise;
      },
    });
    fill("First version");
    await waitFor(() => expect(calls).toBe(1));
    fill("Newest version before locking");
    const lock = screen.getByRole("button", { name: "Lock" });
    expect((lock as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(lock);
    fireEvent.click(lock);
    expect(qa.lock).not.toHaveBeenCalled();
    await act(async () => slow.resolve());
    await waitFor(() => expect(qa.lock).toHaveBeenCalledOnce());
    expect(qa.book().journal?.[0]).toMatchObject({
      text: "Newest version before locking",
      status: "draft",
      revision: 2,
    });
  });
  it("keeps the draft open after a save failure and allows the same navigation to retry", async () => {
    let failing = true;
    const qa = setup({
      beforeSave: async () => {
        if (failing) throw new Error("Full");
      },
    });
    fill("Words that must survive a failed save");
    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    await screen.findByRole("alert");
    expect(qa.lock).not.toHaveBeenCalled();
    expect((input() as HTMLTextAreaElement).value).toBe(
      "Words that must survive a failed save",
    );
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    await waitFor(() => expect(qa.lock).toHaveBeenCalledOnce());
    expect(qa.book().journal?.[0].text).toBe(
      "Words that must survive a failed save",
    );
  });
  it("holds the page open until a photo is attached, then saves it before leaving", async () => {
    const slow = deferred();
    const photo = {
      id: crypto.randomUUID(),
      width: 100,
      height: 100,
      caption: "",
      createdAt: new Date().toISOString(),
    };
    const qa = setup({
      addPhoto: async () => {
        await slow.promise;
        return photo;
      },
    });
    fireEvent.change(screen.getByLabelText("Upload a photo"), {
      target: {
        files: [new File(["photo"], "photo.png", { type: "image/png" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Activities" }));
    await screen.findByText(
      "Your photo is still being added. Give it a moment, then try again.",
    );
    expect(input()).toBeTruthy();
    await act(async () => slow.resolve());
    fireEvent.click(screen.getByRole("button", { name: "Activities" }));
    await screen.findByRole("heading", { name: "Activities" });
    expect(qa.book().journal?.[0].photos).toEqual([photo]);
  });
});
