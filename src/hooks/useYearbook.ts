import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { Yearbook } from '@/types/yearbook';

interface UseYearbookReturn {
  yearbooks: Yearbook[];
  loading: boolean;
  error: string | null;
  getYearbook: (yearbookId: string) => Yearbook | undefined;
  getYearbookForPerson: (personId: string, year?: number) => Yearbook | undefined;
  createYearbook: (personId: string, year?: number) => Promise<string>;
  getOrCreateYearbook: (personId: string) => Promise<string>;
}

export function useYearbook(): UseYearbookReturn {
  const { user } = useAuth();
  const [yearbooks, setYearbooks] = useState<Yearbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setYearbooks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, COLLECTIONS.YEARBOOKS),
      where('familyId', '==', user.familyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as Yearbook);
      setYearbooks(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to yearbooks:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId]);

  const getYearbook = useCallback((yearbookId: string) => {
    return yearbooks.find(y => y.yearbookId === yearbookId);
  }, [yearbooks]);

  const getYearbookForPerson = useCallback((personId: string, year?: number) => {
    const targetYear = year || new Date().getFullYear();
    return yearbooks.find(y => y.personId === personId && y.year === targetYear);
  }, [yearbooks]);

  const createYearbook = useCallback(async (personId: string, year?: number): Promise<string> => {
    if (!user) throw new Error('No user');

    const targetYear = year || new Date().getFullYear();
    const yearbookRef = doc(collection(firestore, COLLECTIONS.YEARBOOKS));
    const yearbook: Yearbook = {
      yearbookId: yearbookRef.id,
      familyId: user.familyId,
      personId,
      year: targetYear,
      chapters: [],
      createdAt: serverTimestamp() as any,
    };

    await setDoc(yearbookRef, yearbook);
    return yearbookRef.id;
  }, [user]);

  const getOrCreateYearbook = useCallback(async (personId: string): Promise<string> => {
    const existing = getYearbookForPerson(personId);
    if (existing) return existing.yearbookId;
    return createYearbook(personId);
  }, [getYearbookForPerson, createYearbook]);

  return {
    yearbooks,
    loading,
    error,
    getYearbook,
    getYearbookForPerson,
    createYearbook,
    getOrCreateYearbook,
  };
}
