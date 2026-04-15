import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { journalEntryToEntry } from '@/lib/entries/adapter';
import type { JournalEntry } from '@/types/journal';

describe('journalEntryToEntry', () => {
  const testTime = Timestamp.now();

  const baseJournal: JournalEntry = {
    entryId: 'j1',
    familyId: 'f1',
    authorId: 'u1',
    text: 'Dinner was loud tonight.',
    category: 'moment',
    tags: ['dinner'],
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    createdAt: testTime,
    personMentions: [],
  } as JournalEntry;

  it('maps a self-authored entry to written', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.id).toBe('j1');
    expect(e.type).toBe('written');
    expect(e.author).toEqual({ kind: 'person', personId: 'u1' });
    expect(e.subjects.length).toBe(0);
    expect(e.content).toBe('Dinner was loud tonight.');
    expect(e.tags).toEqual(['dinner']);
  });

  it('maps an entry about another person to observation', () => {
    const j: JournalEntry = {
      ...baseJournal,
      entryId: 'j2',
      subjectPersonId: 'p-liam',
      subjectType: 'child_proxy',
    } as JournalEntry;
    const e = journalEntryToEntry(j);
    expect(e.type).toBe('observation');
    expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
  });

  it('preserves visibility fields verbatim', () => {
    const j: JournalEntry = {
      ...baseJournal,
      visibleToUserIds: ['u1', 'u2'],
      sharedWithUserIds: ['u2'],
    };
    const e = journalEntryToEntry(j);
    expect(e.visibleToUserIds).toEqual(['u1', 'u2']);
    expect(e.sharedWithUserIds).toEqual(['u2']);
  });

  it('preserves createdAt timestamp', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.createdAt).toBe(testTime);
  });
});
