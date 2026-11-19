import { createElement, useState } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
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
  // Just me / Our family is remembered per book; each test starts in Just me.
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
