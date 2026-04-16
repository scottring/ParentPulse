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

async function recentlyServedLibraryIds({ daysCollection, now, windowDays }) {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().slice(0, 10);
  const snap = await daysCollection.where("__name__", ">=", sinceIso).get();
  const ids = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.source === "library" && data.sourceRefs && data.sourceRefs.libraryId) {
      ids.push(data.sourceRefs.libraryId);
    }
  });
  return ids;
}

async function synthCountInLast7Days({ daysCollection, now }) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().slice(0, 10);
  const snap = await daysCollection.where("__name__", ">=", sinceIso).get();
  let count = 0;
  snap.docs.forEach(d => { if (d.data().source === "synthesized") count++; });
  return count;
}

module.exports = { writeNewDay, readDay, recordSwap, recordReport, recentlyServedLibraryIds, synthCountInLast7Days };
