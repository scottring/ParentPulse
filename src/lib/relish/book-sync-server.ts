import { FieldPath } from "firebase-admin/firestore";
import { createHash, randomUUID } from "node:crypto";
import { AIError, services } from "./hosted-ai";
import {
  isSyncId,
  isHash,
  validSyncBlob,
  validManifest,
  manifestHashes,
  type SyncedEdition,
  type SyncManifest,
} from "./book-sync";
const QUOTA = 300_000_000;
const bad = (message = "This sync request could not be read.", status = 400) =>
  new AIError(message, status);

// The UID comes exclusively from the verified token. These collections are not
// accessible through the client Firestore SDK. Account-managed books have a random
// recovery secret in a separate owner-scoped collection; local book passphrases
// are never uploaded. This is account security, not zero-knowledge storage.
export async function syncAction(uid: string, data: Record<string, unknown>) {
  const { db } = services();
  const root = db.doc(`relish_sync/${uid}`),
    books = root.collection("books"),
    blobs = root.collection("blobs");
  const tombstone = db.doc(`relish_connections_profiles/${uid}`);
  const now = Date.now(),
    minute = Math.floor(now / 60_000),
    day = Math.floor(now / 86_400_000);
  await db.runTransaction(async (tx) => {
    const [p, r] = await tx.getAll(tombstone, root);
    if (p.data()?.deleting || r.data()?.deleting)
      throw bad("Account removal is in progress.", 409);
    const previous = r.data() || {};
    const count = previous.minute === minute ? previous.count : 0;
    const daily = previous.day === day ? previous.daily : 0;
    if (count >= 400 || daily >= 20000)
      throw new AIError(
        "Sync needs a short pause. Your changes are saved on this device.",
        429,
        count >= 400 ? 60 : 3600,
      );
    tx.set(root, {
      ...previous,
      minute,
      count: count + 1,
      day,
      daily: daily + 1,
    });
  });
  if (data.action === "list") {
    await collectOldSyncBlobs(uid);
    return {
      books: (await books.get()).docs.map((d) => {
        const { previous: _previous, ...head } = d.data();
        void _previous;
        return head;
      }),
    };
  }
  if (data.action === "account-key") {
    if (!isSyncId(data.id)) throw bad();
    return db.runTransaction(async (tx) => {
      const [p, r, head, access] = await tx.getAll(
        tombstone,
        root,
        books.doc(data.id as string),
        root.collection("access").doc(data.id as string),
      );
      if (p.data()?.deleting || r.data()?.deleting)
        throw bad("Account removal is in progress.", 409);
      if (!head.data()?.accountManaged || !access.exists)
        throw bad("This account book is not available.", 404);
      return { secret: access.data()!.secret };
    });
  }
  if (data.action === "get") {
    if (!isHash(data.hash)) throw bad();
    const blob = (await blobs.doc(data.hash).get()).data();
    if (!blob)
      throw bad(
        "This synced version is no longer available. Refresh your library and try again.",
        404,
      );
    return { blob: blob.blob };
  }
  if (data.action === "put") {
    if (!validSyncBlob(data.blob)) throw bad();
    const serialized = JSON.stringify(data.blob),
      hash = createHash("sha256").update(serialized).digest("hex"),
      size = Buffer.byteLength(serialized);
    await db.runTransaction(async (tx) => {
      const [p, r, existing] = await tx.getAll(
        tombstone,
        root,
        blobs.doc(hash),
      );
      if (p.data()?.deleting || r.data()?.deleting)
        throw bad("Account removal is in progress.", 409);
      if (existing.exists) return;
      const used = r.data()?.bytes || 0;
      if (used + size > QUOTA)
        throw bad(
          "This account’s encrypted storage is full. Your latest changes remain on this device.",
          413,
        );
      tx.set(blobs.doc(hash), {
        blob: data.blob,
        kind: (data.blob as { kind: string }).kind,
        photoId:
          (data.blob as { kind: string; data: { id?: string } }).kind ===
          "photo"
            ? (data.blob as { data: { id: string } }).data.id
            : null,
        size,
        createdAt: now,
      });
      tx.set(root, { bytes: used + size }, { merge: true });
    });
    return { hash };
  }
  if (data.action === "commit") {
    if (
      !isSyncId(data.id) ||
      !(data.baseRevision === null || isSyncId(data.baseRevision)) ||
      typeof data.label !== "string" ||
      !data.label.trim() ||
      data.label.length > 60 ||
      !validManifest(data.manifest) ||
      (data.accountSecret !== undefined && !isHash(data.accountSecret))
    )
      throw bad();
    const manifest = data.manifest,
      ref = books.doc(data.id);
    return db.runTransaction(async (tx) => {
      const [p, head, r] = await tx.getAll(tombstone, ref, root);
      if (p.data()?.deleting || r.data()?.deleting)
        throw bad("Account removal is in progress.", 409);
      const current = head.data() as
        (SyncedEdition & { previous?: SyncManifest }) | undefined;
      if (data.accountSecret !== undefined && current) {
        const access = await tx.get(
          root.collection("access").doc(data.id as string),
        );
        if (
          !current.accountManaged ||
          access.data()?.secret !== data.accountSecret
        )
          throw bad("An existing book’s account key cannot be replaced.", 409);
      }
      // An acknowledged retry after a lost response is idempotent.
      if (current?.manifest.fingerprint === manifest.fingerprint)
        return {
          book: {
            id: current.id,
            label: current.label,
            revision: current.revision,
            updatedAt: current.updatedAt,
            manifest: current.manifest,
            ...(current.accountManaged
              ? { accountManaged: true as const }
              : {}),
          },
        };
      if ((current?.revision || null) !== data.baseRevision)
        throw bad(
          "Another device saved changes. Keep both versions before continuing.",
          409,
        );
      if (!current && (await tx.get(books)).size >= 20)
        throw bad("This account already holds 20 editions.", 409);
      const refs = manifestHashes(manifest).map((h) => blobs.doc(h));
      const available = await tx.getAll(...refs, {
        fieldMask: ["kind", "photoId", "size"],
      });
      const byHash = new Map(available.map((d) => [d.id, d.data()]));
      if (
        manifest.envelope.parts.some((h) => byHash.get(h)?.kind !== "text") ||
        manifest.photos.some(
          (p) =>
            byHash.get(p.hash)?.kind !== "photo" ||
            byHash.get(p.hash)?.photoId !== p.id,
        )
      )
        throw bad("An upload is incomplete. Please try syncing again.", 409);
      if (
        available.reduce((sum, d) => sum + (d.data()?.size || 0), 0) >
        120_000_000
      )
        throw bad("This book is too large to sync.", 413);
      const book: SyncedEdition = {
        id: data.id as string,
        label: (data.label as string).trim(),
        revision: randomUUID(),
        updatedAt: now,
        manifest,
        ...(current?.accountManaged || data.accountSecret
          ? { accountManaged: true as const }
          : {}),
      };
      if (!current && data.accountSecret)
        tx.set(root.collection("access").doc(data.id as string), {
          secret: data.accountSecret,
        });
      tx.set(ref, { ...book, previous: current?.manifest || null });
      return { book };
    });
  }
  if (data.action === "remove") {
    if (
      !isSyncId(data.id) ||
      !isSyncId(data.baseRevision) ||
      data.confirmation !== "REMOVE SYNCED COPY"
    )
      throw bad("Confirm removal of the synced copy first.");
    await db.runTransaction(async (tx) => {
      const [p, head, r] = await tx.getAll(
        tombstone,
        books.doc(data.id as string),
        root,
      );
      if (p.data()?.deleting || r.data()?.deleting)
        throw bad("Account removal is in progress.", 409);
      if (head.data()?.revision !== data.baseRevision)
        throw bad(
          "This book changed. Refresh before removing its synced copy.",
          409,
        );
      const allHeads = await tx.get(books);
      const protectedHashes = new Set<string>();
      for (const other of allHeads.docs)
        if (other.id !== head.id) {
          for (const m of [other.data().manifest, other.data().previous])
            if (m)
              manifestHashes(m).forEach((hash) => protectedHashes.add(hash));
        }
      const candidates = [
        ...new Set(
          [head.data()?.manifest, head.data()?.previous]
            .filter(Boolean)
            .flatMap((m) => manifestHashes(m)),
        ),
      ].filter((hash) => !protectedHashes.has(hash));
      const obsolete = candidates.length
        ? await tx.getAll(...candidates.map((hash) => blobs.doc(hash)), {
            fieldMask: ["size"],
          })
        : [];
      let freed = 0;
      for (const blob of obsolete)
        if (blob.exists) {
          freed += blob.data()?.size || 0;
          tx.delete(blob.ref);
        }
      tx.set(
        root,
        { bytes: Math.max(0, (r.data()?.bytes || 0) - freed) },
        { merge: true },
      );
      tx.delete(head.ref);
      tx.delete(root.collection("access").doc(data.id as string));
    });
    return { ok: true };
  }
  throw bad("Choose a sync action.");
}

// Keep current and previous revisions; collect abandoned/obsolete ciphertext in
// bounded transactions. A grace period protects uploads and in-flight downloads.
async function collectOldSyncBlobs(uid: string) {
  const { db } = services(),
    root = db.doc(`relish_sync/${uid}`);
  await db.runTransaction(async (tx) => {
    const [r, p] = await tx.getAll(
      root,
      db.doc(`relish_connections_profiles/${uid}`),
    );
    if (
      p.data()?.deleting ||
      r.data()?.deleting ||
      Date.now() - (r.data()?.collectedAt || 0) < 60000
    )
      return;
    const heads = await tx.get(root.collection("books"));
    const keep = new Set<string>();
    heads.docs.forEach((d) => {
      const h = d.data();
      for (const m of [h.manifest, h.previous])
        if (m) manifestHashes(m).forEach((hash) => keep.add(hash));
    });
    let query = root
      .collection("blobs")
      .where("createdAt", "<", Date.now() - 3600000)
      .orderBy("createdAt")
      .orderBy(FieldPath.documentId());
    const cursor = r.data()?.collectionCursor;
    if (cursor) query = query.startAfter(cursor.createdAt, cursor.id);
    const old = await tx.get(query.limit(400).select("size", "createdAt"));
    const last = old.docs.at(-1);
    const collectionCursor =
      old.size === 400 && last
        ? { id: last.id, createdAt: last.data().createdAt }
        : null;
    let freed = 0;
    for (const d of old.docs)
      if (!keep.has(d.id)) {
        freed += d.data().size;
        tx.delete(d.ref);
      }
    tx.set(
      root,
      {
        bytes: Math.max(0, (r.data()?.bytes || 0) - freed),
        collectedAt: Date.now(),
        collectionCursor,
      },
      { merge: true },
    );
  });
}
