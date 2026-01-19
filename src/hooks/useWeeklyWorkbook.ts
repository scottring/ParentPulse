/**
 * useWeeklyWorkbook Hook - Phase 1 (Simplified)
 *
 * Manages weekly workbook CRUD operations for parent-driven goals
 * and tablet-friendly interactive activities.
 *
 * Features:
 * - Fetch active workbook for a person
 * - Create new workbook
 * - Update parent goals and activities
 * - Complete workbook with reflection
 * - Real-time subscription
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  arrayUnion
} from 'firebase/firestore';
import { firestore as db } from '@/lib/firebase';
import {
  WeeklyWorkbook,
  ParentBehaviorGoal,
  GoalCompletion,
  DailyActivity,
  WeeklyReflection,
  WORKBOOK_COLLECTIONS,
  getWeekStart,
  getWeekEnd,
  getWeekNumber
} from '@/types/workbook';
import { useAuth } from '@/context/AuthContext';

interface UseWeeklyWorkbookResult {
  workbook: WeeklyWorkbook | null;
  loading: boolean;
  error: string | null;
  createWorkbook: (personId: string, personName: string, manualId: string, parentGoals: ParentBehaviorGoal[], dailyActivities: DailyActivity[]) => Promise<WeeklyWorkbook>;
  updateWorkbook: (workbookId: string, updates: Partial<WeeklyWorkbook>) => Promise<void>;

  // Parent goal management
  logGoalCompletion: (workbookId: string, goalId: string, completed: boolean, notes?: string) => Promise<void>;

  // Activity management
  completeActivity: (workbookId: string, activityId: string, childResponse: any, parentNotes?: string) => Promise<void>;

  // Weekly reflection
  saveReflection: (workbookId: string, reflection: WeeklyReflection) => Promise<void>;
  completeWorkbook: (workbookId: string) => Promise<void>;

  refresh: () => Promise<void>;
}

/**
 * Hook to manage weekly workbook for a specific person
 */
export function useWeeklyWorkbook(personId: string | null): UseWeeklyWorkbookResult {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<WeeklyWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch active workbook for person
  const fetchActiveWorkbook = useCallback(async () => {
    if (!personId || !user) {
      setWorkbook(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();

      // Query for active workbook in current week
      const q = query(
        collection(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS),
        where('personId', '==', personId),
        where('familyId', '==', user.familyId),
        where('status', '==', 'active'),
        where('startDate', '>=', Timestamp.fromDate(weekStart)),
        where('startDate', '<=', Timestamp.fromDate(weekEnd)),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as WeeklyWorkbook;
        setWorkbook({ ...data, workbookId: snapshot.docs[0].id });
      } else {
        setWorkbook(null);
      }
    } catch (err) {
      console.error('Error fetching workbook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workbook');
      setWorkbook(null);
    } finally {
      setLoading(false);
    }
  }, [personId, user]);

  // Real-time subscription to workbook changes
  useEffect(() => {
    if (!personId || !user) {
      setWorkbook(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS),
      where('personId', '==', personId),
      where('familyId', '==', user.familyId),
      where('status', '==', 'active'),
      where('startDate', '>=', Timestamp.fromDate(weekStart)),
      where('startDate', '<=', Timestamp.fromDate(weekEnd)),
      limit(1)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as WeeklyWorkbook;
          setWorkbook({ ...data, workbookId: snapshot.docs[0].id });
        } else {
          setWorkbook(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error in workbook subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [personId, user]);

  // Create new workbook
  const createWorkbook = useCallback(
    async (
      personId: string,
      personName: string,
      manualId: string,
      parentGoals: ParentBehaviorGoal[],
      dailyActivities: DailyActivity[]
    ): Promise<WeeklyWorkbook> => {
      if (!user) throw new Error('User not authenticated');

      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();
      const weekNumber = getWeekNumber();

      const newWorkbook: Omit<WeeklyWorkbook, 'workbookId'> = {
        familyId: user.familyId,
        personId,
        personName,
        manualId,
        startDate: Timestamp.fromDate(weekStart),
        endDate: Timestamp.fromDate(weekEnd),
        weekNumber,
        status: 'active',
        parentGoals,
        dailyActivities,
        createdAt: Timestamp.now(),
        generatedBy: 'ai'
      };

      try {
        const docRef = await addDoc(
          collection(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS),
          newWorkbook
        );

        const createdWorkbook: WeeklyWorkbook = {
          ...newWorkbook,
          workbookId: docRef.id
        };

        setWorkbook(createdWorkbook);
        return createdWorkbook;
      } catch (err) {
        console.error('Error creating workbook:', err);
        throw new Error('Failed to create workbook');
      }
    },
    [user]
  );

  // Update workbook
  const updateWorkbook = useCallback(
    async (workbookId: string, updates: Partial<WeeklyWorkbook>) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const workbookRef = doc(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS, workbookId);

        await updateDoc(workbookRef, updates);

        // Optimistic update
        if (workbook && workbook.workbookId === workbookId) {
          setWorkbook({ ...workbook, ...updates });
        }
      } catch (err) {
        console.error('Error updating workbook:', err);
        throw new Error('Failed to update workbook');
      }
    },
    [user, workbook]
  );

  // Log goal completion
  const logGoalCompletion = useCallback(
    async (workbookId: string, goalId: string, completed: boolean, notes?: string) => {
      if (!user || !workbook) throw new Error('User not authenticated or workbook not loaded');

      try {
        const goalCompletion: GoalCompletion = {
          date: Timestamp.now(),
          completed,
          notes,
          addedBy: user.userId
        };

        const updatedGoals = workbook.parentGoals.map(goal => {
          if (goal.id === goalId) {
            return {
              ...goal,
              completionLog: [...goal.completionLog, goalCompletion]
            };
          }
          return goal;
        });

        await updateWorkbook(workbookId, { parentGoals: updatedGoals });
      } catch (err) {
        console.error('Error logging goal completion:', err);
        throw new Error('Failed to log goal completion');
      }
    },
    [user, workbook, updateWorkbook]
  );

  // Complete activity
  const completeActivity = useCallback(
    async (workbookId: string, activityId: string, childResponse: any, parentNotes?: string) => {
      if (!user || !workbook) throw new Error('User not authenticated or workbook not loaded');

      try {
        const updatedActivities = workbook.dailyActivities.map(activity => {
          if (activity.id === activityId) {
            return {
              ...activity,
              completed: true,
              childResponse,
              parentNotes,
              recordedBy: user.userId
            };
          }
          return activity;
        });

        await updateWorkbook(workbookId, { dailyActivities: updatedActivities });
      } catch (err) {
        console.error('Error completing activity:', err);
        throw new Error('Failed to complete activity');
      }
    },
    [user, workbook, updateWorkbook]
  );

  // Save weekly reflection
  const saveReflection = useCallback(
    async (workbookId: string, reflection: WeeklyReflection) => {
      if (!user) throw new Error('User not authenticated');

      try {
        await updateWorkbook(workbookId, { weeklyReflection: reflection });
      } catch (err) {
        console.error('Error saving reflection:', err);
        throw new Error('Failed to save reflection');
      }
    },
    [user, updateWorkbook]
  );

  // Complete workbook
  const completeWorkbook = useCallback(
    async (workbookId: string) => {
      if (!user) throw new Error('User not authenticated');

      try {
        await updateWorkbook(workbookId, { status: 'completed' });
        setWorkbook(null);
      } catch (err) {
        console.error('Error completing workbook:', err);
        throw new Error('Failed to complete workbook');
      }
    },
    [user, updateWorkbook]
  );

  return {
    workbook,
    loading,
    error,
    createWorkbook,
    updateWorkbook,
    logGoalCompletion,
    completeActivity,
    saveReflection,
    completeWorkbook,
    refresh: fetchActiveWorkbook
  };
}

/**
 * Hook to fetch all active workbooks for the family
 */
export function useActiveWorkbooks() {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<WeeklyWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setWorkbooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS),
      where('familyId', '==', user.familyId),
      where('status', '==', 'active'),
      where('startDate', '>=', Timestamp.fromDate(weekStart)),
      where('startDate', '<=', Timestamp.fromDate(weekEnd))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const workbooksData = snapshot.docs.map(doc => ({
          ...doc.data(),
          workbookId: doc.id
        })) as WeeklyWorkbook[];

        setWorkbooks(workbooksData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching active workbooks:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { workbooks, loading, error };
}

/**
 * Hook to fetch workbook history for a person
 */
export function useWorkbookHistory(personId: string | null, weekCount: number = 4) {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<WeeklyWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId || !user) {
      setWorkbooks([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);

      try {
        const q = query(
          collection(db, WORKBOOK_COLLECTIONS.WEEKLY_WORKBOOKS),
          where('personId', '==', personId),
          where('familyId', '==', user.familyId),
          orderBy('startDate', 'desc'),
          limit(weekCount)
        );

        const snapshot = await getDocs(q);
        const workbooksData = snapshot.docs.map(doc => ({
          ...doc.data(),
          workbookId: doc.id
        })) as WeeklyWorkbook[];

        setWorkbooks(workbooksData);
        setError(null);
      } catch (err) {
        console.error('Error fetching workbook history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch workbook history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [personId, user, weekCount]);

  return { workbooks, loading, error };
}
