'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PersonManual, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

export interface UseFamilyManualsReturn {
  manuals: PersonManual[];
  loading: boolean;
  error: Error | null;
}

/**
 * Live list of all PersonManual documents in the current user's
 * family. Used by completeness visualisations that need every
 * manual at once (the Ring, the portrait matrix, etc.).
 */
export function useFamilyManuals(): UseFamilyManualsReturn {
  const { user } = useAuth();
  const [manuals, setManuals] = useState<PersonManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const familyId = user?.familyId;
    if (!familyId) {
      setManuals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
      where('familyId', '==', familyId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setManuals(
          snap.docs.map((d) => ({ ...(d.data() as PersonManual), manualId: d.id })),
        );
        setLoading(false);
      },
      (err) => {
        console.error('useFamilyManuals:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.familyId]);

  return { manuals, loading, error };
}
