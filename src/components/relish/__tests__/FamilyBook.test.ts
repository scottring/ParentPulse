// @vitest-environment happy-dom
// Our family book across one account: Scott adds a passage from his Journal,
// Kaleb's book (a child's book in the same account) shows it in Book · Our
// family, and when Scott takes it out it's gone from both. The family book is
// real (encrypted, read-modify-write); only the account's server is a fake.
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { Window } from "happy-dom";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
if (!globalThis.CSS)
  Object.defineProperty(globalThis, "CSS", { value: { escape: (s: string) => s }, configurable: true });

const world = vi.hoisted(() => ({
  edition: "ed-scott",
  version: 0,
  gate: null as unknown,
  listeners: new Set<() => void>(),
  books: {} as Record<string, unknown>,
  vaults: {} as Record<string, unknown>,
  sync: null as unknown,
  library: null as unknown,
}));
const heads = vi.hoisted(() => ({
  scott: { id: "r-scott", label: "Scott", accountManaged: true as const },
  kaleb: { id: "r-kaleb", label: "Kaleb", accountManaged: true as const },
  ella: { id: "r-ella", label: "Ella", accountManaged: true as const },
}));
const editionOf = (remoteId: string) => remoteId.replace(/^r-/, "ed-");
const notify = () => world.listeners.forEach((l) => l());

vi.mock("../Sensory", () => ({
  SensoryProvider: ({ children }: { children: ReactNode }) => children,
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
vi.mock("../TypingSound", () => ({
  useTypingSound: () => ({}),
  TypingSoundToggle: () => null,
  TypingSoundSetting: () => null,
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
  world.books = {
    "ed-scott": {
      ...emptyBook("Scott"),
      profile: { kind: "adult" },
      people: [{ id: "k", name: "Kaleb", role: "Son", color: "ochre", note: "", lessons: [] }],
    },
    "ed-kaleb": {
      ...emptyBook("Kaleb"),
      profile: { kind: "child", ageBand: "6-8", parentLock: { accountUid: "parent-one" } },
    },
    "ed-ella": {
      ...emptyBook("Ella"),
      profile: { kind: "child", ageBand: "9-12", parentLock: { accountUid: "parent-one" } },
    },
  };
  const vaultFor = (key: string) => {
    const id = key.split("#")[0];
    return (world.vaults[key] ??= {
      mode: "open",
      book: world.books[id],
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
      photos: undefined,
      save: async (change: (b: unknown) => unknown) => {
        world.books[id] = change(world.books[id]);
        world.version++;
        notify();
      },
    });
  };
  return {
    useLocalBook: () =>
      vaultFor(
        useSyncExternalStore(
          (l) => {
            world.listeners.add(l);
            return () => world.listeners.delete(l);
          },
          () => `${world.edition}#${world.version}`,
        ),
      ),
  };
});
vi.mock("../useBookSync", async () => {
  const { loadFamilyPages, changeFamilyBook } = await import("@/lib/relish/family-book");
  const { fakeLibrary } = await import("@/lib/relish/__tests__/family-remote");
  return {
    useBookSync: () => {
      const lib = (world.library ??= fakeLibrary()) as ReturnType<typeof fakeLibrary>;
      return (world.sync ??= {
        authReady: true,
        user: { uid: "parent-one", email: "parent@example.invalid", emailVerified: true },
        books: [heads.scott, heads.kaleb, heads.ella],
        working: false,
        status: "",
        error: "",
        conflict: null,
        open: vi.fn(async (head: { id: string }) => {
          world.edition = editionOf(head.id);
          notify();
        }),
        refresh: vi.fn().mockResolvedValue([heads.scott, heads.kaleb, heads.ella]),
        cancel: vi.fn(),
        setPaused: vi.fn(),
        refreshUser: vi.fn(),
        createBook: vi.fn(),
        addCurrentBook: vi.fn(),
        keepBoth: vi.fn(),
        // The real family book, against a fake account library.
        family: {
          load: () => loadFamilyPages(lib.remote),
          change: (c: Parameters<typeof changeFamilyBook>[1]) => changeFamilyBook(lib.remote, c),
        },
      });
    },
  };
});
import RelishApp from "../RelishApp";
import { familyJournal, myJournal, pickJournal } from "./bookHarness";
import { loadFamilyPages } from "@/lib/relish/family-book";
import type { fakeLibrary } from "@/lib/relish/__tests__/family-remote";

const library = () => world.library as ReturnType<typeof fakeLibrary>;
/** Journal ▾, then Our family journal. Leaving a page being written saves it first. */
async function ourFamily() {
  familyJournal();
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
}
const QUOTE = "When I’m big I’ll still hold your hand. Just not in front of people.";

beforeEach(() => {
  localStorage.setItem("relish:home-book:parent-one", "r-scott");
  world.edition = "ed-scott";
  world.gate = null;
  world.vaults = {};
  world.sync = null;
  world.library = null;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("a passage added in Scott's book shows in Kaleb's Our family, and taking it out removes it for both", async () => {
  render(createElement(RelishApp));

  // Scott writes in My journal and shares one passage with the family.
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Bedtime was hard" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), {
    target: {
      value: `Forty minutes of stalling.\n\nThen Kaleb said: “${QUOTE}”\n\nI want to remember that.`,
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).getByText("Kaleb and Ella will see this in Our family journal.")).toBeTruthy();
  // The first quoted sentence is suggested; the caption names Kaleb.
  expect(within(sheet).getByText(QUOTE)).toBeTruthy();
  expect((within(sheet).getByLabelText("Caption") as HTMLInputElement).value).toBe("Kaleb");
  fireEvent.click(within(sheet).getByRole("button", { name: "Add passage to family journal" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Share with our family" })).toBeNull(), {
    timeout: 15000,
  });
  // The entry was saved to Scott's book first; only the passage went out.
  const scott = world.books["ed-scott"] as { journal: { text: string }[] };
  expect(scott.journal[0].text).toContain("Forty minutes");
  const stored = await loadFamilyPages(library().remote);
  expect(stored).toMatchObject([
    { kind: "passage", text: QUOTE, caption: "Kaleb", byName: "Scott", byBookId: "r-scott" },
  ]);
  expect([...library().raw.values()].join()).not.toContain("hold your hand");

  // Scott's Our family journal shows it.
  await ourFamily();
  expect(await screen.findByText(`“${QUOTE}”`, {}, { timeout: 15000 })).toBeTruthy();

  // Kaleb's journal, opened from Kids' journals in the Journal menu, shows it too.
  pickJournal("Kaleb’s journal");
  await screen.findByRole("heading", { name: /Kaleb/ });
  await ourFamily();
  fireEvent.click(await screen.findByText(`“${QUOTE}”`, {}, { timeout: 15000 }));
  // Kaleb didn't add it, so he can't take it out.
  expect(screen.queryByRole("button", { name: "Take out of the family journal" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

  // Back to Scott's journal (parent password), straight onto Our family journal.
  fireEvent.click(screen.getByRole("button", { name: "Back to my journal" }));
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "parent password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
  fireEvent.click(await screen.findByText(`“${QUOTE}”`, {}, { timeout: 15000 }));
  fireEvent.click(screen.getByRole("button", { name: "Take out of the family journal" }));
  await waitFor(() => expect(screen.queryByText(`“${QUOTE}”`)).toBeNull(), { timeout: 15000 });
  await waitFor(async () => expect(await loadFamilyPages(library().remote)).toEqual([]), {
    timeout: 15000,
  });
  expect(screen.getByRole("status").textContent).toBe("Taken out of Our family journal.");

  // And it's gone from Kaleb's Our family journal too.
  pickJournal("Kaleb’s journal");
  await screen.findByRole("heading", { name: /Kaleb/ });
  await ourFamily();
  await screen.findByRole("heading", { name: "The first entry is waiting" }, { timeout: 15000 });
  expect(screen.queryByText(`“${QUOTE}”`)).toBeNull();
}, 60000);
