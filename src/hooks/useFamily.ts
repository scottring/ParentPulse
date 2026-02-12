import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { Family } from '@/types/user';

interface UseFamilyReturn {
  family: Family | null;
  loading: boolean;
}

export function useFamily(): UseFamilyReturn {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setFamily(null);
      setLoading(false);
      return;
    }

    const familyRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);
    const unsubscribe = onSnapshot(familyRef, (snapshot) => {
      if (snapshot.exists()) {
        setFamily(snapshot.data() as Family);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId]);

  return { family, loading };
}
