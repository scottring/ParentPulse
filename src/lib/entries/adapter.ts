import type { Entry, EntrySubject } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';

/**
 * Convert a legacy JournalEntry into the unified Entry shape.
 *
 * If the journal entry carries a non-self subject, emit type 'observation';
 * otherwise 'written'. Type-inference during the migration stays purely
 * structural — no content analysis here.
 */
export function journalEntryToEntry(j: JournalEntry): Entry {
  const subjects: EntrySubject[] = [];
  if (j.subjectPersonId && j.subjectType && j.subjectType !== 'self') {
    subjects.push({ kind: 'person', personId: j.subjectPersonId });
  }

  return {
    id: j.entryId,
    familyId: j.familyId,
    type: subjects.length > 0 ? 'observation' : 'written',
    author: { kind: 'person', personId: j.authorId },
    subjects,
    content: j.text,
    tags: j.tags ?? [],
    visibleToUserIds: j.visibleToUserIds ?? [],
    sharedWithUserIds: j.sharedWithUserIds ?? [],
    createdAt: j.createdAt,
  };
}
