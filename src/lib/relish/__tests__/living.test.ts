import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import { createVault, unlockVault } from "../vault";
import {
  advanceGame,
  beginVisit,
  changeLiving,
  chooseThread,
  completeVisit,
  freshLiving,
  gameText,
  isLiving,
  keepGame,
  livingOf,
  markTried,
  newGame,
  nextKind,
  pauseVisit,
  pendingPractice,
  turnCount,
  updateDraft,
  type Draft,
  type Game,
} from "../living";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const draft: Draft = {
  text: "A small sample moment",
  opportunity: "a meal together",
  outcome: "time",
  perspective: "",
};
function begun() {
  return chooseThread(beginVisit(emptyBook("Alex")), "listen");
}
function completeRound(count: number, kind: Game["kind"]) {
  let g = advanceGame(
    newGame(
      kind,
      Array.from({ length: count }, (_, i) => ({
        id: String(i),
        name: `Player ${i + 1}`,
      })),
    ),
    { type: "start" },
  );
  while (g.stage !== "reveal") {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "choice", choice: g.turn % 2 === 0 ? 0 : null });
    expect(isLiving({ ...freshLiving(), game: g })).toBe(true);
  }
  return g;
}
describe("bounded living-book sessions", () => {
  it("choosing a thread does not claim a completed moment", () => {
    const book = begun();
    expect(livingOf(book).visit?.step).toBe(1);
    expect(livingOf(book).visit?.status).toBe("active");
    expect(livingOf(book).entries).toHaveLength(0);
  });
  it("keeps a paused draft, resumes the same visit, and completes once", () => {
    let book = begun();
    const id = livingOf(book).visit!.id;
    book = pauseVisit(updateDraft(book, id, draft));
    expect(livingOf(book).visit?.draft).toEqual(draft);
    book = beginVisit(book);
    expect(livingOf(book).visit?.id).toBe(id);
    expect(() => completeVisit(book, id, { ...draft, text: " " })).toThrow(
      "One sentence",
    );
    book = completeVisit(book, id, draft);
    expect(livingOf(book).visit?.status).toBe("complete");
    expect(livingOf(book).entries).toHaveLength(1);
    expect(() => completeVisit(book, id, draft)).toThrow();
    expect(() => updateDraft(book, id, draft)).toThrow();
  });
  it("does not mistake planning for trying, and accepts an unresolved reflection", () => {
    let book = begun();
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    expect(nextKind(book)).toBe("practice");
    book = beginVisit(book);
    book = completeVisit(book, livingOf(book).visit!.id, draft);
    const plan = pendingPractice(book)!;
    expect(plan.triedAt).toBeUndefined();
    expect(nextKind(book)).toBe("reflect");
    book = beginVisit(book);
    expect(() => completeVisit(book, livingOf(book).visit!.id, draft)).toThrow(
      "Mark the practice",
    );
    book = markTried(book, plan.id);
    book = completeVisit(book, livingOf(book).visit!.id, {
      ...draft,
      text: "",
    });
    expect(livingOf(book).entries.at(-1)?.outcome).toBe("time");
    expect(pendingPractice(book)).toBeUndefined();
  });
  it("encrypts a paused draft and game state through export and restore", async () => {
    let book = begun();
    book = pauseVisit(updateDraft(book, livingOf(book).visit!.id, draft));
    book = changeLiving(book, (l) => ({
      ...l,
      game: completeRound(5, "story"),
    }));
    const { envelope } = await createVault(
      book,
      "long testing-only passphrase",
    );
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("small sample");
    expect(raw).not.toContain("Player");
    expect(
      (await unlockVault(raw, "long testing-only passphrase")).book,
    ).toEqual(book);
  });
});
describe("a finite round and explicit consent", () => {
  for (const count of [2, 3, 4, 5, 12])
    for (const kind of ["joy", "story"] as const)
      it(`${count} players complete one ${kind} round with optional sharing`, () => {
        const game = completeRound(count, kind);
        expect(game.turn).toBe(turnCount(game));
        let book = changeLiving(emptyBook("Alex"), (l) => ({ ...l, game }));
        expect(() => keepGame(book)).toThrow("Every player");
        for (const p of game.players.slice(0, -1))
          book = changeLiving(book, (l) => ({
            ...l,
            game: advanceGame(l.game!, { type: "approve", playerId: p.id }),
          }));
        expect(() => keepGame(book)).toThrow("Every player");
        book = changeLiving(book, (l) => ({
          ...l,
          game: advanceGame(l.game!, {
            type: "approve",
            playerId: game.players.at(-1)!.id,
          }),
        }));
        book = keepGame(book);
        expect(isBook(book)).toBe(true);
        expect(livingOf(book).sharedPages[0].text).toBe(gameText(game));
        expect(() => keepGame(book)).toThrow();
        const unsaved = advanceGame(game, { type: "finish" });
        expect(unsaved.stage).toBe("finished");
        expect(unsaved.savedPageId).toBeUndefined();
      });
  it("allows the chooser to pass without inventing a memory or requiring approval", () => {
    const g = advanceGame(
      advanceGame(
        newGame("joy", [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ]),
        { type: "start" },
      ),
      { type: "choice", choice: null },
    );
    expect(g.stage).toBe("reveal");
    expect(gameText(g)).toBe("");
    expect(advanceGame(g, { type: "finish" }).stage).toBe("finished");
    expect(() =>
      keepGame(changeLiving(emptyBook("Alex"), (l) => ({ ...l, game: g }))),
    ).toThrow();
  });
  it("rejects repeated turns, premature finishing, and outsider approval", () => {
    const g = newGame("joy", [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    expect(() => advanceGame(g, { type: "finish" })).toThrow();
    expect(() => advanceGame(g, { type: "choice", choice: 0 })).toThrow();
    const reveal = completeRound(3, "joy");
    expect(() =>
      advanceGame(reveal, { type: "approve", playerId: "outside" }),
    ).toThrow();
  });
});
describe("backup state validation", () => {
  it("still reads pre-living-book backups", () => {
    expect(isBook(emptyBook("Alex"))).toBe(true);
  });
  it("rejects invalid turns, unfinished completion, duplicate players and unknown threads", () => {
    const game = completeRound(3, "story");
    expect(isLiving({ ...freshLiving(), game: { ...game, turn: 99 } })).toBe(
      false,
    );
    expect(
      isLiving({
        ...freshLiving(),
        game: {
          ...game,
          players: [game.players[0], game.players[0], game.players[2]],
        },
      }),
    ).toBe(false);
    expect(isLiving({ ...freshLiving(), thread: "invented" })).toBe(false);
    expect(
      isLiving({
        ...livingOf(begun()),
        visit: { ...livingOf(begun()).visit, status: "complete" },
      }),
    ).toBe(false);
    expect(
      isLiving({
        ...freshLiving(),
        game: { ...game, stage: "kept", savedPageId: "missing" },
      }),
    ).toBe(false);
  });
});
