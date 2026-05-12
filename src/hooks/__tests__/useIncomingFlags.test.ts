import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const onSnapshotMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => ({ where: args })),
  orderBy: vi.fn((...args) => ({ orderBy: args })),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'me' } }),
}));

import { useIncomingFlags } from '../useIncomingFlags';

describe('useIncomingFlags', () => {
  beforeEach(() => onSnapshotMock.mockReset());

  it('subscribes to message_flags where toUserId == me && status in [open, seen]', async () => {
    let cb: ((snap: { docs: Array<{ id: string; data: () => unknown }> }) => void) | undefined;
    onSnapshotMock.mockImplementation((_q: unknown, callback: (snap: { docs: Array<{ id: string; data: () => unknown }> }) => void) => {
      cb = callback;
      return () => {};
    });
    const { result } = renderHook(() => useIncomingFlags());
    expect(result.current.flags).toEqual([]);
    if (cb) {
      cb({
        docs: [
          { id: 'f1', data: () => ({ status: 'open', toUserId: 'me' }) },
          { id: 'f2', data: () => ({ status: 'closed', toUserId: 'me' }) },
        ],
      });
    }
    await waitFor(() => expect(result.current.flags.length).toBeGreaterThan(0));
    expect(result.current.flags.map((f) => f.flagId)).toContain('f1');
  });
});
