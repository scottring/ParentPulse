// Cancel and delete (Scott, 2026-11-19): "we also need options to
// cancel/delete activities/games/posts that have been created or are in
// progress." Each book is one encrypted snapshot, so removing something here
// removes it from this book on every synced device. Backups exported earlier
// still hold it, and a copy already sent to someone else's book stays there.
import type { Book } from "./model";
import { changeLiving, livingOf } from "./living";
import type { UnderWay } from "./catalog";
import { discardDay, runningByTool, stopTracker, toolsOf } from "./tools";

const without = <T extends { id: string }>(list: T[] | undefined, id: string) => {
  const kept = (list || []).filter((x) => x.id !== id);
  if (kept.length === (list || []).length) throw new Error("This page has already gone.");
  return kept;
};

/**
 * Deletes one page from this book, by the id it has in Your book or Our
 * family book: `journal:`, `moment:`, `earlier:`, `review:`, `passage:`
 * (received), `sent:` (your record of a page you sent), `album:`, `game:` (a
 * kept game page, with its round) or `play:` (a round's record).
 */
export function deletePage(book: Book, pageId: string): Book {
  const cut = pageId.indexOf(":");
  const kind = pageId.slice(0, cut),
    id = pageId.slice(cut + 1);
  if (cut < 1 || !id) throw new Error("This page couldn’t be found.");
  switch (kind) {
    case "journal":
      return { ...book, journal: without(book.journal, id) };
    case "earlier":
      return { ...book, moments: without(book.moments, id) };
    case "review":
      return { ...book, reviews: without(book.reviews, id) };
    case "album":
      return { ...book, album: without(book.album, id) };
    case "passage":
    case "sent": {
      const c = book.connections;
      if (!c) throw new Error("This page has already gone.");
      return {
        ...book,
        connections:
          kind === "passage"
            ? { ...c, received: without(c.received, id) }
            : { ...c, outgoing: without(c.outgoing, id) },
      };
    }
    case "moment":
      return changeLiving(book, (x) => ({ ...x, entries: without(x.entries, id) }));
    case "game":
      // The kept page and the round it came from go together.
      return changeLiving(book, (x) => ({
        ...x,
        sharedPages: without(x.sharedPages, id),
        plays: (x.plays || []).filter((r) => r.pageId !== id),
      }));
    case "play":
      return changeLiving(book, (x) => ({
        ...x,
        plays: without(x.plays, id),
        // A kept page from that round goes with it.
        sharedPages: x.sharedPages.filter(
          (p) => p.id !== (x.plays || []).find((r) => r.id === id)?.pageId,
        ),
      }));
    default:
      throw new Error("This page can’t be deleted here.");
  }
}

/** Whether Your book can delete this page (everything it lists can be). */
export const deletable = (pageId: string) =>
  /^(journal|moment|earlier|review|passage|sent|album|game|play):./.test(pageId);

/** Ends something under way without keeping it: a game, reflection, draft, day or habit. */
export function discardUnderWay(book: Book, g: UnderWay): Book {
  switch (g.kind) {
    case "game":
      if (!livingOf(book).game) throw new Error("This game has already ended.");
      return changeLiving(book, (x) => ({ ...x, game: undefined }));
    case "visit":
      if (!livingOf(book).visit) throw new Error("This reflection has already ended.");
      return changeLiving(book, (x) => ({ ...x, visit: undefined }));
    case "draft":
      return { ...book, journal: without(book.journal, g.draft.id) };
    case "day": {
      const run = toolsOf(book).day;
      if (!run) throw new Error("This day has already ended.");
      return discardDay(book, run.id);
    }
    case "habit": {
      const runs = runningByTool(book).find((r) => r.toolId === g.toolId)?.runs || [];
      if (!runs.length) throw new Error("This has already stopped.");
      return runs.reduce((b, r) => stopTracker(b, r.id), book);
    }
  }
}

/** Removes one kept note about a person. */
export function deletePersonNote(book: Book, personId: string, noteId: string): Book {
  const person = book.people.find((p) => p.id === personId);
  if (!person?.notes?.some((n) => n.id === noteId)) throw new Error("This note has already gone.");
  return {
    ...book,
    people: book.people.map((p) =>
      p.id === personId ? { ...p, notes: p.notes!.filter((n) => n.id !== noteId) } : p,
    ),
  };
}
