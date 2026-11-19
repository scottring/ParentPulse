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

import { openBook } from "./bookHarness";
export { openBook };
/** Book, then Our family in the switch at the top. */
const ourFamily = () => {
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Whose pages" })).getByRole("button", { name: "Our family" }),
  );
};

it("opens on Home with one suggestion, another on request, and time tiles", () => {
  openBook();
  expect(
    screen.getByRole("heading", { name: "Hi Robin. Here’s one small thing." }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
  ).toBe("page");
  const region = screen.getByRole("region", { name: "Today’s suggestion" });
  const first = region.textContent;
  fireEvent.click(screen.getByRole("button", { name: "Show me another" }));
  expect(region.textContent).not.toBe(first);
  for (const name of [/1 minute/, /5 minutes/, /With the kids/, /Something’s hard/])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /With the kids/ }));
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
  expect(
    screen.getByRole("button", { name: "Book" }).getAttribute("aria-current"),
  ).toBe("page");
});

it("shows the family’s books as people and opens one", () => {
  const onOpen = vi.fn();
  openBook(undefined, { family: [{ id: "b1", name: "Ella", onOpen }] });
  fireEvent.click(screen.getByRole("button", { name: "Ella" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

it("falls back to family noted in the book when there are no account books", () => {
  openBook(sampleBook(), { mode: "sample" });
  expect(screen.getByRole("button", { name: "Leo" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Invite a partner" })).toBeNull();
});

it("Your book: reviews one suggestion at a time and filters by person", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  expect(screen.getByRole("heading", { name: "Your book", level: 1 })).toBeTruthy();
  expect(screen.getByText("A little room to talk")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Yes, keep it" }));
  await screen.findByText(/Try: If you both feel like it/);
  expect(app.stored().manual?.cards[0].status).toBe("kept");
  expect(screen.queryByRole("button", { name: "Yes, keep it" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Leo" }));
  expect(
    screen.getByText("Getting down to his eye level changes the whole conversation."),
  ).toBeTruthy();
  expect(screen.queryByText(/An unhurried walk/)).toBeNull();
  expect(screen.getByRole("button", { name: /Leaving the playground was hard/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /We went for a walk/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Everyone" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a page" }), {
    target: { value: "spaceship" },
  });
  const found = screen.getByRole("button", { name: /The blanket-fort expedition/ });
  expect(screen.queryByRole("button", { name: /Leaving the playground/ })).toBeNull();
  fireEvent.click(found);
  expect(screen.getByRole("button", { name: /Back to your book/ })).toBeTruthy();
});

it("Your book: unfinished drafts are under Still going", () => {
  const draft = { ...newJournalDraft(), title: "Half a thought", text: "and then" };
  const book = writeJournalPage(
    { ...emptyBook("Robin"), profile: { kind: "adult" } },
    draft,
    0,
    "draft",
  );
  openBook(book);
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  fireEvent.click(screen.getByRole("button", { name: /Keep writing: Half a thought/ }));
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
    family: [{ id: "b1", name: "Ella", onOpen: vi.fn(), note: "Book in your account" }],
  });
  ourFamily();
  expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy();
  // Family members: your own book first, then account books, then invitations.
  fireEvent.click(screen.getByRole("button", { name: "Family members" }));
  const members = screen.getByRole("dialog", { name: "Family members" });
  const mine = within(members).getByRole("button", { name: "Open my book" });
  const ella = within(members).getByRole("button", { name: "Open Ella’s book" });
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
  expect(screen.queryByRole("dialog", { name: "Family members" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Family members" }));
  // Pages passed between partners and kept game pages are both here.
  expect(screen.getByText("A note from Sam")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Our story/ }));
  expect(screen.getAllByText("A fox in yellow boots.").length).toBeGreaterThan(0);
  expect(screen.getByRole("dialog", { name: "Our story" })).toBeTruthy();
  // A game page wasn't added by this writer to the family book: no take-out.
  expect(screen.queryByRole("button", { name: "Take out of the family book" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(app.lock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Family members" }));
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
  // Kids can read and add to the family book, but invite no one.
  expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Family members" }));
  expect(screen.queryByRole("button", { name: /Invite a partner/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Add a child/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Open .*’s book/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Open my book" })).toBeTruthy();
  // Inviting a friend to start their own Relish is open to everyone.
  expect(screen.getByRole("button", { name: /Invite a friend/ })).toBeTruthy();
});

it("Invite a friend copies the link where there's no share sheet", async () => {
  openBook();
  ourFamily();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  fireEvent.click(screen.getByRole("button", { name: "Family members" }));
  fireEvent.click(screen.getByRole("button", { name: /Invite a friend/ }));
  expect(await screen.findByText(/Invite link copied/)).toBeTruthy();
  expect(writeText.mock.calls[0][0]).toContain("https://app.relish.my/");
});
