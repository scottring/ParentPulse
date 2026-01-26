'use client';

import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  SpiderAssessment,
  LayerAssessment,
  RepairLog,
} from '@/types/assessment';
import { COLLECTIONS } from '@/types';

interface UseAssessmentV2Return {
  loading: boolean;
  error: string | null;

  // Create
  saveAssessment: (
    personId: string,
    manualId: string,
    layers: LayerAssessment[],
    weekId?: string,
    planId?: string
  ) => Promise<SpiderAssessment | null>;

  saveRepairLog: (repair: Omit<RepairLog, 'repairId' | 'createdAt'>) => Promise<RepairLog | null>;

  // Read
  getLatestAssessment: (personId: string) => Promise<SpiderAssessment | null>;
  getAssessmentHistory: (
    personId: string,
    limitCount?: number
  ) => Promise<SpiderAssessment[]>;
  getBaselineAssessment: (planId: string) => Promise<SpiderAssessment | null>;

  // Utilities
  clearError: () => void;
}

export function useAssessmentV2(): UseAssessmentV2Return {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Save a new spider assessment
   */
  const saveAssessment = useCallback(
    async (
      personId: string,
      manualId: string,
      layers: LayerAssessment[],
      weekId?: string,
      planId?: string
    ): Promise<SpiderAssessment | null> => {
      if (!user) {
        setError('Must be logged in to save assessment');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const assessmentData: Omit<SpiderAssessment, 'assessmentId'> = {
          personId,
          manualId,
          layers,
          weekId,
          planId,
          assessedAt: Timestamp.now(),
          assessedBy: user.userId,
        };

        const docRef = await addDoc(
          collection(firestore, COLLECTIONS.ASSESSMENTS),
          assessmentData
        );

        const assessment: SpiderAssessment = {
          ...assessmentData,
          assessmentId: docRef.id,
        };

        return assessment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save assessment';
        setError(message);
        console.error('Error saving assessment:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Save a repair log
   */
  const saveRepairLog = useCallback(
    async (
      repair: Omit<RepairLog, 'repairId' | 'createdAt'>
    ): Promise<RepairLog | null> => {
      if (!user) {
        setError('Must be logged in to save repair log');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const repairData = {
          ...repair,
          createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(
          collection(firestore, COLLECTIONS.REPAIR_LOGS),
          repairData
        );

        const repairLog: RepairLog = {
          ...repairData,
          repairId: docRef.id,
        };

        return repairLog;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save repair log';
        setError(message);
        console.error('Error saving repair log:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Get the most recent assessment for a person
   */
  const getLatestAssessment = useCallback(
    async (personId: string): Promise<SpiderAssessment | null> => {
      if (!user) {
        setError('Must be logged in to fetch assessment');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(firestore, COLLECTIONS.ASSESSMENTS),
          where('personId', '==', personId),
          orderBy('assessedAt', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return null;
        }

        const doc = snapshot.docs[0];
        return {
          assessmentId: doc.id,
          ...doc.data(),
        } as SpiderAssessment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch assessment';
        setError(message);
        console.error('Error fetching assessment:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Get assessment history for a person
   */
  const getAssessmentHistory = useCallback(
    async (personId: string, limitCount = 12): Promise<SpiderAssessment[]> => {
      if (!user) {
        setError('Must be logged in to fetch assessments');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(firestore, COLLECTIONS.ASSESSMENTS),
          where('personId', '==', personId),
          orderBy('assessedAt', 'desc'),
          limit(limitCount)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
          assessmentId: doc.id,
          ...doc.data(),
        })) as SpiderAssessment[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch assessments';
        setError(message);
        console.error('Error fetching assessments:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Get the baseline assessment for a goal/plan
   */
  const getBaselineAssessment = useCallback(
    async (planId: string): Promise<SpiderAssessment | null> => {
      if (!user) {
        setError('Must be logged in to fetch baseline');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(firestore, COLLECTIONS.ASSESSMENTS),
          where('planId', '==', planId),
          orderBy('assessedAt', 'asc'),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return null;
        }

        const doc = snapshot.docs[0];
        return {
          assessmentId: doc.id,
          ...doc.data(),
        } as SpiderAssessment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch baseline';
        setError(message);
        console.error('Error fetching baseline:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    loading,
    error,
    saveAssessment,
    saveRepairLog,
    getLatestAssessment,
    getAssessmentHistory,
    getBaselineAssessment,
    clearError,
  };
}
