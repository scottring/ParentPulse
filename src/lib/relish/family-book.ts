/**
 * Our family book: one more account-managed edition in the parent's account.
 *
 * It is never opened as the current book. Its decrypted Book has the profile
 * `{ kind: "family" }` and holds `familyPages`; every change is a
 * read-modify-write: get the book's secret, download, decrypt, apply one
 * change by id, re-encrypt and upload against the revision that was read.
 * A revision conflict (another device saved first) re-reads and re-applies,
 * up to three tries. It is created on the first page added. If two devices
 * raced to create it, pages are read from both and written to the one with
 * the smallest id; a removal is applied to every copy that holds the page.
 *
 * Without an account (a book kept on this device, or the sample), the same
 * `familyPages` field lives in the current book itself.
 *
 * Photos shared with a page (2026-11-23) are the family book's own media:
 * encrypted with its key, like the pages, and opened one at a time when
 * shown. Each write keeps the photos of the pages still there (by hash, not
 * downloaded again) and drops those of a page taken out; the sync server
 * collects their ciphertext once no recent revision refers to it.
 */
import { emptyBook, type Book } from "./model";
import {
  addFamilyPage,
  mergeFamilyPages,
  removeFamilyPage,
  type FamilyPage,
} from "./family-pages";
import { createVault, seal, unlockVault } from "./vault";
import { decryptPhoto, encryptPhoto, type EncryptedPhoto, type PhotoCopy } from "./photos";
import { SyncError } from "./book-sync-client";
import type {
  EncryptedSnapshot,
  SyncManifest,
  SyncedEdition,
} from "./book-sync";

export const FAMILY_LABEL = "Our family book";
/** The account's family book, judged by its label before it is decrypted. */
export const isFamilyHead = (head: Pick<SyncedEdition, "label" | "accountManaged">) =>
  !!head.accountManaged && head.label === FAMILY_LABEL;

/** What the family book needs from the account's library, so tests can fake it. */
export type FamilyRemote = {
  list: () => Promise<SyncedEdition[]>;
  secret: (id: string) => Promise<string>;
  /** The book's encrypted envelope, without its photos. */
  download: (head: SyncedEdition) => Promise<string>;
  /** One of its photos, by the id and hash in its manifest. */
  photo: (entry: SyncManifest["photos"][number]) => Promise<EncryptedPhoto>;
  upload: (
    snapshot: EncryptedSnapshot,
    id: string,
    baseRevision: string | null,
    previous?: SyncManifest,
    accountSecret?: string,
  ) => Promise<SyncedEdition>;
};
type Opened = { head: SyncedEdition; key: CryptoKey; salt: string; book: Book };

const byId = (a: SyncedEdition, b: SyncedEdition) => a.id.localeCompare(b.id);
async function familyHeads(remote: FamilyRemote) {
  return (await remote.list()).filter(isFamilyHead).toSorted(byId);
}
async function openFamily(remote: FamilyRemote, head: SyncedEdition): Promise<Opened | null> {
  const secret = await remote.secret(head.id);
  const raw = await remote.download(head);
  const { key, envelope, book } = await unlockVault(raw, secret);
  // Something else that happens to share the label is never written to.
  if (book.profile?.kind !== "family") return null;
  return { head, key, salt: envelope.salt, book };
}
const photosOf = (book: Pick<Book, "familyPages">) =>
  new Set((book.familyPages || []).flatMap((p) => p.photos || []).map((p) => p.id));
const seals = (copies: PhotoCopy[], key: CryptoKey) =>
  Promise.all(copies.map((c) => encryptPhoto(c.photo.id, c.blob, key)));
async function write(remote: FamilyRemote, opened: Opened, book: Book, copies: PhotoCopy[] = []) {
  const envelope = await seal(book, opened.key, opened.salt);
  const wanted = photosOf(book);
  const keep = (opened.head.manifest.photos || []).filter((p) => wanted.has(p.id));
  await remote.upload(
    { envelope, media: await seals(copies, opened.key), keep, label: FAMILY_LABEL },
    opened.head.id,
    opened.head.revision,
    opened.head.manifest,
  );
}
const newSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
async function create(remote: FamilyRemote, pages: FamilyPage[], copies: PhotoCopy[] = []) {
  const secret = newSecret();
  const book: Book = {
    ...emptyBook("Our family"),
    profile: { kind: "family" },
    familyPages: pages,
  };
  const { envelope, key } = await createVault(book, secret);
  await remote.upload(
    { envelope, media: await seals(copies, key), label: FAMILY_LABEL },
    crypto.randomUUID(),
    null,
    undefined,
    secret,
  );
}

/** Our family book as read: its pages, and a way to open their photos. */
export type FamilyRead = { pages: FamilyPage[]; photo: (id: string) => Promise<Blob> };

/** Every page in the account's family book (all copies, merged). */
export async function loadFamilyPages(remote: FamilyRemote): Promise<FamilyRead> {
  const heads = await familyHeads(remote);
  const opened = (await Promise.all(heads.map((h) => openFamily(remote, h)))).filter(
    (o): o is Opened => !!o,
  );
  const opening = new Map<string, Promise<Blob>>();
  // A photo opens from the copy whose pages hold it, with that copy's key.
  const photo = (id: string) => {
    const known = opening.get(id);
    if (known) return known;
    const from = opened.find((o) => photosOf(o.book).has(id));
    const entry = from?.head.manifest.photos?.find((p) => p.id === id);
    const next =
      from && entry
        ? remote.photo(entry).then((p) => decryptPhoto(p, from.key))
        : Promise.reject(new Error("This photo isn’t in Our family journal."));
    next.catch(() => opening.delete(id));
    opening.set(id, next);
    return next;
  };
  return { pages: mergeFamilyPages(...opened.map((o) => o.book.familyPages || [])), photo };
}

/** Add a page (with copies of its photos, if any), or take one out by id. */
export type FamilyChange = { add: FamilyPage; photos?: PhotoCopy[] } | { remove: string };
const conflict = (e: unknown) => e instanceof SyncError && e.status === 409;

/** One change to the account's family book, retried on a revision conflict. */
export async function changeFamilyBook(remote: FamilyRemote, change: FamilyChange, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const heads = await familyHeads(remote);
      if ("add" in change) {
        const target = heads.length ? await openFamily(remote, heads[0]) : null;
        const copies = (change.photos || []).filter((c) =>
          change.add.photos?.some((p) => p.id === c.photo.id),
        );
        if ((change.add.photos?.length || 0) !== copies.length)
          throw new Error("This page’s photos couldn’t be added.");
        if (!heads.length)
          await create(remote, addFamilyPage<Pick<Book, "familyPages">>({}, change.add).familyPages!, copies);
        else if (!target) throw new Error("Our family journal couldn’t be read.");
        else {
          const next = addFamilyPage(target.book, change.add);
          if (next !== target.book) await write(remote, target, next, copies);
        }
      } else {
        for (const head of heads) {
          const opened = await openFamily(remote, head);
          if (!opened?.book.familyPages?.some((p) => p.id === change.remove)) continue;
          await write(remote, opened, removeFamilyPage(opened.book, change.remove));
        }
      }
      return;
    } catch (e) {
      if (!conflict(e) || attempt >= tries) throw e;
    }
  }
}
