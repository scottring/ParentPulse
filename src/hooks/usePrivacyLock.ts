'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { hashPin, verifyPin } from '@/lib/privacy-lock';

/**
 * Manages the private-view unlock state for the current user.
 *
 * - `pinIsSet`: whether a PIN has been saved for this user
 * - `unlocked`: whether the private view is currently unlocked in
 *   this session. Resets on page load and after inactivity.
 * - `setupPin(pin)` persists a new PIN and immediately unlocks
 * - `verify(pin)` checks a PIN and unlocks on success
 * - `lock()` re-locks immediately
 *
 * Inactivity: after `inactivityMs` of no user input, `unlocked` flips
 * back to false. The timer resets on document-level pointer/key
 * events.
 */
export interface UsePrivacyLockReturn {
  loading: boolean;
  pinIsSet: boolean;
  unlocked: boolean;
  error: string | null;
  setupPin: (pin: string) => Promise<void>;
  verify: (pin: string) => Promise<boolean>;
  lock: () => void;
}

const DEFAULT_INACTIVITY_MS = 3 * 60 * 1000; // 3 minutes

export function usePrivacyLock(
  inactivityMs: number = DEFAULT_INACTIVITY_MS
): UsePrivacyLockReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pinIsSet, setPinIsSet] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cached hash/salt after load, so verify() doesn't hit Firestore.
  const hashRef = useRef<{ pinHash: string; pinSalt: string } | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);

  // sessionStorage key for cross-route unlock persistence within a tab session.
  const sessionKey = user?.userId ? `relish:privacy:unlocked:${user.userId}` : null;

  const lockRef = useCallback(() => {
    setUnlocked(false);
    try {
      if (sessionKey && typeof window !== 'undefined') {
        window.sessionStorage?.removeItem(sessionKey);
      }
    } catch {
      // sessionStorage may be disabled; non-fatal.
    }
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [sessionKey]);

  // Restore unlocked state from sessionStorage on mount / user change so
  // navigation between routes within a session preserves the unlock.
  // Inactivity timeout still clears it via lockRef().
  useEffect(() => {
    if (!sessionKey || typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage?.getItem(sessionKey);
      if (raw === '1') setUnlocked(true);
    } catch {
      // ignore
    }
  }, [sessionKey]);

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      lockRef();
    }, inactivityMs);
  }, [inactivityMs, lockRef]);

  // Activity listeners: while unlocked, reset the inactivity timer
  // on user input. Clean up on lock / unmount.
  useEffect(() => {
    if (!unlocked) return;
    startInactivityTimer();
    const reset = () => startInactivityTimer();
    const events: Array<keyof DocumentEventMap> = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    for (const ev of events) {
      document.addEventListener(ev, reset, { passive: true });
    }
    return () => {
      for (const ev of events) {
        document.removeEventListener(ev, reset);
      }
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [unlocked, startInactivityTimer]);

  // Load existing PIN hash (if any) when the user arrives.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.userId) {
        setLoading(false);
        setPinIsSet(false);
        return;
      }
      try {
        const ref = doc(firestore, 'users', user.userId, 'private', 'lock');
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data() as { pinHash?: string; pinSalt?: string };
          if (d.pinHash && d.pinSalt) {
            hashRef.current = { pinHash: d.pinHash, pinSalt: d.pinSalt };
            setPinIsSet(true);
          } else {
            setPinIsSet(false);
          }
        } else {
          setPinIsSet(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load lock');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const persistUnlock = useCallback(() => {
    try {
      if (sessionKey && typeof window !== 'undefined') {
        window.sessionStorage?.setItem(sessionKey, '1');
      }
    } catch {
      // ignore
    }
  }, [sessionKey]);

  const setupPin = useCallback(
    async (pin: string) => {
      if (!user?.userId) throw new Error('Not signed in');
      setError(null);
      const { pinHash, pinSalt } = await hashPin(pin);
      const ref = doc(firestore, 'users', user.userId, 'private', 'lock');
      await setDoc(ref, { pinHash, pinSalt, updatedAt: serverTimestamp() });
      hashRef.current = { pinHash, pinSalt };
      setPinIsSet(true);
      setUnlocked(true);
      persistUnlock();
    },
    [user?.userId, persistUnlock]
  );

  const verify = useCallback(async (pin: string): Promise<boolean> => {
    const cached = hashRef.current;
    if (!cached) return false;
    const ok = await verifyPin(pin, cached.pinHash, cached.pinSalt);
    if (ok) {
      setUnlocked(true);
      persistUnlock();
      setError(null);
    } else {
      setError('Incorrect PIN');
    }
    return ok;
  }, [persistUnlock]);

  return {
    loading,
    pinIsSet,
    unlocked,
    error,
    setupPin,
    verify,
    lock: lockRef,
  };
}
