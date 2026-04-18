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
}

// Live list of entries whose respondsToEntryId === parentEntryId,
// ordered oldest → newest so the page reads like a conversation.
// Read gating still happens in Firestore rules: the caller only
// sees responses they have visibleToUserIds access to.
export function useEntryResponses(
  parentEntryId: string,
): UseEntryResponsesReturn {
  const { user } = useAuth();
  const [responses, setResponses] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(parentEntryId));

  useEffect(() => {
    if (!parentEntryId || !user?.familyId) {
      setResponses([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(firestore, 'journal_entries'),
      where('respondsToEntryId', '==', parentEntryId),
      orderBy('createdAt', 'asc'),
    );
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        ...(d.data() as JournalEntry),
        entryId: d.id,
      }));
      setResponses(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [parentEntryId, user?.familyId]);

  return { responses, loading };
}
