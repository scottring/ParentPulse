/**
 * Sends one page to partner journals in this journal's circle, through the
 * same path as "Offer words to another journal" in Connected journals:
 * encrypt for each member, keep the outgoing copy in this journal, send, then
 * mark it sent. Each partner chooses whether to keep it, as with any shared
 * passage.
 *
 * Since 2026-11-22 a send can go to chosen people only ("Send a line" to
 * Anna): it shows in their My journal under Sent to me and never in Our
 * family journal. Relish never notifies anyone; it's there next time they open
 * their journal.
 *
 * Since 2026-11-23 a whole entry can take its photos along. Each photo is
 * encrypted once, on this device, with a new key made for that one send; the
 * key travels only inside each chosen person's encrypted passage, so the relay
 * keeps ciphertext it can't open. Whoever keeps the passage opens the photos
 * and keeps them in their own journal under its own key (with ids of their
 * own); the relay's copy is removed once everyone has kept or set it aside,
 * or the send is withdrawn. A send that didn't go keeps its relay photos, so
 * trying again (here or from Connected journals) sends them too; if they've
 * expired, they're uploaded again from where this journal keeps them.
 */
import type { User } from "firebase/auth";
import type { Book } from "./model";
import {
  decryptPhoto,
  encryptPhoto,
  importPhotoKey,
  isEncryptedPhoto,
  newPhotoKey,
  PHOTO_LIMIT,
  type EncryptedPhoto,
  type Photo,
  type PhotoCopy,
  type PhotoLoader,
} from "./photos";
import {
  canonicalKey,
  decryptPassage,
  encryptPassage,
  keepReceived,
  type ConnectionSnapshot,
  type Delivery,
  type Identity,
  type Member,
  type Outgoing,
  type PassageAudience,
  type PassagePayload,
  type ReceivedOffer,
  PHOTOS_MISSING,
} from "./sharing";

type Save = (change: (b: Book) => Book) => Promise<void>;

async function api(user: User, data: Record<string, unknown>) {
  const res = await fetch("/api/relish/connections/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
      "x-relish-consent": "chosen-connection",
      "x-relish-edition": "adult",
    },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok)
    throw Object.assign(new Error(result.error || "The connection is unavailable."), {
      status: res.status,
    });
  return result;
}

/** Someone a line can be sent to: another adult journal in the circle. */
export type Recipient = { uid: string; name: string };

/** Whether this journal is the signed-in account's connected journal. */
function connectedIdentity(user: User | null, book: Book): Identity | null {
  const identity = book.connections?.identity;
  if (book.profile?.kind !== "adult" || !identity || !user?.emailVerified || identity.uid !== user.uid)
    return null;
  return identity;
}

/**
 * Who gets a send: every other member, or only the chosen ones. A chosen
 * person who has left the circle stops the send rather than quietly dropping
 * them.
 */
export function chooseRecipients(members: Member[], me: string, only?: string[]): Member[] {
  const others = members.filter((m) => m.uid !== me);
  if (!only) return others;
  const chosen = others.filter((m) => only.includes(m.uid));
  if (chosen.length !== new Set(only).size)
    throw new Error("Someone you chose isn’t connected anymore. Refresh and try again.");
  return chosen;
}

export type SendOptions = {
  /** Only these people (uids). Absent: everyone else in the circle. */
  recipients?: string[];
  audience?: PassageAudience;
  note?: string;
  caption?: string;
  sourceId?: string;
  /** Photos to send with it: copies already given their own ids (photos.ts copyPhotos). */
  photos?: PhotoCopy[];
  /**
   * The copies are kept in this journal too (a line sent from an entry), so
   * the outgoing record lists them. A family page's copies live in Our family
   * journal instead.
   */
  keepPhotoCopies?: boolean;
};

/**
 * Sends `passage` to the other members of this journal's circle (or only
 * `options.recipients`). Returns how many journals it went to; 0 when the
 * journal isn't connected or has nobody to send to. `id` becomes the delivery
 * id, so a family page and its sent copy share an id.
 */
export async function sendToPartners(
  user: User | null,
  book: Book,
  save: Save,
  passage: { id: string; title: string; text: string },
  options: SendOptions = {},
): Promise<number> {
  const identity = connectedIdentity(user, book);
  if (!identity || !user) return 0;
  const snapshot = (await api(user, { action: "list" })) as ConnectionSnapshot;
  if (
    !snapshot.profile ||
    !snapshot.circle ||
    canonicalKey(identity.publicKey) !== canonicalKey(snapshot.profile.publicKey)
  )
    return 0;
  const circle = snapshot.circle;
  const others = chooseRecipients(circle.members, user.uid, options.recipients);
  if (!others.length) return 0;
  const copies = (options.photos || []).slice(0, PHOTO_LIMIT);
  const photoKey = copies.length ? await newPhotoKey() : null;
  const sealed = photoKey
    ? await Promise.all(copies.map((c) => encryptPhoto(c.photo.id, c.blob, photoKey.key)))
    : [];
  const photos = copies.map((c) => c.photo);
  const words: PassagePayload = {
    title: passage.title.trim().slice(0, 120) || "A page from our family journal",
    text: passage.text.trim().slice(0, 8000),
    ...(options.note?.trim() ? { note: options.note.trim().slice(0, 1000) } : {}),
    ...(options.caption?.trim() ? { caption: options.caption.trim().slice(0, 200) } : {}),
    ...(options.audience ? { audience: options.audience } : {}),
  };
  const payload: PassagePayload = photoKey ? { ...words, photos, photoKey: photoKey.raw } : words;
  const packets = Object.fromEntries(
    await Promise.all(
      others.map(async (m) => [
        m.uid,
        await encryptPassage(payload, m, passage.id, circle.id, user.uid),
      ]),
    ),
  );
  const outgoing: Outgoing = {
    id: passage.id,
    circleId: circle.id,
    ...words,
    ...(photos.length && options.keepPhotoCopies ? { photos } : {}),
    recipients: others.map((m) => m.uid),
    recipientNames: others.map((m) => m.name.slice(0, 60)),
    packets,
    createdAt: new Date().toISOString(),
    sent: false,
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    ...(photoKey ? { relayPhotos: photos.map((p) => p.id), photoKey: photoKey.raw } : {}),
  };
  await save((b) => ({
    ...b,
    connections: {
      ...b.connections!,
      received: b.connections?.received || [],
      outgoing: [
        ...(b.connections?.outgoing || []).filter((o) => o.id !== outgoing.id),
        outgoing,
      ],
    },
  }));
  // The photos go first, so a passage is never there without them. If the
  // send fails they stay in the relay for a retry (sendOutgoing).
  for (const photo of sealed) await api(user, { action: "photo", id: outgoing.id, photo });
  await sendOutgoing(user, save, outgoing);
  return others.length;
}

/**
 * Sends a passage already prepared in this journal (its packets encrypted),
 * then marks it sent. Its photos are expected in the relay from the first
 * try; if they aren't (they expired), they're encrypted again with the same
 * key from where they're kept (`reopen`: this journal's copies, or Our
 * family journal's) and uploaded, so the passage never goes without them.
 */
export async function sendOutgoing(
  user: User,
  save: Save,
  outgoing: Outgoing,
  reopen?: PhotoLoader,
) {
  const relayPhotos = outgoing.relayPhotos || [];
  const send = () =>
    api(user, {
      action: "send",
      id: outgoing.id,
      recipients: outgoing.recipients,
      packets: outgoing.packets,
      ...(relayPhotos.length ? { photos: relayPhotos } : {}),
    });
  try {
    await send();
  } catch (e) {
    if ((e as Error).message !== PHOTOS_MISSING || !relayPhotos.length) throw e;
    const again: EncryptedPhoto[] = [];
    try {
      if (!reopen || !outgoing.photoKey) throw new Error();
      const key = await importPhotoKey(outgoing.photoKey);
      for (const id of relayPhotos) again.push(await encryptPhoto(id, await reopen.load(id), key));
    } catch {
      throw new Error(
        "This page’s photos are no longer waiting to go, and they aren’t on this device. Share it again from your journal.",
      );
    }
    for (const photo of again) await api(user, { action: "photo", id: outgoing.id, photo });
    await send();
  }
  await save((b) => ({
    ...b,
    connections: {
      ...b.connections!,
      outgoing: (b.connections?.outgoing || []).map((o) => {
        if (o.id !== outgoing.id) return o;
        const { relayPhotos: _r, photoKey: _k, ...rest } = o;
        void _r;
        void _k;
        return { ...rest, sent: true, packets: {} };
      }),
    },
  }));
}

/** Something sent to this journal that hasn't been kept or set aside yet, opened for reading. */
export type Incoming = ReceivedOffer;

/**
 * The circle as My journal needs it: who a line can go to, and what's waiting
 * to be kept. Pending passages are opened here, on this device; reading one
 * records nothing. Null when the journal isn't connected.
 */
export async function loadCircle(
  user: User | null,
  book: Book,
): Promise<{ recipients: Recipient[]; incoming: Incoming[] } | null> {
  const identity = connectedIdentity(user, book);
  if (!identity || !user) return null;
  const snapshot = (await api(user, { action: "list" })) as ConnectionSnapshot;
  if (
    !snapshot.profile ||
    canonicalKey(identity.publicKey) !== canonicalKey(snapshot.profile.publicKey)
  )
    return null;
  const recipients = (snapshot.circle?.members || [])
    .filter((m) => m.uid !== user.uid)
    .map((m) => ({ uid: m.uid, name: m.name }));
  const kept = new Set((book.connections?.received || []).map((p) => p.id));
  const waiting = snapshot.deliveries.filter(
    (d): d is Delivery & { packet: NonNullable<Delivery["packet"]> } =>
      d.sender !== user.uid &&
      !d.revoked &&
      d.receipts[user.uid] === "pending" &&
      !!d.packet &&
      !kept.has(d.id),
  );
  const incoming = (
    await Promise.all(
      waiting.map(async (d) => {
        try {
          const words = await decryptPassage(d.packet, identity, d);
          return [{ id: d.id, sender: d.sender, senderName: d.senderName, createdAt: d.createdAt, ...words }];
        } catch {
          // One that can't be opened here stays in Connected journals.
          return [];
        }
      }),
    )
  ).flat();
  return { recipients, incoming };
}

/**
 * One photo of a passage waiting to be kept, opened on this device with the
 * key inside the passage. Null when the relay no longer has it (404).
 */
export async function openIncomingPhoto(
  user: User,
  offer: Pick<Incoming, "id" | "photos" | "photoKey">,
  photoId: string,
): Promise<Blob | null> {
  if (!offer.photoKey || !offer.photos?.some((p) => p.id === photoId))
    throw new Error("This photo isn’t part of the passage.");
  let result: { photo?: unknown };
  try {
    result = await api(user, { action: "photo-get", id: offer.id, photo: photoId });
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
  if (!isEncryptedPhoto(result.photo) || result.photo.id !== photoId)
    throw new Error("This photo could not be read safely.");
  return decryptPhoto(result.photo, await importPhotoKey(offer.photoKey));
}

/**
 * A passage's photos, opened from the relay for keeping, each with an id of
 * this journal's own. One the relay no longer has stays on the page as
 * "Photo unavailable" (no picture is kept for it) and is counted in `missing`.
 */
export async function bringPhotosIn(
  user: User,
  offer: Pick<Incoming, "id" | "photos" | "photoKey">,
): Promise<{ photos: Photo[]; copies: PhotoCopy[]; missing: number }> {
  const photos: Photo[] = [],
    copies: PhotoCopy[] = [];
  let missing = 0;
  for (const sent of offer.photos || []) {
    const blob = await openIncomingPhoto(user, offer, sent.id);
    const photo = { ...sent, id: crypto.randomUUID() };
    photos.push(photo);
    if (blob) copies.push({ photo, blob });
    else missing++;
  }
  return { photos, copies, missing };
}

/**
 * Keep it: saves the passage in this journal, then tells the sender's copy it
 * was kept. Its photos are opened first and kept in this journal under its
 * own key (`store`). Returns how many photos didn't come through.
 */
export async function keepIncoming(
  user: User | null,
  book: Book,
  save: Save,
  offer: Incoming,
  store?: (copies: PhotoCopy[]) => Promise<void>,
): Promise<{ missing: number }> {
  if (!connectedIdentity(user, book) || !user) throw new Error("Sign in to keep this passage.");
  const { photos, copies, missing } = await bringPhotosIn(user, offer);
  if (copies.length) {
    if (!store) throw new Error("This journal can’t keep photos. Unlock it and try again.");
    await store(copies);
  }
  await save((b) => ({
    ...b,
    connections: keepReceived(b.connections, offer, undefined, photos),
  }));
  await api(user, { action: "receipt", id: offer.id, status: "accepted" });
  return { missing };
}

/** Set aside: the passage isn't kept; the sender's copy says you passed. */
export async function setAsideIncoming(user: User | null, book: Book, id: string) {
  if (!connectedIdentity(user, book) || !user) throw new Error("Sign in to set this aside.");
  await api(user, { action: "receipt", id, status: "declined" });
}
