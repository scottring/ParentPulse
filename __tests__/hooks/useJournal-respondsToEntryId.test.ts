import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJournal } from '@/hooks/useJournal';

// Mock firestore addDoc + collection
const addDocMock = vi.fn(async () => ({ id: 'new-entry-id' }));
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    addDoc: (...args: unknown[]) => addDocMock(...args),
    collection: vi.fn((_, name: string) => ({ name })),
    Timestamp: actual.Timestamp,
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'user-A', familyId: 'fam-1' } }),
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));

describe('useJournal.createEntry — respondsToEntryId', () => {
  beforeEach(() => {
    addDocMock.mockClear();
  });

  it('writes respondsToEntryId when provided', async () => {
    const { result } = renderHook(() => useJournal());
    await act(async () => {
      await result.current.createEntry({
        text: 'my take',
        category: 'moment',
        respondsToEntryId: 'parent-entry-1',
      });
    });
    expect(addDocMock).toHaveBeenCalledOnce();
    const [, docData] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(docData.respondsToEntryId).toBe('parent-entry-1');
  });

  it('omits respondsToEntryId when not provided (no empty string)', async () => {
    const { result } = renderHook(() => useJournal());
    await act(async () => {
      await result.current.createEntry({ text: 'hi', category: 'moment' });
    });
    const [, docData] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect('respondsToEntryId' in docData).toBe(false);
  });
});
