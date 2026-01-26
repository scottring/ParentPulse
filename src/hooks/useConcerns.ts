'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { Concern, ConcernUrgency } from '@/types/household-workbook';

interface UseConcernsReturn {
  concerns: Concern[];
  activeConcerns: Concern[];
  loading: boolean;
  error: string | null;
  // CRUD operations
  addConcern: (concern: Omit<Concern, 'concernId' | 'familyId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateConcern: (concernId: string, updates: Partial<Concern>) => Promise<void>;
  dismissConcern: (concernId: string) => Promise<void>;
  markAddressed: (concernId: string, workbookId?: string) => Promise<void>;
  deleteConcern: (concernId: string) => Promise<void>;
  // Filtering helpers
  getConcernsByUrgency: (urgency: ConcernUrgency) => Concern[];
  getConcernsByPerson: (personId: string) => Concern[];
}

export function useConcerns(familyId: string | undefined): UseConcernsReturn {
  const { user } = useAuth();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to concerns for this family
  useEffect(() => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const concernsQuery = query(
      collection(firestore, COLLECTIONS.CONCERNS),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      concernsQuery,
      (snapshot) => {
        const concernsData = snapshot.docs.map((doc) => doc.data() as Concern);
        setConcerns(concernsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching concerns:', err);
        setError('Failed to load concerns');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, familyId]);

  // Add a new concern
  const addConcern = useCallback(
    async (
      concernData: Omit<Concern, 'concernId' | 'familyId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>
    ): Promise<string> => {
      if (!user || !familyId) throw new Error('Must be signed in');

      const concernId = `concern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      const newConcern: Concern = {
        ...concernData,
        concernId,
        familyId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: user.userId,
      };

      const docRef = doc(firestore, COLLECTIONS.CONCERNS, concernId);
      await setDoc(docRef, newConcern);

      return concernId;
    },
    [user, familyId]
  );

  // Update a concern
  const updateConcern = useCallback(
    async (concernId: string, updates: Partial<Concern>) => {
      if (!user) throw new Error('Must be signed in');

      const docRef = doc(firestore, COLLECTIONS.CONCERNS, concernId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    },
    [user]
  );

  // Dismiss a concern (don't want to address it)
  const dismissConcern = useCallback(
    async (concernId: string) => {
      await updateConcern(concernId, { status: 'dismissed' });
    },
    [updateConcern]
  );

  // Mark concern as addressed (became a focus or resolved)
  const markAddressed = useCallback(
    async (concernId: string, workbookId?: string) => {
      await updateConcern(concernId, {
        status: 'addressed',
        addressedAt: Timestamp.now(),
        addressedInWorkbookId: workbookId,
      });
    },
    [updateConcern]
  );

  // Delete a concern completely
  const deleteConcern = useCallback(
    async (concernId: string) => {
      if (!user) throw new Error('Must be signed in');

      const docRef = doc(firestore, COLLECTIONS.CONCERNS, concernId);
      await deleteDoc(docRef);
    },
    [user]
  );

  // Get only active concerns
  const activeConcerns = concerns.filter((c) => c.status === 'active');

  // Filter by urgency
  const getConcernsByUrgency = useCallback(
    (urgency: ConcernUrgency) => {
      return activeConcerns.filter((c) => c.urgency === urgency);
    },
    [activeConcerns]
  );

  // Filter by person involved
  const getConcernsByPerson = useCallback(
    (personId: string) => {
      return activeConcerns.filter((c) => c.involvedPersonIds.includes(personId));
    },
    [activeConcerns]
  );

  return {
    concerns,
    activeConcerns,
    loading,
    error,
    addConcern,
    updateConcern,
    dismissConcern,
    markAddressed,
    deleteConcern,
    getConcernsByUrgency,
    getConcernsByPerson,
  };
}

export default useConcerns;
