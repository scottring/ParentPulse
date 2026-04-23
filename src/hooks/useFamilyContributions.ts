'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Contribution, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

export interface UseFamilyContributionsReturn {
  contributions: Contribution[];
  loading: boolean;
  error: Error | null;
}

/**
 * Live list of all Contribution documents across every manual in the
 * current user's family. Used by completeness visualisations that
 * need cross-family perspective coverage.
 */
export function useFamilyContributions(): UseFamilyContributionsReturn {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const familyId = user?.familyId;
    if (!familyId) {
      setContributions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
      where('familyId', '==', familyId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setContributions(
          snap.docs.map(
            (d) => ({ ...(d.data() as Contribution), contributionId: d.id }),
          ),
        );
        setLoading(false);
      },
      (err) => {
        console.error('useFamilyContributions:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.familyId]);

  return { contributions, loading, error };
}
