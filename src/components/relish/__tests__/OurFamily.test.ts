// @vitest-environment happy-dom
// Home · Journal · Activities on one device: one journal with the family's
// spine and your branches (2026-11-22), the Journal menu of kids' journals,
// each page's audience, and family pages kept inside a book with no account.
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

it("has three places; with kids' journals, Journal is a menu: the one journal, then theirs", () => {
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
    "Our family journalThe family’s pages, and yours",
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
  expect(document.activeElement).toBe(items[1]);
  // A kid's journal opens their own view.
  fireEvent.click(items[1]);
  expect(openElla).toHaveBeenCalledOnce();
  // The one journal, marked as the open one.
  myJournal();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  expect(journalTab().getAttribute("aria-current")).toBe("page");
  fireEvent.click(journalTab());
  expect(screen.getByRole("menuitem", { name: /^Our family journal/ }).getAttribute("aria-current")).toBe("page");
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  // Honest about where the pages are kept without an account.
  expect(screen.getByText(/isn’t in an account, so family entries are kept/)).toBeTruthy();
});

it("without kids' journals, Journal is a plain tab onto the one journal", () => {
  openBook(adult());
  expect(journalTab().getAttribute("aria-haspopup")).toBeNull();
  tab("Journal");
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
});

it("on a phone, Journal opens the one journal, with no Mine / Family switch, and kids' journals below", () => {
  const restore = asPhone();
  try {
    const openElla = vi.fn();
    openBook(adult(), { family: [{ id: "b1", name: "Ella", onOpen: openElla }] });
    tab("Journal");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Which journal" })).toBeNull();
    // Filters over the one journal instead.
    const show = within(screen.getByRole("group", { name: "Show" }));
    expect(show.getByRole("button", { name: "Everything" }).getAttribute("aria-pressed")).toBe("true");
    expect(show.getByRole("button", { name: "Family" })).toBeTruthy();
    expect(show.getByRole("button", { name: "Just me" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ella’s journal" }));
    expect(openElla).toHaveBeenCalledOnce();
  } finally {
    restore();
  }
});

it("each journal names its audience; Add to our family journal keeps a copy and adds the whole page", async () => {
  const app = openBook(adult());
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  expect(screen.getByText("Only you")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save privately" })).toBeTruthy();
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
  // Opening the private draft from anywhere keeps it Only you.
  myJournal();
  fireEvent.click(await screen.findByRole("button", { name: "Only for me: Keep writing" }));
  expect((screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value).toBe(
    "PRIVATE DRAFT WORDS",
  );
  expect(screen.getByText("Only you", { selector: ".rj-audience" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add to our family journal" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save privately" }));
  await screen.findByText("Entry saved");
  const kept = app.stored().journal!.find((e) => e.id === draft.id)!;
  expect(kept.status).toBe("kept");
  expect(kept.audience).toBeUndefined();
  expect(app.stored().familyPages ?? []).toEqual([]);
  // Home labels it Only you, never Everyone.
  tab("Home");
  const lately = within(screen.getByRole("region", { name: "Lately" }));
  const row = lately.getByText("Only for me").closest(".ha-row")!;
  expect(row.textContent).toMatch(/Only you · kept/);
  expect(row.textContent).not.toMatch(/Everyone/);
});

it("Home's Lately labels each item with who can see it, as the journal does", () => {
  openBook(sampleBook(), { mode: "sample" });
  const lately = within(screen.getByRole("region", { name: "Lately" }));
  // The family's newest passage leads, on butter paper.
  const passage = document.querySelector(".ha-passage")!;
  expect(passage.textContent).toMatch(/^Everyone/);
  expect(passage.textContent).toMatch(/hold your hand/);
  // Rows from the spine and from branches, each saying who can see it.
  const kinds = Array.from(document.querySelectorAll(".ha-lately .ha-row .ha-whose")).map((w) => w.textContent);
  expect(kinds.some((k) => k?.startsWith("Only you"))).toBe(true);
  expect(kinds.some((k) => k === "Everyone")).toBe(true);
  expect(kinds.some((k) => /Only me|Family journal/.test(k || ""))).toBe(false);
  expect(lately.getByText("The blanket-fort expedition").closest(".ha-row")!.textContent).toMatch(/Only you · kept/);
  expect(lately.getByText("The drive to Grandma June’s").closest(".ha-row")!.textContent).toMatch(/Everyone/);
  // A round played with Anna says so, like its branch in the journal.
  expect(lately.getByText("Same page? with Anna", { selector: ".ha-row-title" }).closest(".ha-row")!.textContent).toMatch(/You and Anna · played/);
});

it("Share opens on the whole page; Just a passage suggests the selected words, keeps the draft, and shares only the passage", async () => {
  const app = openBook(adult());
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: "A long day.\n\nThe best bit: pancakes at dawn." } });
  body.setSelectionRange(body.value.indexOf("pancakes"), body.value.length - 1);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).getByText("Kaleb will see this in Our family journal.")).toBeTruthy();
  // It opens on the whole page; Just a passage is the second choice.
  expect(within(sheet).getByRole("button", { name: "Whole page" }).getAttribute("aria-pressed")).toBe("true");
  expect(within(sheet).getByRole("button", { name: "Add the whole entry to our family journal" })).toBeTruthy();
  fireEvent.click(within(sheet).getByRole("button", { name: "Just a passage" }));
  expect(within(sheet).getByText("pancakes at dawn")).toBeTruthy();
  // Keyboard: Escape closes it.
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Share with our family" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  fireEvent.click(screen.getByRole("button", { name: "Just a passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Change passage" }));
  fireEvent.change(screen.getByLabelText("Only these words"), { target: { value: "A long day." } });
  fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
  expect(screen.getByRole("button", { name: "Add the whole entry to our family journal" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Just a passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Add passage to family journal" }));
  await waitFor(() => expect(app.stored().familyPages).toHaveLength(1));
  expect(app.stored().familyPages![0]).toMatchObject({ kind: "passage", text: "A long day.", byName: "Robin" });
  // Nobody tagged or named in it: no caption is guessed.
  expect(app.stored().familyPages![0]).not.toHaveProperty("caption");
  // The entry itself was saved first and stays a private draft.
  expect(app.stored().journal?.[0]).toMatchObject({ status: "draft" });
  expect(screen.getByRole("textbox", { name: "Your journal entry" })).toBeTruthy();
});

it("the sample's family spine: its own fictional pages, a painted page and a kept passage", () => {
  openBook(sampleBook(), { mode: "sample" });
  familyJournal();
  // One way to write for everyone, beside writing your own.
  expect(screen.getByRole("button", { name: "Add to our family journal" })).toBeTruthy();
  const entries = within(screen.getByRole("region", { name: "Entries in the journal" }));
  const rows = () => entries.getAllByRole("listitem");
  expect(rows()).toHaveLength(6);
  expect(rows().every((li) => li.className.includes("rt-spine"))).toBe(true);
  // Newest first: the painted day's highlights, then the passage on butter paper.
  expect(rows()[0].textContent).toMatch(/drive to Grandma June/);
  expect(rows()[0].querySelector("[data-illustration]")).toBeTruthy();
  const passage = entries.getByRole("button", { name: /hold your hand/ });
  expect(passage.className).toContain("rs-butter");
  expect(passage.textContent).toMatch(/Leo, at bedtime/);
  // People filter by who's in a page; search reads titles and words.
  fireEvent.click(within(screen.getByRole("group", { name: "Show entries about" })).getByRole("button", { name: "June" }));
  expect(rows().map((c) => c.textContent)).toEqual([
    expect.stringMatching(/drive to Grandma June/),
    expect.stringMatching(/tomatoes/),
  ]);
  fireEvent.click(within(screen.getByRole("group", { name: "Show entries about" })).getByRole("button", { name: "June" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tooth" } });
  expect(rows()).toHaveLength(1);
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
  expect(screen.getByRole("button", { name: "Save privately" })).toBeTruthy();
  // Back in Our family journal, its button resumes the family draft.
  familyJournal();
  fireEvent.click(await screen.findByRole("button", { name: "Add to our family journal" }));
  expect((screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement).value).toBe(
    "Half a family page",
  );
});
