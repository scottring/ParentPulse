'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { WeeklyBrief } from '@/types/weekly-brief';

// Subscribes to the most recent weekly_briefs doc the current user
// can see. Written by the generateWeeklyBrief Cloud Function.
export function useWeeklyBrief(): {
  brief: WeeklyBrief | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;

    const q = query(
      collection(firestore, 'weekly_briefs'),
      where('familyId', '==', user.familyId),
      where('participantUserIds', 'array-contains', user.userId),
      orderBy('weekEnding', 'desc'),
      limit(1),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docSnap = snap.docs[0];
        setBrief(
          docSnap
            ? ({
                ...(docSnap.data() as Omit<WeeklyBrief, 'briefId'>),
                briefId: docSnap.id,
              } as WeeklyBrief)
            : null,
        );
        setLoading(false);
      },
      (err) => {
        console.warn('useWeeklyBrief: listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.familyId, user?.userId]);

  return { brief, loading };
}
