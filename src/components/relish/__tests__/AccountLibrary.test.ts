// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import AccountLibrary from "../AccountLibrary";
import { emptyBook } from "@/lib/relish/model";
import { Window } from "happy-dom";
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
const auth = vi.hoisted(() => ({
  gate: null as null | { accountUid: string },
  verify: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/lib/relish/ai-auth", () => ({
  getParentGate: () => auth.gate,
  setParentGate: auth.clear,
  connectAI: vi.fn(),
  disconnectAI: vi.fn(),
  getAIAuth: vi.fn(),
}));
vi.mock("@/lib/relish/profiles", async () => ({
  ...(await vi.importActual("@/lib/relish/profiles")),
  verifyParent: auth.verify,
}));
vi.mock("@/lib/relish/book-sync", async () => ({
  ...(await vi.importActual("@/lib/relish/book-sync")),
  readBinding: () => null,
}));
const user = {
  uid: "parent-one",
  email: "parent@example.invalid",
  emailVerified: true,
};
function mount(overrides = {}, props = {}) {
  const sync = {
    user,
    books: [],
    refresh: vi.fn().mockResolvedValue([]),
    open: vi.fn().mockResolvedValue(undefined),
    createBook: vi.fn().mockResolvedValue(undefined),
    addCurrentBook: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const close = vi.fn();
  render(
    createElement(AccountLibrary, {
      inline: true,
      sync,
      vault: { mode: "shelf", book: emptyBook(""), editionId: "test" },
      onClose: close,
      ...props,
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  return { sync, close };
}
beforeEach(() => {
  auth.gate = null;
  vi.clearAllMocks();
});
afterEach(cleanup);
it("creates a child inside the signed-in parent account without child credentials", async () => {
  const { sync, close } = mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Create a child’s journal" }),
  );
  fireEvent.change(screen.getByLabelText("Child’s name"), {
    target: { value: "Robin" },
  });
  fireEvent.change(screen.getByLabelText("Age range"), {
    target: { value: "9-12" },
  });
  const create = screen.getByRole("button", { name: "Create & open journal" });
  expect((create as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByLabelText(/email/i)).toBeNull();
  expect(screen.queryByLabelText(/password/i)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(create);
  await waitFor(() =>
    expect(sync.createBook).toHaveBeenCalledWith("Robin", "9-12"),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
});
it("opens an account book with one click and no journal passphrase", async () => {
  const head = { id: "fictional", label: "Robin", accountManaged: true };
  const { sync } = mount({ books: [head] });
  fireEvent.click(screen.getByRole("button", { name: /Robin/ }));
  await waitFor(() => expect(sync.open).toHaveBeenCalledWith(head));
  expect(screen.queryByLabelText(/passphrase/i)).toBeNull();
});
it("keeps the account's books behind the parent gate after a child-view reload", async () => {
  auth.gate = { accountUid: "parent-one" };
  auth.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { sync } = mount({
    books: [
      { id: "private", label: "Parent private journal", accountManaged: true },
    ],
  });
  expect(screen.queryByText("Parent private journal")).toBeNull();
  expect(sync.refresh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "incorrect" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  await screen.findByRole("alert");
  expect(sync.refresh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "parent password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  // This device doesn't know the adult's journal: it asks which one is theirs.
  await screen.findByText(/Parent private journal/);
  expect(
    screen.getByRole("heading", { name: "Which journal is yours?" }),
  ).toBeTruthy();
  expect(auth.clear).toHaveBeenCalledWith(null);
  expect(sync.refresh).toHaveBeenCalledTimes(1);
  expect(sync.open).not.toHaveBeenCalled();
});

it("after the parent password, goes straight back to the adult's own journal", async () => {
  localStorage.setItem("relish:home-book:parent-one", "mine");
  auth.gate = { accountUid: "parent-one" };
  auth.verify.mockResolvedValueOnce(true);
  const mine = { id: "mine", label: "Scott", accountManaged: true };
  const onSwitchHome = vi.fn();
  const { sync, close } = mount(
    { books: [{ id: "kid", label: "Kaleb", accountManaged: true }, mine] },
    { onSwitchHome },
  );
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "parent password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  await waitFor(() => expect(sync.open).toHaveBeenCalledWith(mine));
  expect(onSwitchHome).toHaveBeenCalledWith(mine);
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(screen.queryByRole("list")).toBeNull();
  localStorage.removeItem("relish:home-book:parent-one");
});
it("keeps original passphrase protection for an earlier synced book", async () => {
  const head = { id: "old", label: "Earlier Robin" };
  const { sync } = mount({ books: [head] });
  fireEvent.click(screen.getByRole("button", { name: /Earlier Robin/ }));
  await screen.findByLabelText("Original journal passphrase");
  expect(sync.open).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Original journal passphrase"), {
    target: { value: "original passphrase" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open journal" }));
  await waitFor(() =>
    expect(sync.open).toHaveBeenCalledWith(head, "original passphrase"),
  );
});
it("if opening the adult's book on sign-in didn't work, it's below without a second Create my journal", () => {
  localStorage.setItem("relish:home-book:parent-one", "mine");
  mount({
    books: [
      { id: "kid", label: "Ella", accountManaged: true },
      { id: "mine", label: "Scott", accountManaged: true },
    ],
  });
  expect(
    screen.getByRole("heading", { name: "Welcome back, Scott." }),
  ).toBeTruthy();
  // One way back into your own journal; the others are quiet links. No shelf.
  expect(screen.getByRole("button", { name: "Open my journal" }).className).toContain("lb-primary");
  expect(screen.getByRole("button", { name: "Ella’s journal" }).className).toContain("lb-lib-link");
  expect(document.querySelector(".lb-bookshelf, [data-cloth]")).toBeNull();
  expect(screen.queryByRole("button", { name: /Create my journal/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Create a new journal" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Create a child’s journal" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Refresh library/ })).toBeNull();
  expect(screen.queryByText(/Sign in once/)).toBeNull();
  localStorage.removeItem("relish:home-book:parent-one");
});
it("opens straight onto the add-a-child form from Family", () => {
  render(
    createElement(AccountLibrary, {
      sync: { user, books: [], refresh: vi.fn().mockResolvedValue([]) },
      vault: { mode: "open", book: { ...emptyBook("Scott"), profile: { kind: "adult" } }, editionId: "test" },
      onClose: vi.fn(),
      startAdding: "child",
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  expect(screen.getByLabelText("Child’s name")).toBeTruthy();
});

const invitation =
  "What’s one thing someone in your family did this week that you’d like to remember?";

it("first visit: invites the adult to start a journal once the empty list has loaded", async () => {
  const onLocal = vi.fn();
  render(
    createElement(AccountLibrary, {
      inline: true,
      sync: { user, books: [], refresh: vi.fn().mockResolvedValue([]) },
      vault: { mode: "shelf", book: emptyBook(""), editionId: "test" },
      onClose: vi.fn(),
      onLocal,
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  await screen.findByRole("heading", { name: "Start your journal" });
  expect(screen.getByText(invitation)).toBeTruthy();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.queryByText(/Your library is empty/)).toBeNull();
  expect(screen.queryByText(/Signed in as/)).toBeNull();
  expect(screen.getByText(/Encrypted and saved to your account/)).toBeTruthy();
  // Child access is explained in the child-book form, not beside the button.
  expect(screen.queryByText(/without a separate sign-in/)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Open a local journal or restore a backup" }),
  );
  expect(onLocal).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Create my journal" }));
  expect(screen.getByLabelText("Your name")).toBeTruthy();
  expect(screen.queryByLabelText("Age range")).toBeNull();
});

it("shows a loading state, never the invitation, while books are fetched", () => {
  mount({ refresh: vi.fn(() => new Promise(() => {})) });
  expect(screen.getByRole("status").textContent).toContain("Loading your journals");
  expect(screen.queryByText(invitation)).toBeNull();
  expect(screen.queryByRole("button", { name: "Create my journal" })).toBeNull();
});

it("shows a failed load with Try again instead of the invitation", async () => {
  const refresh = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network unavailable."))
    .mockResolvedValueOnce([]);
  mount({ refresh, error: "Network unavailable." });
  const alert = await screen.findByText(/didn’t load/);
  expect(alert.getAttribute("role")).toBe("alert");
  expect(alert.textContent).toContain("Network unavailable.");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.queryByText(invitation)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("heading", { name: "Start your journal" });
  expect(refresh).toHaveBeenCalledTimes(2);
});

it("waits for a sync already running instead of reporting a failed load", async () => {
  const refresh = vi
    .fn()
    .mockRejectedValueOnce(
      new Error("Sync is already running. Please try again in a moment."),
    )
    .mockResolvedValueOnce([]);
  mount({ refresh });
  await screen.findByRole("heading", { name: "Start your journal" });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(refresh).toHaveBeenCalledTimes(2);
});

it("new device: asks which book is yours, with create as quiet links", async () => {
  const kid = { id: "kid", label: "Ella", accountManaged: true };
  const old = { id: "old", label: "Iris" };
  const { sync } = mount({ books: [kid, old] });
  expect(
    screen.getByRole("heading", { name: "Which journal is yours?" }),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Start your journal" })).toBeNull();
  // No primary Create my book; creating stays available, quietly.
  expect(screen.queryByRole("button", { name: /Create my journal/ })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Create a new journal" }).className,
  ).toContain("lb-lib-link");
  expect(
    screen.getByRole("button", { name: "Create a child’s journal" }).className,
  ).toContain("lb-lib-link");
  // A plain list of names, not a shelf of covers; the older copy says it
  // needs its passphrase.
  expect(document.querySelector(".lb-bookshelf, [data-cloth]")).toBeNull();
  expect(
    screen.getByRole("button", { name: /^Iris’s journal.*needs its original passphrase/ }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ella’s journal" }));
  await waitFor(() => expect(sync.open).toHaveBeenCalledWith(kid));
});

it("no bookshelf: a returning device with several journals offers Open my journal, then the others", () => {
  localStorage.setItem("relish:home-book:parent-one", "mine");
  const { sync } = mount({
    books: [
      { id: "kid", label: "Kaleb", accountManaged: true },
      { id: "mine", label: "Scott", accountManaged: true },
      { id: "old", label: "Ella" },
    ],
  });
  expect(document.querySelector(".lb-bookshelf, [data-cloth]")).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getByText(/Kids’ journals are in the Journal menu/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Kaleb’s journal" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ella’s journal" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open my journal" }));
  return waitFor(() => expect(sync.open).toHaveBeenCalledWith(expect.objectContaining({ id: "mine" }))).finally(
    () => localStorage.removeItem("relish:home-book:parent-one"),
  );
});

it("explains child access in the child-book form, not beside the button", async () => {
  mount({ books: [{ id: "kid", label: "Ella", accountManaged: true }] });
  expect(screen.queryByText(/without a separate sign-in/)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Create a child’s journal" }),
  );
  expect(
    screen.getByText(/Children use this account without a separate sign-in/),
  ).toBeTruthy();
});
it("keeps account identity and Sign out together in the Account menu", async () => {
  const lock = vi.fn();
  const refreshUser = vi.fn();
  render(
    createElement(AccountLibrary, {
      inline: true,
      sync: {
        user,
        books: [],
        refresh: vi.fn().mockResolvedValue([]),
        refreshUser,
      },
      vault: { mode: "shelf", book: emptyBook(""), editionId: "test", lock },
      onClose: vi.fn(),
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  const toggle = screen.getByRole("button", { name: "Account" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  const menu = screen.getByRole("group", { name: "Account" });
  expect(menu.textContent).toContain(user.email);
  fireEvent.keyDown(menu, { key: "Escape" });
  expect(screen.queryByRole("group", { name: "Account" })).toBeNull();
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(lock).toHaveBeenCalled());
  expect(refreshUser).toHaveBeenCalled();
});

it("from an adult's book: the account panel, with local books and privacy but no list of books", async () => {
  const onLocal = vi.fn();
  render(
    createElement(AccountLibrary, {
      sync: {
        user,
        books: [{ id: "kid", label: "Ella", accountManaged: true }],
        refresh: vi.fn().mockResolvedValue([]),
      },
      vault: {
        mode: "open",
        book: { ...emptyBook("Scott"), profile: { kind: "adult" } },
        editionId: "test",
      },
      onClose: vi.fn(),
      onLocal,
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  expect(
    screen.getByRole("heading", { level: 2, name: "Account" }),
  ).toBeTruthy();
  expect(screen.getByText(user.email)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Ella’s journal/ })).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.getByRole("link", { name: "Privacy details" })).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Open a local journal or restore a backup" }),
  );
  expect(onLocal).toHaveBeenCalled();
});

it("opens an older book from Family straight onto its passphrase form", async () => {
  const old = { id: "old", label: "Iris" };
  const close = vi.fn();
  const sync = {
    user,
    books: [old],
    refresh: vi.fn().mockResolvedValue([]),
    open: vi.fn().mockResolvedValue(undefined),
  };
  render(
    createElement(AccountLibrary, {
      sync,
      vault: {
        mode: "open",
        book: { ...emptyBook("Scott"), profile: { kind: "adult" } },
        editionId: "test",
      },
      onClose: close,
      opening: old,
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  expect(
    screen.getByRole("heading", { name: "Open Iris’s earlier journal" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Original journal passphrase"), {
    target: { value: "original passphrase" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open journal" }));
  await waitFor(() =>
    expect(sync.open).toHaveBeenCalledWith(old, "original passphrase"),
  );
  await waitFor(() => expect(close).toHaveBeenCalled());
});
it("keeps child-profile details and consent in child setup", async () => {
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Create a child’s journal" }),
  );
  expect(screen.getByText(/no child email or password/)).toBeTruthy();
  expect(
    screen.getByLabelText(/I’m their parent or guardian/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByText(/no child email or password/)).toBeNull();
});
