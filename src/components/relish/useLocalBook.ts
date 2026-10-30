"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  editionKey,
  listEditions,
  labelEdition,
  removeEditionLabel,
  type Edition,
} from "@/lib/relish/editions";
import { emptyBook, sampleBook, isBook, type Book } from "@/lib/relish/model";
import {
  createVault,
  unlockVault,
  seal,
  parseEnvelope,
  type Envelope,
} from "@/lib/relish/vault";
async function withVaultWrite<T>(operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks?.request)
    throw new Error(
      "This browser cannot safely save this book. Please try a newer browser.",
    );
  return navigator.locks.request(
    "relish-vault-write-v1",
    { mode: "exclusive" },
    operation,
  );
}
export function useLocalBook() {
  const selected = useRef("original");
  const [editions, setEditions] = useState<Edition[]>([]);
  const [editionId, setEditionId] = useState("original");
  const [book, setBook] = useState<Book>(sampleBook);
  const [mode, setMode] = useState<
    "loading" | "sample" | "locked" | "open" | "shelf" | "new"
  >("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<CryptoKey | null>(null),
    envelope = useRef<Envelope | null>(null),
    epoch = useRef(0);
  const currentBook = useRef(book);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  useEffect(() => {
    try {
      const shelf = listEditions();
      // Read browser-only storage after hydration so server and first client render agree.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditions(shelf);
      selected.current = shelf[0]?.id || "original";
      setEditionId(selected.current);
      setMode(shelf.length > 1 ? "shelf" : shelf.length ? "locked" : "sample");
    } catch {
      setMode("sample");
      setError(
        "Browser storage is unavailable. You can explore the sample book.",
      );
    }
  }, []);
  const lock = useCallback(() => {
    epoch.current++;
    key.current = null;
    envelope.current = null;
    currentBook.current = emptyBook("");
    setBook(currentBook.current);
    setMode("locked");
    setBusy(false);
    setError("");
  }, []);
  useEffect(() => {
    if (mode !== "open") return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, 10 * 60 * 1000);
    };
    const change = (e: StorageEvent) => {
      if (e.key === editionKey(selected.current) || e.key === null) lock();
    };
    const visibility = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, document.hidden ? 60_000 : 600_000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("storage", change);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("storage", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [mode, lock]);
  const open = async (
    passphrase: string,
    owner?: string,
    importRaw?: string,
  ) => {
    setBusy(true);
    setError("");
    const token = epoch.current;
    const storageKey = editionKey(selected.current);
    const id = selected.current;
    try {
      const raw = importRaw || localStorage.getItem(storageKey);
      if (importRaw && localStorage.getItem(storageKey))
        throw new Error(
          "This edition already exists. Choose Add an edition on the bookshelf to restore a backup separately.",
        );
      const result = raw
        ? await unlockVault(raw, passphrase)
        : {
            ...(await createVault(
              emptyBook(owner?.trim() || "You"),
              passphrase,
            )),
            book: emptyBook(owner?.trim() || "You"),
          };
      if (token !== epoch.current) return;
      if (!raw || importRaw) {
        await withVaultWrite(async () => {
          if (token !== epoch.current)
            throw new Error("The book was locked before it could be created.");
          if (localStorage.getItem(storageKey))
            throw new Error(
              "A book was created in another tab. Reload to open it.",
            );
          localStorage.setItem(storageKey, JSON.stringify(result.envelope));
          labelEdition(id, result.book.owner);
          setEditions(listEditions());
        });
      } else if (localStorage.getItem(storageKey) !== raw) {
        throw new Error(
          "This book changed in another tab. Please unlock its latest version.",
        );
      }
      if (token !== epoch.current) return;
      key.current = result.key;
      envelope.current = result.envelope;
      currentBook.current = result.book;
      setBook(result.book);
      setMode("open");
      navigator.storage?.persist?.().catch(() => {});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your book could not be opened.",
      );
    } finally {
      if (token === epoch.current) setBusy(false);
    }
  };
  const save = (change: Book | ((book: Book) => Book)): Promise<void> => {
    const token = epoch.current;
    const sample = mode === "sample";
    const storageKey = editionKey(selected.current);
    pending.current++;
    setBusy(true);
    setError("");
    const operation = queue.current
      .catch(() => {})
      .then(async () => {
        if (token !== epoch.current)
          throw new Error(
            "Your book locked before saving. Unlock it to continue.",
          );
        const next =
          typeof change === "function" ? change(currentBook.current) : change;
        if (!isBook(next))
          throw new Error("This change could not be saved safely.");
        if (!sample) {
          await withVaultWrite(async () => {
            if (token !== epoch.current)
              throw new Error(
                "Your book locked before saving. Unlock it to continue.",
              );
            if (!key.current || !envelope.current)
              throw new Error("Unlock your book first.");
            const previous = JSON.stringify(envelope.current);
            if (localStorage.getItem(storageKey) !== previous) {
              lock();
              throw new Error(
                "This book changed in another tab. Unlock its latest version.",
              );
            }
            const encrypted = await seal(
              next,
              key.current,
              envelope.current.salt,
            );
            if (token !== epoch.current)
              throw new Error(
                "Your book locked before saving. Unlock it to continue.",
              );
            if (localStorage.getItem(storageKey) !== previous) {
              lock();
              throw new Error(
                "This book changed in another tab. Unlock its latest version.",
              );
            }
            localStorage.setItem(storageKey, JSON.stringify(encrypted));
            envelope.current = encrypted;
          });
        }
        currentBook.current = next;
        setBook(next);
      });
    queue.current = operation.catch(() => {});
    return operation
      .catch((e) => {
        if (token === epoch.current)
          setError(
            e instanceof Error
              ? e.message
              : "Could not save. Your draft is still here; try again.",
          );
        throw e;
      })
      .finally(() => {
        pending.current--;
        if (token === epoch.current && pending.current === 0) setBusy(false);
      });
  };
  const backup = () => {
    const storageKey = editionKey(selected.current);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    parseEnvelope(raw);
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `relish-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const remove = async (confirmation: string) => {
    if (mode !== "open" || confirmation !== currentBook.current.owner)
      throw new Error("Type the edition name exactly before removing it.");
    const token = epoch.current,
      id = selected.current,
      storageKey = editionKey(id);
    await withVaultWrite(async () => {
      if (
        token !== epoch.current ||
        !envelope.current ||
        localStorage.getItem(storageKey) !== JSON.stringify(envelope.current)
      )
        throw new Error(
          "This book changed. Unlock its latest version before removing it.",
        );
      localStorage.removeItem(storageKey);
      removeEditionLabel(id);
      lock();
      setEditions(listEditions());
      setMode("shelf");
    });
  };
  const shelf = () => {
    lock();
    setEditions(listEditions());
    setMode("shelf");
  };
  const select = (id?: string) => {
    lock();
    if (id && !listEditions().some((e) => e.id === id)) {
      setMode("shelf");
      return;
    }
    selected.current = id || crypto.randomUUID();
    setEditionId(selected.current);
    setMode(id ? "locked" : "new");
  };
  return {
    book,
    mode,
    busy,
    error,
    open,
    save,
    lock,
    backup,
    editions,
    editionId,
    shelf,
    select,
    remove,
  };
}
