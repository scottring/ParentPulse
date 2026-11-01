import type { Book } from "./model";
import { livingOf, outcomes } from "./living";
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
};
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
          kind: "A page of my own",
          title: e.title.trim() || "A little untitled something",
          text: e.text,
          date: e.createdAt,
          style: e.style,
          photos: e.photos || [],
          people: e.people || [],
        }),
      ),
    ...livingOf(book).entries.map((e) =>
      page({
        id: `moment:${e.id}`,
        kind:
          e.kind === "notice"
            ? "A moment noticed"
            : e.kind === "practice"
              ? "A little practice"
              : "A lesson kept",
        text: e.text || (e.outcome ? outcomes[e.outcome] : ""),
        date: e.createdAt,
        style: e.kind === "practice" ? "moss" : "sky",
        sections: [
          { label: "A perspective I kept", text: e.perspective || "" },
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
        kind: "A moment noticed",
        text: m.observation,
        date: m.createdAt,
        people: [m.personId],
        sections: [
          { label: "A perspective I kept", text: m.perspective },
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
        kind: "A passage welcomed",
        title: p.title,
        text: p.text,
        date: p.acceptedAt,
        style: "blush",
        from: p.fromName,
      }),
    ),
    ...livingOf(book).sharedPages.map((p) =>
      page({
        id: `game:${p.id}`,
        kind: "Made together",
        title: p.title,
        text: p.text,
        date: p.createdAt,
        style: "moss",
        from: p.players.map((x) => x.name).join(" + "),
      }),
    ),
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
