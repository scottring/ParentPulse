'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

// Returns the set of reflection entries the current user can see
// that cite `entryId` in their reflectsOnEntryIds. Firestore can
// index only one array-contains per query, so the visibility
// post-filter runs client-side.
export function useReflectionsOfEntry(
  entryId: string | null | undefined,
): JournalEntry[] {
  const { user } = useAuth();
  const [results, setResults] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!entryId || !user?.familyId || !user?.userId) return;

    const q = query(
      collection(firestore, 'journal_entries'),
      where('familyId', '==', user.familyId),
      where('reflectsOnEntryIds', 'array-contains', entryId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: JournalEntry[] = snap.docs
          .map((d) => ({
            ...(d.data() as Omit<JournalEntry, 'entryId'>),
            entryId: d.id,
          } as JournalEntry))
          .filter((e) => e.visibleToUserIds?.includes(user.userId));
        setResults(arr);
      },
      (err) => {
        console.warn('useReflectionsOfEntry: listener error', err);
      },
    );

    return () => unsub();
  }, [entryId, user?.familyId, user?.userId]);

  return results;
}
