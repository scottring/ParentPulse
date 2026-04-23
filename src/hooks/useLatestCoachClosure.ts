'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  COACH_CLOSURES_COLLECTION,
  type CoachClosure,
} from '@/types/coach';

export interface UseLatestCoachClosureReturn {
  closure: CoachClosure | null;
  loading: boolean;
}

/**
 * Subscribes to the current user's coach closures and returns the
 * most recent one (client-side sort — per-user counts are small and
 * we avoid a composite index requirement).
 *
 * Used by the workbook's "From your last conversation" card.
 */
export function useLatestCoachClosure(): UseLatestCoachClosureReturn {
  const { user } = useAuth();
  const [closure, setClosure] = useState<CoachClosure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      setClosure(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, COACH_CLOSURES_COLLECTION),
      where('userId', '==', userId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(
          (d) => ({ ...(d.data() as CoachClosure), closureId: d.id }),
        );
        docs.sort((a, b) => {
          const am = a.distilledAt?.toMillis?.() ?? 0;
          const bm = b.distilledAt?.toMillis?.() ?? 0;
          return bm - am;
        });
        setClosure(docs[0] ?? null);
        setLoading(false);
      },
      (err) => {
        console.error('useLatestCoachClosure:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.userId]);

  return { closure, loading };
}
