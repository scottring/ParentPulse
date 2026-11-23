import type { Book } from "./model";

export type Photo = {
  id: string;
  width: number;
  height: number;
  caption: string;
};
export type EncryptedPhoto = { id: string; iv: string; ciphertext: string };
export type PhotoAccess = {
  add: (file: File) => Promise<Photo>;
  load: (id: string) => Promise<Blob>;
  /**
   * Keeps already-prepared photos (JPEGs from `load`) in this journal under
   * their own ids, encrypted with this journal's key: a shared copy's photos.
   */
  store?: (copies: PhotoCopy[]) => Promise<void>;
  /** Forgets photos this journal no longer holds (a shared copy taken out). */
  discard?: (ids: string[]) => Promise<void>;
};
/** Anything that can open a photo by id: a journal, Our family journal, a passage waiting. */
export type PhotoLoader = Pick<PhotoAccess, "load">;
/** A photo going somewhere else: its new id and details, and its (decrypted) JPEG. */
export type PhotoCopy = { photo: Photo; blob: Blob };
export const PHOTO_LIMIT = 4;
export const PHOTO_BYTES = 350_000;
export const BACKUP_BYTES = 120_000_000;
const idPattern = /^[a-f0-9-]{36}$/i;
const b64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const un64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export function isPhotos(value: unknown): value is Photo[] {
  return (
    Array.isArray(value) &&
    value.length <= PHOTO_LIMIT &&
    new Set(value.map((p) => p?.id)).size === value.length &&
    value.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        idPattern.test(p.id) &&
        [p.width, p.height].every(
          (n) => Number.isInteger(n) && n > 0 && n <= 1600,
        ) &&
        typeof p.caption === "string" &&
        p.caption.length <= 240,
    )
  );
}
/**
 * Every photo this journal holds, so backups, sync and restores carry them:
 * its pages and album, plus the copies on shared pages kept in it (Our family
 * journal without an account, passages kept, and lines sent).
 */
export function photoIds(book: Book): string[] {
  return [...new Set([...ownPhotoIds(book), ...sharedPhotoIds(book)])];
}
/** Photos on this journal's own pages and album: a backup must carry every one. */
export function ownPhotoIds(book: Book): string[] {
  return [
    ...new Set(
      [
        ...(book.journal || []).flatMap((e) => e.photos || []),
        ...(book.album || []).flatMap((e) => e.photos || []),
      ].map((p) => p.id),
    ),
  ];
}
/**
 * Copies on shared pages kept in this journal. One can be missing (it didn't
 * come through, or a device that didn't have it saved the journal): backups,
 * sync and restores carry what's there, and the page shows "Photo
 * unavailable" for the rest, instead of refusing the whole journal.
 */
export function sharedPhotoIds(book: Book): string[] {
  const own = new Set(ownPhotoIds(book));
  return [
    ...new Set(
      [
        ...(book.familyPages || []).flatMap((p) => p.photos || []),
        ...(book.connections?.received || []).flatMap((p) => p.photos || []),
        ...(book.connections?.outgoing || []).flatMap((o) => o.photos || []),
      ]
        .map((p) => p.id)
        .filter((id) => !own.has(id)),
    ),
  ];
}
/**
 * Copies of photos to send or share: each opened from where it is kept and
 * given a new id, so the copy and the private page never share a photo.
 * Only these chosen photos are opened, and at most PHOTO_LIMIT of them.
 */
export async function copyPhotos(
  photos: Photo[] | undefined,
  from: PhotoLoader,
): Promise<PhotoCopy[]> {
  const chosen = (photos || []).slice(0, PHOTO_LIMIT);
  return Promise.all(
    chosen.map(async (p) => {
      const blob = await from.load(p.id);
      if (blob.type !== "image/jpeg" || blob.size > PHOTO_BYTES)
        throw new Error("A photo on this page couldn’t be shared.");
      return { photo: { ...p, id: crypto.randomUUID() }, blob };
    }),
  );
}
/** A new key for one send's photos; it travels inside each person's encrypted passage. */
export async function newPhotoKey(): Promise<{ key: CryptoKey; raw: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { key: await importPhotoKey(b64(bytes)), raw: b64(bytes) };
}
export const isPhotoKey = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9+/]{43}=$/.test(v);
export async function importPhotoKey(raw: string): Promise<CryptoKey> {
  if (!isPhotoKey(raw)) throw new Error("This passage’s photos can’t be opened.");
  return crypto.subtle.importKey("raw", un64(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function preparePhoto(
  file: File,
): Promise<{ photo: Photo; blob: Blob }> {
  if (
    file.size > 20_000_000 ||
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ].includes(file.type)
  )
    throw new Error(
      "Choose a JPG, PNG, WebP or supported HEIC photo under 20 MB.",
    );
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error(
        "This browser cannot open that photo. Try a JPG or PNG copy.",
      );
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 100_000_000
    )
      throw new Error("Choose a smaller photo.");
    let scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("Photo preparation is unavailable in this browser.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      // Re-encoding removes camera location and other EXIF metadata.
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82),
      );
      if (blob && blob.size <= PHOTO_BYTES)
        return {
          blob,
          photo: {
            id: crypto.randomUUID(),
            width: canvas.width,
            height: canvas.height,
            caption: "",
          },
        };
      scale *= 0.75;
    }
    throw new Error("This photo is still too large. Try a smaller copy.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
function context(id: string) {
  return new TextEncoder().encode(`relish-photo-v1:${id}`);
}
export async function encryptPhoto(
  id: string,
  blob: Blob,
  key: CryptoKey,
): Promise<EncryptedPhoto> {
  if (
    !idPattern.test(id) ||
    blob.type !== "image/jpeg" ||
    blob.size > PHOTO_BYTES
  )
    throw new Error("This photo could not be stored safely.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: context(id) },
    key,
    await blob.arrayBuffer(),
  );
  return { id, iv: b64(iv), ciphertext: b64(new Uint8Array(bytes)) };
}
export function isEncryptedPhoto(value: unknown): value is EncryptedPhoto {
  if (!value || typeof value !== "object") return false;
  const p = value as EncryptedPhoto;
  try {
    return (
      typeof p.id === "string" &&
      idPattern.test(p.id) &&
      typeof p.iv === "string" &&
      p.iv.length === 16 &&
      un64(p.iv).length === 12 &&
      typeof p.ciphertext === "string" &&
      p.ciphertext.length <= 470_000 &&
      un64(p.ciphertext).length >= 16
    );
  } catch {
    return false;
  }
}
export async function decryptPhoto(
  photo: EncryptedPhoto,
  key: CryptoKey,
): Promise<Blob> {
  if (!isEncryptedPhoto(photo))
    throw new Error("This encrypted photo is damaged.");
  const bytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: un64(photo.iv), additionalData: context(photo.id) },
    key,
    un64(photo.ciphertext),
  );
  const data = new Uint8Array(bytes);
  if (
    data.length > PHOTO_BYTES ||
    data[0] !== 0xff ||
    data[1] !== 0xd8 ||
    data[2] !== 0xff
  )
    throw new Error("This photo could not be read.");
  return new Blob([bytes], { type: "image/jpeg" });
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("relish-encrypted-photos-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("photos", {
        keyPath: ["edition", "id"],
      });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error("Photo storage is unavailable. Your words are still here."),
      );
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const request = run(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () =>
        reject(
          new Error(
            "This photo could not be saved. Check available device storage and try again.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function putPhoto(edition: string, photo: EncryptedPhoto) {
  if (!isEncryptedPhoto(photo)) throw new Error("Invalid encrypted photo.");
  await transaction("readwrite", (store) => store.put({ ...photo, edition }));
}
export async function getPhoto(
  edition: string,
  id: string,
): Promise<EncryptedPhoto> {
  const photo = await transaction("readonly", (store) =>
    store.get([edition, id]),
  );
  if (!isEncryptedPhoto(photo))
    throw new Error(
      "A photo is missing on this device. Restore a backup that includes its photos.",
    );
  return { id: photo.id, iv: photo.iv, ciphertext: photo.ciphertext };
}
export async function deletePhotos(edition: string, ids: string[]) {
  if (!ids.length) return;
  await transaction("readwrite", (store) => {
    let last!: IDBRequest<undefined>;
    for (const id of ids) last = store.delete([edition, id]);
    return last;
  });
}
export async function removePhotos(edition: string) {
  await transaction("readwrite", (store) =>
    store.delete(IDBKeyRange.bound([edition, ""], [edition, "\uffff"])),
  );
}
export async function backupPhotos(
  book: Book,
  edition: string,
): Promise<EncryptedPhoto[]> {
  const own = await Promise.all(ownPhotoIds(book).map((id) => getPhoto(edition, id)));
  // A shared copy missing on this device is left out, not a reason to fail.
  const shared = await Promise.all(
    sharedPhotoIds(book).map((id) => getPhoto(edition, id).catch(() => null)),
  );
  return [...own, ...shared.filter((p): p is EncryptedPhoto => !!p)];
}
export async function restorePhotos(
  raw: string,
  book: Book,
  key: CryptoKey,
  edition: string,
) {
  const supplied: unknown = JSON.parse(raw).media ?? [];
  const ids = new Set(photoIds(book));
  // Every photo on the journal's own pages must be there; shared copies may
  // be missing (they show as unavailable). Nothing unexpected is accepted.
  if (
    !Array.isArray(supplied) ||
    !supplied.every(isEncryptedPhoto) ||
    new Set(supplied.map((p) => p.id)).size !== supplied.length ||
    supplied.some((p) => !ids.has(p.id)) ||
    ownPhotoIds(book).some((id) => !supplied.some((p) => p.id === id))
  )
    throw new Error(
      "This backup is missing photos or contains unexpected photo data.",
    );
  // Authenticate every photo before changing the destination edition.
  for (const photo of supplied) await decryptPhoto(photo, key);
  for (const photo of supplied) await putPhoto(edition, photo);
}
