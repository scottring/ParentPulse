// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, sampleChildBook, type Book } from "@/lib/relish/model";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);
import { familyJournal, myJournal, openBook } from "./bookHarness";

const stream = () => within(screen.getByRole("region", { name: "Entries in the journal" }));

/** The timeline row an entry sits on: the family's spine, or a branch off it. */
const laneOf = (el: HTMLElement) => (el.closest("li")?.className.match(/rt-(spine|branch)/) || [])[1];

it("the journal is one timeline: the family's spine, with branches that say who can see them", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
  expect(screen.getByText(/What the family shares runs down the middle/)).toBeTruthy();
  // No Mine / Family switch: one journal, with filters.
  expect(screen.queryByRole("group", { name: "Which journal" })).toBeNull();
  // A line Anna sent Alex alone: a branch only they see, waiting to be kept.
  const sent = stream().getByRole("article", { name: "Anna sent you this" });
  expect(sent.textContent).toMatch(/You stayed so calm with Leo at the pool today/);
  expect(within(sent).getByText("New")).toBeTruthy();
  expect(laneOf(sent)).toBe("branch");
  expect(sent.textContent).toMatch(/You and Anna/);
  // Leo's family page that mentions Alex: on the spine, for everyone, saying so.
  const mention = stream().getByRole("button", { name: /Leo mentioned you/ });
  expect(mention.textContent).toMatch(/@Dad read it to me/);
  expect(laneOf(mention)).toBe("spine");
  expect(mention.textContent).toMatch(/Everyone/);
  // A round Alex and Anna played; a line Alex sent Anna.
  const played = stream().getByRole("button", { name: /You played Same page\? with Anna/ });
  expect([laneOf(played), played.textContent?.includes("You and Anna")]).toEqual(["branch", true]);
  const line = stream().getByRole("article", { name: "You sent Anna" });
  expect([laneOf(line), line.textContent?.includes("You and Anna")]).toEqual(["branch", true]);
  // A private entry: a branch, Only you.
  const own = stream().getByRole("button", { name: /You wrote.*The blanket-fort expedition/ });
  expect([laneOf(own), own.textContent?.includes("Only you")]).toEqual(["branch", true]);
  // The family's own pages run down the spine.
  expect(laneOf(stream().getByRole("button", { name: /When I’m big I’ll still hold your hand/ }))).toBe("spine");
  expect(stream().getAllByRole("listitem").filter((li) => li.className.includes("rt-spine"))).toHaveLength(6);
  // Today / This week / Earlier.
  expect(screen.getByRole("region", { name: "Today" })).toBeTruthy();
  // The side column: what the family says, and what this view can see.
  const says = screen.getByRole("region", { name: "What your family says about you" });
  expect(within(says).getByRole("button", { name: "See all 2" })).toBeTruthy();
  expect(screen.getByText(/Each branch says who can see it, and nobody else does\./)).toBeTruthy();
});

it("filters: Family is the spine, Just me the branches, then kind and person", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const show = within(screen.getByRole("group", { name: "Show" }));
  const rows = () => stream().getAllByRole("listitem");
  fireEvent.click(show.getByRole("button", { name: "Family" }));
  expect(rows()).toHaveLength(6);
  expect(rows().every((li) => li.className.includes("rt-spine"))).toBe(true);
  expect(stream().queryByText(/Only you|You and Anna/)).toBeNull();
  fireEvent.click(show.getByRole("button", { name: "Just me" }));
  expect(rows().every((li) => li.className.includes("rt-branch"))).toBe(true);
  expect(stream().queryByText("Everyone")).toBeNull();
  expect(stream().getByRole("article", { name: "Anna sent you this" })).toBeTruthy();
  fireEvent.click(show.getByRole("button", { name: /Sent to me.*1 new/ }));
  expect(rows()).toHaveLength(1);
  fireEvent.click(show.getByRole("button", { name: "We played" }));
  expect(rows().map((li) => li.textContent)).toEqual([expect.stringMatching(/You played Same page\? with Anna/)]);
  fireEvent.click(show.getByRole("button", { name: "Everything" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Show entries about" })).getByRole("button", { name: "Leo" }));
  expect(stream().queryByRole("article", { name: "Anna sent you this" })).toBeNull();
  expect(stream().getByRole("button", { name: /Leo mentioned you/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See all 2" }));
  expect(rows().map((li) => li.textContent)).toEqual([
    expect.stringMatching(/Anna sent you this/),
    expect.stringMatching(/Leo mentioned you/),
  ]);
});

it("a page of the family journal opens to read, right here", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(stream().getByRole("button", { name: /Leo mentioned you/ }));
  const reader = screen.getByRole("dialog", { name: "My tooth came out!!" });
  expect(reader.textContent).toMatch(/Leo added this to Our family journal\./);
  // Leo added it, so Alex can't take it out.
  expect(within(reader).queryByRole("button", { name: "Take out of the family journal" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("heading", { name: "Our family journal", level: 1 })).toBeTruthy();
});

it("Keep it saves a line in your own journal; it never goes on the family spine", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const sent = stream().getByRole("article", { name: "Anna sent you this" });
  fireEvent.click(within(sent).getByRole("button", { name: "Keep it" }));
  await waitFor(() => expect(app.stored().connections?.received).toHaveLength(1));
  expect(app.stored().connections!.received[0]).toMatchObject({ from: "sample-anna", fromName: "Anna", audience: "direct" });
  const kept = stream().getByRole("article", { name: "Anna sent you this" });
  expect(within(kept).queryByText("New")).toBeNull();
  expect(within(kept).getByRole("button", { name: "Open" })).toBeTruthy();
  expect(laneOf(kept)).toBe("branch");
  familyJournal();
  expect(stream().queryByText(/You stayed so calm/)).toBeNull();
  expect(stream().getAllByRole("listitem")).toHaveLength(6);
  expect(app.stored().familyPages).toHaveLength(6);
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
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Send this entry" });
  fireEvent.click(within(sheet).getByRole("button", { name: "Just a passage" }));
  expect(within(sheet).getByRole("heading", { name: "Send a line" })).toBeTruthy();
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
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Send this entry" });
  fireEvent.click(within(sheet).getByRole("button", { name: "Just a passage" }));
  expect(within(sheet).getByRole("heading", { name: "Send a line" })).toBeTruthy();
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
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Share with our family" });
  expect(within(sheet).queryByRole("group", { name: "Who gets it" })).toBeNull();
});

it("Share on a private entry's card sends the whole entry to Anna; it becomes a You and Anna branch, once", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const card = () => stream().getByRole("button", { name: /You wrote.*The blanket-fort expedition/ });
  const share = () => within(card().closest("li")!).getByRole("button", { name: "Share" });
  fireEvent.click(share());
  const sheet = screen.getByRole("dialog", { name: "Send this entry" });
  // It opens on the whole page, with the whole entry in the preview.
  expect(within(sheet).getByRole("button", { name: "Whole page" }).getAttribute("aria-pressed")).toBe("true");
  expect(within(sheet).getByRole("button", { name: "Just a passage" })).toBeTruthy();
  expect(within(sheet).getByText(/My favorite part was helping each other find a way in\./)).toBeTruthy();
  // Anna is tagged in it, so she's chosen; nothing has gone anywhere yet.
  expect(app.stored().connections?.outgoing).toHaveLength(1);
  fireEvent.click(within(sheet).getByRole("button", { name: "Send the whole entry to Anna" }));
  await waitFor(() => expect(app.stored().connections?.outgoing).toHaveLength(2));
  expect(app.stored().connections!.outgoing!.at(-1)).toMatchObject({
    title: "The blanket-fort expedition",
    text: expect.stringMatching(/^The couch became a spaceship\.[\s\S]*find a way in\.$/),
    recipientNames: ["Anna"],
    audience: "direct",
    sourceId: "sample-story",
  });
  expect(screen.queryByRole("dialog")).toBeNull();
  // The entry itself is the branch Anna can see; no second copy beside it.
  expect([laneOf(card()), card().textContent?.includes("You and Anna"), card().textContent?.includes("Sent to Anna")]).toEqual([
    "branch",
    true,
    true,
  ]);
  expect(stream().queryByRole("article", { name: "You sent Anna", description: /blanket-fort/ })).toBeNull();
  expect(stream().getAllByRole("article", { name: "You sent Anna" })).toHaveLength(1);
  expect(app.stored().familyPages).toHaveLength(6);
});

it("Share on a private entry's card adds the whole entry to Our family journal, on the spine", async () => {
  const app = openBook(sampleBook(), { mode: "sample" });
  myJournal();
  const card = stream().getByRole("button", { name: /You wrote.*The blanket-fort expedition/ });
  fireEvent.click(within(card.closest("li")!).getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Send this entry" });
  fireEvent.click(within(sheet).getByRole("checkbox", { name: /Everyone · Our family journal/ }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Add the whole entry to our family journal" }));
  await waitFor(() => expect(app.stored().familyPages).toHaveLength(7));
  expect(app.stored().familyPages!.at(-1)).toMatchObject({
    kind: "page",
    title: "The blanket-fort expedition",
    sourceId: "sample-story",
    byName: "Alex",
  });
  expect(app.stored().connections?.outgoing).toHaveLength(1);
  // One card: on the spine for everyone, saying it came from your private page.
  await waitFor(() => expect(stream().queryByRole("button", { name: /You wrote.*The blanket-fort expedition/ })).toBeNull());
  const spine = stream().getByRole("button", { name: /Shared from your private page/ });
  expect([laneOf(spine), spine.textContent?.includes("Everyone"), spine.textContent?.includes("The blanket-fort expedition")]).toEqual([
    "spine",
    true,
    true,
  ]);
});

it("Share is on the page while reading it, and not in a child's journal", () => {
  openBook(sampleBook(), { mode: "sample" });
  myJournal();
  fireEvent.click(stream().getByRole("button", { name: /You wrote.*The blanket-fort expedition/ }));
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  const sheet = screen.getByRole("dialog", { name: "Send this entry" });
  expect(within(sheet).getByRole("button", { name: "Whole page" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  cleanup();
  // A child's journal keeps the parent-managed way it shares: no Share on its pages.
  openBook(sampleChildBook(), { mode: "sample" });
  // #71 renames this to "Open your journal".
  fireEvent.click(screen.getByRole("button", { name: /^Open (my|your) journal$/ }));
  const page = stream()
    .getAllByRole("button", { name: /My tooth came out/ })
    .find((b) => b.closest("li.rt-item"))!;
  expect(within(page.closest("li")!).queryByRole("button", { name: "Share" })).toBeNull();
  fireEvent.click(page);
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
});
