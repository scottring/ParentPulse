import { describe, it, expect, vi } from 'vitest';

// `@/lib/entries/query` now imports `@/lib/firebase` for the production
// firestoreEntrySource. Short-circuit the env-var validation that fires
// at module load so the test environment doesn't throw.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  auth: {},
  functions: {},
  storage: {},
}));

import { Timestamp } from 'firebase/firestore';
import { fetchEntries, type EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';
import type { Contribution } from '@/types/person-manual';

describe('fetchEntries', () => {
  const now = Timestamp.fromMillis(1_700_000_000_000);
  const earlier = Timestamp.fromMillis(1_600_000_000_000);

  const buildSource = (overrides: Partial<EntrySource> = {}): EntrySource => ({
    journalEntries: vi.fn().mockResolvedValue([
      {
        entryId: 'j1',
        familyId: 'f1',
        authorId: 'u1',
        text: 'latest',
        category: 'moment',
        tags: [],
        visibleToUserIds: ['u1'],
        sharedWithUserIds: [],
        createdAt: now,
      } as unknown as JournalEntry,
      {
        entryId: 'j2',
        familyId: 'f1',
        authorId: 'u1',
        text: 'earlier',
        category: 'moment',
        tags: [],
        visibleToUserIds: ['u1'],
        sharedWithUserIds: [],
        createdAt: earlier,
      } as unknown as JournalEntry,
    ]),
    contributions: vi.fn().mockResolvedValue([]),
    personManuals: vi.fn().mockResolvedValue([]),
    growthItems: vi.fn().mockResolvedValue([]),
    ...overrides,
  });

  it('queries every source in parallel', async () => {
    const source = buildSource();
    await fetchEntries('f1', {}, source, 'u1');
    expect(source.journalEntries).toHaveBeenCalledWith('f1', 'u1');
    expect(source.contributions).toHaveBeenCalledWith('f1', 'u1');
    expect(source.personManuals).toHaveBeenCalledWith('f1', 'u1');
    expect(source.growthItems).toHaveBeenCalledWith('f1', 'u1');
  });

  it('returns entries sorted by createdAt descending', async () => {
    const entries = await fetchEntries('f1', {}, buildSource(), 'u1');
    expect(entries.map((e) => e.id)).toEqual(['j1', 'j2']);
  });

  it('applies the types filter', async () => {
    const entries = await fetchEntries('f1', { types: ['synthesis'] }, buildSource(), 'u1');
    expect(entries.length).toBe(0);
  });
});

describe('fetchEntries — currentUserId pass-through', () => {
  it('passes currentUserId to every source method', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };
    await fetchEntries('f1', {}, source, 'u1');
    expect(source.journalEntries).toHaveBeenCalledWith('f1', 'u1');
    expect(source.contributions).toHaveBeenCalledWith('f1', 'u1');
    expect(source.personManuals).toHaveBeenCalledWith('f1', 'u1');
    expect(source.growthItems).toHaveBeenCalledWith('f1', 'u1');
  });
});

describe('fetchEntries — _visibility:family sentinel resolution', () => {
  it('replaces visibleToUserIds with family roster when sentinel present', async () => {
    const t = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c1',
          manualId: 'm1',
          personId: 'p1',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'A',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'sec.q': 'visible answer' },
          answerVisibility: undefined,
          status: 'complete',
          createdAt: t,
          updatedAt: t,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const familyRoster = ['u1', 'u2', 'u3'];
    const entries = await fetchEntries(
      'f1',
      {},
      source,
      'u1',
      async () => familyRoster
    );

    const reflection = entries.find((e) => e.type === 'reflection');
    expect(reflection?.visibleToUserIds).toEqual(familyRoster);
    expect(reflection?.tags).not.toContain('_visibility:family');
  });

  it('keeps contributor-only visibility when no sentinel', async () => {
    const t = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c2',
          manualId: 'm1',
          personId: 'p1',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'A',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'sec.q': 'private answer' },
          answerVisibility: { sec: { q: 'private' } },
          status: 'complete',
          createdAt: t,
          updatedAt: t,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const entries = await fetchEntries('f1', {}, source, 'u1', async () => ['u1', 'u2']);
    const reflection = entries.find((e) => e.type === 'reflection');
    expect(reflection?.visibleToUserIds).toEqual(['u1']);
  });
});
