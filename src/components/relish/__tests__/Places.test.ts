// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { writeJournalPage, newJournalDraft } from "@/lib/relish/journal";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);

import { familyJournal, myJournal, openBook } from "./bookHarness";
export { openBook };
const ourFamily = familyJournal;
const journalTab = () =>
  within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name: /^Journal/ });

it("opens on Home with a welcome and four things to do", () => {
  openBook();
  expect(screen.getByRole("heading", { level: 1, name: /^Welcome/ })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
  ).toBe("page");
  const todo = screen.getByRole("region", { name: "What would you like to do?" });
  fireEvent.click(within(todo).getByRole("button", { name: "Do an activity" }));
  expect(
    screen
      .getByRole("button", { name: "Activities" })
      .getAttribute("aria-current"),
  ).toBe("page");
});

it("lists the latest kept pages and opens one in the reader", () => {
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    { ...newJournalDraft(), title: "Pancakes at dawn", text: "We flipped them high." },
    0,
    "kept",
  );
  openBook(book);
  fireEvent.click(screen.getByRole("button", { name: /Pancakes at dawn/ }));
  expect(screen.getByText("We flipped them high.")).toBeTruthy();
  expect(journalTab().getAttribute("aria-current")).toBe("page");
});

it("Read about our family opens Our family journal", () => {
  openBook(sampleBook(), { mode: "sample" });
  const todo = screen.getByRole("region", { name: "What would you like to do?" });
  expect(within(todo).getByText("The family journal, newest first")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite a partner" })).toBeNull();
  fireEvent.click(within(todo).getByRole("button", { name: "Read about our family" }));
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  expect(journalTab().getAttribute("aria-current")).toBe("page");
});

it("My journal: reviews one suggestion at a time and filters by person", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  // Relish noticed sits beside the stream (2026-11-22), one suggestion at a time.
  const noticed = () => within(screen.getByRole("region", { name: "Relish noticed" }));
  expect(noticed().getByText("A little room to talk")).toBeTruthy();
  fireEvent.click(noticed().getByRole("button", { name: "Keep it" }));
  await screen.findByText(/Try: If you both feel like it/);
  expect(app.stored().manual?.cards[0].status).toBe("kept");
  expect(screen.queryByRole("region", { name: "Relish noticed" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Leo" }));
  expect(
    screen.getByText("Getting down to his eye level changes the whole conversation."),
  ).toBeTruthy();
  expect(screen.queryByText(/An unhurried walk/)).toBeNull();
  expect(screen.getByRole("button", { name: /Leaving the playground was hard/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /We went for a walk/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Everything" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Find an entry" }), {
    target: { value: "spaceship" },
  });
  const found = screen.getByRole("button", { name: /The blanket-fort expedition/ });
  expect(screen.queryByRole("button", { name: /Leaving the playground/ })).toBeNull();
  fireEvent.click(found);
  expect(screen.getByRole("button", { name: /Back to the journal/ })).toBeTruthy();
});

it("My journal: an unfinished draft comes first, with Keep writing", () => {
  const draft = { ...newJournalDraft(), title: "Half a thought", text: "and then" };
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    draft,
    0,
    "draft",
  );
  openBook(book);
  myJournal();
  const entries = screen.getByRole("list");
  expect(within(entries).getAllByRole("listitem")[0].textContent).toContain("Half a thought");
  fireEvent.click(screen.getByRole("button", { name: "Half a thought: Keep writing" }));
  expect(
    (screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement)
      .value,
  ).toBe("and then");
});

it("Our family: members, pages passed between you, and kept game pages, without locking", () => {
  const base: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
  const book: Book = {
    ...base,
    connections: {
      received: [
        {
          id: "p1",
          title: "A note from Sam",
          text: "Thanks for Tuesday.",
          from: "uid-sam",
          fromName: "Sam",
          createdAt: "2026-11-01T00:00:00Z",
          acceptedAt: "2026-11-02T00:00:00Z",
        },
      ],
    },
    living: {
      version: 1,
      entries: [],
      sharedPages: [
        {
          id: "g1",
          kind: "story",
          title: "Our story",
          text: "A fox in yellow boots.",
          players: [
            { id: "a", name: "Robin" },
            { id: "b", name: "Ella" },
          ],
          approvedBy: ["a", "b"],
          createdAt: "2026-11-03T00:00:00Z",
        },
      ],
    },
  };
  const app = openBook(book, {
    family: [{ id: "b1", name: "Ella", onOpen: vi.fn(), note: "Journal in your account" }],
  });
  ourFamily();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  // Who's in our family: your own journal first, then account journals, then invitations.
  fireEvent.click(screen.getByRole("button", { name: "Who’s in our family" }));
  const members = screen.getByRole("dialog", { name: "Who’s in our family" });
  const mine = within(members).getByRole("button", { name: "See just my pages" });
  const ella = within(members).getByRole("button", { name: "Open Ella’s journal" });
  expect(
    mine.compareDocumentPosition(ella) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    ella.closest("li")?.querySelector("[data-illustration]")?.getAttribute("data-illustration"),
  ).toBe("emblem-star");
  const invite = within(members).getByRole("button", { name: /Invite a partner/ });
  expect(
    ella.compareDocumentPosition(invite) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // Escape closes it and puts focus back on the link.
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Who’s in our family" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Who’s in our family" }));
  // Pages passed between partners and kept game pages are both here.
  expect(screen.getByText("A note from Sam")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Our story/ }));
  expect(screen.getAllByText("A fox in yellow boots.").length).toBeGreaterThan(0);
  expect(screen.getByRole("dialog", { name: "Our story" })).toBeTruthy();
  // A game page wasn't added by this writer to the family journal: no take-out.
  expect(screen.queryByRole("button", { name: "Take out of the family journal" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(app.lock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Who’s in our family" }));
  fireEvent.click(screen.getByRole("button", { name: /Invite a partner/ }));
  expect(screen.getByRole("dialog", { name: "Invite a partner" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "Invite a partner" })).toBeNull();
});

it("Our family in a child's book offers no invitations or other books", () => {
  openBook({
    ...emptyBook("Ella"),
    profile: { kind: "child", ageBand: "6-8", parentLock: { accountUid: "parent" } },
  });
  ourFamily();
  // Kids read and add to the family journal in their own, but invite no one.
  expect(screen.getByRole("heading", { name: "Ella’s journal", level: 1 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 2 })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add to our family journal" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Who’s in our family" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Invite a partner/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Add a child/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Open .*’s journal/ })).toBeNull();
});

it("Invite a friend copies the link where there's no share sheet", async () => {
  openBook();
  ourFamily();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Who’s in our family" }));
  fireEvent.click(screen.getByRole("button", { name: /Invite a friend/ }));
  expect(await screen.findByText(/Invite link copied/)).toBeTruthy();
  expect(writeText.mock.calls[0][0]).toContain("https://app.relish.my/");
});
