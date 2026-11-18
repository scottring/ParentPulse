// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "@/lib/relish/model";
import { advanceGame, livingOf, newGame, type Game } from "@/lib/relish/living";
import LivingBook from "../LivingBook";
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
    newGame("match", [
      { id: "owner", name: "Robin" },
      { id: "ella", name: "Ella" },
      { id: "kaleb", name: "Kaleb" },
    ]),
    { type: "start" },
  );
  while (g.stage !== "reveal") {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "choice", choice: 1 });
  }
  return g;
}
const everyPage = () =>
  within(screen.getByRole("heading", { name: "Every page" }).closest("section")!);

it("a game finished without keeping a page shows in Your book under each player", async () => {
  const book = family();
  const app = openBook({ ...book, living: { ...livingOf(book), game: revealed() } });
  fireEvent.click(screen.getByRole("button", { name: "Do something" }));
  fireEvent.click(screen.getByRole("button", { name: /Same page\?/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Finish for now/ }));
  await screen.findByRole("status");
  expect(livingOf(app.stored()).plays).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Your book" }));
  const record = everyPage().getByRole("button", { name: /Same page\? with Ella and Kaleb/ });
  expect(record.textContent).toMatch(/^Game/);
  fireEvent.click(screen.getByRole("button", { name: "Ella" }));
  expect(everyPage().getByRole("button", { name: /Same page\? with Ella and Kaleb/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Gran" }));
  expect(everyPage().queryByRole("button", { name: /Same page\?/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Me" }));
  expect(everyPage().queryByRole("button", { name: /Same page\?/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Our family" }));
  expect(everyPage().getByRole("button", { name: /Same page\? with Ella and Kaleb/ })).toBeTruthy();
});
