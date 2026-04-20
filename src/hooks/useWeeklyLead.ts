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
import type { WeeklyDispatch } from '@/types/weekly-dispatch';

// Subscribes to the most recent weekly_dispatches doc the current
// user can see. The doc is written by the generateWeeklyLead Cloud
// Function (Sunday 9pm cron + callable backfill). Returns null when
// no dispatch exists yet — the workbook card shows the placeholder
// in that case.
export function useWeeklyLead(): {
  dispatch: WeeklyDispatch | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [dispatch, setDispatch] = useState<WeeklyDispatch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;

    const q = query(
      collection(firestore, 'weekly_dispatches'),
      where('familyId', '==', user.familyId),
      where('participantUserIds', 'array-contains', user.userId),
      orderBy('weekEnding', 'desc'),
      limit(1),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docSnap = snap.docs[0];
        setDispatch(
          docSnap
            ? ({
                ...(docSnap.data() as Omit<WeeklyDispatch, 'dispatchId'>),
                dispatchId: docSnap.id,
              } as WeeklyDispatch)
            : null,
        );
        setLoading(false);
      },
      (err) => {
        console.warn('useWeeklyLead: listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.familyId, user?.userId]);

  return { dispatch, loading };
}
