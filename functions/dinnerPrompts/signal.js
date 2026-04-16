const THEME_KEYWORDS = {
  courage: ["brave", "scared", "scary", "nervous", "afraid", "tried"],
  gratitude: ["grateful", "thankful", "lucky", "appreciate", "thank"],
  silliness: ["silly", "funny", "ridiculous", "laugh", "joke"],
  kindness: ["kind", "nice", "helped", "shared", "thoughtful"],
  curiosity: ["wonder", "curious", "noticed", "question", "interesting"],
  "family-history": ["remember", "used to", "tradition", "grandma", "grandpa", "when I was"],
  dreams: ["wish", "hope", "want to", "someday", "dream"],
  connection: ["close", "together", "miss", "love", "feel"],
  challenge: ["hard", "tough", "struggle", "difficult", "couldn't"],
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function withinLast7Days(date, now) {
  return now - new Date(date) <= SEVEN_DAYS_MS;
}

function hasJuicySignal({ theme, recentJournalEntries, recentManualAnswers, synthCountInLast7Days, now }) {
  if (synthCountInLast7Days >= 2) {
    return { matched: false, reason: "synth-cap-reached" };
  }

  const keywords = (THEME_KEYWORDS[theme] || []).map(k => k.toLowerCase());
  const matchedJournalIds = [];
  const matchedManualIds = [];

  for (const entry of recentJournalEntries) {
    if (!entry.authorIsHouseholdMember) continue;
    if (!withinLast7Days(entry.createdAt, now)) continue;
    const text = (entry.text || "").toLowerCase();
    if (keywords.some(k => text.includes(k)) || entry.salient === true) {
      matchedJournalIds.push(entry.id);
    }
  }

  for (const answer of recentManualAnswers) {
    if (!answer.authorIsHouseholdMember) continue;
    if (!withinLast7Days(answer.createdAt, now)) continue;
    const text = (answer.text || "").toLowerCase();
    if (keywords.some(k => text.includes(k)) || answer.salient === true) {
      matchedManualIds.push(answer.id);
    }
  }

  const matched = matchedJournalIds.length > 0 || matchedManualIds.length > 0;
  return { matched, matchedJournalIds, matchedManualIds };
}

module.exports = { hasJuicySignal, THEME_KEYWORDS };
