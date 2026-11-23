import { createHash, randomBytes, randomUUID } from "node:crypto";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { AIError, services } from "./hosted-ai";
import { canonicalKey, isPacket, isPublicKey, PHOTOS_MISSING, type Member } from "./sharing";
import { isEncryptedPhoto, PHOTO_LIMIT } from "./photos";
function fail(message: string, status = 400): never {
  throw new AIError(message, status);
}
const clean = (s: unknown, max: number) =>
  typeof s === "string" && s.trim().length > 0 && s.length <= max;
const id = (v: unknown): string =>
  typeof v === "string" && /^[a-f0-9-]{36}$/.test(v)
    ? v
    : fail("This invitation could not be found.", 404);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const publicMember = (p: FirebaseFirestore.DocumentData): Member => ({
  uid: p.uid,
  name: p.name,
  publicKey: p.publicKey,
  keyId: p.keyId,
});
function stable(v: unknown): string {
  return JSON.stringify(v, (_, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, value[k]]),
        )
      : value,
  );
}
const root = "relish_connections";
/**
 * Photos sent with a passage (2026-11-23): one encrypted copy per photo, at
 * `relish_connections_photos/{passageId}_{photoId}`. The key to them is only
 * inside each recipient's encrypted packet; this server never has it. Like
 * every relish_connections collection, only this server reads or writes it.
 */
const photoDoc = (passageId: string, photoId: string) =>
  `${root}_photos/${passageId}_${photoId}`;
const uuid = /^[a-f0-9-]{36}$/;
/** The photo ids a send names: none, or up to PHOTO_LIMIT distinct ids. */
export function sentPhotoIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > PHOTO_LIMIT ||
    new Set(value).size !== value.length ||
    !value.every((p) => typeof p === "string" && uuid.test(p))
  )
    return null;
  return value;
}
/** Once nobody is still deciding, a passage's photos leave the relay. */
export const photosDone = (receipts: Record<string, string>) =>
  Object.values(receipts).every((r) => r !== "pending");
const DAY = 86_400_000;
/** A send that never went keeps its relay photos this long, for a retry. */
export const UNSENT_PHOTO_DAYS = 14;
/** However long someone takes to decide, relay photos go after this. */
export const RELAY_PHOTO_DAYS = 60;
/**
 * Which of a sender's relay photos to remove: those of a send that never
 * went (after UNSENT_PHOTO_DAYS), of one withdrawn or answered by everyone
 * (whatever was left), and any older than RELAY_PHOTO_DAYS.
 */
export function expiredRelayPhotos(
  photos: { id: string; passageId: string; createdAt: string }[],
  passages: Map<string, { revoked?: boolean; receipts?: Record<string, string> } | undefined>,
  now = Date.now(),
): string[] {
  return photos
    .filter((p) => {
      const age = now - (Date.parse(p.createdAt) || 0);
      const passage = passages.get(p.passageId);
      if (age > RELAY_PHOTO_DAYS * DAY) return true;
      if (!passage) return age > UNSENT_PHOTO_DAYS * DAY;
      return !!passage.revoked || photosDone(passage.receipts || {});
    })
    .map((p) => p.id);
}
/** The relay's cleanup reads a sender's photos this many at a time, at most this many pages a run. */
export const RELAY_PAGE = 100;
export const RELAY_PAGES = 10;
/**
 * Pages through a sender's relay photos in document-id order from `start`,
 * handing each page on, for at most `pages` pages. Returns where to pick up
 * next run, or null once it reached the end (the next run starts over), so
 * every photo is reached over successive runs however many there are.
 */
export async function pageThrough<T extends { id: string }>(
  start: string | null,
  page: (after: string | null, size: number) => Promise<T[]>,
  handle: (docs: T[]) => Promise<void>,
  pages = RELAY_PAGES,
  size = RELAY_PAGE,
): Promise<string | null> {
  let after = start;
  for (let i = 0; i < pages; i++) {
    const docs = await page(after, size);
    if (docs.length) await handle(docs);
    if (docs.length < size) return null;
    after = docs.at(-1)!.id;
  }
  return after;
}
/**
 * The relay's cleanup for one sender, at most once a day from their list
 * (the same request that reads their passages). Bounded, and best effort.
 * The query is an equality on `sender` ordered by document id, which the
 * automatic single-field index serves: no composite index.
 */
async function collectRelayPhotos(uid: string, start: string | null): Promise<string | null> {
  const { db } = services();
  return pageThrough(
    start,
    async (after, size) => {
      let query = db
        .collection(`${root}_photos`)
        .where("sender", "==", uid)
        .orderBy(FieldPath.documentId())
        .limit(size);
      if (after) query = query.startAfter(after);
      return (await query.get()).docs;
    },
    async (mine) => {
      const ids = [...new Set(mine.map((d) => d.data().passageId as string))];
      const passages = await db.getAll(...ids.map((p) => db.doc(`${root}_passages/${p}`)));
      const byId = new Map(passages.map((p) => [p.id, p.exists ? p.data() : undefined]));
      const gone = new Set(
        expiredRelayPhotos(
          mine.map((d) => ({ id: d.id, passageId: d.data().passageId, createdAt: d.data().createdAt })),
          byId,
        ),
      );
      if (!gone.size) return;
      const batch = db.batch();
      mine.filter((d) => gone.has(d.id)).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
  );
}
export async function connectionAction(
  uid: string,
  data: Record<string, unknown>,
) {
  const { db } = services();
  const profileRef = db.doc(`${root}_profiles/${uid}`);
  const action = data.action;
  if ((await profileRef.get()).data()?.deleting)
    fail(
      "Account deletion is in progress. Finish deleting from account settings.",
      409,
    );
  if (typeof action !== "string") fail("Choose an action.");
  // Durable quotas protect reads, invitation guessing, and writes across instances.
  const sweep = await db.runTransaction(async (tx) => {
    const ref = db.doc(`${root}_usage/${hash(uid)}`),
      snap = await tx.get(ref),
      old = snap.data();
    const minute = Math.floor(Date.now() / 60000),
      day = Math.floor(Date.now() / 86400000);
    const count = old?.minute === minute ? old.count : 0,
      daily = old?.day === day ? old.daily : 0;
    const sends = old?.day === day ? old.sends : 0;
    const photos = old?.day === day ? old.photos || 0 : 0;
    if (
      count >= 60 ||
      daily >= 2000 ||
      (action === "send" && sends >= 40) ||
      (action === "photo" && photos >= 160)
    )
      throw new AIError("A little breathing room. Please try later.", 429, 60);
    // The relay's daily cleanup rides on the first list of the day.
    const sweep = action === "list" && old?.swept !== day;
    tx.set(ref, {
      minute,
      day,
      count: count + 1,
      daily: daily + 1,
      sends: sends + (action === "send" ? 1 : 0),
      photos: photos + (action === "photo" ? 1 : 0),
      swept: sweep ? day : old?.swept ?? null,
      relayCursor: old?.relayCursor ?? null,
    });
    return sweep ? { cursor: (old?.relayCursor as string | null | undefined) ?? null } : null;
  });
  if (sweep)
    await collectRelayPhotos(uid, sweep.cursor)
      .then((relayCursor) =>
        db.doc(`${root}_usage/${hash(uid)}`).set({ relayCursor }, { merge: true }),
      )
      .catch(() => {});
  if (action === "list") {
    const profile = (await profileRef.get()).data();
    if (!profile) return { profile: null, circle: null, deliveries: [] };
    if (!profile.circleId)
      return { profile: publicMember(profile), circle: null, deliveries: [] };
    const circle = (
      await db.doc(`${root}_circles/${profile.circleId}`).get()
    ).data();
    if (!circle?.memberIds.includes(uid))
      return { profile: publicMember(profile), circle: null, deliveries: [] };
    const members = await db.getAll(
      ...circle.memberIds.map((u: string) => db.doc(`${root}_profiles/${u}`)),
    );
    const refs = await profileRef
      .collection("inbox")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();
    const deliveries = refs.empty
      ? []
      : await db.getAll(
          ...refs.docs.map((d) => db.doc(`${root}_passages/${d.id}`)),
        );
    // Do not return other recipients' encrypted packets. Membership is checked on every read.
    const items = deliveries
      .map((s) => s.data())
      .filter(
        (p) =>
          p &&
          p.circleId === circle.id &&
          (p.sender === uid || p.recipients.includes(uid)),
      )
      .map((p) => ({
        id: p!.id,
        circleId: p!.circleId,
        sender: p!.sender,
        senderName: p!.senderName,
        createdAt: p!.createdAt,
        recipients: p!.sender === uid ? p!.recipients : [uid],
        receipts: p!.sender === uid ? p!.receipts : { [uid]: p!.receipts[uid] },
        ...(p!.packets?.[uid] ? { packet: p!.packets[uid] } : {}),
        revoked: !!p!.revoked,
      }));
    return {
      profile: publicMember(profile),
      circle: {
        id: circle.id,
        name: circle.name,
        ownerId: circle.ownerId,
        members: members
          .filter((m) => m.exists && m.data()?.circleId === circle.id)
          .map((m) => publicMember(m.data()!)),
      },
      deliveries: items,
    };
  }
  if (action === "register") {
    if (data.adultConfirmed !== true)
      fail(
        "Online connections are for adults. Children can keep local books.",
        403,
      );
    if (!clean(data.name, 60) || !isPublicKey(data.publicKey))
      fail("Choose your journal name and key.");
    const key = data.publicKey as Member["publicKey"],
      keyId = hash(canonicalKey(key));
    // Validate the point, not just the JWK shape.
    try {
      await crypto.subtle.importKey(
        "jwk",
        key,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        [],
      );
    } catch {
      fail("This journal key could not be read.");
    }
    await db.runTransaction(async (tx) => {
      const existing = (await tx.get(profileRef)).data();
      if (existing?.deleting) fail("Account deletion is in progress.", 409);
      if (existing && existing.keyId !== keyId)
        fail(
          "This account already belongs to another journal. Restore its encrypted backup or use a different account.",
          409,
        );
      tx.set(profileRef, {
        uid,
        name: (data.name as string).trim(),
        publicKey: key,
        keyId,
        circleId: existing?.circleId || null,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
    });
    return { ok: true };
  }
  const profile = (await profileRef.get()).data();
  if (!profile) fail("Connect this journal first.", 409);
  if (action === "create") {
    if (!clean(data.name, 60)) fail("Give your family journal a name.");
    const circleId = randomUUID(),
      circleRef = db.doc(`${root}_circles/${circleId}`);
    await db.runTransaction(async (tx) => {
      const current = (await tx.get(profileRef)).data();
      if (current?.deleting) fail("Account deletion is in progress.", 409);
      if (current?.circleId)
        fail("Leave your current family before creating another.", 409);
      tx.create(circleRef, {
        id: circleId,
        name: (data.name as string).trim(),
        ownerId: uid,
        memberIds: [uid],
        createdAt: new Date().toISOString(),
        inviteHash: null,
      });
      tx.update(profileRef, { circleId });
    });
    return { ok: true };
  }
  if (action === "inspect" || action === "join") {
    const token = data.code;
    if (typeof token !== "string" || !/^[a-f0-9]{40}$/.test(token.trim()))
      fail("Check the invitation code.");
    const inviteRef = db.doc(
      `${root}_invites/${hash((token as string).trim())}`,
    );
    return db.runTransaction(async (tx) => {
      const invite = (await tx.get(inviteRef)).data();
      if (!invite || invite.usedBy || invite.expires < Date.now())
        fail("This invitation has expired or was already used.", 404);
      const circleRef = db.doc(`${root}_circles/${invite.circleId}`);
      const [c, p] = await tx.getAll(circleRef, profileRef);
      const circle = c.data(),
        current = p.data();
      if (!circle || circle.inviteHash !== inviteRef.id)
        fail("This invitation is no longer active.", 404);
      if (current?.deleting) fail("Account deletion is in progress.", 409);
      if (current?.circleId)
        fail("This journal already belongs to a family.", 409);
      if (circle.memberIds.length >= 12)
        fail("This family has reached its 12-member limit.", 409);
      if (action === "inspect") return { name: circle.name };
      tx.update(circleRef, {
        memberIds: [...circle.memberIds, uid],
        inviteHash: null,
      });
      tx.update(profileRef, { circleId: circle.id });
      tx.update(inviteRef, { usedBy: uid });
      return { ok: true };
    });
  }
  const circleId = profile!.circleId;
  if (!circleId) fail("Create or join your family first.", 409);
  const circleRef = db.doc(`${root}_circles/${circleId}`);
  return db.runTransaction(async (tx) => {
    const [circleSnap, freshProfile] = await tx.getAll(circleRef, profileRef);
    const circle = circleSnap.data();
    if (
      !circle ||
      freshProfile.data()?.deleting ||
      !circle.memberIds.includes(uid) ||
      freshProfile.data()?.circleId !== circleId
    )
      fail("You are no longer connected to this family.", 403);
    if (action === "invite") {
      if (circle.ownerId !== uid)
        fail("The family’s organizer creates invitations.", 403);
      const code = randomBytes(20).toString("hex"),
        inviteHash = hash(code);
      tx.set(db.doc(`${root}_invites/${inviteHash}`), {
        circleId,
        createdBy: uid,
        expires: Date.now() + 86400000,
        usedBy: null,
      });
      tx.update(circleRef, { inviteHash });
      return { code };
    }
    if (action === "cancelInvite") {
      if (circle.ownerId !== uid)
        fail("Only the organizer can cancel this invitation.", 403);
      tx.update(circleRef, { inviteHash: null });
      return { ok: true };
    }
    if (action === "leave" || action === "remove") {
      const target = action === "leave" ? uid : data.uid;
      if (typeof target !== "string" || !circle.memberIds.includes(target))
        fail("That member is no longer here.", 404);
      if (target !== uid && circle.ownerId !== uid)
        fail("Only the organizer can remove a member.", 403);
      if (target === circle.ownerId && circle.memberIds.length > 1)
        fail("Choose another organizer before leaving.", 409);
      const targetRef = db.doc(`${root}_profiles/${target}`);
      const current = (await tx.get(targetRef)).data();
      if (current?.circleId !== circleId)
        fail("Refresh the family and try again.", 409);
      tx.update(targetRef, { circleId: null });
      if (circle.memberIds.length === 1) tx.delete(circleRef);
      else
        tx.update(circleRef, {
          memberIds: circle.memberIds.filter((u: string) => u !== target),
          inviteHash: null,
        });
      return { ok: true };
    }
    if (action === "organizer") {
      if (
        circle.ownerId !== uid ||
        typeof data.uid !== "string" ||
        !circle.memberIds.includes(data.uid) ||
        data.uid === uid
      )
        fail("Choose a current family member.", 403);
      tx.update(circleRef, { ownerId: data.uid, inviteHash: null });
      return { ok: true };
    }
    if (action === "photo") {
      // Uploaded before its passage is sent, by whoever is sending it.
      const passageId = id(data.id),
        photo = data.photo;
      if (!isEncryptedPhoto(photo) || Object.keys(photo).length !== 3)
        fail("This photo could not be stored safely.");
      const ref = db.doc(photoDoc(passageId, photo.id));
      const [passage, existing] = await tx.getAll(
        db.doc(`${root}_passages/${passageId}`),
        ref,
      );
      if (passage.exists) fail("This passage was already sent.", 409);
      if (existing.exists && existing.data()?.sender !== uid)
        fail("This photo already exists.", 409);
      tx.set(ref, {
        passageId,
        photoId: photo.id,
        sender: uid,
        circleId,
        photo: { id: photo.id, iv: photo.iv, ciphertext: photo.ciphertext },
        createdAt: new Date().toISOString(),
      });
      return { ok: true };
    }
    if (action === "photo-get") {
      const passageId = id(data.id),
        photoId = typeof data.photo === "string" && uuid.test(data.photo) ? data.photo : "";
      const p = (await tx.get(db.doc(`${root}_passages/${passageId}`))).data();
      if (!p || p.circleId !== circleId || p.revoked || !photoId || !(p.photoIds || []).includes(photoId))
        fail("This photo is no longer available.", 404);
      if (p.sender !== uid && !(p.recipients.includes(uid) && p.receipts[uid] === "pending"))
        fail("This photo wasn’t sent to your journal.", 403);
      const kept = (await tx.get(db.doc(photoDoc(passageId, photoId)))).data();
      if (!kept || kept.sender !== p.sender || !isEncryptedPhoto(kept.photo))
        fail("This photo is no longer available.", 404);
      return { photo: kept.photo };
    }
    if (action === "send") {
      const passageId = id(data.id),
        recipients = data.recipients,
        packets = data.packets,
        photoIds = sentPhotoIds(data.photos);
      if (!photoIds) fail("Send up to four photos with a passage.");
      if (
        !Array.isArray(recipients) ||
        recipients.length < 1 ||
        recipients.length > 11 ||
        new Set(recipients).size !== recipients.length ||
        recipients.some(
          (u) =>
            typeof u !== "string" || u === uid || !circle.memberIds.includes(u),
        )
      )
        fail("Choose current family members.");
      if (
        !packets ||
        typeof packets !== "object" ||
        Array.isArray(packets) ||
        Object.keys(packets).sort().join() !== [...recipients].sort().join()
      )
        fail("Encrypt this passage for each chosen journal.");
      const members = await tx.getAll(
        ...recipients.map((u) => db.doc(`${root}_profiles/${u}`)),
      );
      const typedPackets = packets as Record<string, unknown>;
      members.forEach((m, i) => {
        const p = typedPackets[recipients[i]],
          member = m.data();
        if (
          !member ||
          member.deleting ||
          member.circleId !== circleId ||
          !isPacket(p) ||
          p.keyId !== member.keyId
        )
          fail("A member’s journal changed. Refresh before sharing.", 409);
      });
      const ref = db.doc(`${root}_passages/${passageId}`),
        previous = await tx.get(ref);
      const uploaded = photoIds.length
        ? await tx.getAll(...photoIds.map((p) => db.doc(photoDoc(passageId, p))))
        : [];
      if (previous.exists) {
        const old = previous.data()!;
        if (
          old.sender !== uid ||
          old.circleId !== circleId ||
          (old.payloadHash || hash(stable(old.packets))) !==
            hash(stable(packets))
        )
          fail("This passage already exists.", 409);
        return { ok: true };
      }
      if (uploaded.some((d) => d.data()?.sender !== uid || d.data()?.passageId !== passageId))
        fail(PHOTOS_MISSING, 409);
      const createdAt = new Date().toISOString();
      tx.create(ref, {
        id: passageId,
        circleId,
        sender: uid,
        senderName: profile!.name,
        recipients,
        packets,
        payloadHash: hash(stable(packets)),
        createdAt,
        revoked: false,
        receipts: Object.fromEntries(recipients.map((u) => [u, "pending"])),
        ...(photoIds.length ? { photoIds } : {}),
      });
      for (const participant of [uid, ...recipients])
        tx.set(db.doc(`${root}_profiles/${participant}/inbox/${passageId}`), {
          createdAt,
        });
      return { ok: true };
    }
    if (action === "receipt" || action === "withdraw") {
      const ref = db.doc(`${root}_passages/${id(data.id)}`),
        p = (await tx.get(ref)).data();
      if (!p || p.circleId !== circleId)
        fail("This passage is no longer available.", 404);
      if (action === "withdraw") {
        if (p.sender !== uid)
          fail("Only the author can withdraw this invitation.", 403);
        tx.update(ref, { revoked: true, packets: {} });
        for (const photo of p.photoIds || []) tx.delete(db.doc(photoDoc(p.id, photo)));
        return { ok: true };
      }
      if (!p.recipients.includes(uid))
        fail("This passage was not offered to your journal.", 403);
      if (p.revoked) fail("The author withdrew this passage.", 409);
      if (!["accepted", "declined"].includes(data.status as string))
        fail("Choose whether to keep this passage.");
      if (p.receipts[uid] !== "pending" && p.receipts[uid] !== data.status)
        fail("Your choice was already recorded.", 409);
      tx.update(
        ref,
        new FieldPath("receipts", uid),
        data.status,
        new FieldPath("packets", uid),
        FieldValue.delete(),
      );
      if (photosDone({ ...p.receipts, [uid]: data.status as string }))
        for (const photo of p.photoIds || []) tx.delete(db.doc(photoDoc(p.id, photo)));
      return { ok: true };
    }
    fail("That action is unavailable.");
  });
}
