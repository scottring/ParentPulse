// @vitest-environment happy-dom
// One shared device: Scott opens Kaleb's book from Family without a
// password, then switching back from Kaleb's book needs the parent password.
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { Window } from "happy-dom";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});

const world = vi.hoisted(() => ({
  edition: "ed-scott",
  gate: null as unknown,
  listeners: new Set<() => void>(),
  vaults: {} as Record<string, unknown>,
  sync: null as unknown,
}));
const heads = vi.hoisted(() => ({
  scott: { id: "r-scott", label: "Scott", accountManaged: true as const },
  kaleb: { id: "r-kaleb", label: "Kaleb", accountManaged: true as const },
  ella: { id: "r-ella", label: "Ella", accountManaged: true as const },
  iris: { id: "r-iris", label: "Iris" },
}));
const editionOf = (remoteId: string) => remoteId.replace(/^r-/, "ed-");
const notify = () => world.listeners.forEach((l) => l());

vi.mock("../Sensory", () => ({
  SensoryProvider: ({ children }: { children: ReactNode }) => children,
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
vi.mock("@/lib/relish/ai-auth", () => ({
  getParentGate: () => world.gate,
  setParentGate: (g: unknown) => {
    world.gate = g;
  },
  connectAI: vi.fn(),
  disconnectAI: vi.fn().mockResolvedValue(undefined),
  getAIAuth: vi.fn(),
}));
vi.mock("@/lib/relish/profiles", async () => ({
  ...(await vi.importActual("@/lib/relish/profiles")),
  verifyParent: vi.fn(async (_gate: unknown, pass: string) => pass === "parent password"),
}));
vi.mock("@/lib/relish/book-sync", async () => ({
  ...(await vi.importActual("@/lib/relish/book-sync")),
  readBinding: (editionId: string) => ({
    uid: "parent-one",
    remoteId: editionId.replace(/^ed-/, "r-"),
    revision: "1",
    fingerprint: null,
    accountManaged: true,
  }),
}));
vi.mock("../useLocalBook", async () => {
  const { useSyncExternalStore } = await import("react");
  const { emptyBook } = await import("@/lib/relish/model");
  const books = {
    "ed-scott": { ...emptyBook("Scott"), profile: { kind: "adult" } },
    "ed-kaleb": {
      ...emptyBook("Kaleb"),
      profile: {
        kind: "child",
        ageBand: "6-8",
        parentLock: { accountUid: "parent-one" },
      },
    },
    "ed-ella": {
      ...emptyBook("Ella"),
      profile: {
        kind: "child",
        ageBand: "9-12",
        parentLock: { accountUid: "parent-one" },
      },
    },
  } as Record<string, ReturnType<typeof emptyBook>>;
  const vaultFor = (id: string) =>
    (world.vaults[id] ??= {
      mode: "open",
      book: books[id],
      editionId: id,
      editions: [],
      busy: false,
      error: "",
      shelf: vi.fn(),
      select: vi.fn(),
      remove: vi.fn(),
      open: vi.fn(),
      lock: vi.fn(),
      backup: vi.fn(),
      photos: { add: vi.fn(), load: vi.fn() },
      save: vi.fn(async () => {}),
    });
  return {
    useLocalBook: () =>
      vaultFor(
        useSyncExternalStore(
          (l) => {
            world.listeners.add(l);
            return () => world.listeners.delete(l);
          },
          () => world.edition,
        ),
      ),
  };
});
vi.mock("../useBookSync", () => ({
  useBookSync: () =>
    (world.sync ??= {
      authReady: true,
      user: { uid: "parent-one", email: "parent@example.invalid", emailVerified: true },
      books: [heads.scott, heads.iris, heads.kaleb, heads.ella],
      working: false,
      status: "",
      error: "",
      conflict: null,
      open: vi.fn(async (head: { id: string }) => {
        world.edition = editionOf(head.id);
        notify();
      }),
      refresh: vi.fn().mockResolvedValue([]),
      cancel: vi.fn(),
      setPaused: vi.fn(),
      refreshUser: vi.fn(),
      createBook: vi.fn(),
      addCurrentBook: vi.fn(),
      keepBoth: vi.fn(),
    }),
}));
import RelishApp from "../RelishApp";

type FakeSync = { open: ReturnType<typeof vi.fn> };
beforeEach(() => {
  localStorage.setItem("relish:home-book:parent-one", "r-scott");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("hands a shared device from Scott's book to Kaleb's and back to Family, then on to Ella's", async () => {
  render(createElement(RelishApp));
  const sync = world.sync as FakeSync;

  // Scott's book: Family lists the children's books first, then the older
  // copy that needs its passphrase. Kaleb's opens without a password.
  fireEvent.click(screen.getByRole("button", { name: "Family" }));
  let shelf = screen.getByRole("list", { name: "Family books" });
  expect(
    within(shelf)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label")),
  ).toEqual([
    "Open Kaleb’s book",
    "Open Ella’s book",
    "Open Iris’s book, an earlier copy that needs its original passphrase",
  ]);
  expect(within(shelf).queryByRole("button", { name: /Scott’s book/ })).toBeNull();
  fireEvent.click(within(shelf).getByRole("button", { name: "Open Kaleb’s book" }));
  expect(sync.open).toHaveBeenLastCalledWith(heads.kaleb);
  expect(screen.queryByLabelText(/password|passphrase/i)).toBeNull();

  // Kaleb's book: no way to other books from Family, and his lock is set.
  await screen.findByRole("heading", { name: /Kaleb/ });
  expect(world.gate).toEqual({ accountUid: "parent-one" });
  fireEvent.click(screen.getByRole("button", { name: "Family" }));
  expect(screen.queryByRole("list", { name: "Family books" })).toBeNull();

  // Switch book asks for the parent password; a wrong one is rejected.
  fireEvent.click(screen.getByRole("button", { name: /^Menu/ }));
  fireEvent.click(screen.getByRole("button", { name: "Switch book" }));
  expect(screen.getByRole("heading", { name: "Parent sign-in" })).toBeTruthy();
  const password = screen.getByLabelText("Parent account password");
  fireEvent.change(password, { target: { value: "a guess" } });
  fireEvent.click(screen.getByRole("button", { name: "Open my book" }));
  await screen.findByText(/parent password didn’t match/);
  expect(sync.open).toHaveBeenLastCalledWith(heads.kaleb);
  fireEvent.change(password, { target: { value: "parent password" } });
  fireEvent.click(screen.getByRole("button", { name: "Open my book" }));

  // Scott's book opens straight onto Family: no list of books in between.
  await screen.findByRole("heading", { name: "Your family", level: 1 });
  expect(sync.open).toHaveBeenLastCalledWith(heads.scott);
  expect(
    screen.getByRole("button", { name: "Family" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(world.gate).toBeNull();
  expect(screen.queryByRole("heading", { name: "Parent sign-in" })).toBeNull();

  // And on to Ella's book, again without a password.
  shelf = screen.getByRole("list", { name: "Family books" });
  fireEvent.click(within(shelf).getByRole("button", { name: "Open Ella’s book" }));
  expect(sync.open).toHaveBeenLastCalledWith(heads.ella);
  await screen.findByRole("heading", { name: /Ella/ });
  expect(world.gate).toEqual({ accountUid: "parent-one" });
});
