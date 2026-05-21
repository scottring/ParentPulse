import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// We'll mock firestore + AuthContext.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {},
}));

const mockDocRef = { id: 'new-obstacle-id' };
const mockAddDoc = vi.fn().mockResolvedValue(mockDocRef);
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({}),
  addDoc: (...a: unknown[]) => mockAddDoc(...a),
  onSnapshot: (...a: unknown[]) => mockOnSnapshot(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  serverTimestamp: () => 'SERVER_TS',
  Timestamp: { now: () => ({ toMillis: () => 0 }) },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'uid-1', familyId: 'fam-1', role: 'parent' },
  }),
}));

import { useObstacle, useCreateObstacle } from '../useObstacle';

beforeEach(() => {
  mockAddDoc.mockClear();
  mockOnSnapshot.mockClear();
  mockUpdateDoc.mockClear();
});

describe('useCreateObstacle', () => {
  it('creates a private obstacle with author in visibleToUserIds', async () => {
    const { result } = renderHook(() => useCreateObstacle());
    let id = '';
    await act(async () => {
      id = await result.current.create();
    });
    expect(id).toBe('new-obstacle-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const docArg = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(docArg.authorId).toBe('uid-1');
    expect(docArg.familyId).toBe('fam-1');
    expect(docArg.status).toBe('fresh');
    expect(docArg.visibility).toEqual({ mode: 'private', sharedWith: ['uid-1'] });
    expect(docArg.visibleToUserIds).toEqual(['uid-1']);
    expect(docArg.sensitive).toBe(false);
  });
});

describe('useObstacle', () => {
  it('subscribes when obstacleId is provided', () => {
    renderHook(() => useObstacle('ob1'));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });
  it('does not subscribe when obstacleId is null', () => {
    renderHook(() => useObstacle(null));
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });
});
