/**
 * Reproduces the iPad/iOS Safari "spinner forever" bug:
 * Firestore's IndexedDB cache wedges, so the post-login
 * `getDoc(users/{uid})` never settles. The auth bootstrap must NOT
 * hang the loading gate forever — it has to give up and surface a
 * retryable error instead of an infinite spinner.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Keep the bootstrap timeout tiny so the test is fast. Production
// default is much larger; this knob also lets ops tune it for slow
// beta networks.
beforeEach(() => {
  process.env.NEXT_PUBLIC_AUTH_BOOTSTRAP_TIMEOUT_MS = '50';
});

// onAuthStateChanged fires a signed-in user synchronously.
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    cb({
      uid: 'u1',
      email: 'a@b.c',
      displayName: 'A',
      metadata: { creationTime: 'now' },
    });
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

// getDoc never settles — this is the wedged-cache condition.
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => new Promise(() => {})),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  firestore: {},
  functions: {},
}));

vi.mock('@/utils/user-manual-setup', () => ({
  createUserOwnManual: vi.fn(async () => {}),
}));

import { AuthProvider, useAuth } from '../AuthContext';

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthContext bootstrap timeout', () => {
  it('stops loading and surfaces an error when the user read never settles', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.loading).toBe(true);

    // The wedged read never resolves; the bootstrap must still give up.
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});
