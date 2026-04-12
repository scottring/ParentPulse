'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { JournalEntry } from '@/types/journal';

interface UseJournalEntryReturn {
  entry: JournalEntry | null;
  loading: boolean;
  // `notFound` is true when the snapshot confirmed the doc doesn't
  // exist. Distinct from `loading` (still waiting) and `error`
  // (listener failed, could be permission).
  notFound: boolean;
  error: string | null;
}

// Live single-entry subscription. Firestore security rules gate the
// read via visibleToUserIds (see project_journal_visibility_model.md)
// so a listener on a forbidden entry surfaces as an error, not a
// silent empty result.
export function useJournalEntry(
  entryId: string | null | undefined,
): UseJournalEntryReturn {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(entryId));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) return;

    const ref = doc(firestore, 'journal_entries', entryId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEntry(null);
          setNotFound(true);
          setLoading(false);
          return;
        }
        setEntry({
          ...(snap.data() as Omit<JournalEntry, 'entryId'>),
          entryId: snap.id,
        } as JournalEntry);
        setNotFound(false);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Journal entry listener error:', err);
        setError('Failed to load entry');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [entryId]);

  return { entry, loading, notFound, error };
}
