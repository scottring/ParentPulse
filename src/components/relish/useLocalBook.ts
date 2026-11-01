"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  photoIds,
  preparePhoto,
  encryptPhoto,
  decryptPhoto,
  putPhoto,
  getPhoto,
  backupPhotos,
  restorePhotos,
  removePhotos,
  BACKUP_BYTES,
  type PhotoAccess,
} from "@/lib/relish/photos";
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
  decryptVault,
  unlockVault,
  seal,
  parseEnvelope,
  type Envelope,
} from "@/lib/relish/vault";
import {
  hashSync,
  readBinding,
  writeBinding,
  bindingKey,
  type SyncedEdition,
  type EncryptedSnapshot,
} from "@/lib/relish/book-sync";
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
  const samplePhotos = useRef(new Map<string, Blob>());
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
    samplePhotos.current.clear();
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
          if (importRaw)
            await restorePhotos(importRaw, result.book, result.key, id);
          if (token !== epoch.current)
            throw new Error("The book was locked before it could be restored.");
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
  const photos: PhotoAccess = {
    add: async (file) => {
      const token = epoch.current,
        id = selected.current,
        sample = mode === "sample";
      if (!sample && !key.current) throw new Error("Unlock your book first.");
      if (photoIds(currentBook.current).length >= 200)
        throw new Error(
          "This book holds up to 200 photos. Save a backup before starting another edition.",
        );
      const prepared = await preparePhoto(file);
      if (token !== epoch.current) throw new Error("This book was locked.");
      if (sample) samplePhotos.current.set(prepared.photo.id, prepared.blob);
      else {
        const encrypted = await encryptPhoto(
          prepared.photo.id,
          prepared.blob,
          key.current!,
        );
        if (token !== epoch.current) throw new Error("This book was locked.");
        await putPhoto(id, encrypted);
      }
      if (token !== epoch.current) throw new Error("This book was locked.");
      return prepared.photo;
    },
    load: async (id) => {
      const token = epoch.current,
        edition = selected.current,
        activeKey = key.current;
      const sample = samplePhotos.current.get(id);
      if (mode === "sample" && sample) return sample;
      if (!activeKey) throw new Error("Unlock this book to see its photos.");
      const blob = await decryptPhoto(await getPhoto(edition, id), activeKey);
      if (token !== epoch.current) throw new Error("This book was locked.");
      return blob;
    },
  };
  const backup = async () => {
    const token = epoch.current;
    try {
      await queue.current;
      if (token !== epoch.current || !key.current)
        throw new Error("Unlock your book before making a backup.");
      const raw = localStorage.getItem(editionKey(selected.current));
      if (!raw) throw new Error("This book has not been saved yet.");
      const encrypted = parseEnvelope(raw);
      if (JSON.stringify(encrypted) !== JSON.stringify(envelope.current))
        throw new Error(
          "This book changed in another tab. Unlock its latest version before making a backup.",
        );
      const media = await backupPhotos(currentBook.current, selected.current);
      if (token !== epoch.current) throw new Error("This book was locked.");
      const bundle = JSON.stringify({
        ...encrypted,
        ...(media.length ? { media } : {}),
      });
      if (bundle.length > BACKUP_BYTES)
        throw new Error(
          "This book is too large for a single backup. Please contact support before adding more photos.",
        );
      const url = URL.createObjectURL(
        new Blob([bundle], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `relish-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (token === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "The backup could not be made. Your book is still here.",
        );
    }
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
      localStorage.removeItem(bindingKey(id));
      removeEditionLabel(id);
      await removePhotos(id).catch(() => {});
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
  // Sync sees only a consistent encrypted snapshot, never an editor's unsaved text.
  const syncSnapshot = async (): Promise<EncryptedSnapshot> => {
    const token = epoch.current,
      id = selected.current;
    await queue.current;
    return withVaultWrite(async () => {
      if (token !== epoch.current || !key.current || !envelope.current)
        throw new Error("Unlock this book before syncing it.");
      const encrypted = envelope.current;
      if (localStorage.getItem(editionKey(id)) !== JSON.stringify(encrypted))
        throw new Error(
          "This book changed in another tab. Unlock its latest version.",
        );
      const media = await backupPhotos(currentBook.current, id);
      if (token !== epoch.current) throw new Error("This book was locked.");
      return {
        envelope: encrypted,
        media,
        label: currentBook.current.owner.slice(0, 60),
      };
    });
  };
  const openSynced = async (
    raw: string,
    passphrase: string,
    head: SyncedEdition,
    uid: string,
    signal?: AbortSignal,
  ) => {
    const token = epoch.current;
    await queue.current;
    signal?.throwIfAborted();
    const existing = listEditions().find((e) => {
      const b = readBinding(e.id);
      return b?.uid === uid && b.remoteId === head.id;
    });
    const id = existing?.id || crypto.randomUUID();
    const before = localStorage.getItem(editionKey(id)),
      binding = readBinding(id);
    // An offline edit takes precedence locally. The sync controller will surface
    // a conflict if the remote revision also advanced; it must never overwrite it.
    const dirty =
      !!before &&
      (await hashSync(parseEnvelope(before))) !== binding?.fingerprint;
    const result = await unlockVault(dirty ? before! : raw, passphrase);
    await withVaultWrite(async () => {
      signal?.throwIfAborted();
      if (
        token !== epoch.current ||
        localStorage.getItem(editionKey(id)) !== before
      )
        throw new Error("This book changed while opening. Please try again.");
      if (!dirty) await restorePhotos(raw, result.book, result.key, id);
      signal?.throwIfAborted();
      if (token !== epoch.current) throw new Error("This book was locked.");
      // Persist ciphertext first. If the binding write fails, the next sync
      // recognizes the remote fingerprint without treating old data as a new edit.
      localStorage.setItem(editionKey(id), JSON.stringify(result.envelope));
      if (!dirty)
        writeBinding(id, {
          uid,
          remoteId: head.id,
          revision: head.revision,
          fingerprint: head.manifest.fingerprint,
        });
      labelEdition(id, result.book.owner);
    });
    signal?.throwIfAborted();
    if (token !== epoch.current) return;
    epoch.current++;
    selected.current = id;
    setEditionId(id);
    setEditions(listEditions());
    key.current = result.key;
    envelope.current = result.envelope;
    currentBook.current = result.book;
    setBook(result.book);
    setMode("open");
    setError("");
  };
  const receiveSynced = async (
    raw: string,
    head: SyncedEdition,
    uid: string,
    expected: string,
    preserve = false,
    signal?: AbortSignal,
    canApply: () => boolean = () => true,
  ) => {
    const token = epoch.current,
      id = selected.current,
      activeKey = key.current;
    if (!activeKey) throw new Error("Unlock your book first.");
    const encrypted = parseEnvelope(raw);
    const next = await decryptVault(encrypted, activeKey);
    await queue.current;
    signal?.throwIfAborted();
    await withVaultWrite(async () => {
      signal?.throwIfAborted();
      if (!canApply())
        throw new Error("Finish this activity before bringing in new pages.");
      const current = envelope.current;
      if (
        token !== epoch.current ||
        !current ||
        localStorage.getItem(editionKey(id)) !== JSON.stringify(current) ||
        (await hashSync(current)) !== expected
      )
        throw new Error("Your device saved another change. Try syncing again.");
      const binding = readBinding(id);
      if (binding?.uid !== uid || binding.remoteId !== head.id)
        throw new Error("The sync connection changed. Reopen Account.");
      if (!preserve && binding.fingerprint !== expected)
        throw new Error("This device has changes. Keep both versions first.");
      if (preserve) {
        const copyId = crypto.randomUUID();
        const media = await backupPhotos(currentBook.current, id);
        await restorePhotos(
          JSON.stringify({ ...current, media }),
          currentBook.current,
          activeKey,
          copyId,
        );
        signal?.throwIfAborted();
        if (!canApply())
          throw new Error("Finish this activity before bringing in new pages.");
        if (token !== epoch.current) throw new Error("This book was locked.");
        localStorage.setItem(editionKey(copyId), JSON.stringify(current));
        labelEdition(copyId, `${currentBook.current.owner} — device copy`);
      }
      await restorePhotos(raw, next, activeKey, id);
      signal?.throwIfAborted();
      if (!canApply())
        throw new Error("Finish this activity before bringing in new pages.");
      if (token !== epoch.current) throw new Error("This book was locked.");
      localStorage.setItem(editionKey(id), JSON.stringify(encrypted));
      envelope.current = encrypted;
      currentBook.current = next;
      setBook(next);
      writeBinding(id, {
        uid,
        remoteId: head.id,
        revision: head.revision,
        fingerprint: head.manifest.fingerprint,
      });
      labelEdition(id, next.owner);
      setEditions(listEditions());
    });
  };
  return {
    syncSnapshot,
    openSynced,
    receiveSynced,
    photos,
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
