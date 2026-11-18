// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ReadingBook from "../ReadingBook";

afterEach(cleanup);

it("reads as a book with entry links: previous, where you are, and a new entry at the end", () => {
  const onPreviousEntry = vi.fn(),
    onNewEntry = vi.fn();
  render(
    createElement(
      ReadingBook,
      {
        entryLabel: "Entry 5 of 5",
        onPreviousEntry,
        onNewEntry,
      },
      createElement("p", null, "We took the long way home."),
    ),
  );
  expect(screen.getByText("We took the long way home.")).toBeTruthy();
  expect(screen.getByText("Entry 5 of 5")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Previous entry/ }));
  expect(onPreviousEntry).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /New entry/ }));
  expect(onNewEntry).toHaveBeenCalled();
  // A short entry fits one spread: no page turning offered.
  expect(screen.queryByRole("button", { name: /Turn the page/ })).toBeNull();
});

it("the first entry can't go back, and an earlier one offers the next entry instead of a new one", () => {
  const onNextEntry = vi.fn();
  render(
    createElement(
      ReadingBook,
      {
        entryLabel: "Entry 1 of 3",
        onNextEntry,
        onNewEntry: vi.fn(),
      },
      createElement("p", null, "First."),
    ),
  );
  expect(
    (screen.getByRole("button", { name: /Previous entry/ }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(screen.queryByRole("button", { name: /New entry/ })).toBeNull();
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(onNextEntry).toHaveBeenCalled();
});
