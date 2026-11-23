import type { Book } from "./model";
import {
  livingOf,
  outcomes,
  playMemory,
  reflectionSections,
  type Player,
} from "./living";
import { games } from "./play-content";
import { checkBackSection, toolById } from "./tools";
import { guidanceFor } from "./guidance";
import type { JournalStyle } from "./journal";
import { isPhotos, type Photo } from "./photos";

export type AlbumPassage = {
  id: string;
  title: string;
  text: string;
  fromName: string;
  sourceDate: string;
  createdAt: string;
  photos?: Photo[];
};
export type BookPage = {
  id: string;
  kind: string;
  title: string;
  text: string;
  date: string;
  style: JournalStyle;
  sections: { label: string; text: string }[];
  journalId?: string;
  from?: string;
  photos: Photo[];
  people: string[];
  /** The exercise's name, for pages kept from an exercise. */
  exercise?: string;
  /** A trace that a game was played; it has no words of its own to share. */
  record?: true;
};
/** Kind of a play record in bookPages ("Game" in Your book). */
export const PLAY_RECORD = "Game played";
const list = (names: string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
/** The people in this book who played: matched by id, or by name for players from other books. */
export function playersInBook(book: Book, players: Pick<Player, "id" | "name">[]) {
  const key = (n: string) => n.trim().toLocaleLowerCase();
  return book.people
    .filter((person) =>
      players.some(
        (p) => p.id !== "owner" && (p.id === person.id || key(p.name) === key(person.name)),
      ),
    )
    .map((person) => person.id);
}
export function isAlbum(value: unknown): value is AlbumPassage[] {
  return (
    Array.isArray(value) &&
    new Set(value.map((p) => p?.id)).size === value.length &&
    value.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        p.id.length <= 100 &&
        typeof p.title === "string" &&
        p.title.length <= 120 &&
        typeof p.text === "string" &&
        p.text.length <= 8000 &&
        (p.text.trim() || p.photos?.length) &&
        typeof p.fromName === "string" &&
        p.fromName.length <= 200 &&
        [p.sourceDate, p.createdAt].every(
          (d) => typeof d === "string" && Number.isFinite(Date.parse(d)),
        ) &&
        (p.photos === undefined || isPhotos(p.photos)),
    )
  );
}
export function bookPages(book: Book): BookPage[] {
  const situations = guidanceFor(book).threads;
  const page = (
    data: Partial<BookPage> & Pick<BookPage, "id" | "kind" | "text" | "date">,
  ): BookPage => ({
    title: data.kind,
    style: "sky",
    sections: [],
    photos: [],
    people: [],
    ...data,
  });
  return [
    ...(book.journal || [])
      .filter((e) => e.status === "kept")
      .map((e) =>
        page({
          id: `journal:${e.id}`,
          journalId: e.id,
          kind: e.source?.kind === "exercise" ? "Exercise" : "Journal entry",
          ...(e.source?.kind === "exercise"
            ? { exercise: toolById(e.source.toolId)?.title }
            : {}),
          title: e.title.trim() || "Untitled entry",
          text: e.text,
          date: e.createdAt,
          style: e.style,
          photos: e.photos || [],
          people: e.people || [],
          // An exercise plan that was checked back on shows how it went.
          sections: [checkBackSection(book, e.id)].filter(
            (x): x is { label: string; text: string } => !!x,
          ),
        }),
      ),
    ...livingOf(book).entries.map((e) =>
      page({
        id: `moment:${e.id}`,
        kind:
          e.kind === "notice"
            ? "Guided reflection"
            : e.kind === "practice"
              ? "Plan to try"
              : "How it went",
        // Named by the situation it came from, so pages are told apart.
        title:
          e.kind === "notice"
            ? situations[e.thread].title
            : e.kind === "practice"
              ? `A plan · ${situations[e.thread].title}`
              : `How it went · ${situations[e.thread].title}`,
        text: e.text || (e.outcome ? outcomes[e.outcome] : ""),
        date: e.createdAt,
        style: e.kind === "practice" ? "moss" : "sky",
        sections: [
          { label: "Saved perspective", text: e.perspective || "" },
          {
            label: "How it felt",
            text: e.outcome && e.text ? outcomes[e.outcome] : "",
          },
        ].filter((s) => s.text),
      }),
    ),
    ...book.moments.map((m) =>
      page({
        id: `earlier:${m.id}`,
        kind: "Guided reflection",
        text: m.observation,
        date: m.createdAt,
        people: [m.personId],
        sections: [
          { label: "Saved perspective", text: m.perspective },
          { label: "A small practice", text: m.move },
          { label: "Looking back", text: m.reflection },
        ].filter((s) => s.text),
      }),
    ),
    ...(book.reviews || []).map((r) =>
      page({
        id: `review:${r.id}`,
        kind: "Looking back",
        text: r.reflection,
        date: r.createdAt,
        style: "moss",
        sections: r.next ? [{ label: "For next time", text: r.next }] : [],
      }),
    ),
    ...(book.connections?.received || []).map((p) =>
      page({
        id: `passage:${p.id}`,
        kind: "Received passage",
        title: p.title,
        text: p.text,
        date: p.acceptedAt,
        style: "blush",
        from: p.fromName,
        // Photos sent with a whole entry, kept in this journal.
        photos: p.photos || [],
        // A line sent with a note and who said it (Send a line, 2026-11-22).
        sections: [
          { label: "Who said it", text: p.caption || "" },
          { label: `${p.fromName}’s note`, text: p.note || "" },
        ].filter((x) => x.text),
      }),
    ),
    ...livingOf(book).sharedPages.map((p) => {
      // Players' own lines about the round live on its play record.
      const round = (livingOf(book).plays || []).find((r) => r.pageId === p.id);
      return page({
        id: `game:${p.id}`,
        kind: "Made together",
        title: p.title,
        text: p.text,
        date: p.createdAt,
        style: "moss",
        from: p.players.map((x) => x.name).join(" + "),
        people: playersInBook(book, p.players),
        sections: round ? reflectionSections(round) : [],
      });
    }),
    // A round with a kept page shows that page instead of a second record.
    ...(livingOf(book).plays || [])
      .filter(
        (r) =>
          !r.pageId ||
          !livingOf(book).sharedPages.some((p) => p.id === r.pageId),
      )
      .map((r) => {
        const others = r.players.filter(
          (p) => p.id !== "owner" && p.name.trim() !== book.owner.trim(),
        );
        const title = games.find((g) => g.kind === r.kind)?.title || "A game";
        const memory = playMemory(r);
        return page({
          id: `play:${r.id}`,
          kind: PLAY_RECORD,
          title: r.place
            ? `${title} on the way to ${r.place}`
            : `${title} with ${list((others.length ? others : r.players).map((p) => p.name))}`,
          text:
            memory.summary ||
            (r.pageId
              ? "One round, played together."
              : "One round, played together. No shared page was kept."),
          sections: memory.sections,
          date: r.playedAt,
          style: "moss",
          people: playersInBook(book, r.players),
          record: true,
        });
      }),
  ].sort(
    (a, b) =>
      (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) ||
      a.id.localeCompare(b.id),
  );
}
export function keepAlbumPassage(
  book: Book,
  source: BookPage,
  title: string,
  text: string,
  photos: Photo[],
): Book {
  // The saved copy contains only chosen words and photos, never the private source page.
  if (photos.some((p) => !source.photos.some((s) => s.id === p.id)))
    throw new Error("Choose photos from this page.");
  const passage: AlbumPassage = {
    id: crypto.randomUUID(),
    title: title.trim(),
    text: text.trim(),
    fromName: source.from || book.owner,
    sourceDate: source.date,
    createdAt: new Date().toISOString(),
    photos,
  };
  if (!isAlbum([passage]))
    throw new Error("Choose a passage of up to 8,000 characters or a photo.");
  return { ...book, album: [...(book.album || []), passage] };
}
