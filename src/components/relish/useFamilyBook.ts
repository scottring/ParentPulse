"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FamilyChange, FamilyRead } from "@/lib/relish/family-book";
import type { PhotoAccess, PhotoCopy, PhotoLoader } from "@/lib/relish/photos";
import {
  addFamilyPage,
  mergeFamilyPages,
  removeFamilyPage,
  type FamilyPage,
} from "@/lib/relish/family-pages";
import type { Book } from "@/lib/relish/model";

/** Our family book as a page sees it, wherever its pages are kept. */
export type FamilyAccess = {
  /** "account": the account's family book. "local": inside this book only. */
  kind: "account" | "local";
  pages: FamilyPage[];
  loading: boolean;
  error: string;
  /** Adds a page; `photos` are copies of its photos (ids as on the page). */
  add: (page: FamilyPage, photos?: PhotoCopy[]) => Promise<void>;
  /** Takes a page out, with its photos. */
  remove: (id: string) => Promise<void>;
  /** Opens the photos on its pages. */
  photos?: PhotoLoader;
  /** Reads the family book again (e.g. when Our family opens). */
  refresh: () => void;
};

type Remote = {
  load: () => Promise<FamilyRead>;
  change: (change: FamilyChange) => Promise<void>;
};

/**
 * The account's family book while a signed-in account book is open. `remote`
 * is null when there is no account to keep it in; the page then keeps family
 * pages inside the current book (see localFamily).
 */
export function useAccountFamily(remote: Remote | null, bookKey: string): FamilyAccess | undefined {
  const [pages, setPages] = useState<FamilyPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(remote);
  const generation = useRef(0);
  // Opens photos from the last read; forgotten with the book. Photos just
  // added are shown from this device until the next read has them.
  const opener = useRef<FamilyRead["photo"] | null>(null);
  const added = useRef(new Map<string, Blob>());
  useLayoutEffect(() => {
    latest.current = remote;
  });
  const enabled = !!remote;
  const refresh = useCallback(() => {
    const r = latest.current;
    if (!r) return;
    const mine = ++generation.current;
    setLoading(true);
    r.load()
      .then((next) => {
        if (generation.current !== mine) return;
        opener.current = next.photo;
        setPages(next.pages);
        setError("");
      })
      .catch((e) => {
        // A book closing or signing out cancels the read; nothing to say.
        if (generation.current !== mine || (e instanceof Error && e.name === "AbortError"))
          return;
        setError(
          e instanceof Error && e.message
            ? `Our family journal didn’t load. ${e.message}`
            : "Our family journal didn’t load. Try again in a moment.",
        );
      })
      .finally(() => {
        if (generation.current === mine) setLoading(false);
      });
  }, []);
  useEffect(() => {
    generation.current++;
    // A different book (or signing out) starts from nothing, then reads.
    opener.current = null;
    added.current.clear();
    setPages([]);
    setError("");
    if (enabled) refresh();
  }, [enabled, bookKey, refresh]);
  async function change(change: FamilyChange, optimistic: (p: FamilyPage[]) => FamilyPage[]) {
    const r = latest.current;
    if (!r) throw new Error("Sign in to add to Our family journal.");
    generation.current++;
    const before = pages;
    setPages(optimistic(pages));
    setError("");
    try {
      await r.change(change);
    } catch (e) {
      setPages(before);
      throw e;
    }
    refresh();
  }
  if (!remote) return undefined;
  return {
    kind: "account",
    pages,
    loading,
    error,
    add: async (page, photos) => {
      for (const c of photos || []) added.current.set(c.photo.id, c.blob);
      await change({ add: page, ...(photos?.length ? { photos } : {}) }, (p) => mergeFamilyPages([page], p));
    },
    remove: (id) => change({ remove: id }, (p) => p.filter((x) => x.id !== id)),
    photos: {
      load: (id) => {
        const recent = added.current.get(id);
        if (recent) return Promise.resolve(recent);
        return opener.current
          ? opener.current(id)
          : Promise.reject(new Error("Our family journal is still opening."));
      },
    },
    refresh,
  };
}

/**
 * Family pages kept inside this book: no account, or the sample. Their photos
 * are kept in this book too, under its key, and go when the page is taken out.
 */
export function localFamily(
  book: Book,
  save: (change: (b: Book) => Book) => Promise<void>,
  photos?: PhotoAccess,
): FamilyAccess {
  return {
    kind: "local",
    pages: mergeFamilyPages(book.familyPages || []),
    loading: false,
    error: "",
    add: async (page, copies = []) => {
      if (copies.length) {
        if (!photos?.store) throw new Error("This journal can’t keep photos here.");
        await photos.store(copies);
      }
      await save((b) => addFamilyPage(b, page));
    },
    remove: async (id) => {
      const gone = (book.familyPages || []).find((p) => p.id === id)?.photos || [];
      await save((b) => removeFamilyPage(b, id));
      if (gone.length) await photos?.discard?.(gone.map((p) => p.id)).catch(() => {});
    },
    photos,
    refresh: () => {},
  };
}
