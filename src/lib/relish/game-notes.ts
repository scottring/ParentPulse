// Notes about the people you play with (Scott, 2026-11-19): whoever holds the
// device, what matters is that what comes out of a game is kept — what Kaleb
// likes, what he likes about Dad, what he doesn't like. Notes come from two
// places: the typed answers (worked out here, no AI) and, when someone turned
// on Listen, what was said aloud (pulled out by /api/relish/notes). A parent
// reviews them, everything pre-checked, and keeps them in their own book on
// that person. Notes about a child are for parents: they are never offered in
// a child's book, and nothing here is shared to the family book.
import type { Book, Person } from "./model";
import {
  joyResult,
  ownWords,
  roundMemory,
  samePageQuestions,
  type Game,
  type GameKind,
} from "./living";
import { samePageQuestion } from "./play-content";

export type NoteKind = "likes" | "dislikes" | "appreciates" | "wishes" | "other";
export const noteKinds: NoteKind[] = ["likes", "dislikes", "appreciates", "wishes", "other"];
export const NOTE_LIMIT = 240;
export type PersonNote = {
  id: string;
  kind: NoteKind;
  text: string;
  /** For "appreciates": the person it's about, by name. */
  about?: string;
  /** Where it came from: a typed answer, or something said aloud. */
  from: "answer" | "said";
  game?: GameKind;
  at: string;
};
/** A note before it's kept: who it's about, by player name. */
export type NoteDraft = Omit<PersonNote, "id" | "at"> & { person: string };

export const kindLabels: Record<NoteKind, string> = {
  likes: "Likes",
  dislikes: "Doesn’t like",
  appreciates: "Appreciates",
  wishes: "Hopes and wishes",
  other: "Noticed",
};

const clip = (s: string, n = NOTE_LIMIT) => s.trim().replace(/\s+/g, " ").slice(0, n);

/** Notes from the answers typed during a round. No AI involved. */
export function notesFromAnswers(g: Game): NoteDraft[] {
  const nameOf = (id: string) => g.players.find((p) => p.id === id)?.name;
  const out: NoteDraft[] = [];
  const memory = roundMemory(g);
  if (g.kind === "match" && ownWords(g)) {
    for (const s of memory.said || []) {
      const who = nameOf(s.by),
        q = samePageQuestion(s.id);
      if (!who || !s.answer?.trim() || !q) continue;
      out.push({
        person: who,
        kind: "other",
        text: clip(`${q.prompt} ${who}: “${s.answer.trim()}”`),
        from: "answer",
        game: g.kind,
      });
    }
  } else if (g.kind === "match" && memory.questions) {
    const qs = samePageQuestions(g);
    memory.questions.forEach((line, qi) => {
      const q = qs[qi] ?? samePageQuestion(line.id);
      if (!q) return;
      line.picks.forEach((pick, pi) => {
        const who = g.players[pi]?.name;
        if (!who || pick === null || !q.choices[pick]) return;
        out.push({
          person: who,
          kind: "other",
          text: clip(`${q.prompt} ${who}: “${q.choices[pick]}”`),
          from: "answer",
          game: g.kind,
        });
      });
    });
  } else if (g.kind === "joy" && g.contentVersion === 2) {
    joyResult(g).picks.forEach((joy, pi) => {
      const who = g.players[pi]?.name;
      if (!who || !joy?.trim()) return;
      out.push({
        person: who,
        kind: "likes",
        text: clip(`A small joy for ${who}: ${joy.trim()}`),
        from: "answer",
        game: g.kind,
      });
    });
  }
  for (const r of g.reflections || []) {
    const who = nameOf(r.playerId);
    if (!who || !r.text.trim()) continue;
    out.push({
      person: who,
      kind: "other",
      text: clip(`After the game, ${who} said: “${r.text.trim()}”`),
      from: "answer",
      game: g.kind,
    });
  }
  return out;
}

/** The typed answers as plain lines, for the AI to read alongside what was said. */
export function answerLines(g: Game): string[] {
  return notesFromAnswers(g).map((n) => n.text);
}

const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * Keeps the chosen notes in `book`, each on its person (matched by name). A
 * player who isn't in the book yet is added, so their notes have a home.
 */
export function keepNotes(book: Book, drafts: NoteDraft[], now = new Date()): Book {
  if (book.profile?.kind === "child")
    throw new Error("Notes about family members are kept in a parent’s journal.");
  const at = now.toISOString();
  const people: Person[] = book.people.map((p) => ({ ...p }));
  for (const d of drafts) {
    const name = clip(d.person, 80);
    if (!name || !d.text.trim()) continue;
    let person = people.find((p) => same(p.name, name));
    if (!person) {
      person = {
        id: globalThis.crypto.randomUUID(),
        name,
        role: "Family",
        color: "sage",
        note: "",
        lessons: [],
      };
      people.push(person);
    }
    const notes = person.notes || [];
    if (notes.some((n) => same(n.text, d.text))) continue;
    person.notes = [
      ...notes,
      {
        id: globalThis.crypto.randomUUID(),
        kind: d.kind,
        text: clip(d.text),
        ...(d.about ? { about: clip(d.about, 80) } : {}),
        from: d.from,
        ...(d.game ? { game: d.game } : {}),
        at,
      },
    ];
  }
  return { ...book, people };
}

export function isPersonNote(v: unknown): v is PersonNote {
  if (!v || typeof v !== "object") return false;
  const n = v as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    noteKinds.includes(n.kind as NoteKind) &&
    typeof n.text === "string" &&
    n.text.length <= NOTE_LIMIT &&
    (n.about === undefined || (typeof n.about === "string" && n.about.length <= 80)) &&
    (n.from === "answer" || n.from === "said") &&
    (n.game === undefined || typeof n.game === "string") &&
    typeof n.at === "string" &&
    Number.isFinite(Date.parse(n.at))
  );
}

/** What the notes route accepts and returns, checked on both sides. */
export type NotesRequest = {
  players: { name: string; child: boolean }[];
  answers: string[];
  transcript: string;
};
export const TRANSCRIPT_LIMIT = 60_000;
export function isNotesRequest(v: unknown): v is NotesRequest {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r.players) &&
    r.players.length >= 1 &&
    r.players.length <= 12 &&
    r.players.every(
      (p) =>
        p &&
        typeof p.name === "string" &&
        !!p.name.trim() &&
        p.name.length <= 80 &&
        typeof p.child === "boolean",
    ) &&
    Array.isArray(r.answers) &&
    r.answers.length <= 200 &&
    r.answers.every((a) => typeof a === "string" && a.length <= NOTE_LIMIT) &&
    typeof r.transcript === "string" &&
    r.transcript.length <= TRANSCRIPT_LIMIT
  );
}
/** Checks the AI's notes: only the players named, only the kinds we know. */
export function checkNotes(v: unknown, players: string[]): NoteDraft[] | null {
  if (!Array.isArray(v) || v.length > 60) return null;
  const out: NoteDraft[] = [];
  for (const n of v) {
    if (!n || typeof n !== "object") return null;
    const person = players.find((p) => typeof n.person === "string" && same(p, n.person));
    if (!person || !noteKinds.includes(n.kind) || typeof n.text !== "string") return null;
    const about =
      typeof n.about === "string" && n.about.trim()
        ? players.find((p) => same(p, n.about))
        : undefined;
    if (!n.text.trim()) continue;
    out.push({
      person,
      kind: n.kind,
      text: clip(n.text),
      ...(about && about !== person ? { about } : {}),
      from: "said",
    });
  }
  return out;
}
