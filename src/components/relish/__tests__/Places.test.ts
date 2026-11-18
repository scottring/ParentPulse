// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { writeJournalPage, newJournalDraft } from "@/lib/relish/journal";
import LivingBook from "../LivingBook";
import type { FamilyPerson } from "../Home";
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

export function openBook(
  book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } },
  extra: { family?: FamilyPerson[]; mode?: "open" | "sample" } = {},
) {
  let stored = book;
  const lock = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState(stored);
    return createElement(LivingBook, {
      family: extra.family,
      vault: {
        book: current,
        mode: extra.mode || "open",
        editions: [],
        editionId: "places-test",
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
          stored = typeof change === "function" ? change(stored) : change;
          setCurrent(stored);
        },
      },
    });
  }
  render(createElement(Harness));
  return { stored: () => stored, lock };
}

it("opens on Home with one suggestion, another on request, and time tiles", () => {
  openBook();
  expect(
    screen.getByRole("heading", { name: "Hi Robin. Here’s one small thing." }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
  ).toBe("page");
  const region = screen.getByRole("region", { name: "Today’s suggestion" });
  const first = region.textContent;
  fireEvent.click(screen.getByRole("button", { name: "Show me another" }));
  expect(region.textContent).not.toBe(first);
  for (const name of [/1 minute/, /5 minutes/, /With the kids/, /Something’s hard/])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /With the kids/ }));
  expect(
    screen
      .getByRole("button", { name: "Do something" })
      .getAttribute("aria-current"),
  ).toBe("page");
});

it("lists the latest kept pages and opens one in the reader", () => {
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    { ...newJournalDraft(), title: "Pancakes at dawn", text: "We flipped them high." },
    0,
    "kept",
  );
  openBook(book);
  fireEvent.click(screen.getByRole("button", { name: /Pancakes at dawn/ }));
  expect(screen.getByText("We flipped them high.")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Your book" }).getAttribute("aria-current"),
  ).toBe("page");
});

it("shows the family’s books as people and opens one", () => {
  const onOpen = vi.fn();
  openBook(undefined, { family: [{ id: "b1", name: "Ella", onOpen }] });
  fireEvent.click(screen.getByRole("button", { name: "Ella" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

it("falls back to family noted in the book when there are no account books", () => {
  openBook(sampleBook(), { mode: "sample" });
  expect(screen.getByRole("button", { name: "Leo" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite a partner" })).toBeNull();
});

it("Your book: reviews one suggestion at a time and filters by person", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  fireEvent.click(screen.getByRole("button", { name: "Your book" }));
  expect(screen.getByRole("heading", { name: "Your book", level: 1 })).toBeTruthy();
  expect(screen.getByText("A little room to talk")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Yes, keep it" }));
  await screen.findByText(/Try: If you both feel like it/);
  expect(app.stored().manual?.cards[0].status).toBe("kept");
  expect(screen.queryByRole("button", { name: "Yes, keep it" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Leo" }));
  expect(
    screen.getByText("Getting down to his eye level changes the whole conversation."),
  ).toBeTruthy();
  expect(screen.queryByText(/An unhurried walk/)).toBeNull();
  expect(screen.getByRole("button", { name: /Leaving the playground was hard/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /We went for a walk/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Everyone" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a page" }), {
    target: { value: "spaceship" },
  });
  const found = screen.getByRole("button", { name: /The blanket-fort expedition/ });
  expect(screen.queryByRole("button", { name: /Leaving the playground/ })).toBeNull();
  fireEvent.click(found);
  expect(screen.getByRole("button", { name: /Back to your book/ })).toBeTruthy();
});

it("Your book: unfinished drafts are under Still going", () => {
  const draft = { ...newJournalDraft(), title: "Half a thought", text: "and then" };
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    draft,
    0,
    "draft",
  );
  openBook(book);
  fireEvent.click(screen.getByRole("button", { name: "Your book" }));
  fireEvent.click(screen.getByRole("button", { name: /Keep writing: Half a thought/ }));
  expect(
    (screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement)
      .value,
  ).toBe("and then");
});
