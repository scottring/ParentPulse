'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
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
// Privacy: entries with no sharedWithUserIds (private-to-self) are
// excluded. The dashboard frame is read-as-public-feeling — even
// surfacing your OWN private entries here feels like broadcast. The
// journal stream is the right place for those.
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

    const unsub = onSnapshot(
      q,
      (snap) => {
        const candidates: JournalEntry[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<JournalEntry, 'entryId'>),
          entryId: d.id,
        } as JournalEntry));

        // Drop private-to-self entries — even the author's own private
        // writing shouldn't surface in this dashboard frame.
        const visible = candidates.filter((e) => !isPrivateToSelf(e));

        // Filter to voices worth quoting: not reflections, not responses,
        // and a sentence-or-two length that reads as a memory.
        const quotable = visible
          .filter((e) => !e.respondsToEntryId)
          .filter((e) => e.category !== 'reflection')
          .filter((e) => {
            const len = (e.text ?? '').trim().length;
            return len >= 40 && len <= 280;
          });

        // Preference order:
        //   1. Year-ago window (±30 days) — pick deterministically by
        //      day-of-year so the slot rotates instead of freezing on
        //      one entry across visits.
        //   2. Older quotable entries — same day-of-year rotation so a
        //      young archive still rotates.
        //   3. Any oldest entry as a last resort (even if outside the
        //      quotable length range).
        const oneYearMs = 365 * 24 * 60 * 60 * 1000;
        const yearAgoMs = now.getTime() - oneYearMs;
        const windowMs = 30 * 24 * 60 * 60 * 1000;

        const yearAgoMatches = quotable.filter((e) => {
          const ms = e.createdAt?.toMillis?.() ?? 0;
          return Math.abs(ms - yearAgoMs) <= windowMs;
        });

        const dayIndex = dayOfYear(now);
        const pickFrom = (arr: JournalEntry[]) =>
          arr.length === 0 ? null : arr[dayIndex % arr.length];

        const pick =
          pickFrom(yearAgoMatches) ??
          pickFrom(quotable) ??
          (visible.length > 0 ? visible[visible.length - 1] : null);

        if (!pick) {
          setEntry(null);
          setAgeLabel(null);
          setLoading(false);
          return;
        }

        const pickedMs = pick.createdAt?.toMillis?.() ?? 0;
        setEntry(pick);
        setAgeLabel(labelForAge(now.getTime() - pickedMs));
        setLoading(false);
      },
      (err) => {
        console.warn('useMemoryOfTheDay: listener error', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user?.familyId, user?.userId]);

  return { entry, ageLabel, loading };
}

// A "private to self" entry has no sharing — only the author can see
// it. We respect both the new sharedWithUserIds model and the legacy
// isPrivate flag still present on older docs.
function isPrivateToSelf(e: JournalEntry): boolean {
  if (e.isPrivate) return true;
  return (e.sharedWithUserIds ?? []).length === 0;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
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
