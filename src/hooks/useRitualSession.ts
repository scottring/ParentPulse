'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import {
  SESSION_COLLECTION,
  type RitualSession,
  type RitualIntention,
} from '@/types/ritual-session';

/* Load one ritual session with live updates + expose save helpers. */
export interface UseRitualSessionReturn {
  session: RitualSession | null;
  loading: boolean;
  error: Error | null;
  saveSectionNote: (sectionIndex: number, note: string) => Promise<void>;
  saveIntentions: (intentions: RitualIntention[]) => Promise<void>;
  markComplete: () => Promise<void>;
}

export function useRitualSession(
  sessionId: string | null,
): UseRitualSessionReturn {
  const [session, setSession] = useState<RitualSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(firestore, SESSION_COLLECTION, sessionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setSession({ ...(snap.data() as RitualSession), sessionId: snap.id });
        } else {
          setSession(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('useRitualSession:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [sessionId]);

  const saveSectionNote = useCallback(
    async (sectionIndex: number, note: string) => {
      if (!sessionId || !session) return;
      const next = session.sections.map((s, i) =>
        i === sectionIndex ? { ...s, note } : s,
      );
      const ref = doc(firestore, SESSION_COLLECTION, sessionId);
      await updateDoc(ref, {
        sections: next,
        updatedAt: serverTimestamp(),
      });
    },
    [sessionId, session],
  );

  const saveIntentions = useCallback(
    async (intentions: RitualIntention[]) => {
      if (!sessionId) return;
      const ref = doc(firestore, SESSION_COLLECTION, sessionId);
      await updateDoc(ref, {
        intentions,
        updatedAt: serverTimestamp(),
      });
    },
    [sessionId],
  );

  const markComplete = useCallback(async () => {
    if (!sessionId) return;
    const ref = doc(firestore, SESSION_COLLECTION, sessionId);
    await updateDoc(ref, {
      status: 'complete',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, [sessionId]);

  return {
    session,
    loading,
    error,
    saveSectionNote,
    saveIntentions,
    markComplete,
  };
}

/* Call the Cloud Function to generate a new session, return its id. */
export async function createRitualSession(
  ritualId: string,
  daysBack?: number,
): Promise<string> {
  const callable = httpsCallable<
    { ritualId: string; daysBack?: number },
    { sessionId: string }
  >(functions, 'generateRitualScript');
  const res = await callable({ ritualId, ...(daysBack ? { daysBack } : {}) });
  return res.data.sessionId;
}

/* List recent complete sessions for a given ritual. Used on /rituals. */
export async function listRecentSessions(
  ritualId: string,
  max = 10,
): Promise<RitualSession[]> {
  const col = collection(firestore, SESSION_COLLECTION);
  const q = query(
    col,
    where('ritualId', '==', ritualId),
    where('status', '==', 'complete'),
    orderBy('completedAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ ...(d.data() as RitualSession), sessionId: d.id }),
  );
}
