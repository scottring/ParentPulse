import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook } from "../model";
import { createVault, unlockVault } from "../vault";
import {
  ANSWERS_KEPT,
  advanceGame,
  changeLiving,
  cleanPlace,
  finishGame,
  freshLiving,
  gameText,
  isLiving,
  keepGame,
  livingOf,
  newGame,
  playMemory,
  recordRound,
  SPOT_ALL,
  spotLines,
  spotSummary,
  startGame,
  type Game,
  type LivingState,
  type PlayRecord,
} from "../living";
import { SPOT_SIZE, spotBank, spotSquare } from "../play-content";
import { bookPages } from "../pages";
import { doItems, matchesFilter } from "../catalog";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

const car = [
  { id: "owner", name: "Alex", audience: "adult" as const },
  { id: "anna", name: "Anna" },
  { id: "leo", name: "Leo", audience: "6-8" as const },
];
const valid = (game: Game, l: LivingState = freshLiving()) =>
  isLiving({ ...l, game });
function started(place?: string) {
  return advanceGame(newGame("spot", car), { type: "start", ...(place !== undefined ? { place } : {}) });
}

describe("Spot it!: one card for the car", () => {
  it("deals nine different squares fitted to the youngest player, ready to swap", () => {
    const g = newGame("spot", car);
    expect(g).toMatchObject({ kind: "spot", contentVersion: 2, stage: "ready", turn: 0 });
    // Anna has no age, so the card is the simplest one.
    expect(g.audience).toBe("under-6");
    expect(g.spot!.squares).toHaveLength(SPOT_SIZE);
    expect(new Set(g.spot!.squares).size).toBe(SPOT_SIZE);
    const bank = spotBank("under-6").map((x) => x.id);
    expect(g.spot!.squares.every((id) => bank.includes(id))).toBe(true);
    expect(g.spot!.marks.every((m) => m === null)).toBe(true);
    expect(valid(g)).toBe(true);
    const older = newGame("spot", [car[0], { ...car[2], audience: "9-12" }]);
    expect(older.spot!.squares.every((id) => id.startsWith("o-"))).toBe(true);

    const swapped = advanceGame(g, { type: "swap", square: 4 });
    expect(swapped.spot!.squares[4]).not.toBe(g.spot!.squares[4]);
    expect(swapped.spot!.squares.filter((_, i) => i !== 4)).toEqual(
      g.spot!.squares.filter((_, i) => i !== 4),
    );
    expect(new Set(swapped.spot!.squares).size).toBe(SPOT_SIZE);
    expect(valid(swapped)).toBe(true);
    expect(() => advanceGame(g, { type: "swap", square: 9 })).toThrow("square");
    expect(() => advanceGame(started(), { type: "swap", square: 0 })).toThrow();
  });

  it("prefers squares the family hasn't had on a recent card", () => {
    let l = freshLiving();
    l = startGame(l, "spot", car);
    l = { ...l, game: advanceGame(advanceGame(l.game!, { type: "start" }), { type: "done" }) };
    const first = l.game!.spot!.squares;
    l = startGame(l, "spot", car);
    expect(l.plays).toHaveLength(1);
    // 24 under-6 squares: a second card of nine needs none of the first.
    expect(l.game!.spot!.squares.some((id) => first.includes(id))).toBe(false);
  });

  it("each tap marks who spotted it, saved straight into the game", () => {
    let g = started(" on the way to Grandma’s. ");
    expect(g.place).toBe("Grandma’s");
    g = advanceGame(g, { type: "spot", square: 0, by: 1 });
    g = advanceGame(g, { type: "spot", square: 1, by: 1 });
    g = advanceGame(g, { type: "spot", square: 2, by: 2 });
    expect(spotLines(g.spot!)).toBe(1);
    g = advanceGame(g, { type: "spot", square: 4, by: SPOT_ALL });
    expect(g.spot!.marks).toEqual([1, 1, 2, null, SPOT_ALL, null, null, null, null]);
    expect(valid(g)).toBe(true);
    expect(spotSummary(g.players, g.spot!)).toBe("Anna spotted the most: 2.");
    // Tap again to change who, or clear it.
    g = advanceGame(g, { type: "spot", square: 1, by: 2 });
    expect(spotSummary(g.players, g.spot!)).toBe("Leo spotted the most: 2.");
    g = advanceGame(g, { type: "spot", square: 1, by: null });
    expect(g.spot!.marks[1]).toBeNull();
    expect(spotSummary(g.players, g.spot!)).toBe("Anna and Leo each spotted 1.");
    expect(() => advanceGame(g, { type: "spot", square: 3, by: 3 })).toThrow("who");
    expect(() => advanceGame(g, { type: "spot", square: -1, by: 0 })).toThrow();
    expect(() => advanceGame(g, { type: "choice", choice: 0 })).toThrow();
    expect(() => advanceGame(g, { type: "finish" })).toThrow();
  });

  it("says plainly who spotted the most, together, or nothing at all", () => {
    const g = started();
    expect(spotSummary(g.players, g.spot!)).toBe("Nothing spotted this time.");
    const together = advanceGame(g, { type: "spot", square: 3, by: SPOT_ALL });
    expect(spotSummary(together.players, together.spot!)).toBe("You spotted 1 together.");
    expect(cleanPlace("Heading to the lake")).toBe("the lake");
    expect(cleanPlace("x".repeat(90))).toHaveLength(60);
  });

  it("can finish any time: the card is kept with the round in the hosting book", () => {
    let book = changeLiving(emptyBook("Alex"), (l) => startGame(l, "spot", car));
    const play = (fn: (g: Game) => Game) =>
      (book = changeLiving(book, (l) => ({ ...l, game: fn(l.game!) })));
    play((g) => advanceGame(g, { type: "start", place: "Grandma’s" }));
    play((g) => advanceGame(g, { type: "spot", square: 0, by: 1 }));
    play((g) => advanceGame(g, { type: "spot", square: 5, by: 1 }));
    play((g) => advanceGame(g, { type: "spot", square: 8, by: SPOT_ALL }));
    play((g) => advanceGame(g, { type: "done" }));
    const g = livingOf(book).game!;
    expect(g.stage).toBe("reveal");
    const first = spotSquare(g.spot!.squares[0])!.text;
    expect(gameText(g).split("\n")).toEqual([
      "On the way to Grandma’s. 3 of 9 spotted. Anna spotted the most: 2.",
      `${first}: Anna.`,
      `${spotSquare(g.spot!.squares[5])!.text}: Anna.`,
      `${spotSquare(g.spot!.squares[8])!.text}: everyone.`,
    ]);
    play((x) => advanceGame(x, { type: "reflect", playerId: "leo", text: "I saw the cow first!" }));
    book = finishGame(book);
    expect(isBook(book)).toBe(true);
    const [record] = livingOf(book).plays!;
    expect(record).toMatchObject({
      kind: "spot",
      place: "Grandma’s",
      spot: { squares: g.spot!.squares, marks: [1, null, null, null, null, 1, null, null, SPOT_ALL] },
      reflections: [{ playerId: "leo", text: "I saw the cow first!" }],
    });
    const memory = playMemory(record);
    expect(memory.summary).toBe("Anna spotted the most: 2. 3 of 9 spotted.");
    expect(memory.sections[0].label).toBe("Spotted");
    expect(memory.sections[0].text).toContain(`${first}: Anna`);
    expect(memory.sections[1].label).toBe("Still out there");
    expect(memory.sections.at(-1)).toEqual({ label: "Leo remembers", text: "I saw the cow first!" });
    const page = bookPages(book).find((p) => p.id === `play:${record.id}`)!;
    expect(page.title).toBe("Spot it! on the way to Grandma’s");
  });

  it("a shared page needs everyone's approval, and is named for the trip", () => {
    let book = changeLiving(emptyBook("Alex"), (l) => startGame(l, "spot", car.slice(0, 2)));
    const play = (fn: (g: Game) => Game) =>
      (book = changeLiving(book, (l) => ({ ...l, game: fn(l.game!) })));
    play((g) => advanceGame(g, { type: "start" }));
    play((g) => advanceGame(g, { type: "spot", square: 2, by: 0 }));
    play((g) => advanceGame(g, { type: "done" }));
    play((g) => advanceGame(g, { type: "place", place: "the coast" }));
    expect(() => keepGame(book)).toThrow("approve");
    play((g) => advanceGame(g, { type: "approve", playerId: "owner" }));
    play((g) => advanceGame(g, { type: "approve", playerId: "anna" }));
    book = keepGame(book);
    expect(livingOf(book).sharedPages[0].title).toBe("Spot it! on the way to the coast");
    expect(isBook(book)).toBe(true);
  });

  it("validators accept old and new shapes and reject malformed cards", () => {
    const g = advanceGame(started("Grandma’s"), { type: "spot", square: 0, by: 0 });
    expect(valid(g)).toBe(true);
    const bad: unknown[] = [
      { ...g, spot: { ...g.spot!, squares: g.spot!.squares.slice(0, 8) } },
      { ...g, spot: { ...g.spot!, squares: [...g.spot!.squares.slice(0, 8), g.spot!.squares[0]] } },
      { ...g, spot: { ...g.spot!, squares: [...g.spot!.squares.slice(0, 8), "made-up"] } },
      { ...g, spot: { ...g.spot!, marks: [3, ...g.spot!.marks.slice(1)] } },
      { ...g, spot: { ...g.spot!, marks: [-2, ...g.spot!.marks.slice(1)] } },
      { ...g, spot: { ...g.spot!, marks: ["anna", ...g.spot!.marks.slice(1)] } },
      { ...g, spot: { ...g.spot!, marks: g.spot!.marks.slice(1) } },
      { ...g, spot: undefined },
      { ...g, stage: "ready" },
      { ...g, stage: "handoff" },
      { ...g, turn: 1 },
      { ...g, answers: [[0]] },
      { ...g, place: "x".repeat(61) },
      { ...g, place: "  " },
      { ...g, contentVersion: 1 },
      { ...newGame("joy", car), place: "Grandma’s" },
      { ...newGame("joy", car), spot: g.spot },
    ];
    for (const game of bad) expect(isLiving({ ...freshLiving(), game })).toBe(false);

    const record: PlayRecord = {
      id: "r1",
      kind: "spot",
      players: car.map(({ id, name }) => ({ id, name })),
      playedAt: "2026-11-18T10:00:00.000Z",
      spot: { squares: g.spot!.squares, marks: [0, 1, 2, SPOT_ALL, null, null, null, null, null] },
      place: "Grandma’s",
    };
    const withPlays = (plays: unknown[]) => isLiving({ ...freshLiving(), plays });
    // Older rounds: no card, no place. A retired square never blocks a book.
    expect(withPlays([{ ...record, spot: undefined, place: undefined }])).toBe(true);
    expect(withPlays([record])).toBe(true);
    expect(
      withPlays([{ ...record, spot: { ...record.spot!, squares: [...record.spot!.squares.slice(0, 8), "retired"] } }]),
    ).toBe(true);
    expect(withPlays([{ ...record, spot: { ...record.spot!, marks: [3, ...record.spot!.marks.slice(1)] } }])).toBe(false);
    expect(withPlays([{ ...record, spot: { squares: [], marks: [] } }])).toBe(false);
    expect(withPlays([{ ...record, kind: "joy" }])).toBe(false);
    expect(withPlays([{ ...record, spot: undefined, kind: "joy" }])).toBe(false);
    expect(withPlays([{ ...record, place: "" }])).toBe(false);
  });

  it("keeps cards on the newest rounds only", () => {
    const record = (i: number): PlayRecord => ({
      id: `r${i}`,
      kind: "spot",
      players: car.slice(0, 2).map(({ id, name }) => ({ id, name })),
      playedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      spot: { squares: spotBank("adult").slice(0, 9).map((x) => x.id), marks: Array(9).fill(0) },
      place: "the lake",
    });
    let l: LivingState = {
      ...freshLiving(),
      plays: Array.from({ length: ANSWERS_KEPT }, (_, i) => record(i)),
    };
    l = startGame(l, "spot", car);
    l = { ...l, game: advanceGame(advanceGame(l.game!, { type: "start" }), { type: "done" }) };
    l = recordRound(l);
    expect(isLiving(l)).toBe(true);
    expect(l.plays![0].spot).toBeUndefined();
    expect(l.plays![0].place).toBeUndefined();
    expect(l.plays!.at(-1)!.spot).toBeDefined();
  });

  it("encrypts an open card and a kept one through export and restore", async () => {
    let book = changeLiving(emptyBook("Alex"), (l) => startGame(l, "spot", car));
    book = changeLiving(book, (l) => ({
      ...l,
      game: advanceGame(advanceGame(l.game!, { type: "start", place: "Grandma’s" }), {
        type: "done",
      }),
    }));
    book = finishGame(book);
    book = changeLiving(book, (l) => startGame(l, "spot", car));
    book = changeLiving(book, (l) => ({
      ...l,
      game: advanceGame(advanceGame(l.game!, { type: "start", place: "the lake" }), {
        type: "spot",
        square: 0,
        by: 2,
      }),
    }));
    expect(isBook(book)).toBe(true);
    const { envelope } = await createVault(book, "long testing-only passphrase");
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("Grandma");
    expect(raw).not.toContain("lake");
    expect((await unlockVault(raw, "long testing-only passphrase")).book).toEqual(book);
  });
});

describe("Road trip in Do something", () => {
  it("a Road trip chip shows the car activities, for grown-ups and kids alike", () => {
    for (const audience of ["adult", "under-6", "13-17"] as const) {
      const trip = doItems(audience).filter((i) => matchesFilter(i, "trip"));
      expect(trip.map((i) => i.title)).toContain("Spot it!");
    }
    expect(
      doItems("adult")
        .filter((i) => matchesFilter(i, "kids"))
        .map((i) => i.title),
    ).toContain("Spot it!");
  });
});
