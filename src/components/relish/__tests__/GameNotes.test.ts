// @vitest-environment happy-dom
import { createElement } from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceGame, newGame, type Game, type Player } from "@/lib/relish/living";
import GameNotes, { canListen } from "../GameNotes";
import { isChildPlayer } from "../GameListen";

vi.mock("@/lib/relish/ai-auth", () => ({ currentAIUser: () => null }));

const family: Player[] = [
  { id: "owner", name: "Scott", audience: "adult" },
  { id: "k", name: "Kaleb", audience: "6-8" },
];
function round(answers: string[]): Game {
  let g = advanceGame(newGame("match", family), { type: "start", firstId: "owner" });
  for (const answer of answers) {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "say", text: answer });
    g = advanceGame(advanceGame(g, { type: "ready" }), { type: "say", text: "a guess" });
    if (g.stage === "judge") g = advanceGame(g, { type: "next", skip: true });
  }
  return g;
}
afterEach(cleanup);

describe("notes at the end of a round", () => {
  it("lists each player's notes, all checked, and keeps the ones still checked", async () => {
    const onKeep = vi.fn().mockResolvedValue(true);
    render(
      createElement(GameNotes, {
        game: round(["the beach", "tacos"]),
        owner: "Scott",
        config: { enabled: true, children: false },
        listen: null,
        busy: false,
        onKeep,
      }),
    );
    expect(screen.getByRole("group", { name: "Kaleb" })).toBeTruthy();
    // Scott's own answers aren't notes about a person in his own book.
    expect(screen.queryByRole("group", { name: "Scott" })).toBeNull();
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(boxes).toHaveLength(1);
    fireEvent.click(boxes[0]);
    expect(screen.getByRole("button", { name: "Keep 0 notes" })).toHaveProperty("disabled", true);
    fireEvent.click(boxes[0]);
    fireEvent.click(screen.getByRole("button", { name: "Keep 1 note" }));
    await waitFor(() => expect(onKeep).toHaveBeenCalled());
    expect(onKeep.mock.calls[0][0]).toHaveLength(1);
    expect(onKeep.mock.calls[0][0][0]).toMatchObject({ person: "Kaleb" });
    expect(await screen.findByText(/Kept in Scott’s book/)).toBeTruthy();
    // Children's spoken notes wait for the provider privacy setup, and it says so.
    expect(screen.queryByText(/extra privacy setup/)).toBeNull();
  });
  it("says why Listen is off when a child plays before the privacy setup", () => {
    render(
      createElement(GameNotes, {
        game: round(["pizza"]),
        owner: "Scott",
        config: { enabled: true, children: false },
        listen: null,
        busy: false,
        onKeep: vi.fn(),
      }),
    );
    expect(screen.getByText(/extra privacy setup/)).toBeTruthy();
  });
  it("Listen is offered for adults, and for children only once their setup is verified", () => {
    const kids = newGame("match", family);
    const adults = newGame("match", [family[0], { id: "i", name: "Iris", audience: "adult" }]);
    expect(isChildPlayer(family[1])).toBe(true);
    expect(isChildPlayer({ id: "x", name: "Unknown age" })).toBe(true);
    expect(canListen(adults, { enabled: true, children: false })).toBe(true);
    expect(canListen(kids, { enabled: true, children: false })).toBe(false);
    expect(canListen(kids, { enabled: true, children: true })).toBe(true);
    expect(canListen(adults, null)).toBe(false);
  });
});
