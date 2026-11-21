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
      // No edition: signed in, nothing open on this device yet.
      mode: id ? "open" : "shelf",
      book: books[id] ?? emptyBook(""),
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
import { familyJournal, pickJournal } from "./bookHarness";

type FakeSync = { open: ReturnType<typeof vi.fn> };
/** Journal ▾, then Our family journal. */
const ourFamily = familyJournal;
/** Opens Who's in our family and returns it. */
function members() {
  fireEvent.click(screen.getByRole("button", { name: "Who’s in our family" }));
  return screen.getByRole("dialog", { name: "Who’s in our family" });
}
/** Opens the Journal menu and returns its items' names. */
function journalMenu() {
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name: /^Journal/ }),
  );
  const items = within(screen.getByRole("menu", { name: "Journals" }))
    .getAllByRole("menuitem")
    .map((i) => i.textContent);
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  return items;
}
beforeEach(() => {
  localStorage.setItem("relish:home-book:parent-one", "r-scott");
  world.edition = "ed-scott";
  world.gate = null;
  world.vaults = {};
  world.sync = null;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("hands a shared device from Scott's book to Kaleb's and back to Our family, then on to Ella's", async () => {
  render(createElement(RelishApp));
  const sync = world.sync as FakeSync;

  // Scott's journal: the Journal menu lists the children's journals, then
  // the older copy that needs its passphrase. Kaleb's opens without a password.
  expect(journalMenu()).toEqual([
    "My journalOnly me",
    "Our family journalEveryone in the family",
    "Kaleb’s journal",
    "Ella’s journal",
    "Iris’s journalNeeds its original passphrase",
  ]);
  // Who's in our family lists them too.
  ourFamily();
  const shelf = members();
  expect(
    within(shelf)
      .getAllByRole("button", { name: /^Open / })
      .map((b) => b.getAttribute("aria-label") ?? b.textContent),
  ).toEqual([
    "Open my journal",
    "Open Kaleb’s journal",
    "Open Ella’s journal",
    "Open Iris’s journal, an earlier copy that needs its original passphrase",
  ]);
  fireEvent.keyDown(document, { key: "Escape" });
  pickJournal("Kaleb’s journal");
  expect(sync.open).toHaveBeenLastCalledWith(heads.kaleb);
  expect(screen.queryByLabelText(/password|passphrase/i)).toBeNull();

  // Kaleb's journal: Our family journal works, but leads to no other
  // journals, and his lock is set.
  await screen.findByRole("heading", { name: /Kaleb/ });
  expect(world.gate).toEqual({ accountUid: "parent-one" });
  expect(journalMenu()).toEqual(["My journalOnly me", "Our family journalEveryone in the family"]);
  ourFamily();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  members();
  expect(screen.queryByRole("button", { name: /^Open .*’s journal/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Add a child|Invite a partner/ })).toBeNull();
  fireEvent.keyDown(document, { key: "Escape" });

  // Back to my journal (a clear way back) asks for the parent password; a
  // wrong one is rejected.
  expect(screen.getByText("Kaleb’s journal", { selector: ".rp-kidbar strong" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to my journal" }));
  expect(screen.getByRole("heading", { name: "Parent sign-in" })).toBeTruthy();
  const password = screen.getByLabelText("Parent account password");
  fireEvent.change(password, { target: { value: "a guess" } });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  await screen.findByText(/parent password didn’t match/);
  expect(sync.open).toHaveBeenLastCalledWith(heads.kaleb);
  fireEvent.change(password, { target: { value: "parent password" } });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));

  // Scott's journal opens straight onto Our family journal: no list of
  // journals in between.
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
  expect(sync.open).toHaveBeenLastCalledWith(heads.scott);
  expect(
    within(screen.getByRole("navigation", { name: "Main" }))
      .getByRole("button", { name: /^Journal/ })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(screen.queryByRole("button", { name: "Back to my journal" })).toBeNull();
  expect(world.gate).toBeNull();
  expect(screen.queryByRole("heading", { name: "Parent sign-in" })).toBeNull();

  // And on to Ella's journal, again without a password.
  pickJournal("Ella’s journal");
  expect(sync.open).toHaveBeenLastCalledWith(heads.ella);
  await screen.findByRole("heading", { name: /Ella/ });
  expect(world.gate).toEqual({ accountUid: "parent-one" });
});

it("new device: picking your journal once makes the next load open it directly", async () => {
  localStorage.clear();
  world.edition = "";
  render(createElement(RelishApp));
  const sync = world.sync as FakeSync;
  await screen.findByRole("heading", { name: "Which journal is yours?" });
  expect(sync.open).not.toHaveBeenCalled();

  // A child's book picked here is never remembered as the adult's own.
  // A plain list of journals, no bookshelf of covers.
  expect(document.querySelector(".lb-bookshelf")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Kaleb’s journal" }));
  await screen.findByRole("heading", { name: /Kaleb/ });
  expect(localStorage.getItem("relish:home-book:parent-one")).toBeNull();

  // Back on the screen (a reload), Scott picks his own book.
  cleanup();
  world.edition = "";
  world.gate = null;
  world.sync = null;
  render(createElement(RelishApp));
  fireEvent.click(
    await screen.findByRole("button", { name: "Scott’s journal" }),
  );
  await screen.findByRole("heading", { name: /Scott/ });
  expect(localStorage.getItem("relish:home-book:parent-one")).toBe("r-scott");

  // Reload: straight into Scott's book, no screen asking which is yours.
  cleanup();
  world.edition = "";
  world.sync = null;
  render(createElement(RelishApp));
  expect(screen.queryByRole("heading", { name: "Which journal is yours?" })).toBeNull();
  await screen.findByRole("heading", { name: /Scott/ });
  expect((world.sync as FakeSync).open).toHaveBeenCalledWith(heads.scott);
  expect(screen.queryByRole("heading", { name: "Which journal is yours?" })).toBeNull();
});
