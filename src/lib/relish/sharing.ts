export type PublicKey = { kty: "EC"; crv: "P-256"; x: string; y: string };
export type Identity = {
  uid: string;
  publicKey: PublicKey;
  privateKey: JsonWebKey;
};
export type Passage = {
  id: string;
  title: string;
  text: string;
  from: string;
  fromName: string;
  createdAt: string;
  acceptedAt: string;
};
export type Outgoing = {
  id: string;
  circleId: string;
  title: string;
  text: string;
  recipients: string[];
  packets: Record<string, Packet>;
  createdAt: string;
  sent: boolean;
};
export type Connections = {
  identity?: Identity;
  received: Passage[];
  outgoing?: Outgoing[];
  draft?: { title: string; text: string };
};
export type Packet = {
  version: 1;
  ephemeral: PublicKey;
  iv: string;
  ciphertext: string;
  keyId: string;
};
export type Member = {
  uid: string;
  name: string;
  publicKey: PublicKey;
  keyId: string;
};
export type Circle = {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
};
export type Delivery = {
  id: string;
  circleId: string;
  sender: string;
  senderName: string;
  createdAt: string;
  recipients: string[];
  receipts: Record<string, "pending" | "accepted" | "declined">;
  packet?: Packet;
  revoked: boolean;
};
export type ConnectionSnapshot = {
  profile: Member | null;
  circle: Circle | null;
  deliveries: Delivery[];
};
export const isPublicKey = (k: unknown): k is PublicKey => {
  if (!k || typeof k !== "object") return false;
  const j = k as PublicKey & { d?: string };
  return (
    Object.keys(j).sort().join(",") === "crv,kty,x,y" &&
    j.kty === "EC" &&
    j.crv === "P-256" &&
    !j.d &&
    [j.x, j.y].every(
      (x) => typeof x === "string" && /^[A-Za-z0-9_-]{43}$/.test(x),
    )
  );
};
export const canonicalKey = (k: PublicKey) =>
  JSON.stringify({ kty: k.kty, crv: k.crv, x: k.x, y: k.y });
const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(
    Array.from(new Uint8Array(bytes), (b) => String.fromCharCode(b)).join(""),
  );
const un64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function keyFingerprint(k: PublicKey) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(canonicalKey(k)),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function makeIdentity(uid: string): Promise<Identity> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    uid,
    publicKey: { kty: "EC", crv: "P-256", x: pub.x!, y: pub.y! },
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}
function context(
  id: string,
  circle: string,
  sender: string,
  receiver: string,
  keyId: string,
) {
  return enc.encode(
    JSON.stringify(["relish-passage-v1", id, circle, sender, receiver, keyId]),
  );
}
async function exchange(
  privateKey: CryptoKey,
  publicKey: PublicKey,
  info: Uint8Array,
) {
  const pub = await crypto.subtle.importKey(
    "jwk",
    publicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: pub },
    privateKey,
    256,
  );
  const material = await crypto.subtle.importKey("raw", bits, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("Relish passage encryption v1"),
      info: info as BufferSource,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptPassage(
  text: { title: string; text: string },
  to: Member,
  id: string,
  circle: string,
  sender: string,
): Promise<Packet> {
  if (!text.text.trim() || text.text.length > 8000 || text.title.length > 120)
    throw new Error("Choose a passage of up to 8,000 characters.");
  const keyId = await keyFingerprint(to.publicKey);
  if (keyId !== to.keyId)
    throw new Error(
      "This edition’s key changed. Refresh the family before sharing.",
    );
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const aad = context(id, circle, sender, to.uid, keyId);
  const key = await exchange(pair.privateKey, to.publicKey, aad);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad as BufferSource },
    key,
    enc.encode(JSON.stringify(text)),
  );
  return {
    version: 1,
    ephemeral: { kty: "EC", crv: "P-256", x: pub.x!, y: pub.y! },
    iv: b64(iv),
    ciphertext: b64(cipher),
    keyId,
  };
}
export async function decryptPassage(
  packet: Packet,
  identity: Identity,
  delivery: Pick<Delivery, "id" | "circleId" | "sender">,
) {
  if (
    !isPacket(packet) ||
    packet.keyId !== (await keyFingerprint(identity.publicKey))
  )
    throw new Error(
      "Restore the encrypted backup for this edition to read this passage.",
    );
  const priv = await crypto.subtle.importKey(
    "jwk",
    identity.privateKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  const aad = context(
    delivery.id,
    delivery.circleId,
    delivery.sender,
    identity.uid,
    packet.keyId,
  );
  const key = await exchange(priv, packet.ephemeral, aad);
  const raw = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: un64(packet.iv),
      additionalData: aad as BufferSource,
    },
    key,
    un64(packet.ciphertext),
  );
  const result = JSON.parse(new TextDecoder().decode(raw));
  if (
    !result ||
    typeof result.title !== "string" ||
    result.title.length > 120 ||
    typeof result.text !== "string" ||
    !result.text.trim() ||
    result.text.length > 8000
  )
    throw new Error("This passage could not be read safely.");
  return result as { title: string; text: string };
}
export function isPacket(p: unknown): p is Packet {
  if (!p || typeof p !== "object") return false;
  const x = p as Packet;
  return (
    Object.keys(x).sort().join(",") ===
      "ciphertext,ephemeral,iv,keyId,version" &&
    x.version === 1 &&
    isPublicKey(x.ephemeral) &&
    typeof x.iv === "string" &&
    /^[A-Za-z0-9+/]{16}$/.test(x.iv) &&
    typeof x.ciphertext === "string" &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(x.ciphertext) &&
    x.ciphertext.length >= 24 &&
    x.ciphertext.length <= 50000 &&
    typeof x.keyId === "string" &&
    /^[a-f0-9]{64}$/.test(x.keyId)
  );
}
export function isConnections(c: unknown): c is Connections {
  if (!c || typeof c !== "object") return false;
  const v = c as Connections;
  return (
    (!v.draft ||
      (typeof v.draft.title === "string" &&
        v.draft.title.length <= 120 &&
        typeof v.draft.text === "string" &&
        v.draft.text.length <= 8000)) &&
    (v.outgoing === undefined ||
      (Array.isArray(v.outgoing) &&
        v.outgoing.every(
          (o) =>
            o &&
            typeof o.id === "string" &&
            typeof o.circleId === "string" &&
            typeof o.title === "string" &&
            typeof o.text === "string" &&
            o.text.length <= 8000 &&
            typeof o.sent === "boolean" &&
            Number.isFinite(Date.parse(o.createdAt)) &&
            Array.isArray(o.recipients) &&
            o.recipients.every((u) => typeof u === "string") &&
            o.packets &&
            Object.values(o.packets).every(isPacket),
        ))) &&
    (!v.identity ||
      (typeof v.identity.uid === "string" &&
        isPublicKey(v.identity.publicKey) &&
        v.identity.privateKey?.kty === "EC" &&
        v.identity.privateKey.crv === "P-256" &&
        typeof v.identity.privateKey.d === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(v.identity.privateKey.d) &&
        v.identity.privateKey.x === v.identity.publicKey.x &&
        v.identity.privateKey.y === v.identity.publicKey.y)) &&
    Array.isArray(v.received) &&
    v.received.every(
      (p) =>
        p &&
        [
          p.id,
          p.title,
          p.text,
          p.from,
          p.fromName,
          p.createdAt,
          p.acceptedAt,
        ].every((s) => typeof s === "string") &&
        p.text.length <= 8000 &&
        p.title.length <= 120 &&
        Number.isFinite(Date.parse(p.createdAt)) &&
        Number.isFinite(Date.parse(p.acceptedAt)),
    )
  );
}
