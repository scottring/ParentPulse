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
 */
import type { User } from "firebase/auth";
import type { Book } from "./model";
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
  if (!res.ok) throw new Error(result.error || "The connection is unavailable.");
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
  const payload: PassagePayload = {
    title: passage.title.trim().slice(0, 120) || "A page from our family journal",
    text: passage.text.trim().slice(0, 8000),
    ...(options.note?.trim() ? { note: options.note.trim().slice(0, 1000) } : {}),
    ...(options.caption?.trim() ? { caption: options.caption.trim().slice(0, 200) } : {}),
    ...(options.audience ? { audience: options.audience } : {}),
  };
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
    ...payload,
    recipients: others.map((m) => m.uid),
    recipientNames: others.map((m) => m.name.slice(0, 60)),
    packets,
    createdAt: new Date().toISOString(),
    sent: false,
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
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
  await api(user, {
    action: "send",
    id: outgoing.id,
    recipients: outgoing.recipients,
    packets: outgoing.packets,
  });
  await save((b) => ({
    ...b,
    connections: {
      ...b.connections!,
      outgoing: (b.connections?.outgoing || []).map((o) =>
        o.id === outgoing.id ? { ...o, sent: true, packets: {} } : o,
      ),
    },
  }));
  return others.length;
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

/** Keep it: saves the passage in this journal, then tells the sender's copy it was kept. */
export async function keepIncoming(user: User | null, book: Book, save: Save, offer: Incoming) {
  if (!connectedIdentity(user, book) || !user) throw new Error("Sign in to keep this passage.");
  await save((b) => ({ ...b, connections: keepReceived(b.connections, offer) }));
  await api(user, { action: "receipt", id: offer.id, status: "accepted" });
}

/** Set aside: the passage isn't kept; the sender's copy says you passed. */
export async function setAsideIncoming(user: User | null, book: Book, id: string) {
  if (!connectedIdentity(user, book) || !user) throw new Error("Sign in to set this aside.");
  await api(user, { action: "receipt", id, status: "declined" });
}
