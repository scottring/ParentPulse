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
 */
import { emptyBook, type Book } from "./model";
import {
  addFamilyPage,
  mergeFamilyPages,
  removeFamilyPage,
  type FamilyPage,
} from "./family-pages";
import { createVault, seal, unlockVault } from "./vault";
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
  download: (head: SyncedEdition) => Promise<string>;
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
async function write(remote: FamilyRemote, opened: Opened, book: Book) {
  const envelope = await seal(book, opened.key, opened.salt);
  await remote.upload(
    { envelope, media: [], label: FAMILY_LABEL },
    opened.head.id,
    opened.head.revision,
    opened.head.manifest,
  );
}
const newSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
async function create(remote: FamilyRemote, pages: FamilyPage[]) {
  const secret = newSecret();
  const book: Book = {
    ...emptyBook("Our family"),
    profile: { kind: "family" },
    familyPages: pages,
  };
  const { envelope } = await createVault(book, secret);
  await remote.upload(
    { envelope, media: [], label: FAMILY_LABEL },
    crypto.randomUUID(),
    null,
    undefined,
    secret,
  );
}

/** Every page in the account's family book (all copies, merged). */
export async function loadFamilyPages(remote: FamilyRemote): Promise<FamilyPage[]> {
  const heads = await familyHeads(remote);
  const opened = await Promise.all(heads.map((h) => openFamily(remote, h)));
  return mergeFamilyPages(...opened.map((o) => o?.book.familyPages || []));
}

export type FamilyChange = { add: FamilyPage } | { remove: string };
const conflict = (e: unknown) => e instanceof SyncError && e.status === 409;

/** One change to the account's family book, retried on a revision conflict. */
export async function changeFamilyBook(remote: FamilyRemote, change: FamilyChange, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const heads = await familyHeads(remote);
      if ("add" in change) {
        const target = heads.length ? await openFamily(remote, heads[0]) : null;
        if (!heads.length) await create(remote, addFamilyPage<Pick<Book, "familyPages">>({}, change.add).familyPages!);
        else if (!target) throw new Error("Our family journal couldn’t be read.");
        else {
          const next = addFamilyPage(target.book, change.add);
          if (next !== target.book) await write(remote, target, next);
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
