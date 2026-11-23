import { isEncryptedPhoto, type EncryptedPhoto } from "./photos";
import { parseEnvelope, type Envelope } from "./vault";

export type SyncBlob =
  { kind: "text"; data: string } | { kind: "photo"; data: EncryptedPhoto };
export type SyncManifest = {
  envelope: Omit<Envelope, "ciphertext"> & { parts: string[] };
  photos: { id: string; hash: string }[];
  fingerprint: string;
};
export type SyncedEdition = {
  id: string;
  label: string;
  revision: string;
  updatedAt: number;
  manifest: SyncManifest;
  accountManaged?: true;
};
export type SyncBinding = {
  uid: string;
  remoteId: string;
  revision: string | null;
  fingerprint: string | null;
  accountManaged?: true;
};
export type EncryptedSnapshot = {
  envelope: Envelope;
  media: EncryptedPhoto[];
  label: string;
  /**
   * Photos already in this edition's current revision, carried into the next
   * one by id and hash without downloading or uploading them again (Our
   * family book). The server checks each is still there.
   */
  keep?: SyncManifest["photos"];
};
export const SYNC_CHUNK = 450_000;
/**
 * Which Relish is syncing. Since shared pages carry photos (2026-11-23), an
 * older Relish would save a journal or Our family journal without them, and
 * would download a newer journal again and again (its photo check refuses the
 * shared copies), so the server answers an older Relish only with 426 "Relish
 * was updated": before any quota or storage is touched. It shows that once
 * per sync check (every 30 s), keeps everything on the device, and stops
 * polling for nothing. Every request from this Relish says its version.
 */
export const SYNC_CLIENT = 2;
export const RELISH_UPDATED = "Relish was updated. Reload to keep saving.";
/** Whether this sync request comes from this Relish (or newer). */
export function clientMaySync(data: Record<string, unknown>) {
  return typeof data.client === "number" && data.client >= SYNC_CLIENT;
}
export const isSyncId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export const isHash = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
export function validSyncBlob(value: unknown): value is SyncBlob {
  if (!value || typeof value !== "object") return false;
  const b = value as SyncBlob;
  return (
    Object.keys(b).length === 2 &&
    (b.kind === "text"
      ? typeof b.data === "string" &&
        b.data.length > 0 &&
        b.data.length <= SYNC_CHUNK &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(b.data)
      : b.kind === "photo" &&
        isEncryptedPhoto(b.data) &&
        Object.keys(b.data).length === 3)
  );
}
export function validManifest(value: unknown): value is SyncManifest {
  try {
    const m = value as SyncManifest;
    if (
      !m ||
      !isHash(m.fingerprint) ||
      !Array.isArray(m.envelope?.parts) ||
      !m.envelope.parts.length ||
      m.envelope.parts.length > 27 ||
      !m.envelope.parts.every(isHash) ||
      !Array.isArray(m.photos) ||
      m.photos.length > 200 ||
      !m.photos.every((p) => isSyncId(p?.id) && isHash(p?.hash)) ||
      new Set(m.photos.map((p) => p.id)).size !== m.photos.length
    )
      return false;
    parseEnvelope(JSON.stringify({ ...m.envelope, ciphertext: "AAAA" }));
    return (
      Object.keys(m).length === 3 &&
      Object.keys(m.envelope).length === 5 &&
      m.photos.every((p) => Object.keys(p).length === 2)
    );
  } catch {
    return false;
  }
}
export function manifestHashes(m: SyncManifest) {
  return [...new Set([...m.envelope.parts, ...m.photos.map((p) => p.hash)])];
}
export async function hashSync(value: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const bindingKey = (edition: string) => `relish.sync.v1:${edition}`;
export function readBinding(edition: string): SyncBinding | null {
  try {
    const b = JSON.parse(localStorage.getItem(bindingKey(edition)) || "null");
    return b &&
      typeof b.uid === "string" &&
      isSyncId(b.remoteId) &&
      (b.revision === null || isSyncId(b.revision)) &&
      (b.fingerprint === null || isHash(b.fingerprint))
      ? b
      : null;
  } catch {
    return null;
  }
}
export function writeBinding(edition: string, binding: SyncBinding) {
  localStorage.setItem(bindingKey(edition), JSON.stringify(binding));
}
