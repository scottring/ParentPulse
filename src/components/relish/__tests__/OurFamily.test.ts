// @vitest-environment happy-dom
// Home · Journal ▾ · Activities on one device (2026-11-21): the Journal menu,
// the phone's Mine / Family switch, each journal's audience, and family pages
// kept inside a book that has no account.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { Window } from "happy-dom";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { familyJournal, myJournal, openBook } from "./bookHarness";
import { PHONE_QUERY } from "../TopBar";
import { newJournalDraft, writeJournalPage } from "@/lib/relish/journal";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);
if (!globalThis.CSS)
  Object.defineProperty(globalThis, "CSS", { value: { escape: (s: string) => s }, configurable: true });

const adult = (): Book => ({
  ...emptyBook("Robin"),
  profile: { kind: "adult" },
  people: [{ id: "k", name: "Kaleb", role: "Son", color: "ochre", note: "", lessons: [] }],
});
const tab = (name: string) =>
  fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name }));
const journalTab = () =>
  within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name: /^Journal/ });
/** A phone-width screen: Journal opens the journal page, no dropdown. */
function asPhone() {
  const real = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (q: string) => ({ matches: q === PHONE_QUERY, media: q, addEventListener() {}, removeEventListener() {} }),
  });
  return () => Object.defineProperty(window, "matchMedia", { configurable: true, value: real });
}

it("has three places, and Journal is a menu: My journal, Our family journal, then kids' journals", () => {
  const openElla = vi.fn();
  openBook(adult(), {
    family: [{ id: "b1", name: "Ella", onOpen: openElla, note: "Journal in your account" }],
  });
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual([
    "Home",
    "Journal",
    "Activities",
  ]);
  expect(screen.queryByRole("group", { name: "Whose pages" })).toBeNull();
  expect(journalTab().getAttribute("aria-haspopup")).toBe("menu");
  expect(journalTab().getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(journalTab());
  const menu = screen.getByRole("menu", { name: "Journals" });
  expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
    "My journalOnly me",
    "Our family journalEveryone in the family",
    "Ella’s journal",
  ]);
  expect(within(menu).getByText("Kids’ journals")).toBeTruthy();
  // Escape closes it and puts focus back on Journal.
  fireEvent.keyDown(menu, { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(journalTab());
  // Keyboard: ArrowDown opens it on the first item; arrows move between items.
  fireEvent.keyDown(journalTab(), { key: "ArrowDown" });
  const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
  expect(document.activeElement).toBe(items[0]);
  fireEvent.keyDown(items[0], { key: "ArrowDown" });
  expect(document.activeElement).toBe(items[1]);
  fireEvent.keyDown(items[1], { key: "ArrowUp" });
  fireEvent.keyDown(items[0], { key: "ArrowUp" });
  expect(document.activeElement).toBe(items[2]);
  // A kid's journal opens their own view.
  fireEvent.click(items[2]);
  expect(openElla).toHaveBeenCalledOnce();
  // My journal and Our family journal, each marked as the open one.
  myJournal();
  expect(screen.getByRole("heading", { name: "My journal", level: 1 })).toBeTruthy();
  expect(journalTab().getAttribute("aria-current")).toBe("page");
  fireEvent.click(journalTab());
  expect(screen.getByRole("menuitem", { name: /^My journal/ }).getAttribute("aria-current")).toBe("page");
  fireEvent.click(screen.getByRole("menuitem", { name: /^Our family journal/ }));
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  expect(localStorage.getItem("relish.space.v1:places-test")).toBe("family");
  // Honest about where the pages are kept without an account.
  expect(screen.getByText(/isn’t in an account, so family entries are kept/)).toBeTruthy();
});

it("on a phone, Journal opens the last journal with a Mine / Family switch it remembers, and kids' journals below", () => {
  const restore = asPhone();
  try {
    const openElla = vi.fn();
    openBook(adult(), { family: [{ id: "b1", name: "Ella", onOpen: openElla }] });
    tab("Journal");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("heading", { name: "My journal", level: 1 })).toBeTruthy();
    const which = () => within(screen.getByRole("group", { name: "Which journal" }));
    expect(which().getByRole("button", { name: "Mine" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(which().getByRole("button", { name: "Family" }));
    expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
    expect(localStorage.getItem("relish.space.v1:places-test")).toBe("family");
    // Home, then Journal again: still Our family journal.
    tab("Home");
    tab("Journal");
    expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
    expect(which().getByRole("button", { name: "Family" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ella’s journal" }));
    expect(openElla).toHaveBeenCalledOnce();
  } finally {
    restore();
  }
});

it("works without storage: the phone switch still changes journals for this visit", () => {
  const restore = asPhone();
  const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  try {
    openBook(adult());
    tab("Journal");
    const which = () => within(screen.getByRole("group", { name: "Which journal" }));
    fireEvent.click(which().getByRole("button", { name: "Family" }));
    expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
    fireEvent.click(which().getByRole("button", { name: "Mine" }));
    expect(screen.getByRole("heading", { name: "My journal", level: 1 })).toBeTruthy();
  } finally {
    spy.mockRestore();
    restore();
  }
});

it("each journal names its audience; Add to our family journal keeps a copy and adds the whole page", async () => {
  const app = openBook(adult());
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  expect(screen.getByText("Only me")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save to my journal" })).toBeTruthy();
  // The facing page is hidden until asked for.
  expect(screen.queryByRole("complementary", { name: "Previous entry" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Previous entry" }));
  expect(screen.getByRole("complementary", { name: "Previous entry" })).toBeTruthy();
  familyJournal();
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Add to our family journal" }));
  await screen.findByText(/puts the whole entry in\s+Our family journal/);
  expect(screen.getByText("Our family journal", { selector: ".rj-audience" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "First snow" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), {
    target: { value: "Kaleb made a snow cat." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add to our family journal" }));
  await screen.findByText("Entry saved");
  // A copy in Robin's own journal, and the whole page in the family pages.
  expect(app.stored().journal?.[0]).toMatchObject({ status: "kept", title: "First snow", audience: "family" });
  expect(app.stored().familyPages).toMatchObject([
    { kind: "page", title: "First snow", text: "Kaleb made a snow cat.", byName: "Robin" },
  ]);
  familyJournal();
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: /First snow/ }));
  fireEvent.click(screen.getByRole("button", { name: "Take out of the family journal" }));
  await waitFor(() => expect(app.stored().familyPages).toEqual([]));
  // Still in Robin's own journal.
  expect(app.stored().journal).toHaveLength(1);
});

it("a private draft never reaches the family journal by navigation alone", async () => {
  const draft = { ...newJournalDraft(), title: "Only for me", text: "PRIVATE DRAFT WORDS" };
  const app = openBook(writeJournalPage(adult(), draft, 0, "draft"));
  // Not on the family journal's page.
  familyJournal();
  expect(screen.queryByText(/PRIVATE DRAFT WORDS|Only for me/)).toBeNull();
  // Add to our family journal starts a fresh family page, not the private draft.
  fireEvent.click(screen.getByRole("button", { name: "Add to our family journal" }));
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  expect(body.value).toBe("");
  // Opening the private draft from anywhere keeps it Only me.
  myJournal();
  fireEvent.click(await screen.findByRole("button", { name: "Only for me: Keep writing" }));
  expect((screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value).toBe(
    "PRIVATE DRAFT WORDS",
  );
  expect(screen.getByText("Only me", { selector: ".rj-audience" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add to our family journal" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save to my journal" }));
  await screen.findByText("Entry saved");
  const kept = app.stored().journal!.find((e) => e.id === draft.id)!;
  expect(kept.status).toBe("kept");
  expect(kept.audience).toBeUndefined();
  expect(app.stored().familyPages ?? []).toEqual([]);
  // Home labels it Only me, never Family journal.
  tab("Home");
  const lately = within(screen.getByRole("region", { name: "Lately" }));
  const row = lately.getByText("Only for me").closest(".ha-row")!;
  expect(row.textContent).toMatch(/Only me · kept/);
  expect(row.textContent).not.toMatch(/Family journal/);
});

it("Home's Lately labels each item Only me or Family journal", () => {
  openBook(sampleBook(), { mode: "sample" });
  const lately = within(screen.getByRole("region", { name: "Lately" }));
  // The family's newest passage leads, on butter paper.
  const passage = document.querySelector(".ha-passage")!;
  expect(passage.textContent).toMatch(/^Family journal/);
  expect(passage.textContent).toMatch(/hold your hand/);
  // Both journals have rows, each saying whose.
  const kinds = Array.from(document.querySelectorAll(".ha-lately .ha-row .ha-whose")).map((w) => w.textContent);
  expect(kinds.some((k) => k?.startsWith("Only me"))).toBe(true);
  expect(kinds.some((k) => k === "Family journal")).toBe(true);
  expect(lately.getByText("The blanket-fort expedition").closest(".ha-row")!.textContent).toMatch(/Only me · kept/);
  expect(lately.getByText("The drive to Grandma June’s").closest(".ha-row")!.textContent).toMatch(/Family journal/);
});

it("Share a passage suggests the selected words, keeps the draft, and shares only the passage", async () => {
  const app = openBook(adult());
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: "A long day.\n\nThe best bit: pancakes at dawn." } });
  body.setSelectionRange(body.value.indexOf("pancakes"), body.value.length - 1);
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).getByText("Kaleb will see this in Our family journal.")).toBeTruthy();
  expect(within(sheet).getByText("pancakes at dawn")).toBeTruthy();
  // Keyboard: Escape closes it.
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Share with our family" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Change passage" }));
  fireEvent.change(screen.getByLabelText("Only these words"), { target: { value: "A long day." } });
  fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
  expect(screen.getByRole("button", { name: "Add page to family journal" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Add passage to family journal" }));
  await waitFor(() => expect(app.stored().familyPages).toHaveLength(1));
  expect(app.stored().familyPages![0]).toMatchObject({ kind: "passage", text: "A long day.", byName: "Robin" });
  // Nobody tagged or named in it: no caption is guessed.
  expect(app.stored().familyPages![0]).not.toHaveProperty("caption");
  // The entry itself was saved first and stays a private draft.
  expect(app.stored().journal?.[0]).toMatchObject({ status: "draft" });
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBeTruthy();
});

it("the sample shows its own fictional family pages, a featured page and a kept passage", () => {
  openBook(sampleBook(), { mode: "sample" });
  familyJournal();
  expect(screen.getByText(/6 entries since September/)).toBeTruthy();
  // The cloth cover carries the one way to write here.
  expect(screen.getByRole("button", { name: "Add to our family journal" })).toBeTruthy();
  const grid = screen.getByRole("list", { name: "Entries in Our family journal" });
  const cells = within(grid).getAllByRole("listitem");
  // The newest passage leads on butter paper, beside the newest painted entry.
  expect(cells[0].className).toContain("rp-fb-quote-cell");
  expect(cells[0].textContent).toMatch(/hold your hand/);
  expect(cells[1].className).toContain("rp-fb-featured");
  expect(cells[1].querySelector("[data-illustration]")).toBeTruthy();
  // Chips filter by who's in a page; search reads titles and words.
  fireEvent.click(within(screen.getByRole("group", { name: "Show pages from" })).getByRole("button", { name: "June" }));
  expect(within(grid).getAllByRole("listitem").map((c) => c.textContent)).toEqual([
    expect.stringMatching(/tomatoes/),
    expect.stringMatching(/drive to Grandma June/),
  ]);
  fireEvent.click(within(screen.getByRole("group", { name: "Show pages from" })).getByRole("button", { name: "Everyone" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Find something you kept" }), { target: { value: "tooth" } });
  expect(within(grid).getAllByRole("listitem")).toHaveLength(1);
});

it("Activities' Together filter has shelves of things to do together", () => {
  openBook(adult());
  tab("Activities");
  fireEvent.click(within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name: "Together" }));
  const dinner = screen.getByRole("list", { name: "At dinner" });
  const first = within(dinner).getAllByRole("button")[0];
  expect(first.textContent).toMatch(/^Same page\?: Play Same page\?$/);
  expect(screen.getByRole("list", { name: "In the car" })).toBeTruthy();
});

it("Save draft and close returns to the journal the draft belongs to, and it stays there", async () => {
  const app = openBook(adult());
  familyJournal();
  fireEvent.click(screen.getByRole("button", { name: "Add to our family journal" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), {
    target: { value: "Half a family page" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft and close" }));
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
  expect(app.stored().journal?.[0]).toMatchObject({ status: "draft", audience: "family" });
  expect(app.stored().familyPages ?? []).toEqual([]);
  // My journal shows it as a draft for the family journal; Write today's
  // entry there starts a private page instead of resuming it.
  myJournal();
  expect(screen.getByText("Draft for our family journal")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  expect((screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value).toBe("");
  expect(screen.getByRole("button", { name: "Save to my journal" })).toBeTruthy();
  // Back in Our family journal, its button resumes the family draft.
  familyJournal();
  fireEvent.click(await screen.findByRole("button", { name: "Add to our family journal" }));
  expect((screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value).toBe(
    "Half a family page",
  );
});
