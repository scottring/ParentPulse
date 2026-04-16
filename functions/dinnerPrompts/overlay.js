async function flaggedLibraryIds({ overlayCollection }) {
  const snap = await overlayCollection.where("flagged", "==", true).get();
  return snap.docs.map(d => d.id);
}

async function writeFlag({ overlayCollection, libraryId, reason, now }) {
  await overlayCollection.doc(libraryId).set({
    flagged: true,
    flaggedAt: now,
    flaggedReason: reason || null,
  });
}

module.exports = { flaggedLibraryIds, writeFlag };
