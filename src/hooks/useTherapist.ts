'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc, collection, onSnapshot, query, serverTimestamp, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Therapist } from '@/types/therapy';

export interface UseTherapistResult {
  loading: boolean;
  therapist: Therapist | null;
  error: Error | null;
  createTherapist: (displayName: string) => Promise<string>;
}

export function useTherapist(): UseTherapistResult {
  const { user } = useAuth();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(() => !!user?.userId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, 'therapists'),
      where('ownerUserId', '==', userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.docs.length === 0) {
        setTherapist(null);
      } else {
        const d = snap.docs[0];
        setTherapist({ id: d.id, ...(d.data() as Omit<Therapist, 'id'>) });
      }
      setLoading(false);
    }, (err) => { setError(err); setLoading(false); });
    return () => unsub();
  }, [user?.userId]);

  const createTherapist = useCallback(async (displayName: string): Promise<string> => {
    const userId = user?.userId;
    if (!userId) throw new Error('Not signed in');
    const ref = await addDoc(collection(firestore, 'therapists'), {
      ownerUserId: userId,
      displayName: displayName.trim(),
      kind: 'individual',
      createdAt: serverTimestamp(),
    });
    // Create the first open window
    await addDoc(collection(firestore, 'therapy_windows'), {
      therapistId: ref.id,
      ownerUserId: userId,
      status: 'open',
      openedAt: serverTimestamp(),
      themeIds: [],
      noteIds: [],
    });
    return ref.id;
  }, [user]);

  return { loading, therapist, error, createTherapist };
}
