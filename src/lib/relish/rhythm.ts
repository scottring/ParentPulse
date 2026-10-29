import type { Book, WeeklyReview } from "./model";

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const PACES = [
  {
    target: 1,
    name: "Room to breathe",
    description: "One meaningful moment a week.",
  },
  {
    target: 3,
    name: "A little, often",
    description: "A few small pauses through the week.",
  },
  {
    target: 5,
    name: "Everyday attention",
    description: "A moment on most weekdays.",
  },
] as const;
export const DEFAULT_RHYTHM = { target: 3, reviewDay: 0 } as const;
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function weekStart(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
export function getRhythm(book: Book, now: Date) {
  const settings = book.rhythm ?? DEFAULT_RHYTHM;
  const start = weekStart(now);
  const key = dayKey(start);
  const current = book.moments.filter(
    (m) => new Date(m.createdAt) >= start && new Date(m.createdAt) <= now,
  );
  const review = book.reviews?.find((r) => r.weekStart === key);
  const reviewDate = new Date(start);
  reviewDate.setDate(start.getDate() + ((settings.reviewDay + 6) % 7));
  const due = now >= reviewDate && !review;
  const waiting = book.moments
    .filter(
      (m) =>
        !m.completedAt &&
        m.move.trim() &&
        now.getTime() - new Date(m.createdAt).getTime() >= 86_400_000,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const next: "person" | "notice" | "reflect" | "review" | "enough" = !book
    .people.length
    ? "person"
    : !book.moments.length
      ? "notice"
      : due && current.length
        ? "review"
        : waiting.length
          ? "reflect"
          : current.length >= settings.target
            ? "enough"
            : "notice";
  if (review) reviewDate.setDate(reviewDate.getDate() + 7);
  return {
    settings,
    start,
    key,
    current,
    review,
    due,
    waiting,
    next,
    reviewDate,
  };
}
export function keepReview(book: Book, review: WeeklyReview): Book {
  return {
    ...book,
    reviews: [
      review,
      ...(book.reviews ?? []).filter((r) => r.weekStart !== review.weekStart),
    ],
  };
}
