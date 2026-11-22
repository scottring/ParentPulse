// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);
import { familyJournal, myJournal, openBook } from "./bookHarness";

const stream = () => within(screen.getByRole("region", { name: "Entries in my journal" }));

it("My journal is everything that's yours, each item saying where it came from", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  expect(
    screen.getByText("What you wrote, and what your family sent you, shared about you, or did with you."),
  ).toBeTruthy();
  const sent = stream().getByRole("article", { name: "Anna sent you this" });
  expect(sent.textContent).toMatch(/You stayed so calm with Leo at the pool today/);
  expect(within(sent).getByText("New")).toBeTruthy();
  expect(stream().getByRole("article", { name: "Leo mentioned you" }).textContent).toMatch(/@Dad read it to me/);
  expect(stream().getByRole("button", { name: /You played Same page\? with Anna/ })).toBeTruthy();
  expect(stream().getByRole("article", { name: "You sent Anna" }).textContent).toMatch(/field trip form/);
  expect(stream().getByRole("button", { name: /You wrote.*The blanket-fort expedition/ }).textContent).toMatch(/Only me/);
  // Today / This week / Earlier.
  expect(screen.getByRole("region", { name: "Today" })).toBeTruthy();
  // The side column: what the family says, and what this view can see.
  const says = screen.getByRole("region", { name: "What your family says about you" });
  expect(within(says).getByRole("button", { name: "See all 2" })).toBeTruthy();
  expect(screen.getByText(/Only you see this view\. Nothing from anyone’s private entries/)).toBeTruthy();
});

it("filters by kind and person, and See all shows what the family says", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const show = within(screen.getByRole("group", { name: "Show" }));
  fireEvent.click(show.getByRole("button", { name: /Sent to me.*1 new/ }));
  expect(stream().getAllByRole("listitem")).toHaveLength(1);
  fireEvent.click(show.getByRole("button", { name: "We played" }));
  expect(stream().getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    expect.stringMatching(/You played Same page\? with Anna/),
  ]);
  fireEvent.click(show.getByRole("button", { name: "Everything" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Show entries about" })).getByRole("button", { name: "Leo" }));
  expect(stream().queryByRole("article", { name: "Anna sent you this" })).toBeNull();
  expect(stream().getByRole("article", { name: "Leo mentioned you" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See all 2" }));
  expect(stream().getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual([
    "Anna sent you this",
    "Leo mentioned you",
  ]);
});

it("Keep it saves a line in My journal; it never goes to Our family journal", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const sent = stream().getByRole("article", { name: "Anna sent you this" });
  fireEvent.click(within(sent).getByRole("button", { name: "Keep it" }));
  await waitFor(() => expect(app.stored().connections?.received).toHaveLength(1));
  expect(app.stored().connections!.received[0]).toMatchObject({ from: "sample-anna", fromName: "Anna", audience: "direct" });
  const kept = stream().getByRole("article", { name: "Anna sent you this" });
  expect(within(kept).queryByText("New")).toBeNull();
  expect(within(kept).getByRole("button", { name: "Open" })).toBeTruthy();
  familyJournal();
  expect(screen.queryByText(/You stayed so calm/)).toBeNull();
  expect(screen.getByText(/6 entries since September/)).toBeTruthy();
});

it("Write back sends a line to the sender only", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(within(stream().getByRole("article", { name: "Anna sent you this" })).getByRole("button", { name: "Write back" }));
  const sheet = screen.getByRole("dialog", { name: "Write back to Anna" });
  fireEvent.change(within(sheet).getByRole("textbox", { name: "What you’d like to say" }), {
    target: { value: "It helped that you were there." },
  });
  expect(within(sheet).getByText(/It shows up in Anna’s journal under “Sent to me\.”/)).toBeTruthy();
  fireEvent.click(within(sheet).getByRole("button", { name: "Send to Anna" }));
  await waitFor(() => expect(app.stored().connections?.outgoing).toHaveLength(2));
  expect(app.stored().connections!.outgoing!.at(-1)).toMatchObject({
    text: "It helped that you were there.",
    recipients: ["sample-anna"],
    recipientNames: ["Anna"],
    audience: "direct",
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(stream().getAllByRole("article", { name: "You sent Anna" })).toHaveLength(2);
  expect(app.stored().familyPages).toHaveLength(6);
});

it("typing @ offers the family; choosing someone writes @Name and tags them, sharing nothing", async () => {
  try {
    localStorage.removeItem("relish.mention-note.v1");
  } catch {
    /* no storage here */
  }
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: "At the pool @Le", selectionStart: 15, selectionEnd: 15 } });
  const list = screen.getByRole("listbox", { name: "Mention someone" });
  expect(within(list).getAllByRole("option").map((o) => o.textContent)).toEqual(["LLeoSon"]);
  fireEvent.keyDown(body, { key: "Enter" });
  expect(body.value).toBe("At the pool @Leo ");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(screen.getByRole("note").textContent).toMatch(
    /Mentioning someone doesn’t share anything\. It files this entry under Leo in your journal\. To let them read it, send it\./,
  );
  await waitFor(() => expect(app.stored().journal?.[1]?.people).toEqual(["leo"]));
  expect(app.stored().familyPages).toHaveLength(6);
  expect(app.stored().connections?.outgoing).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(screen.queryByRole("note")).toBeNull();
});

it("Send a line offers connected grown-ups one by one, or Everyone in Our family journal", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  const body = screen.getByRole("textbox", { name: "Your journal entry" }) as HTMLTextAreaElement;
  fireEvent.change(body, { target: { value: "He said it was “like being inside a cold hug.” @Anna saw it." } });
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Send a line" });
  const who = within(within(sheet).getByRole("group", { name: "Who gets it" }));
  // Anna is connected and mentioned, so she's chosen. Leo is a child: no line of his own.
  expect((who.getByRole("checkbox", { name: /Anna/ }) as HTMLInputElement).checked).toBe(true);
  expect(who.queryByRole("checkbox", { name: /Leo/ })).toBeNull();
  expect(who.getByRole("checkbox", { name: /Everyone · Our family journal/ })).toBeTruthy();
  expect(within(sheet).getByText("like being inside a cold hug.")).toBeTruthy();
  fireEvent.change(within(sheet).getByRole("textbox", { name: "Add a note" }), { target: { value: "You saw it too." } });
  fireEvent.click(within(sheet).getByRole("button", { name: "Send to Anna" }));
  await waitFor(() => expect(app.stored().connections?.outgoing).toHaveLength(2));
  const line = app.stored().connections!.outgoing!.at(-1)!;
  expect(line).toMatchObject({ text: "like being inside a cold hug.", note: "You saw it too.", recipientNames: ["Anna"], audience: "direct" });
  // It came from this entry, which stays a private draft.
  expect(line.sourceId).toBe(app.stored().journal!.at(-1)!.id);
  expect(app.stored().journal!.at(-1)).toMatchObject({ status: "draft" });
  expect(app.stored().familyPages).toHaveLength(6);
});

it("choosing Everyone adds to Our family journal with the page's mentions", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), {
    target: { value: "@Leo found a frog." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Send a line" });
  // Nobody connected is mentioned, so Our family journal is chosen, as before.
  expect((within(sheet).getByRole("checkbox", { name: /Everyone · Our family journal/ }) as HTMLInputElement).checked).toBe(true);
  expect((within(sheet).getByRole("checkbox", { name: /Anna/ }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(within(sheet).getByRole("button", { name: "Add passage to family journal" }));
  await waitFor(() => expect(app.stored().familyPages).toHaveLength(7));
  const page = app.stored().familyPages!.at(-1)!;
  expect(page).toMatchObject({ kind: "passage", text: "@Leo found a frog.", mentions: ["Leo"], byName: "Alex" });
  expect(page.sourceId).toBe(app.stored().journal!.at(-1)!.id);
});

it("a journal with no connected grown-ups keeps Share with our family as it was", () => {
  openBook({ ...emptyBook("Robin"), profile: { kind: "adult" } } as Book);
  myJournal();
  // Nothing anyone sent, no reflections: the stream is only your own.
  expect(screen.queryByRole("region", { name: "What your family says about you" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Relish noticed" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Write today’s entry" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Your journal entry" }), { target: { value: "Pancakes." } });
  fireEvent.click(screen.getByRole("button", { name: "Share a passage" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).queryByRole("group", { name: "Who gets it" })).toBeNull();
});
