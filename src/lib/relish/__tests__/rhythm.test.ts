import { describe, it, expect } from "vitest";
import { emptyBook, isBook, sampleBook, type WeeklyReview } from "../model";
import { getRhythm, dayKey, weekStart, keepReview } from "../rhythm";
const now = new Date(2026, 9, 29, 12);
const review: WeeklyReview = {
  id: "review",
  weekStart: "2026-10-26",
  reflection: "Private learning",
  next: "Listen more",
  createdAt: now.toISOString(),
};
describe("a gentle, calendar-based rhythm", () => {
  it("guides a new book through people and first moments", () => {
    const book = emptyBook("Alex");
    expect(getRhythm(book, now).next).toBe("person");
    book.people = sampleBook().people;
    expect(getRhythm(book, now).next).toBe("notice");
  });
  it("counts this week only and excludes future moments", () => {
    const book = sampleBook();
    book.moments = [
      ...book.moments,
      {
        ...book.moments[0],
        id: "old",
        createdAt: new Date(2026, 9, 25, 23, 59).toISOString(),
      },
      {
        ...book.moments[0],
        id: "future",
        createdAt: new Date(2026, 9, 30).toISOString(),
      },
    ];
    expect(getRhythm(book, now).current.map((m) => m.id)).toEqual([
      "sample1",
      "sample2",
    ]);
  });
  it("waits a full day before inviting a return, prioritizing the oldest open thread", () => {
    const book = sampleBook();
    book.moments = [
      {
        ...book.moments[1],
        id: "fresh",
        createdAt: new Date(2026, 9, 29, 10).toISOString(),
      },
      {
        ...book.moments[1],
        id: "old",
        createdAt: new Date(2026, 9, 27, 10).toISOString(),
      },
    ];
    expect(getRhythm(book, now).waiting.map((m) => m.id)).toEqual(["old"]);
    book.moments[1].completedAt = now.toISOString();
    expect(getRhythm(book, now).next).toBe("notice");
  });
  it("invites a review on the chosen day, then advances to next week after saving", () => {
    const book = sampleBook();
    book.rhythm = { target: 3, reviewDay: 4 };
    expect(getRhythm(book, now).next).toBe("review");
    const updated = keepReview(book, review);
    const state = getRhythm(updated, now);
    expect(state.review).toEqual(review);
    expect(state.due).toBe(false);
    expect(dayKey(state.reviewDate)).toBe("2026-11-05");
  });
  it("replaces the same week’s reflection without deleting earlier weeks", () => {
    const book = {
      ...sampleBook(),
      reviews: [{ ...review, id: "old", weekStart: "2026-10-19" }, review],
    };
    const updated = keepReview(book, { ...review, reflection: "Revised" });
    expect(updated.reviews).toHaveLength(2);
    expect(updated.reviews?.[0].reflection).toBe("Revised");
    expect(book.reviews[1].reflection).toBe("Private learning");
  });
  it("uses calendar weeks across Sunday, Monday, and the end of daylight saving", () => {
    expect(dayKey(weekStart(new Date(2026, 10, 1, 23, 59)))).toBe("2026-10-26");
    expect(dayKey(weekStart(new Date(2026, 10, 2, 0, 1)))).toBe("2026-11-02");
    const state = getRhythm(
      { ...sampleBook(), reviews: [review] },
      new Date(2026, 10, 2, 12),
    );
    expect(state.current).toHaveLength(0);
    expect(state.review).toBeUndefined();
    expect(state.settings.target).toBe(3);
  });
  it("treats the target as enough and never accumulates missed-week quotas", () => {
    const book = sampleBook();
    book.rhythm = { target: 1, reviewDay: 0 };
    book.moments = book.moments.filter((m) => m.completedAt);
    expect(getRhythm(book, now).next).toBe("enough");
    const later = getRhythm(book, new Date(2026, 11, 10));
    expect(later.settings.target).toBe(1);
    expect(later.current).toHaveLength(0);
  });
  it("accepts old books and validates optional private rhythm data", () => {
    expect(isBook(emptyBook("Alex"))).toBe(true);
    expect(
      isBook({
        ...sampleBook(),
        reviews: [review],
        rhythm: { target: 3, reviewDay: 0 },
      }),
    ).toBe(true);
    expect(
      isBook({ ...sampleBook(), rhythm: { target: 3, reviewDay: 9 } }),
    ).toBe(false);
    expect(
      isBook({ ...sampleBook(), rhythm: { target: 100, reviewDay: 0 } }),
    ).toBe(false);
    expect(
      isBook({ ...sampleBook(), reviews: [{ ...review, reflection: 4 }] }),
    ).toBe(false);
  });
});
