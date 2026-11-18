// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { Window } from "happy-dom";
import { emptyBook } from "@/lib/relish/model";
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
const state = vi.hoisted(() => ({
  sync: {} as Record<string, unknown>,
  gate: null as unknown,
}));
vi.mock("../useLocalBook", () => ({
  useLocalBook: () => ({
    mode: "locked",
    book: emptyBook(""),
    editionId: "local",
    editions: [],
    lock: vi.fn(),
    shelf: vi.fn(),
  }),
}));
vi.mock("../useBookSync", () => ({ useBookSync: () => state.sync }));
vi.mock("@/lib/relish/ai-auth", () => ({
  setParentGate: vi.fn(),
  getParentGate: () => state.gate,
  disconnectAI: vi.fn(),
}));
vi.mock("../Sensory", () => ({
  SensoryProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../AccountLibrary", () => ({ default: () => null }));
vi.mock("../LivingBook", () => ({ default: () => null }));
import RelishApp from "../RelishApp";

const parent = { uid: "parent-one", emailVerified: true };
const books = [
  { id: "kid", label: "Ella", accountManaged: true },
  { id: "mine", label: "Scott", accountManaged: true },
];
const sync = (over: Record<string, unknown>) => ({
  authReady: true,
  user: null,
  books: [],
  working: false,
  status: "",
  open: state.sync.open,
  refresh: state.sync.refresh,
  cancel: vi.fn(),
  setPaused: vi.fn(),
  ...over,
});
beforeEach(() => {
  localStorage.setItem("relish:home-book:parent-one", "mine");
  state.sync = {
    open: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue([]),
  };
  state.gate = null;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("opens the adult's own book after a fresh sign-in, not the library", () => {
  state.sync = sync({});
  const { rerender } = render(createElement(RelishApp));
  state.sync = sync({ user: parent, books });
  rerender(createElement(RelishApp));
  expect(state.sync.open).toHaveBeenCalledWith(books[1]);
});

it("opens the adult's own book on a reload while already signed in", () => {
  state.sync = sync({ user: parent, books });
  render(createElement(RelishApp));
  expect(state.sync.open).toHaveBeenCalledWith(books[1]);
});

it("opens it only once per load, so Lock leaves you on the library", () => {
  state.sync = sync({ user: parent, books });
  const { rerender } = render(createElement(RelishApp));
  rerender(createElement(RelishApp));
  rerender(createElement(RelishApp));
  expect(state.sync.open).toHaveBeenCalledTimes(1);
});

it("never opens a child's book on sign-in when the own book is unknown", () => {
  localStorage.clear();
  state.sync = sync({});
  const { rerender } = render(createElement(RelishApp));
  state.sync = sync({ user: parent, books });
  rerender(createElement(RelishApp));
  expect(state.sync.open).not.toHaveBeenCalled();
});

it("shows the opening screen, not an empty library, while your book loads", () => {
  state.sync = { ...state.sync };
  state.sync = sync({ user: parent, books: [] });
  render(createElement(RelishApp));
  expect(screen.getByRole("status").textContent).toContain("Opening Relish");
  expect(state.sync.refresh).toHaveBeenCalledTimes(1);
});

it("stops at the library when a child's book left a parent gate", () => {
  state.gate = { accountUid: "parent-one" };
  state.sync = sync({ user: parent, books });
  render(createElement(RelishApp));
  expect(state.sync.open).not.toHaveBeenCalled();
  expect(screen.queryByText("Opening Relish…")).toBeNull();
});
