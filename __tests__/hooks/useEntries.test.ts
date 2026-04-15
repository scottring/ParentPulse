import { describe, it, expect, vi } from 'vitest';

// `@/hooks/useEntries` → `@/lib/entries/query` → `@/lib/firebase`
// firebase.ts validates env vars at module load and throws when they're
// absent in the test environment. Short-circuit it here with a hoisted
// vi.mock so the module never evaluates its validateConfig() call.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  auth: {},
  functions: {},
  storage: {},
}));

import { renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useEntries } from '@/hooks/useEntries';
import type { EntrySource } from '@/lib/entries/query';
import type { JournalEntry } from '@/types/journal';

describe('useEntries', () => {
  it('returns entries sorted newest-first', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockResolvedValue([
        {
          entryId: 'j1',
          familyId: 'f1',
          authorId: 'u1',
          text: 'hello',
          category: 'moment',
          tags: [],
          visibleToUserIds: ['u1'],
          sharedWithUserIds: [],
          createdAt: Timestamp.now(),
        } as unknown as JournalEntry,
      ]),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() =>
      useEntries({ familyId: 'f1', filter: {}, source })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.length).toBe(1);
    expect(result.current.entries[0].id).toBe('j1');
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors', async () => {
    const source: EntrySource = {
      journalEntries: vi.fn().mockRejectedValue(new Error('boom')),
      contributions: vi.fn().mockResolvedValue([]),
      personManuals: vi.fn().mockResolvedValue([]),
      growthItems: vi.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() =>
      useEntries({ familyId: 'f1', filter: {}, source })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.entries).toEqual([]);
  });
});
