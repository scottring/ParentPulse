function flattenAnswers(answers) {
  // Walks the nested {section: {questionKey: {text}}} shape and joins all text values.
  if (!answers || typeof answers !== "object") return "";
  const parts = [];
  for (const section of Object.values(answers)) {
    if (!section || typeof section !== "object") continue;
    for (const q of Object.values(section)) {
      if (q && typeof q.text === "string") parts.push(q.text);
    }
  }
  return parts.join(" ");
}

async function collectRecentSignals({
  householdId, householdMemberIds, journalsCollection, contributionsCollection, now, windowDays,
}) {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // NOTE: the parameter is called householdId at the API level but maps to familyId in Firestore.
  const journalSnap = await journalsCollection
    .where("familyId", "==", householdId)
    .where("createdAt", ">=", since)
    .get();

  const journalEntries = journalSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text || "",
      createdAt: data.createdAt,
      authorIsHouseholdMember: householdMemberIds.includes(data.authorId),
      salient: data.salient === true,
    };
  });

  const contribSnap = await contributionsCollection
    .where("familyId", "==", householdId)
    .where("updatedAt", ">=", since)
    .get();

  const manualAnswers = contribSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: flattenAnswers(data.answers),
      createdAt: data.updatedAt,
      authorIsHouseholdMember: householdMemberIds.includes(data.authorId),
      salient: data.salient === true,
    };
  });

  return { journalEntries, manualAnswers };
}

module.exports = { collectRecentSignals, flattenAnswers };
