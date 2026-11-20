import { describe, expect, it } from "vitest";
import { emptyBook, type Book } from "../model";
import {
  isSuggestionTaken,
  nudgeStart,
  nudgeStatus,
  nudgesFor,
  nudgeTemplates,
  takeSuggestion,
} from "../nudges";
import { isBook } from "../model";
import { saveExerciseRun, todayKey } from "../tools";
import type { JournalEntry } from "../journal";
import { ageBands, type Audience } from "../profiles";
import { toolById, toolsFor } from "../tools";
import { gameKinds, livingOf } from "../living";
import { pageKind } from "../catalog";
import type { BookPage } from "../pages";

const bookFor = (audience: Audience): Book =>
  audience === "adult"
    ? { ...emptyBook("Robin"), profile: { kind: "adult" } }
    : {
        ...emptyBook("Robin"),
        profile: {
          kind: "child",
          ageBand: audience,
          parentLock: { accountUid: "parent" },
        },
      };

describe("Try this today", () => {
  it("offers several suggestions for every age, each opening a flow that exists for that age", () => {
    for (const audience of [...ageBands, "adult" as const]) {
      const list = nudgesFor(bookFor(audience));
      expect(list.length).toBeGreaterThanOrEqual(3);
      for (const n of list) {
        expect(n.text && n.why && n.time && n.cta).toBeTruthy();
        if (n.action.kind === "exercise") {
          expect(toolById(n.action.id)).toBeTruthy();
          expect(toolsFor(audience).map((t) => t.id)).toContain(n.action.id);
        }
        if (n.action.kind === "game")
          expect(gameKinds).toContain(n.action.game);
      }
    }
  });
  it("never offers adult suggestions in a child’s book", () => {
    const adultIds = nudgeTemplates
      .filter((t) => t.audiences.includes("adult"))
      .map((t) => t.id);
    for (const band of ageBands)
      for (const n of nudgesFor(bookFor(band)))
        expect(adultIds).not.toContain(n.id);
  });
  it("fills in family names when known, and reads naturally without them", () => {
    const named = nudgesFor(bookFor("adult"), ["Ella", "Kaleb"]);
    expect(named.some((n) => n.text.includes("Ella"))).toBe(true);
    expect(named.some((n) => n.text.includes("Kaleb"))).toBe(true);
    for (const n of nudgesFor(bookFor("adult"), []))
      expect(n.text).not.toMatch(/\{name\}|undefined/);
  });
  it("rotates by day and stays in range", () => {
    const a = nudgeStart(7, new Date(2026, 10, 18));
    const b = nudgeStart(7, new Date(2026, 10, 19));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(7);
    expect(b).toBe((a + 1) % 7);
    expect(nudgeStart(0)).toBe(0);
  });
});

describe("page kinds", () => {
  const page = (over: Partial<BookPage>): BookPage => ({
    id: "x",
    kind: "Journal entry",
    title: "A day",
    text: "Words",
    date: "2026-11-01T00:00:00Z",
    style: "sky",
    sections: [],
    photos: [],
    people: [],
    ...over,
  });
  it("labels journal, exercise, game, reflection, shared and photo pages", () => {
    expect(pageKind(page({})).label).toBe("Journal");
    expect(pageKind(page({ title: "Ten real hellos · Sam" })).label).toBe(
      "Exercise",
    );
    expect(pageKind(page({ kind: "Made together" })).label).toBe("Game");
    expect(pageKind(page({ kind: "Guided reflection" })).label).toBe(
      "Reflection",
    );
    expect(pageKind(page({ kind: "Received passage" })).label).toBe("Shared");
    expect(
      pageKind(
        page({
          text: "",
          photos: [
            {
              id: "p",
              width: 1,
              height: 1,
              caption: "",
            },
          ],
        }),
      ).label,
    ).toBe("Photo");
  });
});

describe("Do something catalog", () => {
  it("merges writing, thinking, games and the age-fitted exercises into one list", async () => {
    const { doItems, matchesFilter } = await import("../catalog");
    const adultItems = doItems("adult");
    expect(adultItems.map((i) => i.type)).toEqual(
      expect.arrayContaining(["Write", "Think", "Game", "Exercise", "Habit"]),
    );
    expect(adultItems).toHaveLength(2 + gameKinds.length + toolsFor("adult").length);
    const little = doItems("under-6").map((i) => i.title);
    expect(little).not.toContain("Rewrite the opener");
    expect(little).toContain("Kindness spotting");
    const hard = adultItems.filter((i) => matchesFilter(i, "hard"));
    expect(hard.length).toBeGreaterThan(2);
    expect(hard.every((i) => i.tags.includes("hard"))).toBe(true);
    expect(adultItems.filter((i) => matchesFilter(i, "all"))).toHaveLength(
      adultItems.length,
    );
    expect(
      adultItems.filter((i) => matchesFilter(i, "kids")).every((i) => i.type === "Game"),
    ).toBe(true);
  });
});

describe("what came of today's suggestion", () => {
  const now = new Date(2026, 10, 20, 17);
  const adult = (): Book => ({ ...emptyBook("Scott"), profile: { kind: "adult" } });
  const laugh = nudgesFor(adult(), ["Ella"]).find((n) => n.id === "made-you-laugh")!;
  const entry = (status: JournalEntry["status"], text = "Ella wore her boots on her hands."): JournalEntry => ({
    id: "j1",
    title: "",
    text,
    style: "sky",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    revision: 1,
    status,
  });
  it("is untouched until a page with words exists, then a draft, then done", () => {
    let b = adult();
    expect(nudgeStatus(b, laugh, now).state).toBe("start");
    b = takeSuggestion(b, laugh.id, "j1", now);
    expect(nudgeStatus(b, laugh, now).state).toBe("start");
    b = { ...b, journal: [entry("draft", "  ")] };
    expect(nudgeStatus(b, laugh, now).state).toBe("start");
    b = { ...b, journal: [entry("draft")] };
    expect(nudgeStatus(b, laugh, now)).toMatchObject({ state: "draft" });
    b = { ...b, journal: [entry("kept")] };
    expect(nudgeStatus(b, laugh, now)).toMatchObject({ state: "done", pageId: "journal:j1" });
    // Tomorrow it is a new day and a fresh card.
    expect(nudgeStatus(b, laugh, new Date(2026, 10, 21, 9)).state).toBe("start");
  });
  it("an exercise suggestion is under way while its sort is saved, done once its page is kept", () => {
    const n = nudgesFor(adult()).find((x) => x.action.kind === "exercise" && x.id === "unseen-work")!;
    let b = saveExerciseRun(adult(), {
      toolId: "unseen",
      who: "",
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      sort: { subject: "", placed: { Laundry: "me" }, picks: {}, extra: [], skipped: [] },
    });
    expect(nudgeStatus(b, n, now)).toMatchObject({ state: "going" });
    b = {
      ...b,
      journal: [{ ...entry("kept", "Laundry"), source: { kind: "exercise", toolId: "unseen" } }],
    };
    expect(nudgeStatus(b, n, now)).toMatchObject({ state: "done", pageId: "journal:j1" });
  });
  it("a game suggestion is done once a round was played today", () => {
    const n = nudgesFor(adult()).find((x) => x.id === "same-page-tonight")!;
    const b: Book = {
      ...adult(),
      living: {
        ...livingOf(adult()),
        plays: [
          {
            id: "r1",
            kind: "match",
            players: [
              { id: "a", name: "Scott" },
              { id: "b", name: "Iris" },
            ],
            playedAt: now.toISOString(),
          },
        ],
      },
    };
    expect(nudgeStatus(b, n, now)).toMatchObject({ state: "done", played: true, pageId: "play:r1" });
  });
  it("the saved suggestion is checked when a book opens", () => {
    expect(isSuggestionTaken({ day: todayKey(now), id: "made-you-laugh", journalId: "j1" })).toBe(true);
    expect(isSuggestionTaken({ day: "Nov 20", id: "x" })).toBe(false);
    expect(isSuggestionTaken({ day: "2026-11-20", id: "" })).toBe(false);
    expect(isBook({ ...adult(), suggestion: { day: "2026-11-20", id: "x" } })).toBe(true);
    expect(isBook({ ...adult(), suggestion: { day: 5, id: "x" } })).toBe(false);
  });
});
