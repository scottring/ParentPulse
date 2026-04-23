'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { THERAPY_BRIEFS_COLLECTION, type TherapyBrief } from '@/types/therapy';

export interface UseTherapyBriefsReturn {
  briefs: TherapyBrief[];
  loading: boolean;
  error: Error | null;
}

// Lists therapy briefs owned by the current user, newest first.
// Live subscription so a newly-generated brief shows up immediately.
export function useTherapyBriefs(): UseTherapyBriefsReturn {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<TherapyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      setBriefs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Intentionally no orderBy — that would require a composite
    // (userId, generatedAt) index. Per-user brief counts are small,
    // so we sort client-side below.
    const q = query(
      collection(firestore, THERAPY_BRIEFS_COLLECTION),
      where('userId', '==', userId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(
          (d) => ({ ...(d.data() as TherapyBrief), briefId: d.id }),
        );
        docs.sort((a, b) => {
          const am = a.generatedAt?.toMillis?.() ?? 0;
          const bm = b.generatedAt?.toMillis?.() ?? 0;
          return bm - am;
        });
        setBriefs(docs);
        setLoading(false);
      },
      (err) => {
        console.error('useTherapyBriefs:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.userId]);

  return { briefs, loading, error };
}
