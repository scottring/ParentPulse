'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
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
    const q = query(
      collection(firestore, THERAPY_BRIEFS_COLLECTION),
      where('userId', '==', userId),
      orderBy('generatedAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBriefs(
          snap.docs.map((d) => ({ ...(d.data() as TherapyBrief), briefId: d.id })),
        );
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
