import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, type Book } from "../model";
import { advanceGame, newGame, type Game, type Player } from "../living";
import { samePageQuestion } from "../play-content";
import {
  checkNotes,
  isNotesRequest,
  keepNotes,
  notesFromAnswers,
  type NoteDraft,
} from "../game-notes";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

const family: Player[] = [
  { id: "owner", name: "Scott", audience: "adult" },
  { id: "k", name: "Kaleb", audience: "6-8" },
  { id: "e", name: "Ella", audience: "9-12" },
];

/** Same page? in your own words: Scott answers, then Kaleb, then Ella, each guessed. */
function sameRound(answers: (string | null)[]): Game {
  let g = advanceGame(newGame("match", family), { type: "start", firstId: "owner" });
  for (const answer of answers) {
    if (g.stage === "handoff") g = advanceGame(g, { type: "ready" });
    g = advanceGame(g, { type: "say", text: answer });
    if (answer === null) continue;
    for (let k = 0; k < family.length - 1; k++)
      g = advanceGame(advanceGame(g, { type: "ready" }), { type: "say", text: "a guess" });
    if (g.stage === "judge") g = advanceGame(g, { type: "next", skip: true });
  }
  return g;
}

describe("notes from a game's typed answers", () => {
  it("notes each player's own answer to Same page?, with the question, and skips passes", () => {
    const g = sameRound(["the beach", "Lego cities", null]);
    const notes = notesFromAnswers(g);
    expect(notes.map((n) => n.person)).toEqual(["Scott", "Kaleb"]);
    const q = samePageQuestion(g.questions![1])!;
    expect(notes[1]).toMatchObject({ kind: "other", from: "answer", game: "match" });
    expect(notes[1].text).toBe(`${q.prompt} Kaleb: “Lego cities”`);
    // Guesses are about someone else's answer, so they aren't noted about the guesser.
    expect(notes.some((n) => n.text.includes("a guess"))).toBe(false);
  });

  it("adds each player's line after the round", () => {
    const g = { ...sameRound(["pizza"]), reflections: [{ playerId: "k", text: "I liked when Dad guessed wrong" }] };
    expect(notesFromAnswers(g).at(-1)).toMatchObject({
      person: "Kaleb",
      text: "After the game, Kaleb said: “I liked when Dad guessed wrong”",
    });
  });
});

describe("keeping notes", () => {
  const drafts: NoteDraft[] = [
    { person: "Kaleb", kind: "likes", text: "Kaleb likes building Lego cities.", from: "said" },
    { person: "kaleb", kind: "appreciates", about: "Ella", text: "Kaleb likes that Ella reads to him.", from: "said" },
    { person: "Kaleb", kind: "likes", text: "Kaleb likes building Lego cities.", from: "said" },
  ];
  it("keeps notes on each person by name, adding a person who isn't in the book yet, once each", () => {
    const book = keepNotes(emptyBook("Scott"), drafts, new Date("2026-11-19T20:00:00Z"));
    expect(book.people).toHaveLength(1);
    const kaleb = book.people[0];
    expect(kaleb.name).toBe("Kaleb");
    expect(kaleb.notes!.map((n) => n.text)).toEqual([
      "Kaleb likes building Lego cities.",
      "Kaleb likes that Ella reads to him.",
    ]);
    expect(kaleb.notes![1]).toMatchObject({ kind: "appreciates", about: "Ella", at: "2026-11-19T20:00:00.000Z" });
    expect(isBook(book)).toBe(true);
    // Keeping again adds nothing twice.
    expect(keepNotes(book, drafts).people[0].notes).toHaveLength(2);
  });
  it("never keeps notes about family members in a child's book", () => {
    const child: Book = { ...emptyBook("Kaleb"), profile: { kind: "child", ageBand: "6-8", parentLock: { accountUid: "p" } } };
    expect(() => keepNotes(child, drafts)).toThrow(/parent/);
  });
  it("a book with a malformed note doesn't validate", () => {
    const book = keepNotes(emptyBook("Scott"), drafts.slice(0, 1));
    const bad = { ...book, people: [{ ...book.people[0], notes: [{ ...book.people[0].notes![0], kind: "secret" }] }] };
    expect(isBook(bad)).toBe(false);
  });
});

describe("the notes route's checks", () => {
  const players = ["Scott", "Kaleb"];
  it("accepts notes about the players only, matching names, dropping self-references in about", () => {
    expect(
      checkNotes(
        [
          { person: "kaleb", kind: "likes", text: "Kaleb likes tacos." },
          { person: "Kaleb", kind: "appreciates", about: "scott", text: "Kaleb likes Dad’s pancakes." },
          { person: "Kaleb", kind: "other", about: "Kaleb", text: "  " },
        ],
        players,
      ),
    ).toEqual([
      { person: "Kaleb", kind: "likes", text: "Kaleb likes tacos.", from: "said" },
      { person: "Kaleb", kind: "appreciates", about: "Scott", text: "Kaleb likes Dad’s pancakes.", from: "said" },
    ]);
  });
  it("rejects notes about someone who didn't play, or of an unknown kind", () => {
    expect(checkNotes([{ person: "Iris", kind: "likes", text: "x" }], players)).toBeNull();
    expect(checkNotes([{ person: "Kaleb", kind: "diagnosis", text: "x" }], players)).toBeNull();
    expect(checkNotes("nope", players)).toBeNull();
  });
  it("checks requests", () => {
    expect(isNotesRequest({ players: [{ name: "Kaleb", child: true }], answers: [], transcript: "hi" })).toBe(true);
    expect(isNotesRequest({ players: [], answers: [], transcript: "" })).toBe(false);
    expect(isNotesRequest({ players: [{ name: "K", child: "yes" }], answers: [], transcript: "" })).toBe(false);
    expect(isNotesRequest({ players: [{ name: "K", child: false }], answers: [], transcript: "x".repeat(60_001) })).toBe(false);
  });
});
