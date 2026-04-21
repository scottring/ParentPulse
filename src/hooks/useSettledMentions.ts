'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// Tracks entry IDs the current user has explicitly "settled" —
// acknowledged without writing a reply. Settled mentions drop out
// of the Waiting-on-you column just like responded-to mentions do,
// giving the user closure as an explicit choice rather than only
// as a side effect of responding.
//
// Persistence: users/{userId}/private/settledMentions
//   { ids: string[], updatedAt: serverTimestamp }
//
// Single-doc array is fine at current scale — each entryId is ~20
// chars, and Firestore's 1MB doc limit gives ~50k entries of
// headroom. Can be refactored to a subcollection if we ever hit
// that ceiling.
export function useSettledMentions(): {
  settledIds: Set<string>;
  loaded: boolean;
  settle: (entryId: string) => Promise<void>;
  isSettled: (entryId: string) => boolean;
} {
  const { user } = useAuth();
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      setSettledIds(new Set());
      setLoaded(false);
      return;
    }
    const ref = doc(firestore, 'users', userId, 'private', 'settledMentions');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { ids?: string[] } | undefined;
        setSettledIds(new Set(data?.ids ?? []));
        setLoaded(true);
      },
      (err) => {
        console.warn('useSettledMentions: listener error', err);
        setLoaded(true);
      },
    );
    return () => unsub();
  }, [user?.userId]);

  const settle = useCallback(
    async (entryId: string) => {
      const userId = user?.userId;
      if (!userId) throw new Error('Not signed in');
      const ref = doc(firestore, 'users', userId, 'private', 'settledMentions');
      await setDoc(
        ref,
        { ids: arrayUnion(entryId), updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [user?.userId],
  );

  const isSettled = useCallback(
    (entryId: string) => settledIds.has(entryId),
    [settledIds],
  );

  return { settledIds, loaded, settle, isSettled };
}
