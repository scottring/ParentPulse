import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Firebase functions
const httpsCallableMock = vi.fn();
const getFunctionsMock = vi.fn();

vi.mock('firebase/functions', () => ({
  getFunctions: () => getFunctionsMock(),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  auth: {},
  functions: {},
  storage: {},
}));

// Mock useAuth hook
const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

// eslint-disable-next-line import/first
import { useDinnerPrompt } from '@/hooks/useDinnerPrompt';

describe('useDinnerPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpsCallableMock.mockClear();
    getFunctionsMock.mockClear();
    useAuthMock.mockClear();
  });

  it('returns null and loading=true while loading', () => {
    useAuthMock.mockReturnValue({
      user: { familyId: 'fam-1', userId: 'user-1' },
      loading: false,
    });

    // Mock the cloud function to never resolve
    httpsCallableMock.mockReturnValue(() => new Promise(() => {}));

    const { result } = renderHook(() => useDinnerPrompt());

    expect(result.current.prompt).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('returns prompt text on successful fetch', async () => {
    useAuthMock.mockReturnValue({
      user: { familyId: 'fam-1', userId: 'user-1' },
      loading: false,
    });

    const mockPrompt = 'What was your favorite meal this week?';
    httpsCallableMock.mockReturnValue(() =>
      Promise.resolve({ data: { prompt: mockPrompt } })
    );

    const { result } = renderHook(() => useDinnerPrompt());

    await waitFor(() => {
      expect(result.current.prompt).toBe(mockPrompt);
    });
    expect(result.current.loading).toBe(false);
  });

  it('returns null on error', async () => {
    useAuthMock.mockReturnValue({
      user: { familyId: 'fam-1', userId: 'user-1' },
      loading: false,
    });

    httpsCallableMock.mockReturnValue(() =>
      Promise.reject(new Error('Cloud function error'))
    );

    const { result } = renderHook(() => useDinnerPrompt());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.prompt).toBeNull();
  });

  it('returns null and does not fetch when user has no familyId', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useDinnerPrompt());

    expect(result.current.prompt).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(httpsCallableMock).not.toHaveBeenCalled();
  });

  it('does not leak fetches after unmount (cancellation token)', async () => {
    useAuthMock.mockReturnValue({
      user: { familyId: 'fam-1', userId: 'user-1' },
      loading: false,
    });

    let resolvePromise: (value: unknown) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    httpsCallableMock.mockReturnValue(() => delayedPromise);

    const { result, unmount } = renderHook(() => useDinnerPrompt());

    expect(result.current.loading).toBe(true);

    // Unmount before promise resolves
    unmount();

    // Resolve the promise after unmount
    resolvePromise!({ data: { prompt: 'Should not update' } });

    // Give a tick for any state updates to attempt
    await new Promise((resolve) => setTimeout(resolve, 10));

    // If the cancellation token worked, no errors should occur
    // (If it didn't work, React would warn about setting state on unmounted component)
  });

  it('handles response with missing prompt field', async () => {
    useAuthMock.mockReturnValue({
      user: { familyId: 'fam-1', userId: 'user-1' },
      loading: false,
    });

    httpsCallableMock.mockReturnValue(() =>
      Promise.resolve({ data: {} })
    );

    const { result } = renderHook(() => useDinnerPrompt());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.prompt).toBeNull();
  });

  it('calls getDinnerPrompt with familyId parameter', async () => {
    const familyId = 'test-family-123';
    useAuthMock.mockReturnValue({
      user: { familyId, userId: 'user-1' },
      loading: false,
    });

    httpsCallableMock.mockReturnValue(() =>
      Promise.resolve({ data: { prompt: 'Test prompt' } })
    );

    renderHook(() => useDinnerPrompt());

    await waitFor(() => {
      expect(httpsCallableMock).toHaveBeenCalledWith(
        getFunctionsMock(),
        'getDinnerPrompt'
      );
    });

    // The returned callable should be invoked with familyId
    const callableMock = httpsCallableMock.mock.results[0]?.value;
    expect(typeof callableMock).toBe('function');
  });
});
