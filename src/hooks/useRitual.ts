'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Ritual } from '@/types/ritual';

interface UseRitualReturn {
  ritual: Ritual | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
}

// Live subscription to a single ritual doc. Rules gate reads to
// participants only — so a listener on a ritual you're not part of
// surfaces as error.
export function useRitual(ritualId: string | null | undefined): UseRitualReturn {
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(ritualId));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ritualId) return;

    const ref = doc(firestore, 'rituals', ritualId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRitual(null);
          setNotFound(true);
          setLoading(false);
          return;
        }
        setRitual({
          ...(snap.data() as Omit<Ritual, 'ritualId'>),
          ritualId: snap.id,
        });
        setNotFound(false);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('useRitual: listener error', err);
        setError('Failed to load ritual');
        setLoading(false);
      },
    );

    return () => unsub();
  }, [ritualId]);

  return { ritual, loading, notFound, error };
}

// Compute the next run date. Pure — used at write time by the runner
// close-step and at schedule-time by the setup page.
export function computeNextRunAt(
  prev: Date,
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'ad_hoc',
): Date {
  const next = new Date(prev);
  switch (cadence) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'ad_hoc':
      // No cadence — next is "never" (far future sentinel).
      next.setFullYear(next.getFullYear() + 10);
      break;
  }
  return next;
}

interface CloseRitualArgs {
  ritualId: string;
  momentId: string;
  ranAt: Date;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'ad_hoc';
}

// Called by the runner's "close" step. Updates lastRunAt,
// lastRunMomentId, and bumps nextRunAt by the ritual's cadence.
export async function closeRitualRun(args: CloseRitualArgs): Promise<void> {
  const nextRunAt = computeNextRunAt(args.ranAt, args.cadence);
  await updateDoc(doc(firestore, 'rituals', args.ritualId), {
    lastRunAt: Timestamp.fromDate(args.ranAt),
    lastRunMomentId: args.momentId,
    nextRunAt: Timestamp.fromDate(nextRunAt),
    updatedAt: serverTimestamp(),
  });
}
