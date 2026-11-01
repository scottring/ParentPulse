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
function mount(overrides = {}) {
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
    } as unknown as Parameters<typeof AccountLibrary>[0]),
  );
  return { sync, close };
}
beforeEach(() => {
  auth.gate = null;
  vi.clearAllMocks();
});
afterEach(cleanup);
it("creates a child inside the signed-in parent library without child credentials", async () => {
  const { sync, close } = mount();
  fireEvent.click(screen.getByRole("button", { name: "Add a child" }));
  fireEvent.change(screen.getByLabelText("Child’s name"), {
    target: { value: "Robin" },
  });
  fireEvent.change(screen.getByLabelText("Age range"), {
    target: { value: "9-12" },
  });
  const create = screen.getByRole("button", { name: "Create & open book" });
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
it("opens an account book with one click and no book passphrase", async () => {
  const head = { id: "fictional", label: "Robin", accountManaged: true };
  const { sync } = mount({ books: [head] });
  fireEvent.click(screen.getByRole("button", { name: /Robin/ }));
  await waitFor(() => expect(sync.open).toHaveBeenCalledWith(head));
  expect(screen.queryByLabelText(/passphrase/i)).toBeNull();
});
it("keeps the family library behind the parent gate after a child-view reload", async () => {
  auth.gate = { accountUid: "parent-one" };
  auth.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { sync } = mount({
    books: [
      { id: "private", label: "Parent private book", accountManaged: true },
    ],
  });
  expect(screen.queryByText("Parent private book")).toBeNull();
  expect(sync.refresh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "incorrect" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open family library" }));
  await screen.findByRole("alert");
  expect(sync.refresh).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Parent account password"), {
    target: { value: "parent password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open family library" }));
  await screen.findByText("Parent private book");
  expect(auth.clear).toHaveBeenCalledWith(null);
  expect(sync.refresh).toHaveBeenCalledTimes(1);
});
it("keeps original passphrase protection for an earlier synced book", async () => {
  const head = { id: "old", label: "Earlier Robin" };
  const { sync } = mount({ books: [head] });
  fireEvent.click(screen.getByRole("button", { name: /Earlier Robin/ }));
  await screen.findByLabelText("Original book passphrase");
  expect(sync.open).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Original book passphrase"), {
    target: { value: "original passphrase" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open book" }));
  await waitFor(() =>
    expect(sync.open).toHaveBeenCalledWith(head, "original passphrase"),
  );
});
