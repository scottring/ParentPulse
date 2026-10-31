// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { Book } from "@/lib/relish/model";
const state = vi.hoisted(() => ({
  book: {
    version: 1,
    owner: "Earlier edition",
    people: [],
    moments: [],
  } as Book,
}));
vi.mock("../useLocalBook", () => ({
  useLocalBook: () => ({
    mode: "open",
    book: state.book,
    save: vi.fn(),
    shelf: vi.fn(),
  }),
}));
vi.mock("../Sensory", () => ({
  SensoryProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../LivingBook", () => ({
  default: () => createElement("p", null, "Private content is open"),
}));
import RelishApp from "../RelishApp";
afterEach(cleanup);
it("keeps an older unlocked book at reader setup until its profile is configured", () => {
  const { rerender } = render(createElement(RelishApp));
  expect(
    screen.getByRole("heading", { name: "Who is this book for?" }),
  ).toBeTruthy();
  expect(screen.queryByText("Private content is open")).toBeNull();
  state.book = { ...state.book, profile: { kind: "adult" } };
  rerender(createElement(RelishApp));
  expect(screen.getByText("Private content is open")).toBeTruthy();
});
