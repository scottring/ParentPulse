'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

// Returns one entry written roughly one year ago that the current
// user can see. Pulls a tight window (±30 days around the matching
// date a year back) and picks the shortest quotable entry inside
// it — a memory reads best when it's a single thought, not a wall
// of text.
export function useMemoryOfTheDay(): {
  entry: JournalEntry | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const target = new Date(now);
        target.setFullYear(target.getFullYear() - 1);
        const windowDays = 30;
        const start = new Date(target);
        start.setDate(start.getDate() - windowDays);
        const end = new Date(target);
        end.setDate(end.getDate() + windowDays);

        const q = query(
          collection(firestore, 'journal_entries'),
          where('familyId', '==', user.familyId),
          where('visibleToUserIds', 'array-contains', user.userId),
          where('createdAt', '>=', Timestamp.fromDate(start)),
          where('createdAt', '<=', Timestamp.fromDate(end)),
          orderBy('createdAt', 'desc'),
          limit(30),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const candidates: JournalEntry[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<JournalEntry, 'entryId'>),
          entryId: d.id,
        } as JournalEntry));

        // Prefer entries with a pithy-quotable length (40..280 chars),
        // ignore reflections (to avoid echoing practice-close text),
        // and drop responses so we surface original voice.
        const pick = candidates
          .filter((e) => !e.respondsToEntryId)
          .filter((e) => e.category !== 'reflection')
          .filter((e) => {
            const len = (e.text ?? '').trim().length;
            return len >= 40 && len <= 280;
          })[0] ?? candidates[0] ?? null;

        setEntry(pick);
      } catch (err) {
        console.warn('useMemoryOfTheDay: query failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.familyId, user?.userId]);

  return { entry, loading };
}
