import { BACKUP_BYTES } from "./photos";
import { isBook, type Book } from "./model";
export const VAULT_KEY = "relish.encrypted-book.v1";
const ITERATIONS = 600_000;
export type Envelope = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
  iterations: number;
};
const encode = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const decode = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export function parseEnvelope(raw: string): Envelope {
  if (raw.length > BACKUP_BYTES) throw new Error("This backup is too large.");
  const e = JSON.parse(raw) as Envelope;
  if (
    e.version !== 1 ||
    e.iterations !== ITERATIONS ||
    typeof e.salt !== "string" ||
    typeof e.iv !== "string" ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length > 12_000_000 ||
    decode(e.salt).length !== 16 ||
    decode(e.iv).length !== 12
  )
    throw new Error("This is not a supported Relish backup.");
  return {
    version: 1,
    salt: e.salt,
    iv: e.iv,
    ciphertext: e.ciphertext,
    iterations: e.iterations,
  };
}
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(
  book: Book,
  key: CryptoKey,
  salt: string,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode(JSON.stringify(book));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    bytes,
  );
  return {
    version: 1,
    salt,
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
    iterations: ITERATIONS,
  };
}
export async function createVault(book: Book, passphrase: string) {
  if (passphrase.length < 12)
    throw new Error("Use a passphrase of at least 12 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  return { key, envelope: await seal(book, key, encode(salt)) };
}
export async function unlockVault(raw: string, passphrase: string) {
  const envelope = parseEnvelope(raw);
  const key = await deriveKey(passphrase, decode(envelope.salt));
  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(envelope.iv) },
      key,
      decode(envelope.ciphertext),
    );
  } catch {
    throw new Error(
      "The passphrase didn’t unlock this book. Check it and try again.",
    );
  }
  const book: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isBook(book))
    throw new Error("The contents of this backup could not be read.");
  return { key, envelope, book };
}
