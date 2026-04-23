'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { THERAPY_BRIEFS_COLLECTION, type TherapyBrief } from '@/types/therapy';

export interface UseTherapyBriefReturn {
  brief: TherapyBrief | null;
  loading: boolean;
  error: Error | null;
  saveSessionNotes: (notes: string) => Promise<void>;
}

// Loads a single therapy brief with live updates. Exposes a
// saveSessionNotes helper for the post-session carryover field.
export function useTherapyBrief(briefId: string | null): UseTherapyBriefReturn {
  const [brief, setBrief] = useState<TherapyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!briefId) {
      setBrief(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(firestore, THERAPY_BRIEFS_COLLECTION, briefId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setBrief({ ...(snap.data() as TherapyBrief), briefId: snap.id });
        } else {
          setBrief(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('useTherapyBrief:', err);
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [briefId]);

  const saveSessionNotes = async (notes: string) => {
    if (!briefId) return;
    const ref = doc(firestore, THERAPY_BRIEFS_COLLECTION, briefId);
    await updateDoc(ref, {
      sessionNotes: notes,
      updatedAt: serverTimestamp(),
    });
  };

  return { brief, loading, error, saveSessionNotes };
}
