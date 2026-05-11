'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

export interface UseUnspokenEntriesReturn {
  entries: JournalEntry[];
  loading: boolean;
  error: Error | null;
}

const COLLECTION = 'journal_entries';

/**
 * Subscribe to unspoken journal entries visible to the current user.
 * Returns entries marked with `unspoken=true`, newest first.
 */
export function useUnspokenEntries(max = 30): UseUnspokenEntriesReturn {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(firestore, COLLECTION);
    const q = query(
      col,
      where('unspoken', '==', true),
      where('visibleToUserIds', 'array-contains', user.userId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ ...(d.data() as JournalEntry), entryId: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('useUnspokenEntries:', err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.userId, max]);

  return { entries, loading, error };
}
