import { describe, it, expect, vi } from 'vitest';

// `@/hooks/useMarginNotes` → `@/lib/firebase`
// firebase.ts validates env vars at module load and throws when they're
// absent in the test environment. Short-circuit it here with a hoisted
// vi.mock so the module never evaluates its validateConfig() call.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', familyId: 'f1' } }),
}));

import { Timestamp } from 'firebase/firestore';
import { groupNotesByEntry, validateNoteContent } from '@/hooks/useMarginNotes';
import type { MarginNote } from '@/types/marginNote';

const note = (over: Partial<MarginNote>): MarginNote => ({
  id: 'n',
  familyId: 'f1',
  journalEntryId: 'e1',
  authorUserId: 'u1',
  content: 'x',
  createdAt: Timestamp.fromMillis(1_000),
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  ...over,
});

describe('groupNotesByEntry', () => {
  it('groups notes by journalEntryId', () => {
    const notes = [
      note({ id: 'a', journalEntryId: 'e1', createdAt: Timestamp.fromMillis(3_000) }),
      note({ id: 'b', journalEntryId: 'e2', createdAt: Timestamp.fromMillis(2_000) }),
      note({ id: 'c', journalEntryId: 'e1', createdAt: Timestamp.fromMillis(1_000) }),
    ];
    const map = groupNotesByEntry(notes);
    expect(map.get('e1')?.map((n) => n.id)).toEqual(['c', 'a']);
    expect(map.get('e2')?.map((n) => n.id)).toEqual(['b']);
  });

  it('returns empty map for empty input', () => {
    expect(groupNotesByEntry([]).size).toBe(0);
  });

  it('sorts each group oldest-first by createdAt', () => {
    const notes = [
      note({ id: 'late', createdAt: Timestamp.fromMillis(9_000) }),
      note({ id: 'early', createdAt: Timestamp.fromMillis(1_000) }),
    ];
    const result = groupNotesByEntry(notes).get('e1')!;
    expect(result.map((n) => n.id)).toEqual(['early', 'late']);
  });
});

describe('validateNoteContent', () => {
  it('trims and accepts content within 1..80 chars', () => {
    expect(validateNoteContent('  hello world  ')).toEqual({
      ok: true,
      content: 'hello world',
    });
  });

  it('rejects empty / whitespace-only content', () => {
    expect(validateNoteContent('').ok).toBe(false);
    expect(validateNoteContent('   ').ok).toBe(false);
  });

  it('rejects content over 80 chars after trimming', () => {
    const long = 'a'.repeat(81);
    expect(validateNoteContent(long).ok).toBe(false);
  });

  it('accepts exactly 80 chars', () => {
    const eighty = 'a'.repeat(80);
    const r = validateNoteContent(eighty);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content).toBe(eighty);
  });
});
