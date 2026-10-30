"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyBook, sampleBook, isBook, type Book } from "@/lib/relish/model";
import {
  createVault,
  unlockVault,
  seal,
  parseEnvelope,
  VAULT_KEY,
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
  const [book, setBook] = useState<Book>(sampleBook);
  const [mode, setMode] = useState<"loading" | "sample" | "locked" | "open">(
    "loading",
  );
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
      setMode(localStorage.getItem(VAULT_KEY) ? "locked" : "sample");
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
      if (e.key === VAULT_KEY || e.key === null) lock();
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
    try {
      const raw = importRaw || localStorage.getItem(VAULT_KEY);
      if (importRaw && localStorage.getItem(VAULT_KEY))
        throw new Error(
          "A book already exists here. Export it before restoring another book in a separate browser profile.",
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
          if (localStorage.getItem(VAULT_KEY))
            throw new Error(
              "A book was created in another tab. Reload to open it.",
            );
          localStorage.setItem(VAULT_KEY, JSON.stringify(result.envelope));
        });
      } else if (localStorage.getItem(VAULT_KEY) !== raw) {
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
            if (localStorage.getItem(VAULT_KEY) !== previous) {
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
            if (localStorage.getItem(VAULT_KEY) !== previous) {
              lock();
              throw new Error(
                "This book changed in another tab. Unlock its latest version.",
              );
            }
            localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
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
    const raw = localStorage.getItem(VAULT_KEY);
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
  return { book, mode, busy, error, open, save, lock, backup };
}
