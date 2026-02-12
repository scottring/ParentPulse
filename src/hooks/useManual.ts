import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { Manual, ManualType, DomainUpdateSource } from '@/types/manual';
import type { DomainId } from '@/types/user';
import { emptyDomains } from '@/types/manual';

interface UseManualReturn {
  manuals: Manual[];
  loading: boolean;
  error: string | null;
  getManual: (manualId: string) => Manual | undefined;
  createManual: (type: ManualType, title: string, personId?: string) => Promise<string>;
  updateDomain: (manualId: string, domainId: DomainId, data: Record<string, unknown>, source?: DomainUpdateSource) => Promise<void>;
}

export function useManual(): UseManualReturn {
  const { user } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setManuals([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, COLLECTIONS.MANUALS),
      where('familyId', '==', user.familyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as Manual);
      setManuals(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to manuals:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId]);

  const getManual = useCallback((manualId: string) => {
    return manuals.find(m => m.manualId === manualId);
  }, [manuals]);

  const createManual = useCallback(async (type: ManualType, title: string, personId?: string): Promise<string> => {
    if (!user) throw new Error('No user');

    const manualRef = doc(collection(firestore, COLLECTIONS.MANUALS));
    const manual: Manual = {
      manualId: manualRef.id,
      familyId: user.familyId,
      type,
      title,
      personId,
      domains: emptyDomains,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(manualRef, manual);
    return manualRef.id;
  }, [user]);

  const updateDomain = useCallback(async (
    manualId: string,
    domainId: DomainId,
    data: Record<string, unknown>,
    source: DomainUpdateSource = 'manual-edit'
  ) => {
    const manualRef = doc(firestore, COLLECTIONS.MANUALS, manualId);
    await updateDoc(manualRef, {
      [`domains.${domainId}`]: data,
      [`domainMeta.${domainId}`]: {
        updatedAt: serverTimestamp(),
        updatedBy: source,
      },
      updatedAt: serverTimestamp(),
    });
  }, []);

  return {
    manuals,
    loading,
    error,
    getManual,
    createManual,
    updateDomain,
  };
}
