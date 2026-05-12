'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { CoupleRitual } from '@/types/couple-ritual';

export interface UseFamilyCheckInsReturn {
  checkIns: CoupleRitual[];
  loading: boolean;
}

const COLLECTION = 'couple_rituals';

/**
 * Subscribe to scheduled family check-ins (couple_rituals where
 * targetType='family-checkin') for the current user's family.
 */
export function useFamilyCheckIns(): UseFamilyCheckInsReturn {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CoupleRitual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setCheckIns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(firestore, COLLECTION);
    const q = query(
      col,
      where('familyId', '==', user.familyId),
      where('targetType', '==', 'family-checkin'),
      where('status', 'in', ['active', 'paused']),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCheckIns(snap.docs.map((d) => ({ ...(d.data() as CoupleRitual), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('useFamilyCheckIns:', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.familyId]);

  return { checkIns, loading };
}
