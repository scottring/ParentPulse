/**
 * Hook for managing ParentWorkbook CRUD operations
 *
 * Provides real-time subscription to parent workbook data
 * and methods for updating goals, strategies, and reflections
 */

import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ParentWorkbook,
  GoalCompletion,
  ParentWeeklyReflection,
} from '@/types/parent-workbook';

interface UseParentWorkbookResult {
  workbook: ParentWorkbook | null;
  loading: boolean;
  error: string | null;
  logGoalCompletion: (goalId: string, completed: boolean, notes?: string) => Promise<void>;
  logDailyStrategyCompletion: (dayNumber: number, completed: boolean, notes?: string) => Promise<void>;
  saveWeeklyReflection: (reflection: Omit<ParentWeeklyReflection, 'completedAt' | 'completedBy'>) => Promise<void>;
  completeWorkbook: () => Promise<void>;
  refreshWorkbook: () => Promise<void>;
}

/**
 * Get active parent workbook for a specific person
 */
export function useParentWorkbook(personId: string): UseParentWorkbookResult {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<ParentWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkbook = async () => {
    if (!user?.familyId || !personId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query for active parent workbook
      const workbooksRef = collection(firestore, 'parent_workbooks');
      const q = query(
        workbooksRef,
        where('familyId', '==', user.familyId),
        where('personId', '==', personId),
        where('status', '==', 'active'),
        orderBy('startDate', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const workbookData = snapshot.docs[0].data() as ParentWorkbook;
        setWorkbook(workbookData);
      } else {
        setWorkbook(null);
      }
    } catch (err) {
      console.error('Error fetching parent workbook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbook();
  }, [user?.familyId, personId]);

  /**
   * Log parent goal completion
   */
  const logGoalCompletion = async (
    goalId: string,
    completed: boolean,
    notes?: string
  ): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    const workbookRef = doc(firestore, 'parent_workbooks', workbook.workbookId);

    // Find the goal
    const goalIndex = workbook.parentGoals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    // Create completion log entry
    const completion: GoalCompletion = {
      date: Timestamp.now(),
      completed: completed,
      notes: notes || null,
      addedBy: user.userId,
    };

    // Update goal's completion log
    const updatedGoals = [...workbook.parentGoals];
    updatedGoals[goalIndex] = {
      ...updatedGoals[goalIndex],
      completionLog: [...updatedGoals[goalIndex].completionLog, completion],
    };

    await updateDoc(workbookRef, {
      parentGoals: updatedGoals,
      updatedAt: Timestamp.now(),
      lastEditedBy: user.userId,
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  /**
   * Log daily parenting strategy completion
   */
  const logDailyStrategyCompletion = async (
    dayNumber: number,
    completed: boolean,
    notes?: string
  ): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    const workbookRef = doc(firestore, 'parent_workbooks', workbook.workbookId);

    // Find the strategy for this day
    const strategyIndex = workbook.dailyStrategies.findIndex((s) => s.dayNumber === dayNumber);
    if (strategyIndex === -1) {
      throw new Error('Daily strategy not found');
    }

    // Update strategy completion
    const updatedStrategies = [...workbook.dailyStrategies];
    updatedStrategies[strategyIndex] = {
      ...updatedStrategies[strategyIndex],
      completed: completed,
      completedAt: completed ? Timestamp.now() : null,
      notes: notes || null,
    };

    await updateDoc(workbookRef, {
      dailyStrategies: updatedStrategies,
      updatedAt: Timestamp.now(),
      lastEditedBy: user.userId,
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  /**
   * Save weekly reflection (end of week)
   */
  const saveWeeklyReflection = async (
    reflection: Omit<ParentWeeklyReflection, 'completedAt' | 'completedBy'>
  ): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    const workbookRef = doc(firestore, 'parent_workbooks', workbook.workbookId);

    const fullReflection: ParentWeeklyReflection = {
      ...reflection,
      completedAt: Timestamp.now(),
      completedBy: user.userId,
    };

    await updateDoc(workbookRef, {
      weeklyReflection: fullReflection,
      updatedAt: Timestamp.now(),
      lastEditedBy: user.userId,
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  /**
   * Mark workbook as completed
   */
  const completeWorkbook = async (): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    const workbookRef = doc(firestore, 'parent_workbooks', workbook.workbookId);

    await updateDoc(workbookRef, {
      status: 'completed',
      updatedAt: Timestamp.now(),
      lastEditedBy: user.userId,
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  return {
    workbook,
    loading,
    error,
    logGoalCompletion,
    logDailyStrategyCompletion,
    saveWeeklyReflection,
    completeWorkbook,
    refreshWorkbook: fetchWorkbook,
  };
}

/**
 * Get all active parent workbooks for the family
 */
export function useActiveParentWorkbooks() {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<ParentWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchWorkbooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const workbooksRef = collection(firestore, 'parent_workbooks');
        const q = query(
          workbooksRef,
          where('familyId', '==', user.familyId),
          where('status', '==', 'active'),
          orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const workbooksData = snapshot.docs.map((doc) => doc.data() as ParentWorkbook);

        setWorkbooks(workbooksData);
      } catch (err) {
        console.error('Error fetching active workbooks:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch workbooks');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkbooks();
  }, [user?.familyId]);

  return { workbooks, loading, error };
}

/**
 * Get parent workbook history for a specific person
 */
export function useParentWorkbookHistory(personId: string, weekCount: number = 4) {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<ParentWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId || !personId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const workbooksRef = collection(firestore, 'parent_workbooks');
        const q = query(
          workbooksRef,
          where('familyId', '==', user.familyId),
          where('personId', '==', personId),
          orderBy('startDate', 'desc'),
          limit(weekCount)
        );

        const snapshot = await getDocs(q);
        const workbooksData = snapshot.docs.map((doc) => doc.data() as ParentWorkbook);

        setWorkbooks(workbooksData);
      } catch (err) {
        console.error('Error fetching workbook history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.familyId, personId, weekCount]);

  return { workbooks, loading, error };
}
