// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { newJournalDraft, writeJournalPage } from "@/lib/relish/journal";
import { openBook } from "./bookHarness";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);
// happy-dom has no CSS.escape
if (!globalThis.CSS) Object.defineProperty(globalThis, "CSS", { value: { escape: (s: string) => s }, configurable: true });

const adult = (): Book => ({
  ...emptyBook("Robin"),
  profile: { kind: "adult" },
  people: [{ id: "kaleb", name: "Kaleb", role: "Son", color: "ochre", note: "", lessons: [] }],
});
const kid = (): Book => ({
  ...emptyBook("Kaleb"),
  profile: { kind: "child", ageBand: "9-12", parentLock: { accountUid: "parent-uid" } },
});
const place = (name: string) =>
  fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name }));

it("+ Add a page opens the composer directly; Give me an idea goes to the catalog", async () => {
  openBook(sampleBook());
  place("Book");
  fireEvent.click(screen.getByRole("button", { name: "+ Add a page" }));
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBeTruthy();
  place("Book");
  fireEvent.click(await screen.findByRole("button", { name: "Give me an idea" }));
  expect(screen.getByRole("heading", { name: "What feels right?" })).toBeTruthy();
});

it("a genuinely empty adult book gets one invitation", () => {
  openBook(adult());
  place("Book");
  expect(screen.getByText(/Nothing kept yet/)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Still going" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "What you’ve learned" })).toBeNull();
});

it("a kept exercise opens its own page, even beside an older one with the same title", async () => {
  const older = writeJournalPage(
    adult(),
    { ...newJournalDraft(), title: "What helps when I’m upset", text: "THE OLDER PAGE" },
    0,
    "kept",
  );
  openBook(older);
  place("Activities");
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  fireEvent.click(screen.getByRole("button", { name: /Start this exercise/ }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Talking it through" })).getByRole("button", {
      name: "Helps me",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByRole("heading", { name: "Kept in your book" });
  fireEvent.click(screen.getByRole("button", { name: /Open this page/ }));
  const page = document.querySelector(".rj-sequence-paper")!;
  expect(page.textContent).toContain("Talking it through");
  expect(page.textContent).not.toContain("THE OLDER PAGE");
});

it("Back from a page restores the person filter and the search", () => {
  openBook(sampleBook());
  place("Book");
  fireEvent.click(screen.getByRole("button", { name: "Leo", pressed: false }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "blanket" } });
  fireEvent.click(screen.getByRole("button", { name: /The blanket-fort expedition/ }));
  fireEvent.click(screen.getByRole("button", { name: /Back to your book/ }));
  expect(screen.getByRole("button", { name: "Leo" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("blanket");
  expect(document.activeElement?.getAttribute("data-page-id")).toBe("journal:sample-story");
  // Choosing the tab starts a fresh browse.
  place("Book");
  expect(screen.getByRole("button", { name: "Everyone" }).getAttribute("aria-pressed")).toBe("true");
});

it("a child's first visit to Your book is their own book with one way to start", () => {
  openBook(kid());
  place("Book");
  expect(screen.getByRole("heading", { name: "Kaleb’s book", level: 1 })).toBeTruthy();
  expect(screen.getByText("What would you like to keep?")).toBeTruthy();
  expect(screen.queryByText("What you’ve learned")).toBeNull();
  expect(screen.queryByText(/Relish noticed/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "+ Make a page" }));
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBeTruthy();
});

it("a child's draft offers Keep going without hiding kept pages", () => {
  let book = writeJournalPage(kid(), { ...newJournalDraft(), title: "My first page", text: "KEPT WORDS" }, 0, "kept");
  book = writeJournalPage(book, { ...newJournalDraft(), title: "Still writing", text: "DRAFT WORDS" }, 0, "draft");
  openBook(book);
  place("Book");
  expect(screen.getByRole("button", { name: "Keep going" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /My first page/ })).toBeTruthy();
});

it("Repair bingo with someone survives leaving, and its page opens over an older same-titled one", async () => {
  const older = writeJournalPage(
    adult(),
    { ...newJournalDraft(), title: "Repair bingo · Kaleb", text: "THE OLDER BINGO" },
    0,
    "kept",
  );
  openBook(older);
  place("Activities");
  fireEvent.click(screen.getByRole("button", { name: /Repair bingo/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Kaleb" }));
  fireEvent.click(screen.getByRole("button", { name: /Start bingo/ }));
  const squares = () => document.querySelectorAll<HTMLButtonElement>(".rt-bingo button");
  await vi.waitFor(() => expect(squares().length).toBe(9));
  // The start is still saving for a moment; a mark lands once it has.
  const mark = (i: number) =>
    vi.waitFor(() => {
      if (squares()[i].getAttribute("aria-pressed") !== "true") fireEvent.click(squares()[i]);
      expect(squares()[i].getAttribute("aria-pressed")).toBe("true");
    });
  await mark(0);
  await mark(4);
  await vi.waitFor(() => {
    fireEvent.click(screen.getByRole("button", { name: /Back to Activities/ }));
    expect(screen.getByRole("heading", { name: "What feels right?" })).toBeTruthy();
  });
  fireEvent.click(screen.getByRole("button", { name: /Repair bingo/ }));
  await vi.waitFor(() => expect(document.querySelectorAll('.rt-bingo button[aria-pressed="true"]').length).toBe(2));
  fireEvent.click(screen.getByRole("button", { name: /Activity options/ }));
  fireEvent.click(screen.getByRole("button", { name: /Finish and keep a page/ }));
  await screen.findByRole("heading", { name: "Kept in your book" });
  fireEvent.click(screen.getByRole("button", { name: /Open this page/ }));
  const page = document.querySelector(".rj-sequence-paper")!;
  expect(page.textContent).toContain("Repair bingo · Kaleb");
  expect(page.textContent).not.toContain("THE OLDER BINGO");
});
