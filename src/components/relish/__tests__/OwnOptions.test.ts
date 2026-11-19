// @vitest-environment happy-dom
import { createElement, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { emptyBook } from "@/lib/relish/model";
import { advanceGame, newGame, type Game, type GameAction } from "@/lib/relish/living";
import GroupPlay from "../GroupPlay";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
afterEach(cleanup);

/** GroupPlay with every action applied, as the book would. */
function play(start: Game) {
  const seen: GameAction[] = [];
  let current = start;
  function Harness() {
    const [g, setG] = useState(start);
    return createElement(GroupPlay, {
      book: emptyBook("Iris"),
      game: g,
      busy: false,
      onAction: (a: GameAction) => {
        seen.push(a);
        current = advanceGame(current, a);
        setG(current);
      },
      onKeep: vi.fn(),
      onPause: vi.fn(),
      onFinish: vi.fn(),
      onCancel: vi.fn(),
    });
  }
  render(createElement(Harness));
  return { seen, game: () => current };
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("games take your own answer", () => {
  it("a small joy in your own words is guessed in words, judged, and revealed", () => {
    const players = [
      { id: "e", name: "Ella", audience: "6-8" as const },
      { id: "k", name: "Kaleb", audience: "9-12" as const },
      { id: "i", name: "Iris", audience: "adult" as const },
    ];
    const { seen, game } = play(advanceGame(newGame("joy", players), { type: "start" }));
    // Ella writes her own; it opens in place, and Pass stays.
    expect(screen.getByRole("button", { name: "Pass my turn" })).toBeTruthy();
    click("Something else…");
    expect(screen.getByText("Say it out loud and a grown-up can type it.")).toBeTruthy();
    type("Your own small joy", "Feeding the ducks");
    click(/Use this/);
    expect(seen.at(-1)).toEqual({ type: "choice", choice: null, text: "Feeding the ducks" });
    click("I’m Kaleb · ready");
    expect(screen.queryByText("Feeding the ducks")).toBeNull();
    click("Playing outside");
    click("I’m Iris · ready");
    click("Making something");
    // Ella guesses from the list: nobody she guesses wrote their own.
    click("I’m Ella · ready");
    expect(screen.queryByLabelText("Your guess")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Playing outside" }));
    fireEvent.click(screen.getByRole("button", { name: "Making something" }));
    // Kaleb guesses Ella's in words, with the list as ideas; Iris's from the list.
    click("I’m Kaleb · ready");
    expect(screen.getByText("Ella wrote their own. Guess in your own words.")).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Ideas to tap" })).getAllByRole("button")).toHaveLength(10);
    type("Your guess", "Ducks at the pond");
    click(/Use this guess/);
    fireEvent.click(screen.getByRole("button", { name: "Making something" }));
    expect(seen.at(-1)).toMatchObject({ type: "answer", texts: ["Ducks at the pond", null] });
    // Iris taps an idea to fill her guess.
    click("I’m Iris · ready");
    fireEvent.click(within(screen.getByRole("group", { name: "Ideas to tap" })).getByRole("button", { name: "Playing outside" }));
    click(/Use this guess/);
    fireEvent.click(screen.getByRole("button", { name: "Playing outside" }));
    // Everyone looks; Ella judges.
    expect(game().stage).toBe("judge");
    expect(screen.getByRole("heading", { name: /Ella wrote\s*Feeding the ducks/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /See everyone’s joys/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(screen.getByRole("group", { name: "How close was Kaleb?" })).getByRole("button", { name: "Got it" }));
    fireEvent.click(within(screen.getByRole("group", { name: "How close was Iris?" })).getByRole("button", { name: "Close" }));
    click(/See everyone’s joys/);
    expect(screen.getByRole("heading", { name: "What lights each of you up" })).toBeTruthy();
    expect(screen.getByText("Feeding the ducks")).toBeTruthy();
    expect(screen.getByText(/was close with “Playing outside”/)).toBeTruthy();
    expect(screen.getByText("Ella 2 of 2 · Kaleb 2 of 2 · Iris 1 of 2 and close once")).toBeTruthy();
  });

  it("a story line can be written instead of picked", () => {
    const { seen } = play(
      advanceGame(
        newGame("story", [
          { id: "a", name: "Iris", audience: "adult" as const },
          { id: "b", name: "Kaleb", audience: "adult" as const },
        ]),
        { type: "start" },
      ),
    );
    click("Write your own…");
    type("Your own line", "a goose in a tiny scarf");
    click(/Use this/);
    expect(seen.at(-1)).toEqual({ type: "choice", choice: null, text: "a goose in a tiny scarf" });
    click("I’m Kaleb · ready");
    expect(screen.getByText(/So far: On an ordinary walk, we found a goose in a tiny scarf\./)).toBeTruthy();
    // Back to the list closes the field without answering.
    click("Write your own…");
    click("Back to the list");
    expect(screen.getByRole("button", { name: "Write your own…" })).toBeTruthy();
  });

  it("a Spot it! square can be changed before and during play", () => {
    const { game } = play(
      newGame("spot", [
        { id: "a", name: "Alex", audience: "adult" as const },
        { id: "l", name: "Leo", audience: "adult" as const },
      ]),
    );
    const first = game().spot!.squares[0];
    const buttons = screen.getAllByRole("button", { name: /^Change this square:/ });
    fireEvent.click(buttons[0]);
    type(/Instead of/, "A purple car");
    click("Use this");
    expect(game().spot!.own![0]).toBe("A purple car");
    expect(game().spot!.squares[0]).toBe(first);
    expect(screen.getByText("A purple car")).toBeTruthy();
    click(/Start spotting/);
    click("A purple car");
    click("Leo");
    expect(game().spot!.marks[0]).toBe(1);
    click(/A purple car, spotted by Leo/);
    click("Change this square");
    expect(screen.getByText("Something new to spot, so Leo hasn’t spotted it yet.")).toBeTruthy();
    type("Your own square", "A llama");
    click("Use this");
    expect(game().spot!.own![0]).toBe("A llama");
    expect(game().spot!.marks[0]).toBeNull();
    expect(screen.getByRole("button", { name: "A llama" })).toBeTruthy();
  });
});
