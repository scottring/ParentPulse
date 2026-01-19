/**
 * useWorkbookObservations Hook
 *
 * Manages workbook observations (casual notes and captures)
 * - Fetch observations for a workbook
 * - Create new observation
 * - Update observation
 * - Delete observation
 * - Real-time subscription
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { firestore as db } from '@/lib/firebase';
import {
  WorkbookObservation,
  WORKBOOK_COLLECTIONS
} from '@/types/workbook';
import { useAuth } from '@/context/AuthContext';

interface UseWorkbookObservationsResult {
  observations: WorkbookObservation[];
  loading: boolean;
  error: string | null;
  addObservation: (text: string, category?: WorkbookObservation['category'], tags?: string[]) => Promise<WorkbookObservation>;
  updateObservation: (observationId: string, updates: Partial<WorkbookObservation>) => Promise<void>;
  deleteObservation: (observationId: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook to manage observations for a specific workbook
 */
export function useWorkbookObservations(
  workbookId: string | null,
  familyId: string | null,
  personId: string | null,
  limitCount: number = 50
): UseWorkbookObservationsResult {
  const { user } = useAuth();
  const [observations, setObservations] = useState<WorkbookObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to observations
  useEffect(() => {
    if (!workbookId || !familyId) {
      setObservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS),
      where('workbookId', '==', workbookId),
      where('familyId', '==', familyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const observationsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          observationId: doc.id
        })) as WorkbookObservation[];

        setObservations(observationsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error in observations subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workbookId, familyId, limitCount]);

  // Add new observation
  const addObservation = useCallback(
    async (
      text: string,
      category?: WorkbookObservation['category'],
      tags?: string[]
    ): Promise<WorkbookObservation> => {
      if (!user || !workbookId || !familyId || !personId) {
        throw new Error('Missing required data to create observation');
      }

      const newObservation: Omit<WorkbookObservation, 'observationId'> = {
        workbookId,
        familyId,
        personId,
        text,
        timestamp: Timestamp.now(),
        category: category || 'neutral',
        tags: tags || [],
        aiAnalyzed: false,
        authorId: user.userId,
        authorName: user.name
      };

      try {
        const docRef = await addDoc(
          collection(db, WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS),
          newObservation
        );

        const createdObservation: WorkbookObservation = {
          ...newObservation,
          observationId: docRef.id
        };

        return createdObservation;
      } catch (err) {
        console.error('Error creating observation:', err);
        throw new Error('Failed to create observation');
      }
    },
    [user, workbookId, familyId, personId]
  );

  // Update observation
  const updateObservation = useCallback(
    async (observationId: string, updates: Partial<WorkbookObservation>) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const observationRef = doc(
          db,
          WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS,
          observationId
        );

        await updateDoc(observationRef, updates);

        // Optimistic update
        setObservations(prev =>
          prev.map(obs =>
            obs.observationId === observationId ? { ...obs, ...updates } : obs
          )
        );
      } catch (err) {
        console.error('Error updating observation:', err);
        throw new Error('Failed to update observation');
      }
    },
    [user]
  );

  // Delete observation
  const deleteObservation = useCallback(
    async (observationId: string) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const observationRef = doc(
          db,
          WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS,
          observationId
        );

        await deleteDoc(observationRef);

        // Optimistic update
        setObservations(prev =>
          prev.filter(obs => obs.observationId !== observationId)
        );
      } catch (err) {
        console.error('Error deleting observation:', err);
        throw new Error('Failed to delete observation');
      }
    },
    [user]
  );

  const refresh = useCallback(() => {
    // Trigger re-subscription by updating a dependency (no-op but forces refresh)
    setLoading(true);
  }, []);

  return {
    observations,
    loading,
    error,
    addObservation,
    updateObservation,
    deleteObservation,
    refresh
  };
}

/**
 * Hook to get recent observations across all workbooks for a person
 */
export function usePersonObservations(personId: string | null, limitCount: number = 20) {
  const { user } = useAuth();
  const [observations, setObservations] = useState<WorkbookObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId || !user) {
      setObservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS),
      where('personId', '==', personId),
      where('familyId', '==', user.familyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const observationsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          observationId: doc.id
        })) as WorkbookObservation[];

        setObservations(observationsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching person observations:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [personId, user, limitCount]);

  return { observations, loading, error };
}

/**
 * Hook to get promotable observations (AI-suggested for manual)
 */
export function usePromotableObservations(workbookId: string | null) {
  const { user } = useAuth();
  const [observations, setObservations] = useState<WorkbookObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workbookId || !user) {
      setObservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.WORKBOOK_OBSERVATIONS),
      where('workbookId', '==', workbookId),
      where('familyId', '==', user.familyId),
      where('aiSuggestions.promotable', '==', true),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const observationsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          observationId: doc.id
        })) as WorkbookObservation[];

        setObservations(observationsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching promotable observations:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workbookId, user]);

  return { observations, loading, error };
}
