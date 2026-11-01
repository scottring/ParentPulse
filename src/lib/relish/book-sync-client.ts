import type { User } from "firebase/auth";
import {
  hashSync,
  SYNC_CHUNK,
  validManifest,
  validSyncBlob,
  type SyncManifest,
  type SyncedEdition,
  type SyncBlob,
  type EncryptedSnapshot,
} from "./book-sync";
import { parseEnvelope } from "./vault";
export class SyncError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function syncRequest<T>(
  user: User,
  data: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch("/api/relish/sync/", {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Relish-Consent": "encrypted-library",
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new SyncError(
      result.error || "Your book is saved here. Sync will try again.",
      response.status,
    );
  return result as T;
}
export async function uploadBook(
  user: User,
  snapshot: EncryptedSnapshot,
  id: string,
  baseRevision: string | null,
  signal: AbortSignal,
  previous?: SyncManifest,
): Promise<SyncedEdition> {
  const { ciphertext, ...envelope } = snapshot.envelope;
  const parts: string[] = [],
    photos: SyncManifest["photos"] = [];
  const known = new Set([
    ...(previous?.envelope.parts || []),
    ...(previous?.photos.map((p) => p.hash) || []),
  ]);
  const put = async (blob: SyncBlob) => {
    const hash = await hashSync(blob);
    if (!known.has(hash)) {
      const result = await syncRequest<{ hash: string }>(
        user,
        { action: "put", blob },
        signal,
      );
      if (result.hash !== hash)
        throw new Error("This upload could not be verified.");
    }
    return hash;
  };
  for (let i = 0; i < ciphertext.length; i += SYNC_CHUNK)
    parts.push(
      await put({ kind: "text", data: ciphertext.slice(i, i + SYNC_CHUNK) }),
    );
  for (const photo of snapshot.media)
    photos.push({
      id: photo.id,
      hash: await put({ kind: "photo", data: photo }),
    });
  const manifest: SyncManifest = {
    envelope: { ...envelope, parts },
    photos,
    fingerprint: await hashSync(snapshot.envelope),
  };
  return (
    await syncRequest<{ book: SyncedEdition }>(
      user,
      { action: "commit", id, baseRevision, label: snapshot.label, manifest },
      signal,
    )
  ).book;
}
export async function downloadBook(
  user: User,
  head: SyncedEdition,
  signal: AbortSignal,
): Promise<string> {
  const m = head.manifest;
  if (!validManifest(m)) throw new Error("This synced book could not be read.");
  const get = async (hash: string) => {
    const { blob } = await syncRequest<{ blob: SyncBlob }>(
      user,
      { action: "get", hash },
      signal,
    );
    if (!validSyncBlob(blob) || (await hashSync(blob)) !== hash)
      throw new Error("This download could not be verified.");
    return blob;
  };
  let ciphertext = "";
  for (const hash of m.envelope.parts) {
    const b = await get(hash);
    if (b.kind !== "text") throw new Error("This book is damaged.");
    ciphertext += b.data;
  }
  const envelope = parseEnvelope(JSON.stringify({ ...m.envelope, ciphertext }));
  if ((await hashSync(envelope)) !== m.fingerprint)
    throw new Error(
      "This book’s encrypted contents do not match its revision.",
    );
  const media = [];
  for (const p of m.photos) {
    const b = await get(p.hash);
    if (b.kind !== "photo" || b.data.id !== p.id)
      throw new Error("This photo is damaged.");
    media.push(b.data);
  }
  return JSON.stringify({ ...envelope, media });
}
