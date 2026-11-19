import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, type Book } from "../model";
import {
  doItems,
  doLabel,
  doLines,
  fitsWithin,
  matchesFilter,
  onlyReopens,
  parseTime,
  underWay,
} from "../catalog";
import { beginVisit, livingOf, newGame, pauseVisit } from "../living";
import { newJournalDraft, writeJournalPage } from "../journal";
import { startDay, startTracker, todayKey, toggleMark } from "../tools";
import { ageBands, type Audience } from "../profiles";

Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const audiences: Audience[] = [...ageBands, "adult"];

describe("reading time labels", () => {
  it("reads single times and ranges in minutes", () => {
    expect(parseTime("3 min")).toEqual({ min: 3, max: 3 });
    expect(parseTime("5–10 min")).toEqual({ min: 5, max: 10 });
    expect(parseTime("5-10 mins")).toEqual({ min: 5, max: 10 });
    expect(parseTime("5 — 10 minutes")).toEqual({ min: 5, max: 10 });
    expect(parseTime("1 minute")).toEqual({ min: 1, max: 1 });
  });
  it("reads words for a minute or less", () => {
    expect(parseTime("Under a minute")).toEqual({ min: 0, max: 1 });
    expect(parseTime("about a minute")).toEqual({ min: 1, max: 1 });
    expect(parseTime("a moment")).toEqual({ min: 0, max: 1 });
  });
  it("reads a habit as time each day or each time, plus how long it runs", () => {
    expect(parseTime("under a minute a day, 10 days")).toEqual({
      min: 0,
      max: 1,
      each: "day",
      days: { min: 10, max: 10 },
    });
    expect(parseTime("About a minute a day, 7 days")).toEqual({
      min: 1,
      max: 1,
      each: "day",
      days: { min: 7, max: 7 },
    });
    expect(parseTime("a moment each time, 1–2 weeks")).toEqual({
      min: 0,
      max: 1,
      each: "time",
      days: { min: 7, max: 14 },
    });
    expect(parseTime("a moment each time, about a week")?.days).toEqual({ min: 7, max: 7 });
  });
  it("treats an open length as no time at all, and odd labels as unreadable", () => {
    expect(parseTime("Any length")).toEqual({});
    for (const odd of [
      "",
      "soon",
      "10–5 min",
      "1 min a day",
      "1–2 weeks",
      "any length a day, 10 days",
      "3 min, 4 min, 5 min",
      "About a minute each",
      "10 days, at your pace",
    ])
      expect(parseTime(odd), odd).toBeNull();
  });
  it("fits a limit only when the longest it takes is within it", () => {
    expect(fitsWithin(parseTime("5 min"), 5)).toBe(true);
    expect(fitsWithin(parseTime("5–10 min"), 5)).toBe(false);
    expect(fitsWithin(parseTime("2 min"), 1)).toBe(false);
    expect(fitsWithin(parseTime("under a minute a day, 10 days"), 1)).toBe(true);
    expect(fitsWithin(parseTime("Any length"), 60)).toBe(false);
    expect(fitsWithin(null, 5)).toBe(false);
  });
});

describe("the live catalog", () => {
  it("every card's time label reads, and the time filters follow it exactly", () => {
    for (const audience of audiences)
      for (const item of doItems(audience)) {
        // Only Spot it! has an open length.
        if (item.key === "game:spot") expect(item.duration).toEqual({});
        else expect(item.duration?.max, `${audience} ${item.key} "${item.time}"`).toBeTypeOf("number");
        expect(item.duration).toEqual(parseTime(item.time));
        for (const [filter, limit] of [["1", 1], ["5", 5]] as const)
          expect(matchesFilter(item, filter)).toBe(
            item.duration?.max !== undefined && item.duration.max <= limit,
          );
      }
  });
  it("sorts the adult catalog by time as the card says", () => {
    const adult = doItems("adult");
    const keys = (f: "1" | "5") => adult.filter((i) => matchesFilter(i, f)).map((i) => i.key);
    expect(keys("1").toSorted()).toEqual(
      ["write", "hellos", "thanks-week", "repair-bingo"].toSorted(),
    );
    // 5–10 minute games, Day's highlights and Spot it! (any length) are out.
    expect(keys("5")).not.toContain("game:match");
    expect(keys("5")).not.toContain("game:joy");
    expect(keys("5")).not.toContain("game:story");
    expect(keys("5")).not.toContain("game:spot");
    expect(keys("5")).not.toContain("day-highlights");
    expect(keys("5")).toContain("load");
    expect(keys("5")).toContain("unseen");
    expect(keys("1")).not.toContain("unseen");
  });
  it("labels each card with one type and time, habits by the day", () => {
    const byKey = (audience: Audience, key: string) =>
      doLabel(doItems(audience).find((i) => i.key === key)!);
    expect(byKey("adult", "repair")).toBe("Exercise · 3 min");
    expect(byKey("adult", "game:match")).toBe("Game · 5–10 min");
    expect(byKey("adult", "game:spot")).toBe("Game · any length");
    expect(byKey("adult", "hellos")).toBe("Habit · under a minute a day, 10 days");
    expect(byKey("adult", "repair-bingo")).toBe("Habit · a moment each time, 1–2 weeks");
    expect(byKey("6-8", "kindness-bingo")).toBe("Habit · a moment each time, about a week");
    expect(byKey("adult", "day-highlights")).toBe("Exercise · 5–10 min");
  });
  it("gives every card one short sentence of its own", () => {
    for (const audience of audiences)
      for (const item of doItems(audience)) {
        expect(doLines[item.key], item.key).toBeTruthy();
        expect(item.line).toBe(doLines[item.key]);
        expect(item.line.split(/\s+/).length, item.line).toBeLessThanOrEqual(12);
      }
  });
  it("keeps mood filters and audience limits as they were", () => {
    expect(doItems("under-6").map((i) => i.key)).not.toContain("soft-start");
    const hard = doItems("adult").filter((i) => matchesFilter(i, "hard")).map((i) => i.key);
    expect(hard).toEqual(
      expect.arrayContaining(["think", "iceberg", "soft-start", "thought-court", "repair", "repair-bingo"]),
    );
    const kids = doItems("adult").filter((i) => matchesFilter(i, "kids"));
    expect(kids.every((i) => i.type === "Game")).toBe(true);
  });
});

describe("what's under way", () => {
  const family = (): Book => ({
    ...emptyBook("Robin"),
    profile: { kind: "adult" },
    people: [{ id: "kit", name: "Kit", role: "child", color: "rose", note: "", lessons: [] }],
  });
  const players = [
    { id: "a", name: "Robin" },
    { id: "b", name: "Kit" },
  ];
  it("is empty when nothing is started", () => {
    expect(underWay(family())).toEqual([]);
  });
  it("lists a game, a paused reflection, a draft, a day and a habit, newest first", () => {
    let book = family();
    book = { ...book, living: { ...livingOf(book), game: newGame("match", players) } };
    book = pauseVisit(beginVisit(book));
    book = writeJournalPage(book, { ...newJournalDraft(), text: "Pancakes\nand more" }, 0, "draft");
    book = startDay(book, [{ id: "a", name: "Leo" }]);
    book = startTracker(book, "hellos", "kit");
    // Give each a distinct time so the order is clear.
    const l = livingOf(book);
    book = {
      ...book,
      living: {
        ...l,
        game: { ...l.game!, updatedAt: "2026-11-18T10:00:00.000Z" },
        visit: { ...l.visit!, updatedAt: "2026-11-18T12:00:00.000Z" },
      },
      journal: book.journal!.map((e) => ({ ...e, updatedAt: "2026-11-18T09:00:00.000Z" })),
      tools: {
        ...book.tools!,
        day: { ...book.tools!.day!, updatedAt: "2026-11-18T11:00:00.000Z" },
        trackers: book.tools!.trackers.map((t) => ({ ...t, startedAt: "2026-11-18T08:00:00.000Z" })),
      },
    };
    const all = underWay(book, 10);
    expect(all.map((g) => [g.kind, g.title, g.label])).toEqual([
      ["visit", "Think it through", "Continue writing"],
      ["day", "Day’s highlights", "Continue"],
      ["game", "Same page?", "Resume game"],
      ["draft", "Pancakes", "Keep writing"],
      ["habit", "Ten real hellos", "Mark today"],
    ]);
    expect(all.find((g) => g.kind === "day")?.detail).toBe("Leo’s turn");
    expect(all.find((g) => g.kind === "habit")?.detail).toBe("0 of 10");
    // A few at most.
    expect(underWay(book)).toHaveLength(4);
  });
  it("leaves out a finished game and says Continue once today is marked", () => {
    let book = startTracker(family(), "hellos", "kit");
    const game = { ...newGame("joy", players), stage: "finished" as const };
    book = { ...book, living: { ...livingOf(book), game } };
    book = toggleMark(book, book.tools!.trackers[0].id, todayKey());
    expect(underWay(book).map((g) => [g.title, g.label])).toEqual([["Ten real hellos", "Continue"]]);
  });
  it("keeps a new game or page in the grid but not a card that would only reopen", () => {
    let book = family();
    book = { ...book, living: { ...livingOf(book), game: newGame("match", players) } };
    book = startTracker(pauseVisit(beginVisit(book)), "hellos", "kit");
    book = writeJournalPage(book, { ...newJournalDraft(), text: "x" }, 0, "draft");
    const going = underWay(book, 10);
    const hidden = doItems("adult")
      .filter((i) => onlyReopens(i, going))
      .map((i) => i.key);
    expect(hidden.toSorted()).toEqual(["hellos", "think"]);
  });
});
