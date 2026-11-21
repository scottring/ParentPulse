// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import { advanceGame, livingOf, turnPlan, type Game } from "@/lib/relish/living";
import LivingBook from "../LivingBook";
import { myJournal } from "./bookHarness";
import { sameV2 } from "@/lib/relish/__tests__/same-page-v2";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function openBook(book: Book) {
  let stored = book;
  function Harness() {
    const [current, setCurrent] = useState(stored);
    return createElement(LivingBook, {
      vault: {
        book: current,
        mode: "open",
        editions: [],
        editionId: "compendium-test",
        shelf: vi.fn(),
        select: vi.fn(),
        remove: vi.fn(),
        busy: false,
        error: "",
        open: vi.fn(),
        lock: vi.fn(),
        backup: vi.fn(),
        photos: { add: vi.fn(), load: vi.fn() },
        save: async (change) => {
          stored = typeof change === "function" ? change(stored) : change;
          setCurrent(stored);
        },
      },
    });
  }
  render(createElement(Harness));
  return { stored: () => stored };
}
const family = (): Book => ({
  ...emptyBook("Robin"),
  profile: { kind: "adult" },
  people: [
    { id: "ella", name: "Ella", role: "Daughter", color: "rose", note: "", lessons: [] },
    { id: "kaleb", name: "Kaleb", role: "Son", color: "ochre", note: "", lessons: [] },
    { id: "gran", name: "Gran", role: "Mother", color: "sage", note: "", lessons: [] },
  ],
});
function revealed(): Game {
  let g = advanceGame(
    sameV2([
      { id: "owner", name: "Robin" },
      { id: "ella", name: "Ella" },
      { id: "kaleb", name: "Kaleb" },
    ]),
    { type: "start" },
  );
  while (g.stage !== "reveal") {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "answer", answers: turnPlan(g)[g.turn].asks.map(() => 1) });
  }
  return g;
}
const everyPage = () => within(screen.getByRole("region", { name: "Entries in my journal" }));

it("a game finished without keeping a page shows in My journal under each player", async () => {
  const book = family();
  const app = openBook({ ...book, living: { ...livingOf(book), game: revealed() } });
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(screen.getByRole("button", { name: /Same page\?.*Resume Same page\?/ }));
  // The reveal says where the play is noted.
  expect(
    await screen.findByText(/Played Same page\? with Ella and Kaleb/),
  ).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "Done" }));
  await screen.findByRole("status");
  expect(livingOf(app.stored()).plays).toHaveLength(1);
  // One short note in Our family journal: the game and who played, no answers.
  await waitFor(() => expect(app.stored().familyPages ?? []).toHaveLength(1));
  expect(app.stored().familyPages![0]).toMatchObject({
    id: `play-${livingOf(app.stored()).plays![0].id}`,
    kind: "game",
    text: "Played Same page? with Ella and Kaleb.",
  });
  // Finishing lands on Our family journal, with the note as an entry; the
  // round is in your own journal too.
  await screen.findByRole("heading", { name: "Our family journal", level: 1 });
  expect(
    within(screen.getByRole("list", { name: "Entries in Our family journal" })).getByRole("button", {
      name: /Game · Same page\?.*Played Same page\? with Ella and Kaleb/,
    }),
  ).toBeTruthy();
  myJournal();
  const record = everyPage().getByRole("button", { name: /Same page\? with Ella and Kaleb/ });
  expect(record.textContent).toMatch(/^Game/);
  fireEvent.click(screen.getByRole("button", { name: "Ella" }));
  expect(everyPage().getByRole("button", { name: /Same page\? with Ella and Kaleb/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Gran" }));
  expect(screen.queryByRole("button", { name: /Same page\?/ })).toBeNull();
});

it("an exercise started with someone is labelled Exercise and filed under them", async () => {
  const app = openBook(family());
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(screen.getByRole("button", { name: /What helps when I’m upset/ }));
  await screen.findByRole("heading", { name: "What helps when I’m upset" });
  const asked = screen.getByRole("group", { name: "Who is this with?" });
  expect(
    (within(asked).getByRole("radio", { name: "No one in particular" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(within(asked).getByRole("radio", { name: "Kaleb" }));
  expect(
    (within(asked).getByRole("radio", { name: "No one in particular" }) as HTMLInputElement)
      .checked,
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Start this exercise/ }));
  fireEvent.click(
    within(screen.getByRole("group", { name: "Talking it through" })).getByRole("button", {
      name: "Helps me",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Keep this page/ }));
  await screen.findByText("Kept in your journal. Only you can see it.");
  expect(app.stored().journal![0]).toMatchObject({
    title: "What helps when I’m upset",
    people: ["kaleb"],
    source: { kind: "exercise", toolId: "helps-upset" },
  });
  expect(app.stored().journal![0].text).not.toContain("Kaleb");
  myJournal();
  const page = everyPage().getByRole("button", { name: /What helps when I’m upset/ });
  expect(page.textContent).toMatch(/^Exercise/);
  expect(page.className).toContain("rp-edge-sage");
  fireEvent.click(screen.getByRole("button", { name: "Kaleb" }));
  expect(everyPage().getByRole("button", { name: /What helps when I’m upset/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ella" }));
  expect(screen.queryByRole("button", { name: /What helps when I’m upset/ })).toBeNull();
});

it("a bingo started with someone carries them to its kept page", async () => {
  const app = openBook(family());
  fireEvent.click(screen.getByRole("button", { name: "Activities" }));
  fireEvent.click(screen.getByRole("button", { name: /Repair bingo/ }));
  await screen.findByRole("heading", { name: "Repair bingo" });
  fireEvent.click(screen.getByRole("checkbox", { name: "Ella" }));
  fireEvent.click(screen.getByRole("button", { name: /Start bingo/ }));
  await screen.findByRole("group", { name: "Repair bingo" });
  expect(app.stored().tools!.trackers[0].personId).toBe("ella");
});

it("person chips filter What you’ve learned, and a card names who it is about", () => {
  openBook(sampleBook());
  myJournal();
  const learned = () =>
    within(screen.getByRole("heading", { name: "What you’ve learned" }).closest("section")!);
  const leoCard = () => learned().queryByText("Endings go better with a heads-up");
  expect(leoCard()?.closest("article")?.textContent).toMatch(/^LLeo/);
  fireEvent.click(screen.getByRole("button", { name: "Leo" }));
  expect(leoCard()).toBeTruthy();
  // Anna's suggestion is offered under Anna, not under Leo.
  expect(learned().queryByText("A little room to talk")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Anna" }));
  expect(leoCard()).toBeNull();
  expect(learned().getByText("A little room to talk")).toBeTruthy();
  expect(learned().getByText(/Relish noticed something · Anna/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Everything" }));
  expect(leoCard()).toBeTruthy();
});
