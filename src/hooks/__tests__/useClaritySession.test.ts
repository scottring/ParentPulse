import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  functions: {},
}));

const mockOnSnapshot = vi.fn();
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'mv1' });
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({}),
  query: (...a: unknown[]) => a,
  orderBy: (...a: unknown[]) => a,
  onSnapshot: (...a: unknown[]) => mockOnSnapshot(...a),
  addDoc: (...a: unknown[]) => mockAddDoc(...a),
  updateDoc: (...a: unknown[]) => mockUpdateDoc(...a),
  serverTimestamp: () => 'SERVER_TS',
}));

const mockHttpsCallable = vi.fn().mockReturnValue(
  vi.fn().mockResolvedValue({ data: { assistantTurn: { reflection: 'r', question: 'q' } } }),
);
vi.mock('firebase/functions', () => ({
  httpsCallable: (...a: unknown[]) => mockHttpsCallable(...a),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'uid-1', familyId: 'fam-1', role: 'parent' },
  }),
}));

import { useClaritySession } from '../useClaritySession';

beforeEach(() => {
  mockOnSnapshot.mockClear();
  mockAddDoc.mockClear();
  mockUpdateDoc.mockClear();
  mockHttpsCallable.mockClear();
});

describe('useClaritySession', () => {
  it('subscribes to moves when obstacleId provided', () => {
    renderHook(() => useClaritySession('ob1'));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it('sendTurn calls claritySessionTurn callable', async () => {
    const callable = vi.fn().mockResolvedValue({ data: { assistantTurn: { reflection: 'r', question: 'q' } } });
    mockHttpsCallable.mockReturnValue(callable);

    const { result } = renderHook(() => useClaritySession('ob1'));
    await act(async () => {
      await result.current.sendTurn('hello');
    });
    expect(callable).toHaveBeenCalledWith({ obstacleId: 'ob1', message: 'hello' });
  });

  it('confirmPrescription writes a prescription move and updates status', async () => {
    const { result } = renderHook(() => useClaritySession('ob1'));
    await act(async () => {
      await result.current.confirmPrescription({ shape: 'atomic', body: 'Ask her: ...' });
    });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const docArg = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(docArg.type).toBe('prescription');
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});
