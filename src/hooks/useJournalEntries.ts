'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';
import {
  hasRunJournalVisibilityMigration,
  runJournalVisibilityMigration,
} from '@/lib/migrations/journal-visibility';

interface UseJournalEntriesReturn {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
}

// Live chronological feed of journal entries visible to the current
// user, newest first. Uses the denormalized `visibleToUserIds` field
// via array-contains so Firestore rules and queries both enforce the
// per-person sharing model without post-filtering.
//
// On first mount per family, runs a one-shot migration that backfills
// `visibleToUserIds` on legacy entries (written before sharing
// existed). The migration is idempotent and only touches entries
// authored by the current user — the only entries Firestore rules
// allow this user to update. For single-author families the result
// is full backfill; for multi-author families, each author backfills
// their own entries on their next visit.
export function useJournalEntries(): UseJournalEntriesReturn {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const familyId = user?.familyId;
    const userId = user?.userId;
    if (!familyId || !userId) return;

    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (cancelled) return;
      const q = query(
        collection(firestore, 'journal_entries'),
        where('familyId', '==', familyId),
        where('visibleToUserIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const rows: JournalEntry[] = snapshot.docs.map(
            (docSnap) =>
              ({
                ...(docSnap.data() as Omit<JournalEntry, 'entryId'>),
                entryId: docSnap.id,
              }) as JournalEntry,
          );
          setEntries(rows);
          setError(null);
        },
        (err) => {
          console.error('Journal entries listener error:', err);
          setError('Failed to load journal');
          setEntries([]);
        },
      );
    };

    const init = async () => {
      // Run the one-shot backfill if we haven't already for this
      // family. Idempotent and gated per-family via localStorage.
      if (!hasRunJournalVisibilityMigration(familyId)) {
        try {
          await runJournalVisibilityMigration(familyId, userId);
        } catch (err) {
          // Don't block the page on a migration failure — subscribe
          // anyway. Unmigrated entries will simply not match the
          // array-contains query until the author triggers another
          // visit. Surface the error so it's visible in devtools.
          console.error('Journal visibility migration failed:', err);
        }
      }
      subscribe();
    };

    void init();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.familyId, user?.userId]);

  const loading = Boolean(user?.familyId) && entries === null;

  return {
    entries: entries ?? [],
    loading,
    error,
  };
}
