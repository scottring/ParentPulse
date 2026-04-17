'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { findSpouseUserId } from '@/lib/rituals/spouseDetection';

interface SpouseState {
  spouseUserId: string | null;
  spouseName: string | null;
  loading: boolean;
}

export function useSpouse(): SpouseState {
  const { user } = useAuth();
  const [state, setState] = useState<SpouseState>({
    spouseUserId: null, spouseName: null, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user?.userId || !user.familyId) {
      setState({ spouseUserId: null, spouseName: null, loading: false });
      return;
    }
    (async () => {
      const id = await findSpouseUserId(user.familyId!, user.userId);
      if (cancelled) return;
      if (!id) {
        setState({ spouseUserId: null, spouseName: null, loading: false });
        return;
      }
      const snap = await getDoc(doc(firestore, 'users', id));
      if (cancelled) return;
      const name = (snap.data()?.name as string | undefined)
        ?? (snap.data()?.email as string | undefined)
        ?? 'your partner';
      setState({ spouseUserId: id, spouseName: name, loading: false });
    })();
    return () => { cancelled = true; };
  }, [user?.userId, user?.familyId]);

  return state;
}
