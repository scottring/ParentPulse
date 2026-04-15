import { describe, it, expect } from 'vitest';
import {
  isWrittenEntry,
  isSynthesisEntry,
  isConversationEntry,
  type Entry,
} from '@/types/entry';
import { Timestamp } from 'firebase/firestore';

describe('Entry type guards', () => {
  const base = {
    id: 'e1',
    familyId: 'f1',
    author: { kind: 'person' as const, personId: 'p1' },
    subjects: [{ kind: 'person' as const, personId: 'p2' }],
    content: 'hello',
    tags: [],
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    createdAt: Timestamp.now(),
  };

  it('recognises written entries', () => {
    const e: Entry = { ...base, type: 'written' };
    expect(isWrittenEntry(e)).toBe(true);
    expect(isSynthesisEntry(e)).toBe(false);
  });

  it('recognises synthesis entries', () => {
    const e: Entry = {
      ...base,
      type: 'synthesis',
      author: { kind: 'system' },
      sourceEntryIds: ['e0'],
    };
    expect(isSynthesisEntry(e)).toBe(true);
    expect(isWrittenEntry(e)).toBe(false);
  });

  it('recognises conversation entries and requires turns', () => {
    const e: Entry = {
      ...base,
      type: 'conversation',
      turns: [
        { author: base.author, content: 'first', createdAt: base.createdAt },
      ],
    };
    expect(isConversationEntry(e)).toBe(true);
    if (isConversationEntry(e)) {
      expect(e.turns.length).toBe(1);
    }
  });
});
