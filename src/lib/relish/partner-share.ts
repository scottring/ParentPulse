/**
 * Sends one page to the partner books in this book's circle, through the same
 * path as "Offer words to another book" in Connected books: encrypt for each
 * member, keep the outgoing copy in this book, send, then mark it sent. Each
 * partner chooses whether to keep it, as with any shared passage.
 */
import type { User } from "firebase/auth";
import type { Book } from "./model";
import {
  canonicalKey,
  encryptPassage,
  type ConnectionSnapshot,
  type Outgoing,
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

/**
 * Sends `passage` to every other member of this book's circle. Returns how
 * many books it went to; 0 when the book isn't connected or has no partner.
 * `id` becomes the delivery id, so the page and the sent copy share an id.
 */
export async function sendToPartners(
  user: User | null,
  book: Book,
  save: Save,
  passage: { id: string; title: string; text: string },
): Promise<number> {
  const identity = book.connections?.identity;
  if (book.profile?.kind !== "adult" || !identity || !user?.emailVerified || identity.uid !== user.uid)
    return 0;
  const snapshot = (await api(user, { action: "list" })) as ConnectionSnapshot;
  if (
    !snapshot.profile ||
    !snapshot.circle ||
    canonicalKey(identity.publicKey) !== canonicalKey(snapshot.profile.publicKey)
  )
    return 0;
  const circle = snapshot.circle;
  const others = circle.members.filter((m) => m.uid !== user.uid);
  if (!others.length) return 0;
  const title = passage.title.trim().slice(0, 120) || "A page from our family book";
  const text = passage.text.trim().slice(0, 8000);
  const packets = Object.fromEntries(
    await Promise.all(
      others.map(async (m) => [
        m.uid,
        await encryptPassage({ title, text }, m, passage.id, circle.id, user.uid),
      ]),
    ),
  );
  const outgoing: Outgoing = {
    id: passage.id,
    circleId: circle.id,
    title,
    text,
    recipients: others.map((m) => m.uid),
    packets,
    createdAt: new Date().toISOString(),
    sent: false,
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
