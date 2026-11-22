import { createElement, useState } from "react";
import { vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { emptyBook, type Book } from "@/lib/relish/model";
import LivingBook from "../LivingBook";
import type { FamilyPerson } from "../Home";

/** Renders a book in LivingBook with an in-memory vault. Mock ../Sensory in the test. */
export function openBook(
  book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } },
  extra: { family?: FamilyPerson[]; mode?: "open" | "sample" } = {},
) {
  let stored = book;
  const lock = vi.fn();
  // The last journal is remembered per book; each test starts in My journal.
  try {
    localStorage.removeItem("relish.space.v1:places-test");
  } catch {
    /* no storage in this environment */
  }
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

/**
 * Journal in the top bar (2026-11-22: one journal, the family spine with your
 * branches). With kids' journals it's a menu; its first item is the journal.
 */
export function openJournal() {
  const nav = screen.getByRole("navigation", { name: "Main" });
  fireEvent.click(within(nav).getByRole("button", { name: /^Journal/ }));
  const menu = screen.queryByRole("menu", { name: "Journals" });
  if (menu) fireEvent.click(within(menu).getByRole("menuitem", { name: /^Our family journal/ }));
}
/** Journal ▾, then one of its items (a kid's journal). */
export function pickJournal(item: RegExp | string) {
  const nav = screen.getByRole("navigation", { name: "Main" });
  fireEvent.click(within(nav).getByRole("button", { name: /^Journal/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: item }));
}
/** The whole journal: the family's spine and your own branches. */
export const myJournal = () => openJournal();
/** The journal showing only the family's spine (the Family filter). */
export function familyJournal() {
  openJournal();
  const show = screen.queryByRole("group", { name: "Show" });
  if (show) fireEvent.click(within(show).getByRole("button", { name: "Family" }));
}
/** One of the three places in the top bar. */
export function place(name: "Home" | "Activities") {
  const nav = screen.getByRole("navigation", { name: "Main" });
  fireEvent.click(within(nav).getByRole("button", { name }));
}
