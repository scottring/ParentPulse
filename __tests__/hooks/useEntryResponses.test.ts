import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntryResponses } from '@/hooks/useEntryResponses';

// Fake onSnapshot — emits a single snapshot synchronously. The mock
// returns entries pre-sorted oldest→newest, matching what Firestore's
// orderBy('createdAt','asc') would have returned in production.
const fakeEntries = [
  { id: 'r1', data: () => ({ entryId: 'r1', text: 'A', respondsToEntryId: 'p1', authorId: 'u1', createdAt: { toDate: () => new Date('2026-04-18T10:00:00Z') } }) },
  { id: 'r2', data: () => ({ entryId: 'r2', text: 'B', respondsToEntryId: 'p1', authorId: 'u2', createdAt: { toDate: () => new Date('2026-04-18T11:00:00Z') } }) },
];
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({})),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
    onSnapshot: vi.fn((_q: unknown, cb: (snap: unknown) => void) => {
      cb({ docs: fakeEntries });
      return () => {};
    }),
  };
});
vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', familyId: 'fam-1' } }),
}));

describe('useEntryResponses', () => {
  it('returns responses ordered chronologically, oldest first', async () => {
    const { result } = renderHook(() => useEntryResponses('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Hook trusts Firestore's server-side orderBy and does not re-sort.
    expect(result.current.responses.map((r) => r.entryId)).toEqual(['r1', 'r2']);
  });

  it('is a no-op when entryId is empty', async () => {
    const { result } = renderHook(() => useEntryResponses(''));
    expect(result.current.responses).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
