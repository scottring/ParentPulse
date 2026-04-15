import type { Entry, EntrySubject } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';
import type { Contribution } from '@/types/person-manual';

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

/**
 * Convert a Contribution's answers into prompt + reflection entry pairs.
 *
 * Each non-empty answer emits:
 *   - a 'prompt' entry (authored by system) carrying the question key
 *   - a 'reflection' entry (authored by the contributor) with the answer text,
 *     anchored to the prompt.
 *
 * Question-prose lookup is deferred to a later plan; for now the prompt
 * content is a placeholder derived from the question key.
 */
export function contributionToEntries(c: Contribution): Entry[] {
  const out: Entry[] = [];
  for (const [questionKey, answerValue] of Object.entries(c.answers ?? {})) {
    const answer = typeof answerValue === 'string' ? answerValue : String(answerValue ?? '');
    if (!answer.trim()) continue;

    const [sectionId] = questionKey.split('.');
    const promptId = `${c.contributionId}:${questionKey}:prompt`;
    const reflectionId = `${c.contributionId}:${questionKey}:reflection`;

    const subjects: EntrySubject[] = [{ kind: 'person', personId: c.personId }];
    const tags = questionKey.includes('.') ? [sectionId] : [];

    out.push({
      id: promptId,
      familyId: c.familyId,
      type: 'prompt',
      author: { kind: 'system' },
      subjects,
      content: `(question: ${questionKey})`,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });

    out.push({
      id: reflectionId,
      familyId: c.familyId,
      type: 'reflection',
      author: { kind: 'person', personId: c.contributorId },
      subjects,
      content: answer,
      anchorEntryId: promptId,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });
  }
  return out;
}
