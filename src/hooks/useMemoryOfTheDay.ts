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

// Returns one entry from the archive that the current user can see,
// preferring something from roughly one year ago and falling back
// progressively to the deepest older-than-one-week memory available.
// Returning an age label alongside the entry lets the caller render
// the slot honestly — "A year ago" when we can say that, "Two weeks
// ago" when a year of history doesn't exist yet.
//
// The empty state (no entries older than 7 days at all) returns
// { entry: null, ageLabel: null } and the caller can render a
// different card entirely — the slot is not worth a placeholder.
export function useMemoryOfTheDay(): {
  entry: JournalEntry | null;
  ageLabel: string | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [ageLabel, setAgeLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7); // older than 7 days

        const q = query(
          collection(firestore, 'journal_entries'),
          where('familyId', '==', user.familyId),
          where('visibleToUserIds', 'array-contains', user.userId),
          where('createdAt', '<=', Timestamp.fromDate(cutoff)),
          orderBy('createdAt', 'desc'),
          limit(80),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const candidates: JournalEntry[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<JournalEntry, 'entryId'>),
          entryId: d.id,
        } as JournalEntry));

        // Filter to voices worth quoting: not reflections, not responses,
        // and a sentence-or-two length that reads as a memory.
        const quotable = candidates
          .filter((e) => !e.respondsToEntryId)
          .filter((e) => e.category !== 'reflection')
          .filter((e) => {
            const len = (e.text ?? '').trim().length;
            return len >= 40 && len <= 280;
          });

        // Preference order:
        //   1. Year-ago window (±30 days) — the canonical "memory of the day"
        //   2. Oldest quotable entry available — deepest honest memory
        //   3. Any oldest entry as a last resort (even if outside quotable length)
        const oneYearMs = 365 * 24 * 60 * 60 * 1000;
        const yearAgoMs = now.getTime() - oneYearMs;
        const windowMs = 30 * 24 * 60 * 60 * 1000;

        const yearAgoMatch = quotable.find((e) => {
          const ms = e.createdAt?.toMillis?.() ?? 0;
          return Math.abs(ms - yearAgoMs) <= windowMs;
        });

        // Oldest quotable = last in desc order.
        const oldestQuotable = quotable[quotable.length - 1];
        const oldestAny = candidates[candidates.length - 1];

        const pick = yearAgoMatch ?? oldestQuotable ?? oldestAny ?? null;

        if (!pick) {
          setEntry(null);
          setAgeLabel(null);
          return;
        }

        const pickedMs = pick.createdAt?.toMillis?.() ?? 0;
        setEntry(pick);
        setAgeLabel(labelForAge(now.getTime() - pickedMs));
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

  return { entry, ageLabel, loading };
}

// Bucket an age in ms into an editorial label. The buckets are
// coarse on purpose — "six months ago" reads better than "186 days
// ago" when the slot is being read as a memory, not a stopwatch.
function labelForAge(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 335) return 'a year ago';
  if (days >= 165) return 'six months ago';
  if (days >= 75)  return 'three months ago';
  if (days >= 45)  return 'two months ago';
  if (days >= 25)  return 'a month ago';
  if (days >= 14)  return `${Math.floor(days / 7)} weeks ago`;
  if (days >= 7)   return 'a week ago';
  return `${days} days ago`;
}
