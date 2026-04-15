import { describe, it, expect, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { fetchEntries, type EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, PersonManual } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  db: {},
}));

describe('entries foundation — smoke', () => {
  it('yields a unified, sorted stream from all four sources', async () => {
    const t0 = Timestamp.fromMillis(1_700_000_000_000);
    const t1 = Timestamp.fromMillis(1_700_000_001_000);
    const t2 = Timestamp.fromMillis(1_700_000_002_000);
    const t3 = Timestamp.fromMillis(1_700_000_003_000);

    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        {
          entryId: 'j1',
          familyId: 'f1',
          authorId: 'u1',
          text: 'wrote this',
          category: 'moment',
          tags: [],
          visibleToUserIds: ['u1'],
          sharedWithUserIds: [],
          createdAt: t2,
        } as unknown as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c1',
          manualId: 'm1',
          personId: 'p-liam',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'Scott',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'a.b': 'an answer' },
          status: 'complete',
          createdAt: t0,
          updatedAt: t0,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([
        {
          manualId: 'm1',
          familyId: 'f1',
          personId: 'p-liam',
          personName: 'Liam',
          createdAt: t1,
          updatedAt: t1,
          synthesizedContent: {
            overview: 'curious',
            alignments: [],
            gaps: [],
            blindSpots: [],
            lastSynthesizedAt: t1,
          },
        } as unknown as PersonManual,
      ]),
      growthItems: vi.fn().mockResolvedValue([
        {
          growthItemId: 'g1',
          familyId: 'f1',
          type: 'micro_activity',
          status: 'active',
          title: 'Try',
          body: 'the long answer',
          targetPersonIds: ['p-liam'],
          createdAt: t3,
        } as unknown as GrowthItem,
      ]),
    };

    const entries = await fetchEntries('f1', { includeContributionSources: true }, source, 'u1');
    // 1 journal + 1 reflection from contribution + 1 synthesis (overview only) + 1 growth = 4
    expect(entries.length).toBe(4);
    // Sorted desc by createdAt: g1 (t3) first, then j1 (t2).
    expect(entries[0].id).toBe('g1');
    expect(entries[1].id).toBe('j1');
  });

  it('excludes contribution-sourced reflections by default', async () => {
    const t = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([]),
      contributions: vi.fn().mockResolvedValue([
        {
          contributionId: 'c1',
          manualId: 'm1',
          personId: 'p-liam',
          familyId: 'f1',
          contributorId: 'u1',
          contributorName: 'Scott',
          perspectiveType: 'observer',
          relationshipToSubject: 'parent',
          topicCategory: 'triggers',
          answers: { 'a.b': 'an answer' },
          status: 'complete',
          createdAt: t,
          updatedAt: t,
        } as unknown as Contribution,
      ]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };
    const entries = await fetchEntries('f1', {}, source, 'u1');
    expect(entries.length).toBe(0);
  });

  it('filters by subject', async () => {
    const t0 = Timestamp.fromMillis(1_700_000_000_000);
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        {
          entryId: 'j1',
          familyId: 'f1',
          authorId: 'u1',
          text: 'about me',
          category: 'moment',
          tags: [],
          visibleToUserIds: ['u1'],
          sharedWithUserIds: [],
          createdAt: t0,
        } as unknown as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([
        {
          manualId: 'm1',
          familyId: 'f1',
          personId: 'p-liam',
          personName: 'Liam',
          createdAt: t0,
          updatedAt: t0,
          synthesizedContent: {
            overview: 'about Liam',
            alignments: [],
            gaps: [],
            blindSpots: [],
            lastSynthesizedAt: t0,
          },
        } as unknown as PersonManual,
      ]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const entries = await fetchEntries(
      'f1',
      { subjectPersonIds: ['p-liam'] },
      source,
      'u1'
    );
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe('synthesis');
  });
});
