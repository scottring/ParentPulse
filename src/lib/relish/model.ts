import { isEditionProfile, type EditionProfile } from "./profiles";
import { isLiving, type LivingState } from "./living";
import { isConnections, type Connections } from "./sharing";
export type Person = {
  id: string;
  name: string;
  role: string;
  color: string;
  note: string;
  lessons: string[];
};
export type Moment = {
  id: string;
  personId: string;
  observation: string;
  perspective: string;
  move: string;
  reflection: string;
  createdAt: string;
  completedAt?: string;
};
export type WeeklyReview = {
  id: string;
  weekStart: string;
  reflection: string;
  next: string;
  createdAt: string;
};
export type RhythmSettings = { target: 1 | 3 | 5; reviewDay: number };
export type Book = {
  version: 1;
  living?: LivingState;
  connections?: Connections;
  owner: string;
  profile?: EditionProfile;
  people: Person[];
  moments: Moment[];
  rhythm?: RhythmSettings;
  reviews?: WeeklyReview[];
};
export const emptyBook = (owner: string): Book => ({
  version: 1,
  owner,
  people: [],
  moments: [],
});
export function sampleBook(): Book {
  return {
    version: 1,
    owner: "Alex",
    profile: { kind: "adult" },
    people: [
      {
        id: "anna",
        name: "Anna",
        role: "Partner",
        color: "rose",
        note: "A little more listening. A little less trying to fix everything.",
        lessons: [
          "Ask whether she wants ideas or just someone to listen.",
          "An unhurried walk often opens up a conversation.",
        ],
      },
      {
        id: "leo",
        name: "Leo",
        role: "Son",
        color: "ochre",
        note: "A big imagination. Big feelings. His own way of finding his feet.",
        lessons: [
          "A heads-up before a change of plans gives him time to adjust.",
          "Getting down to his eye level changes the whole conversation.",
        ],
      },
      {
        id: "june",
        name: "June",
        role: "Mother",
        color: "sage",
        note: "There are still so many stories I haven’t asked her to tell.",
        lessons: [
          "A specific question brings back a story that “how are you?” never does.",
        ],
      },
    ],
    moments: [
      {
        id: "sample1",
        personId: "anna",
        observation:
          "We went for a walk without our phones. Somewhere between the house and the park, we started really talking.",
        perspective:
          "Making space was more useful than finding the right words.",
        move: "Leave our phones at home on our next Sunday walk.",
        reflection:
          "We both felt lighter. I want to remember how little it took.",
        createdAt: "2026-10-27T18:00:00Z",
        completedAt: "2026-10-28T18:00:00Z",
      },
      {
        id: "sample2",
        personId: "leo",
        observation:
          "Leaving the playground was hard again. I was rushing, and the more I hurried him, the harder it got.",
        perspective: "He may have needed time to finish what mattered to him.",
        move: "Give a five-minute heads-up and let him choose one last thing.",
        reflection: "",
        createdAt: "2026-10-28T16:00:00Z",
      },
    ],
  };
}
export function isBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;
  const b = value as Book;
  return (
    b.version === 1 &&
    (b.profile === undefined || isEditionProfile(b.profile)) &&
    (b.connections === undefined || isConnections(b.connections)) &&
    (b.living === undefined || isLiving(b.living)) &&
    (b.rhythm === undefined ||
      (!!b.rhythm &&
        [1, 3, 5].includes(b.rhythm.target) &&
        Number.isInteger(b.rhythm.reviewDay) &&
        b.rhythm.reviewDay >= 0 &&
        b.rhythm.reviewDay <= 6)) &&
    (b.reviews === undefined ||
      (Array.isArray(b.reviews) &&
        b.reviews.every(
          (r) =>
            r &&
            ["id", "weekStart", "reflection", "next", "createdAt"].every(
              (k) => typeof r[k as keyof WeeklyReview] === "string",
            ) &&
            /^\d{4}-\d{2}-\d{2}$/.test(r.weekStart) &&
            Number.isFinite(Date.parse(r.createdAt)),
        ))) &&
    typeof b.owner === "string" &&
    Array.isArray(b.people) &&
    b.people.every(
      (p) =>
        p &&
        ["id", "name", "role", "color", "note"].every(
          (k) => typeof p[k as keyof Person] === "string",
        ) &&
        Array.isArray(p.lessons) &&
        p.lessons.every((x) => typeof x === "string"),
    ) &&
    Array.isArray(b.moments) &&
    b.moments.every(
      (m) =>
        m &&
        [
          "id",
          "personId",
          "observation",
          "perspective",
          "move",
          "reflection",
          "createdAt",
        ].every((k) => typeof m[k as keyof Moment] === "string") &&
        (!m.completedAt || typeof m.completedAt === "string"),
    )
  );
}
