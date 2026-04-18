'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

interface UseEntryResponsesReturn {
  responses: JournalEntry[];
  loading: boolean;
  error: string | null;
}

// Live list of entries whose respondsToEntryId === parentEntryId,
// ordered oldest → newest so the page reads like a conversation.
//
// The query MUST include the same `visibleToUserIds` constraint the
// rule enforces — otherwise the listener errors out (permission-
// denied) the moment a sibling response exists that the caller
// cannot read. See useJournalEntries for the same pattern.
export function useEntryResponses(
  parentEntryId: string,
): UseEntryResponsesReturn {
  const { user } = useAuth();
  const [responses, setResponses] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(parentEntryId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const familyId = user?.familyId;
    const userId = user?.userId;
    if (!parentEntryId || !familyId || !userId) {
      setResponses([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, 'journal_entries'),
      where('familyId', '==', familyId),
      where('respondsToEntryId', '==', parentEntryId),
      where('visibleToUserIds', 'array-contains', userId),
      orderBy('createdAt', 'asc'),
    );
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          ...(d.data() as JournalEntry),
          entryId: d.id,
        }));
        setResponses(rows);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[useEntryResponses] listener error', err);
        setError(err.message ?? 'Failed to load responses');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [parentEntryId, user?.familyId, user?.userId]);

  return { responses, loading, error };
}
