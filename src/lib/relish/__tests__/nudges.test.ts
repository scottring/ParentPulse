import { describe, expect, it } from "vitest";
import { emptyBook, type Book } from "../model";
import { nudgeStart, nudgesFor, nudgeTemplates } from "../nudges";
import { ageBands, type Audience } from "../profiles";
import { toolById, toolsFor } from "../tools";
import { gameKinds } from "../living";
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
