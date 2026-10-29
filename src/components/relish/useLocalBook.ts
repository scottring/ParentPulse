"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { emptyBook, sampleBook, type Book } from "@/lib/relish/model";
import {
  createVault,
  unlockVault,
  seal,
  parseEnvelope,
  VAULT_KEY,
  type Envelope,
} from "@/lib/relish/vault";
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
    setBook(emptyBook(""));
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
      if (e.key === VAULT_KEY) lock();
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
      if (!raw || importRaw)
        localStorage.setItem(VAULT_KEY, JSON.stringify(result.envelope));
      key.current = result.key;
      envelope.current = result.envelope;
      setBook(result.book);
      setMode("open");
      navigator.storage?.persist?.().catch(() => {});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your book could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async (next: Book) => {
    if (mode === "sample") {
      setBook(next);
      return;
    }
    if (!key.current || !envelope.current)
      throw new Error("Unlock your book first.");
    setBusy(true);
    setError("");
    const token = epoch.current;
    try {
      const encrypted = await seal(next, key.current, envelope.current.salt);
      if (token !== epoch.current)
        throw new Error(
          "Your book locked before saving. Please unlock it and try again.",
        );
      localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
      envelope.current = encrypted;
      setBook(next);
    } catch (e) {
      setError(
        "Could not save. Your browser may be out of storage. Export a backup and try again.",
      );
      throw e;
    } finally {
      setBusy(false);
    }
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
