/**
 * Privacy-lock helpers. 4-digit PIN hashing & verification using
 * Web Crypto (PBKDF2 over SHA-256). A per-user random salt is stored
 * alongside the hash in a user-private subcollection doc:
 *   users/{uid}/private/lock  { pinHash, pinSalt, updatedAt }
 *
 * A 4-digit PIN has only 10,000 combinations, so this is hint-grade
 * privacy — enough to block casual over-the-shoulder access, not a
 * determined adversary with the DB contents. The subcollection rule
 * keeps other family members from reading the hash.
 */

const PBKDF2_ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out.buffer;
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toHex(bytes.buffer as ArrayBuffer);
}

async function deriveHash(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function hashPin(
  pin: string
): Promise<{ pinHash: string; pinSalt: string }> {
  const pinSalt = generateSalt();
  const pinHash = await deriveHash(pin, pinSalt);
  return { pinHash, pinSalt };
}

export async function verifyPin(
  pin: string,
  pinHash: string,
  pinSalt: string
): Promise<boolean> {
  const derived = await deriveHash(pin, pinSalt);
  return timingSafeEqual(derived, pinHash);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
