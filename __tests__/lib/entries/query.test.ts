import { describe, it, expect, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { fetchEntries, type EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';

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
    await fetchEntries('f1', {}, source);
    expect(source.journalEntries).toHaveBeenCalledWith('f1');
    expect(source.contributions).toHaveBeenCalledWith('f1');
    expect(source.personManuals).toHaveBeenCalledWith('f1');
    expect(source.growthItems).toHaveBeenCalledWith('f1');
  });

  it('returns entries sorted by createdAt descending', async () => {
    const entries = await fetchEntries('f1', {}, buildSource());
    expect(entries.map((e) => e.id)).toEqual(['j1', 'j2']);
  });

  it('applies the types filter', async () => {
    const entries = await fetchEntries('f1', { types: ['synthesis'] }, buildSource());
    expect(entries.length).toBe(0);
  });
});
