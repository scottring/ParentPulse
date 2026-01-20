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
import { httpsCallable } from 'firebase/functions';
import { firestore as db, functions } from '@/lib/firebase';
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
  regenerating: boolean;
  createWorkbook: (personId: string, personName: string, manualId: string, parentGoals: ParentBehaviorGoal[], dailyActivities: DailyActivity[]) => Promise<WeeklyWorkbook>;
  updateWorkbook: (workbookId: string, updates: Partial<WeeklyWorkbook>) => Promise<void>;

  // Parent goal management
  logGoalCompletion: (workbookId: string, goalId: string, completed: boolean, notes?: string) => Promise<void>;

  // Activity management
  completeActivity: (workbookId: string, activityId: string, childResponse: any, parentNotes?: string) => Promise<void>;
  regenerateActivities: (workbookId: string, personName: string, relationshipType: string, personAge: number | undefined, triggers: any[], whatWorks: any[], boundaries: any[], assessmentScores: any, coreInfo: any) => Promise<void>;

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
  const [regenerating, setRegenerating] = useState(false);

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
        const goalCompletion: any = {
          date: Timestamp.now(),
          completed,
          addedBy: user.userId
        };

        // Only add notes if it has a value
        if (notes !== undefined && notes !== null && notes.trim()) {
          goalCompletion.notes = notes;
        }

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
        // Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
        const removeUndefined = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (Array.isArray(obj)) return obj.map(removeUndefined);
          if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
              const value = obj[key];
              if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
              }
            }
            return cleaned;
          }
          return obj;
        };

        const updatedActivities = workbook.dailyActivities.map(activity => {
          if (activity.id === activityId) {
            const updatedActivity: any = {
              ...activity,
              completed: true,
              childResponse: removeUndefined(childResponse), // Clean undefined from response
              recordedBy: user.userId
            };

            // Only add parentNotes if it has a value
            if (parentNotes !== undefined && parentNotes !== null && parentNotes.trim()) {
              updatedActivity.parentNotes = parentNotes;
            }

            return updatedActivity;
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

  // Regenerate activities
  const regenerateActivities = useCallback(
    async (
      workbookId: string,
      personName: string,
      relationshipType: string,
      personAge: number | undefined,
      triggers: any[],
      whatWorks: any[],
      boundaries: any[],
      assessmentScores: any,
      coreInfo: any
    ) => {
      if (!user || !workbook) throw new Error('User not authenticated or workbook not loaded');

      setRegenerating(true);

      try {
        // Call Cloud Function to regenerate activities
        const regenerateActivitiesFunction = httpsCallable(functions, 'regenerateWorkbookActivities');

        const result = await regenerateActivitiesFunction({
          personName,
          relationshipType,
          personAge,
          triggers,
          whatWorks,
          boundaries,
          assessmentScores,
          coreInfo
        });

        const data = result.data as any;

        if (!data.success || !data.activities) {
          throw new Error(data.error || 'Failed to regenerate activities');
        }

        // Keep completed activities, replace uncompleted ones with new activities
        const completedActivities = workbook.dailyActivities.filter(a => a.completed);
        const newActivities: DailyActivity[] = data.activities.map((activity: any, index: number) => ({
          id: `activity-${Date.now()}-${index}`,
          type: activity.type,
          suggestedTime: activity.suggestedTime,
          customization: activity.customization,
          completed: false
        }));

        // Combine: completed activities first, then new uncompleted activities
        const updatedActivities = [...completedActivities, ...newActivities];

        // Update workbook with new activities
        await updateWorkbook(workbookId, { dailyActivities: updatedActivities });

      } catch (err) {
        console.error('Error regenerating activities:', err);
        throw new Error(err instanceof Error ? err.message : 'Failed to regenerate activities');
      } finally {
        setRegenerating(false);
      }
    },
    [user, workbook, updateWorkbook]
  );

  return {
    workbook,
    loading,
    error,
    regenerating,
    createWorkbook,
    updateWorkbook,
    logGoalCompletion,
    completeActivity,
    regenerateActivities,
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
