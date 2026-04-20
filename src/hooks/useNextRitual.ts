'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Ritual } from '@/types/ritual';

// Returns the user's next active ritual (earliest nextRunAt among
// rituals they participate in). Null when the user has no active
// rituals. Subscribes to changes so the Workbook card stays live.
export function useNextRitual(): { ritual: Ritual | null; loading: boolean } {
  const { user } = useAuth();
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;

    const q = query(
      collection(firestore, 'rituals'),
      where('familyId', '==', user.familyId),
      where('participantUserIds', 'array-contains', user.userId),
      where('status', '==', 'active'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Ritual[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Ritual, 'ritualId'>),
          ritualId: d.id,
        }));
        // Pick the one with the earliest nextRunAt.
        arr.sort((a, b) => {
          const aMs = a.nextRunAt?.toMillis?.() ?? Infinity;
          const bMs = b.nextRunAt?.toMillis?.() ?? Infinity;
          return aMs - bMs;
        });
        setRitual(arr[0] ?? null);
        setLoading(false);
      },
      (err) => {
        console.warn('useNextRitual: listener error', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user?.familyId, user?.userId]);

  return { ritual, loading };
}
