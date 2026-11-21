"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FamilyChange } from "@/lib/relish/family-book";
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
  add: (page: FamilyPage) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Reads the family book again (e.g. when Our family opens). */
  refresh: () => void;
};

type Remote = {
  load: () => Promise<FamilyPage[]>;
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
        setPages(next);
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
    add: (page) => change({ add: page }, (p) => mergeFamilyPages([page], p)),
    remove: (id) => change({ remove: id }, (p) => p.filter((x) => x.id !== id)),
    refresh,
  };
}

/** Family pages kept inside this book: no account, or the sample. */
export function localFamily(
  book: Book,
  save: (change: (b: Book) => Book) => Promise<void>,
): FamilyAccess {
  return {
    kind: "local",
    pages: mergeFamilyPages(book.familyPages || []),
    loading: false,
    error: "",
    add: (page) => save((b) => addFamilyPage(b, page)),
    remove: (id) => save((b) => removeFamilyPage(b, id)),
    refresh: () => {},
  };
}
