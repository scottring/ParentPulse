"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { editionKey } from "@/lib/relish/editions";
import { currentAIUser, getAIAuth } from "@/lib/relish/ai-auth";
import {
  readBinding,
  writeBinding,
  bindingKey,
  hashSync,
  type SyncedEdition,
} from "@/lib/relish/book-sync";
import {
  syncRequest,
  uploadBook,
  downloadBook,
} from "@/lib/relish/book-sync-client";
import type { useLocalBook } from "./useLocalBook";
import { emptyBook } from "@/lib/relish/model";
import { createVault } from "@/lib/relish/vault";
import { type Audience, isAudience } from "@/lib/relish/profiles";
type Vault = ReturnType<typeof useLocalBook>;
export function useBookSync(vault: Vault) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<SyncedEdition[]>([]);
  const [status, setStatus] = useState("Local only");
  const [conflict, setConflict] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(vault),
    paused = useRef(false),
    running = useRef(false),
    abort = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    latest.current = vault;
  });
  useEffect(() => {
    const account = () => {
      setUser(currentAIUser());
      setBooks([]);
      abort.current?.abort();
    };
    const locked = () => {
      abort.current?.abort();

      setError("");
      setConflict(false);
    };
    let alive = true;
    void getAIAuth()
      .authStateReady()
      .then(() => {
        if (alive) {
          account();
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (alive) setAuthReady(true);
      });
    window.addEventListener("relish:account", account);
    window.addEventListener("relish:locked", locked);
    return () => {
      alive = false;
      abort.current?.abort();
      window.removeEventListener("relish:account", account);
      window.removeEventListener("relish:locked", locked);
    };
  }, []);
  const refreshUser = () => setUser(currentAIUser());
  async function exclusive<T>(
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (running.current)
      throw new Error("Sync is already running. Please try again in a moment.");
    running.current = true;
    setWorking(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      return await fn(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Sync is unavailable. Your book is saved here.",
        );
      throw e;
    } finally {
      running.current = false;
      setWorking(false);
    }
  }
  async function list(signal: AbortSignal) {
    if (!user?.emailVerified)
      throw new Error("Sign in and verify your email first.");
    const result = await syncRequest<{ books: SyncedEdition[] }>(
      user,
      { action: "list" },
      signal,
    );
    signal.throwIfAborted();
    setBooks(result.books);
    return result.books;
  }
  const refresh = () => exclusive(list);
  async function run(signal: AbortSignal) {
    const v = latest.current,
      binding = readBinding(v.editionId);
    if (
      v.mode !== "open" ||
      !binding ||
      !user?.emailVerified ||
      binding.uid !== user.uid
    )
      return;
    const heads = await list(signal),
      head = heads.find((h) => h.id === binding.remoteId);
    const snapshot = await v.syncSnapshot(),
      fingerprint = await hashSync(snapshot.envelope);
    signal.throwIfAborted();
    const valid = () => {
      signal.throwIfAborted();
      if (
        latest.current.editionId !== v.editionId ||
        latest.current.mode !== "open"
      )
        throw new Error("The book changed. Reopen Account.");
    };
    valid();
    const markSaved = () =>
      setStatus(
        localStorage.getItem(editionKey(v.editionId)) ===
          JSON.stringify(snapshot.envelope)
          ? "Saved to your account"
          : "Saved here · changes waiting to sync",
      );
    if (head?.manifest.fingerprint === fingerprint) {
      writeBinding(v.editionId, {
        ...binding,
        revision: head.revision,
        fingerprint,
      });
      markSaved();
      setConflict(false);
      return;
    }
    if (binding.revision && !head) {
      setStatus("Synced copy removed · saved here");
      return;
    }
    if (head && head.revision !== binding.revision) {
      if (fingerprint !== binding.fingerprint) {
        setConflict(true);
        setStatus("Two versions · review in Account");
        return;
      }
      if (paused.current || latest.current.busy) {
        setStatus("New pages ready · finish this activity");
        return;
      }
      setStatus("Bringing in your latest pages…");
      const raw = await downloadBook(user, head, signal);
      valid();
      if (paused.current || latest.current.busy) {
        setStatus("New pages ready · finish this activity");
        return;
      }
      await v.receiveSynced(
        raw,
        head,
        user.uid,
        fingerprint,
        false,
        signal,
        () => !paused.current && !latest.current.busy,
      );
      setStatus("Saved to your account");
      setConflict(false);
      return;
    }
    if (fingerprint === binding.fingerprint) {
      markSaved();
      return;
    }
    setStatus("Saving to your account…");
    const saved = await uploadBook(
      user,
      snapshot,
      binding.remoteId,
      binding.revision,
      signal,
      head?.manifest,
    );
    valid();
    writeBinding(v.editionId, {
      ...binding,
      revision: saved.revision,
      fingerprint,
    });
    setBooks((previous) => [
      ...previous.filter((h) => h.id !== saved.id),
      saved,
    ]);
    setConflict(false);
    markSaved();
  }
  const syncNow = () => exclusive(run);
  // Poll while open and also on online/focus. Editor drafts are never replaced.
  const runRef = useRef(syncNow);
  useLayoutEffect(() => {
    runRef.current = syncNow;
  });
  useEffect(() => {
    const b = readBinding(vault.editionId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(
      !b
        ? "Local only"
        : !user
          ? "Saved here · sign in to sync"
          : b.uid !== user.uid
            ? "Saved here · sign in to the linked account"
            : "Checking sync…",
    );
    const check = () => {
      if (
        running.current ||
        latest.current.mode !== "open" ||
        !user?.emailVerified ||
        !readBinding(latest.current.editionId)
      )
        return;
      if (!navigator.onLine) {
        setStatus("Saved here · waiting for internet");
        return;
      }
      void runRef
        .current()
        .catch(() => setStatus("Saved here · sync needs attention"));
    };
    const first = setTimeout(check, 1800),
      interval = setInterval(check, 30000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [vault.book, vault.editionId, vault.mode, user]);
  const newSecret = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  async function accountBook(name: string, audience: Audience, copy = false) {
    return exclusive(async (signal) => {
      if (!user?.emailVerified)
        throw new Error("Sign in and verify your email first.");
      const label = name.trim();
      if (!label || label.length > 60 || !isAudience(audience))
        throw new Error("Choose a name and age range.");
      const secret = newSecret(),
        id = crypto.randomUUID();
      const profile =
        audience === "adult"
          ? { kind: "adult" as const }
          : {
              kind: "child" as const,
              ageBand: audience,
              parentLock: { accountUid: user.uid },
            };
      const initial = copy
        ? null
        : await createVault({ ...emptyBook(label), profile }, secret);
      const snapshot = copy
        ? await latest.current.accountSnapshot(secret, user.uid)
        : { envelope: initial!.envelope, media: [], label };
      signal.throwIfAborted();
      const head = await uploadBook(
        user,
        snapshot,
        id,
        null,
        signal,
        undefined,
        secret,
      );
      signal.throwIfAborted();
      await latest.current.openSynced(
        JSON.stringify({ ...snapshot.envelope, media: snapshot.media }),
        secret,
        head,
        user.uid,
        signal,
      );
      setBooks((previous) => [...previous, head]);
      setStatus("Saved to your account");
    });
  }
  const createBook = (name: string, audience: Audience) =>
    accountBook(name, audience);
  const addCurrentBook = () =>
    accountBook(
      latest.current.book.owner,
      latest.current.book.profile?.kind === "child"
        ? latest.current.book.profile.ageBand
        : "adult",
      true,
    );
  async function enable() {
    if (!user?.emailVerified || latest.current.mode !== "open")
      throw new Error("Open a private book and sign in first.");
    const old = readBinding(latest.current.editionId);
    if (old && old.uid !== user.uid)
      throw new Error(
        "This book is linked to another account. Sign in to that account first.",
      );
    if (!old)
      writeBinding(latest.current.editionId, {
        uid: user.uid,
        remoteId: crypto.randomUUID(),
        revision: null,
        fingerprint: null,
      });
    await syncNow();
  }
  async function open(head: SyncedEdition, passphrase = "") {
    return exclusive(async (signal) => {
      if (!user) throw new Error("Sign in first.");
      const current = (await list(signal)).find((book) => book.id === head.id);
      if (!current)
        throw new Error(
          "This synced copy was removed. Choose another book from your library.",
        );
      if (current.accountManaged) {
        const access = await syncRequest<{ secret: string }>(
          user,
          { action: "account-key", id: current.id },
          signal,
        );
        passphrase = access.secret;
      }
      const raw = await downloadBook(user, current, signal);
      signal.throwIfAborted();
      await latest.current.openSynced(
        raw,
        passphrase,
        current,
        user.uid,
        signal,
      );
      setConflict(false);
      setStatus("Checking sync…");
    });
  }
  async function keepBoth() {
    return exclusive(async (signal) => {
      const v = latest.current,
        b = readBinding(v.editionId);
      if (!b || !user || latest.current.busy)
        throw new Error("Finish this activity before resolving versions.");
      const head = (await list(signal)).find((h) => h.id === b.remoteId);
      if (!head)
        throw new Error(
          "The synced copy was removed. Your device copy is safe.",
        );
      const snapshot = await v.syncSnapshot(),
        raw = await downloadBook(user, head, signal);
      signal.throwIfAborted();
      if (head.accountManaged) {
        const { secret } = await syncRequest<{ secret: string }>(
          user,
          { action: "account-key", id: head.id },
          signal,
        );
        await uploadBook(
          user,
          {
            ...snapshot,
            label: `${snapshot.label.slice(0, 43)} — device copy`,
          },
          crypto.randomUUID(),
          null,
          signal,
          undefined,
          secret,
        );
      }
      await v.receiveSynced(
        raw,
        head,
        user.uid,
        await hashSync(snapshot.envelope),
        head.accountManaged ? "online" : true,
        signal,
      );
      setConflict(false);
      setStatus(
        head.accountManaged
          ? "Saved · both versions in your library"
          : "Synced · device copy kept on bookshelf",
      );
    });
  }
  async function remove(head: SyncedEdition) {
    return exclusive(async (signal) => {
      if (!user) throw new Error("Sign in first.");
      await syncRequest(
        user,
        {
          action: "remove",
          id: head.id,
          baseRevision: head.revision,
          confirmation: "REMOVE SYNCED COPY",
        },
        signal,
      );
      signal.throwIfAborted();
      const b = readBinding(latest.current.editionId);
      if (b?.uid === user.uid && b.remoteId === head.id)
        localStorage.removeItem(bindingKey(latest.current.editionId));
      await list(signal);
      setStatus("Local only");
    });
  }
  return {
    user,
    authReady,
    createBook,
    addCurrentBook,
    books,
    status,
    conflict,
    working,
    error,
    refresh,
    refreshUser,
    enable,
    syncNow,
    open,
    keepBoth,
    remove,
    cancel: () => abort.current?.abort(),
    setPaused: (value: boolean) => {
      paused.current = value;
    },
  };
}
