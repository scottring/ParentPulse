// @vitest-environment happy-dom
// Just me / Our family on one device: the switch, Journal's audience, and
// family pages kept inside a book that has no account.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { Window } from "happy-dom";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { openBook } from "./bookHarness";
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
const switchTo = (name: "Just me" | "Our family") =>
  fireEvent.click(
    within(screen.getByRole("group", { name: "Whose pages" })).getByRole("button", { name }),
  );
const tab = (name: string) =>
  fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("button", { name }));

it("has four tabs and a Just me / Our family switch that Book follows and the device remembers", () => {
  openBook(adult());
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual([
    "Home",
    "Book",
    "Journal",
    "Activities",
  ]);
  expect(screen.queryByRole("button", { name: "Family" })).toBeNull();
  tab("Book");
  expect(screen.getByRole("heading", { name: "Your book", level: 1 })).toBeTruthy();
  switchTo("Our family");
  expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy();
  expect(localStorage.getItem("relish.space.v1:places-test")).toBe("family");
  // Honest about where the pages are kept without an account.
  expect(screen.getByText(/isn’t in an account, so family pages are kept inside it/)).toBeTruthy();
  // Back to Home, then Book again: still Our family.
  tab("Home");
  tab("Book");
  expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy();
});

it("works without storage: the switch still changes Book for this visit", () => {
  const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  try {
    openBook(adult());
    tab("Book");
    switchTo("Our family");
    expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy();
    switchTo("Just me");
    expect(screen.getByRole("heading", { name: "Your book", level: 1 })).toBeTruthy();
  } finally {
    spy.mockRestore();
  }
});

it("Journal says who a page is for; in Our family, saving keeps it and adds the whole page", async () => {
  const app = openBook(adult());
  tab("Journal");
  expect(screen.getByText("Only me")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save to my book" })).toBeTruthy();
  // The facing page is hidden until asked for.
  expect(screen.queryByRole("complementary", { name: "Previous entry" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Previous entry" }));
  expect(screen.getByRole("complementary", { name: "Previous entry" })).toBeTruthy();
  switchTo("Our family");
  await screen.findByText(/adds the whole page to\s+Our family book/);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "First snow" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), {
    target: { value: "Kaleb made a snow cat." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add to our family book" }));
  await screen.findByText("Entry saved");
  // Kept in Robin's own book, and the whole page is in the family pages.
  expect(app.stored().journal?.[0]).toMatchObject({ status: "kept", title: "First snow" });
  expect(app.stored().familyPages).toMatchObject([
    { kind: "page", title: "First snow", text: "Kaleb made a snow cat.", byName: "Robin" },
  ]);
  tab("Book");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Our family book", level: 1 })).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: /First snow/ }));
  fireEvent.click(screen.getByRole("button", { name: "Take out of the family book" }));
  await waitFor(() => expect(app.stored().familyPages).toEqual([]));
  // Still in Robin's own book.
  expect(app.stored().journal).toHaveLength(1);
});

it("Share a passage suggests the selected words, keeps the draft, and shares only the passage", async () => {
  const app = openBook(adult());
  tab("Journal");
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: "A long day.\n\nThe best bit: pancakes at dawn." } });
  body.setSelectionRange(body.value.indexOf("pancakes"), body.value.length - 1);
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).getByText("Kaleb will see this in Our family book.")).toBeTruthy();
  expect(within(sheet).getByText("pancakes at dawn")).toBeTruthy();
  // Keyboard: Escape closes it.
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Share with our family" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Change passage" }));
  fireEvent.change(screen.getByLabelText("Only these words"), { target: { value: "A long day." } });
  fireEvent.click(screen.getByRole("button", { name: "Whole page" }));
  expect(screen.getByRole("button", { name: "Add page to family book" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Passage" }));
  fireEvent.click(screen.getByRole("button", { name: "Add passage to family book" }));
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
  tab("Book");
  switchTo("Our family");
  expect(screen.getByText(/^6 pages/)).toBeTruthy();
  const grid = screen.getByRole("list", { name: "Pages in Our family book" });
  const cells = within(grid).getAllByRole("listitem");
  expect(cells[0].className).toContain("rp-fb-featured");
  expect(cells[0].querySelector("[data-illustration]")).toBeTruthy();
  expect(cells[1].textContent).toMatch(/hold your hand/);
  // Chips filter by who's in a page; search reads titles and words.
  fireEvent.click(within(screen.getByRole("group", { name: "Show pages from" })).getByRole("button", { name: "June" }));
  expect(within(grid).getAllByRole("listitem").map((c) => c.textContent)).toEqual([
    expect.stringMatching(/drive to Grandma June/),
    expect.stringMatching(/tomatoes/),
  ]);
  fireEvent.click(within(screen.getByRole("group", { name: "Show pages from" })).getByRole("button", { name: "Everyone" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a page" }), { target: { value: "tooth" } });
  expect(within(grid).getAllByRole("listitem")).toHaveLength(1);
});

it("Activities puts things to do together first in Our family", () => {
  openBook(adult());
  tab("Activities");
  const titles = () =>
    within(screen.getByRole("list", { name: "Activities" }))
      .getAllByRole("button")
      .map((b) => b.textContent || "");
  switchTo("Our family");
  expect(screen.getByText("Things to do together come first.")).toBeTruthy();
  expect(titles()[0]).toMatch(/Game/);
  expect(titles().length).toBeGreaterThan(1);
});
