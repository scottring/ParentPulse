// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { livingOf } from "@/lib/relish/living";
import { openBook, place } from "./bookHarness";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
type W = Window & { webkit?: unknown; relishNative?: { receive: (m: unknown) => boolean } };
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete (window as W).webkit;
});
const family = (): Book => ({
  ...emptyBook("Alex"),
  profile: { kind: "adult" },
  people: [
    { id: "leo", name: "Leo", role: "Son", color: "ochre", note: "", lessons: [] },
    { id: "anna", name: "Anna", role: "Partner", color: "rose", note: "", lessons: [] },
  ],
});
const together = () =>
  fireEvent.click(
    within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name: "Together" }),
  );
/** A tap anywhere on the card. */
const tap = () => fireEvent.click(document.querySelector(".tm-tap")!);
const app = () => {
  const postMessage = vi.fn();
  (window as W).webkit = { messageHandlers: { relish: { postMessage } } };
  return postMessage;
};
const sent = (post: ReturnType<typeof vi.fn>, type: string) =>
  post.mock.calls.map((c) => c[0]).filter((m) => m.type === type);

it("stands tonight's activity up at the table: one card each, tap for the next, then one note", async () => {
  const book = openBook(family());
  place("Activities");
  together();
  fireEvent.click(screen.getByRole("button", { name: "Stand it up at the table" }));
  const dialog = screen.getByRole("dialog", { name: "Table mode" });
  expect(within(dialog).getByText("Tonight at dinner")).toBeTruthy();
  expect(within(dialog).getByRole("heading", { name: "Hearing each other out" })).toBeTruthy();
  tap();
  expect(screen.getByText("Alex’s turn to tell")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "What was the best part of today?" })).toBeTruthy();
  // Nobody types: there is nothing to type into.
  expect(dialog.querySelector("input, textarea")).toBeNull();
  tap();
  expect(screen.getByText("Leo’s turn to tell")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tap for Anna’s question" }));
  expect(screen.getByText("Anna’s turn to tell")).toBeTruthy();
  tap();
  expect(screen.getByRole("heading", { name: "That’s everyone. Nicely done." })).toBeTruthy();
  expect(screen.getByText(/“Alex, Leo and Anna told their stories at dinner\.” Nobody’s answers are saved\./)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep the note" }));
  await screen.findByRole("main", { name: "Activities" });
  const pages = book.stored().familyPages || [];
  expect(pages).toHaveLength(1);
  expect(pages[0]).toMatchObject({
    kind: "page",
    title: "Hearing each other out",
    text: "Alex, Leo and Anna told their stories at dinner.",
  });
});

it("Skip it leaves Our family journal alone", async () => {
  const book = openBook(family());
  place("Activities");
  together();
  fireEvent.click(screen.getByRole("button", { name: "Stand it up at the table" }));
  for (let i = 0; i < 4; i++) tap();
  fireEvent.click(screen.getByRole("button", { name: "Skip it" }));
  await screen.findByRole("main", { name: "Activities" });
  expect(book.stored().familyPages || []).toHaveLength(0);
});

it("plays Spot it! standing up: tap a square, tap who called it, then keep the note or skip it", async () => {
  const book = openBook(family());
  place("Activities");
  together();
  fireEvent.click(screen.getByRole("button", { name: "Spot it!: Play Spot it!" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Spot it!" })).getByRole("button", { name: "Stand it up at the table" }));
  const board = await screen.findByRole("list", { name: "Spot it! card" });
  await waitFor(() => expect(livingOf(book.stored()).game?.stage).toBe("choose"));
  const first = within(board).getAllByRole("button")[0];
  const square = first.textContent!;
  fireEvent.click(first);
  expect(screen.getByText(new RegExp(`^Who called`))).toBeTruthy();
  fireEvent.click(within(screen.getByRole("group", { name: "Who called it" })).getByRole("button", { name: /Leo/ }));
  await waitFor(() => expect(livingOf(book.stored()).game?.spot?.marks[0]).toBe(1));
  await waitFor(() =>
    expect(within(board).getByRole("button", { name: `${square}, called by Leo` })).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Done spotting" }));
  expect(screen.getByText(/“Played Spot it! with Leo and Anna\.”/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep the note" }));
  await screen.findByRole("main", { name: "Activities" });
  const after = book.stored();
  expect(livingOf(after).plays?.at(-1)?.kind).toBe("spot");
  await waitFor(() =>
    expect((book.stored().familyPages || []).map((p) => p.text)).toEqual([
      "Played Spot it! with Leo and Anna.",
    ]),
  );
});

it("skipping Spot it!'s note still keeps the card in the journal", async () => {
  const book = openBook(family());
  place("Activities");
  together();
  fireEvent.click(screen.getByRole("button", { name: "Spot it!: Play Spot it!" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Spot it!" })).getByRole("button", { name: "Stand it up at the table" }));
  await waitFor(() => expect(livingOf(book.stored()).game?.stage).toBe("choose"));
  fireEvent.click(screen.getByRole("button", { name: "Done spotting" }));
  fireEvent.click(screen.getByRole("button", { name: "Skip it" }));
  await screen.findByRole("main", { name: "Activities" });
  expect(livingOf(book.stored()).plays?.at(-1)?.kind).toBe("spot");
  expect(book.stored().familyPages || []).toHaveLength(0);
});

it("follows the iPhone app: places, the phone standing up, and shared words", async () => {
  const post = app();
  openBook(family());
  expect(sent(post, "ready")).toHaveLength(1);
  const native = (window as W).relishNative!;
  // Something unexpected is ignored.
  expect(native.receive({ v: 1, type: "open", place: "https://outsider.invalid/" })).toBe(false);
  act(() => {
    native.receive({ v: 1, type: "posture", tent: true });
  });
  expect(screen.getByRole("button", { name: "Pick up the phone to leave" })).toBeTruthy();
  expect(sent(post, "table").at(-1)).toEqual({ v: 1, type: "table", open: true });
  act(() => {
    native.receive({ v: 1, type: "posture", tent: false });
  });
  expect(screen.queryByRole("dialog", { name: "Table mode" })).toBeNull();
  expect(sent(post, "table").at(-1)).toEqual({ v: 1, type: "table", open: false });
  act(() => {
    native.receive({ v: 1, type: "open", place: "table" });
  });
  expect(screen.getByRole("button", { name: "Leave the table" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Leave the table" }));
  act(() => {
    native.receive({ v: 1, type: "open", place: "new-entry" });
  });
  expect(await screen.findByText("Writing a private page")).toBeTruthy();
  // A phone standing up never covers the editor.
  act(() => {
    expect(native.receive({ v: 1, type: "posture", tent: true })).toBe(false);
  });
  expect(screen.queryByRole("dialog", { name: "Table mode" })).toBeNull();
  act(() => {
    native.receive({ v: 1, type: "share", id: "share-1", text: "Words from another app" });
  });
  const editor = await screen.findByDisplayValue("Words from another app");
  expect(editor).toBeTruthy();
  expect(screen.getByText("Writing a private page")).toBeTruthy();
  await waitFor(() => expect(sent(post, "share-received")).toEqual([{ v: 1, type: "share-received", id: "share-1" }]));
});

it("tells the widgets tonight's activity, and a family line only once a grown-up turns it on", async () => {
  const post = app();
  openBook({
    ...family(),
    familyPages: [
      {
        id: "p1",
        kind: "passage",
        text: "I’ll still hold your hand.",
        caption: "Leo, at bedtime",
        byName: "Alex",
        byBookId: "b",
        createdAt: "2026-11-19T20:00:00Z",
      },
    ],
  });
  const last = () => sent(post, "widgets").at(-1);
  expect(last()).toMatchObject({
    tonight: { when: "Tonight at dinner", title: "Hearing each other out" },
    familyLine: null,
  });
  fireEvent.click(screen.getByRole("button", { name: /^Menu: family/ }));
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("button", { name: "Show a line from Our family journal" }));
  await waitFor(() =>
    expect(last()).toMatchObject({
      familyLine: { text: "I’ll still hold your hand.", who: "Leo, at bedtime · Nov 19" },
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Turn the family line off" }));
  await waitFor(() => expect(last()).toMatchObject({ familyLine: null }));
});
