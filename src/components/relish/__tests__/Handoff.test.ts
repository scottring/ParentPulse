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
}));
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
    remoteId: editionId === "ed-scott" ? "r-scott" : "r-kaleb",
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
      books: [heads.scott, heads.kaleb],
      working: false,
      status: "",
      error: "",
      conflict: null,
      open: vi.fn(async (head: { id: string }) => {
        world.edition = head.id === "r-scott" ? "ed-scott" : "ed-kaleb";
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

it("hands a shared device from Scott's book to Kaleb's and back through the parent unlock", async () => {
  render(createElement(RelishApp));
  const sync = world.sync as FakeSync;

  // Scott's book: Family shows Kaleb's cover, which opens without a password.
  fireEvent.click(screen.getByRole("button", { name: "Family" }));
  const shelf = screen.getByRole("list", { name: "Family books" });
  fireEvent.click(within(shelf).getByRole("button", { name: "Open Kaleb’s book" }));
  expect(sync.open).toHaveBeenLastCalledWith(heads.kaleb);
  expect(screen.queryByLabelText(/password|passphrase/i)).toBeNull();

  // Kaleb's book: no way to Scott's book from Family, and his lock is set.
  await screen.findByRole("heading", { name: /Kaleb/ });
  expect(world.gate).toEqual({ accountUid: "parent-one" });
  fireEvent.click(screen.getByRole("button", { name: "Family" }));
  expect(screen.queryByRole("button", { name: /Scott’s book/ })).toBeNull();

  // Switch book asks for the parent password before any cover shows.
  fireEvent.click(screen.getByRole("button", { name: /^Menu/ }));
  fireEvent.click(screen.getByRole("button", { name: "Switch book" }));
  expect(screen.getByRole("heading", { name: "Parent sign-in" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Open Scott’s book/ })).toBeNull();
  const password = screen.getByLabelText("Parent account password");
  fireEvent.change(password, { target: { value: "a guess" } });
  fireEvent.click(screen.getByRole("button", { name: "Choose a book" }));
  await screen.findByText(/parent password didn’t match/);
  expect(screen.queryByRole("button", { name: /Open Scott’s book/ })).toBeNull();
  fireEvent.change(password, { target: { value: "parent password" } });
  fireEvent.click(screen.getByRole("button", { name: "Choose a book" }));

  // Unlocked: the "Who’s reading?" picker, then back to Scott's book.
  await screen.findByRole("heading", { name: "Who’s reading?" });
  fireEvent.click(await screen.findByRole("button", { name: "Open Scott’s book" }));
  await screen.findByRole("heading", { name: /Scott/ });
  expect(sync.open).toHaveBeenLastCalledWith(heads.scott);
  expect(screen.queryByRole("heading", { name: "Who’s reading?" })).toBeNull();
  expect(world.gate).toBeNull();
});
