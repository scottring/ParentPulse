import type { JournalEntry } from '@/types/journal';

// Returns the set of personIds an entry is "about" — the union of
// user-tagged mentions (personMentions, set at capture time via the
// About picker) and AI-extracted mentions (enrichment.aiPeople,
// written by the enrichJournalEntry Cloud Function from the entry
// text). We union them so person-scoped views don't go blank when
// the user forgot to tag but the text named the person explicitly.
export function entryMentionsFor(entry: JournalEntry): string[] {
  const tagged = entry.personMentions ?? [];
  const aiPeople = entry.enrichment?.aiPeople ?? [];
  if (aiPeople.length === 0) return tagged;
  const seen = new Set<string>(tagged);
  for (const id of aiPeople) seen.add(id);
  return [...seen];
}

export function entryMentionsPerson(
  entry: JournalEntry,
  personId: string,
): boolean {
  if ((entry.personMentions ?? []).includes(personId)) return true;
  if ((entry.enrichment?.aiPeople ?? []).includes(personId)) return true;
  return false;
}
