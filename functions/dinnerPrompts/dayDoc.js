async function writeNewDay({ ref, payload, now }) {
  await ref.set({
    text: payload.text,
    audience: payload.audience,
    theme: payload.theme,
    source: payload.source,
    sourceRefs: payload.sourceRefs || {},
    status: "served",
    swapHistory: [],
    servedAt: now,
  });
}

async function readDay({ ref }) {
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data();
}

async function recordSwap({ ref, newPayload, now }) {
  const snap = await ref.get();
  const prev = snap.exists ? snap.data() : null;
  const swapEntry = prev
    ? {
        at: now,
        previousText: prev.text,
        previousLibraryId: prev.sourceRefs && prev.sourceRefs.libraryId ? prev.sourceRefs.libraryId : null,
      }
    : null;

  const swapHistory = prev && Array.isArray(prev.swapHistory) ? [...prev.swapHistory] : [];
  if (swapEntry) swapHistory.push(swapEntry);

  await ref.update({
    text: newPayload.text,
    source: newPayload.source,
    sourceRefs: newPayload.sourceRefs || {},
    status: "swapped",
    swapHistory,
  });
}

async function recordReport({ ref, reason, now }) {
  await ref.update({
    status: "reported",
    reportedAt: now,
    reportedReason: reason || null,
  });
}

module.exports = { writeNewDay, readDay, recordSwap, recordReport };
