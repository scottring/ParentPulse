/**
 * An in-memory stand-in for the account's encrypted library, for family-book
 * tests: it keeps each edition's encrypted envelope, hands out account-book
 * secrets, and refuses a commit whose base revision is stale (409), like
 * /api/relish/sync. It never sees anything decrypted.
 */
import { SyncError } from "../book-sync-client";
import { hashSync, type SyncedEdition, type SyncManifest } from "../book-sync";
import type { FamilyRemote } from "../family-book";
import type { EncryptedPhoto } from "../photos";

export function fakeLibrary(others: SyncedEdition[] = []) {
  const heads = new Map<string, SyncedEdition>();
  const raw = new Map<string, string>();
  const secrets = new Map<string, string>();
  const calls = { upload: 0, conflicts: 0, photos: 0 };
  // Encrypted photos by hash, like the sync server's blobs.
  const blobs = new Map<string, EncryptedPhoto>();
  /** Runs once before the next upload, e.g. another device saving first. */
  let before: (() => Promise<void>) | null = null;
  const remote: FamilyRemote = {
    list: async () => [...others, ...heads.values()],
    secret: async (id) => {
      const s = secrets.get(id);
      if (!s) throw new SyncError("This book was not found.", 404);
      return s;
    },
    download: async (head) => {
      const r = raw.get(head.id);
      if (!r) throw new SyncError("This book was not found.", 404);
      return r;
    },
    photo: async (entry) => {
      calls.photos++;
      const p = blobs.get(entry.hash);
      if (!p || p.id !== entry.id) throw new SyncError("This photo is no longer available.", 404);
      return p;
    },
    upload: async (snapshot, id, baseRevision, _previous, secret) => {
      if (before) {
        const run = before;
        before = null;
        await run();
      }
      calls.upload++;
      const current = heads.get(id);
      if ((current?.revision ?? null) !== baseRevision) {
        calls.conflicts++;
        throw new SyncError("Another device saved changes.", 409);
      }
      if (!current && secret) secrets.set(id, secret);
      // Kept photos must already be there; new ones are stored by hash.
      if ((snapshot.keep || []).some((k) => blobs.get(k.hash)?.id !== k.id))
        throw new SyncError("An upload is incomplete.", 409);
      const added = [];
      for (const m of snapshot.media) {
        const hash = await hashSync({ kind: "photo", data: m });
        blobs.set(hash, m);
        added.push({ id: m.id, hash });
      }
      const head: SyncedEdition = {
        id,
        label: snapshot.label,
        revision: crypto.randomUUID(),
        updatedAt: Date.now(),
        manifest: {
          fingerprint: id,
          photos: [...(snapshot.keep || []), ...added],
        } as unknown as SyncManifest,
        accountManaged: true,
      };
      heads.set(id, head);
      // Like downloadBook with { media: false }: the envelope only.
      raw.set(id, JSON.stringify(snapshot.envelope));
      return head;
    },
  };
  return {
    remote,
    heads,
    raw,
    blobs,
    secrets,
    calls,
    beforeNextUpload: (fn: () => Promise<void>) => {
      before = fn;
    },
  };
}
