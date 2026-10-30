import { createHash } from "node:crypto";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { AIError, services } from "./hosted-ai";
// A resumable tombstone blocks new sharing while bounded batches remove this
// account's relay records. Other people's locally kept copies are theirs.
export async function deleteOnlineAccount(uid: string) {
  const { db, auth } = services();
  const profile = db.doc(`relish_connections_profiles/${uid}`);
  await db.runTransaction(async (tx) => {
    const p = (await tx.get(profile)).data();
    const circleRef = p?.circleId
      ? db.doc(`relish_connections_circles/${p.circleId}`)
      : null;
    const c = circleRef ? (await tx.get(circleRef)).data() : null;
    if (c?.ownerId === uid && c.memberIds.length > 1)
      throw new AIError(
        "Make another family member the organizer before deleting your account.",
        409,
      );
    tx.set(profile, { ...(p || {}), uid, deleting: true, circleId: null });
    if (circleRef && c?.memberIds.includes(uid)) {
      if (c.memberIds.length === 1) tx.delete(circleRef);
      else
        tx.update(circleRef, {
          memberIds: c.memberIds.filter((id: string) => id !== uid),
          inviteHash: null,
        });
    }
  });
  // A time-bounded pass can be safely retried with the same account.
  const deadline = Date.now() + 18000;
  const time = () => {
    if (Date.now() > deadline)
      throw new AIError(
        "Removal is in progress. Choose Delete online account again to finish the remaining records.",
        503,
      );
  };
  const passages = db.collection("relish_connections_passages");
  while (true) {
    time();
    const sent = await passages.where("sender", "==", uid).limit(100).get();
    if (sent.empty) break;
    const batch = db.batch();
    for (const doc of sent.docs) batch.delete(doc.ref);
    await batch.commit();
  }
  while (true) {
    time();
    const incoming = await passages
      .where("recipients", "array-contains", uid)
      .limit(100)
      .get();
    if (incoming.empty) break;
    const batch = db.batch();
    for (const doc of incoming.docs)
      batch.update(
        doc.ref,
        new FieldPath("recipients"),
        FieldValue.arrayRemove(uid),
        new FieldPath("receipts", uid),
        FieldValue.delete(),
        new FieldPath("packets", uid),
        FieldValue.delete(),
      );
    await batch.commit();
  }
  for (const field of ["createdBy", "usedBy"])
    while (true) {
      time();
      const invites = await db
        .collection("relish_connections_invites")
        .where(field, "==", uid)
        .limit(100)
        .get();
      if (invites.empty) break;
      const batch = db.batch();
      invites.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  // Inboxes contain only opaque document IDs and timestamps. Remove this inbox;
  // other members' pointers to removed passages become harmless missing records.
  await db.recursiveDelete(profile.collection("inbox"));
  const key = createHash("sha256").update(uid).digest("hex");
  await db.doc(`relish_ai_usage/user-${key}`).delete();
  await db.doc(`relish_connections_usage/${key}`).delete();
  await auth.deleteUser(uid);
  await profile.delete();
  return { ok: true };
}
