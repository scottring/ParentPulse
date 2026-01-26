'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type {
  HouseholdWorkbook,
  HouseholdTask,
  DelegatedTask,
  HouseholdWeeklyFocus,
  HouseholdReflection,
  LayerId,
} from '@/types/household-workbook';

// ==================== Utility Functions ====================

function getWeekId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function getWeekDateRange(weekId: string): { startDate: string; endDate: string } {
  const [year, week] = weekId.split('-W').map(Number);
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 - firstDayOfYear.getDay() + 1;
  const startDate = new Date(year, 0, 1 + daysOffset);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// ==================== Household Workbook Hook ====================

interface UseHouseholdWorkbookReturn {
  workbook: HouseholdWorkbook | null;
  allWorkbooks: HouseholdWorkbook[];
  loading: boolean;
  error: string | null;
  currentWeekId: string;

  // Workbook operations
  createWorkbook: (weeklyFocus: HouseholdWeeklyFocus, journeyDay: number, milestone: HouseholdWorkbook['currentMilestone']) => Promise<string>;
  updateWorkbook: (updates: Partial<HouseholdWorkbook>) => Promise<void>;

  // Task operations
  addHouseholdTask: (task: Omit<HouseholdTask, 'taskId'>) => Promise<void>;
  toggleHouseholdTask: (taskId: string) => Promise<void>;
  addDelegatedTask: (personId: string, personName: string, task: Omit<DelegatedTask, 'taskId' | 'personId' | 'personName'>) => Promise<void>;
  toggleDelegatedTask: (personId: string, taskId: string) => Promise<void>;

  // Reflection
  submitReflection: (reflection: Omit<HouseholdReflection, 'completedAt' | 'completedBy'>) => Promise<void>;

  // Navigation
  loadWorkbook: (weekId: string) => Promise<void>;
  refreshWorkbook: () => Promise<void>;
}

export function useHouseholdWorkbook(familyId: string | undefined): UseHouseholdWorkbookReturn {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<HouseholdWorkbook | null>(null);
  const [allWorkbooks, setAllWorkbooks] = useState<HouseholdWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState(getWeekId());

  // Fetch workbook for a specific week
  const loadWorkbook = useCallback(
    async (weekId: string) => {
      if (!user || !familyId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentWeekId(weekId);

      try {
        const workbookId = `hw_${familyId}_${weekId}`;
        const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_WORKBOOKS, workbookId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setWorkbook(docSnap.data() as HouseholdWorkbook);
        } else {
          setWorkbook(null);
        }
      } catch (err) {
        console.error('Error fetching household workbook:', err);
        setError('Failed to load workbook');
      } finally {
        setLoading(false);
      }
    },
    [user, familyId]
  );

  // Fetch all workbooks for the family
  const fetchAllWorkbooks = useCallback(async () => {
    if (!user || !familyId) return;

    try {
      const workbooksQuery = query(
        collection(firestore, COLLECTIONS.HOUSEHOLD_WORKBOOKS),
        where('familyId', '==', familyId),
        orderBy('weekNumber', 'desc'),
        limit(12) // Last 12 weeks
      );
      const snapshot = await getDocs(workbooksQuery);
      setAllWorkbooks(snapshot.docs.map((d) => d.data() as HouseholdWorkbook));
    } catch (err) {
      console.error('Error fetching workbooks list:', err);
    }
  }, [user, familyId]);

  // Initial load
  useEffect(() => {
    loadWorkbook(getWeekId());
    fetchAllWorkbooks();
  }, [loadWorkbook, fetchAllWorkbooks]);

  // Create new workbook
  const createWorkbook = useCallback(
    async (
      weeklyFocus: HouseholdWeeklyFocus,
      journeyDay: number,
      milestone: HouseholdWorkbook['currentMilestone']
    ) => {
      if (!user || !familyId) throw new Error('Must be signed in');

      const weekId = getWeekId();
      const { startDate, endDate } = getWeekDateRange(weekId);
      const workbookId = `hw_${familyId}_${weekId}`;
      const now = Timestamp.now();

      // Calculate week number (simplified)
      const weekNumber = parseInt(weekId.split('-W')[1], 10);

      const newWorkbook: HouseholdWorkbook = {
        workbookId,
        familyId,
        weekId,
        weekNumber,
        startDate,
        endDate,
        currentMilestone: milestone,
        journeyDayNumber: journeyDay,
        weeklyFocus,
        householdTasks: [],
        delegatedTasks: [],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_WORKBOOKS, workbookId);
      await setDoc(docRef, newWorkbook);

      setWorkbook(newWorkbook);
      await fetchAllWorkbooks();

      return workbookId;
    },
    [user, familyId, fetchAllWorkbooks]
  );

  // Update workbook
  const updateWorkbook = useCallback(
    async (updates: Partial<HouseholdWorkbook>) => {
      if (!user || !workbook) throw new Error('Must be signed in with workbook loaded');

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_WORKBOOKS, workbook.workbookId);
      const fullUpdates = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, fullUpdates);
      setWorkbook({ ...workbook, ...fullUpdates } as HouseholdWorkbook);
    },
    [user, workbook]
  );

  // Add household task
  const addHouseholdTask = useCallback(
    async (task: Omit<HouseholdTask, 'taskId'>) => {
      if (!workbook) return;

      const newTask: HouseholdTask = {
        ...task,
        taskId: `ht_${Date.now()}`,
      };

      await updateWorkbook({
        householdTasks: [...workbook.householdTasks, newTask],
      });
    },
    [workbook, updateWorkbook]
  );

  // Toggle household task completion
  const toggleHouseholdTask = useCallback(
    async (taskId: string) => {
      if (!workbook || !user) return;

      const tasks = workbook.householdTasks.map((t) => {
        if (t.taskId === taskId) {
          return {
            ...t,
            isCompleted: !t.isCompleted,
            completedAt: !t.isCompleted ? Timestamp.now() : undefined,
            completedBy: !t.isCompleted ? user.userId : undefined,
          };
        }
        return t;
      });

      await updateWorkbook({ householdTasks: tasks });
    },
    [workbook, user, updateWorkbook]
  );

  // Add delegated task
  const addDelegatedTask = useCallback(
    async (personId: string, personName: string, task: Omit<DelegatedTask, 'taskId' | 'personId' | 'personName'>) => {
      if (!workbook) return;

      const newTask: DelegatedTask = {
        ...task,
        taskId: `dt_${Date.now()}`,
        personId,
        personName,
      };

      // Find or create person's task list
      const delegatedTasks = [...workbook.delegatedTasks];
      const personIndex = delegatedTasks.findIndex((d) => d.personId === personId);

      if (personIndex >= 0) {
        delegatedTasks[personIndex] = {
          ...delegatedTasks[personIndex],
          tasks: [...delegatedTasks[personIndex].tasks, newTask],
        };
      } else {
        delegatedTasks.push({
          personId,
          personName,
          tasks: [newTask],
        });
      }

      await updateWorkbook({ delegatedTasks });
    },
    [workbook, updateWorkbook]
  );

  // Toggle delegated task completion
  const toggleDelegatedTask = useCallback(
    async (personId: string, taskId: string) => {
      if (!workbook) return;

      const delegatedTasks = workbook.delegatedTasks.map((person) => {
        if (person.personId === personId) {
          return {
            ...person,
            tasks: person.tasks.map((t) => {
              if (t.taskId === taskId) {
                return {
                  ...t,
                  isCompleted: !t.isCompleted,
                  completedAt: !t.isCompleted ? Timestamp.now() : undefined,
                };
              }
              return t;
            }),
          };
        }
        return person;
      });

      await updateWorkbook({ delegatedTasks });
    },
    [workbook, updateWorkbook]
  );

  // Submit weekly reflection
  const submitReflection = useCallback(
    async (reflection: Omit<HouseholdReflection, 'completedAt' | 'completedBy'>) => {
      if (!workbook || !user) return;

      const fullReflection: HouseholdReflection = {
        ...reflection,
        completedAt: Timestamp.now(),
        completedBy: user.userId,
      };

      await updateWorkbook({
        weeklyReflection: fullReflection,
        status: 'completed',
      });
    },
    [workbook, user, updateWorkbook]
  );

  return {
    workbook,
    allWorkbooks,
    loading,
    error,
    currentWeekId,
    createWorkbook,
    updateWorkbook,
    addHouseholdTask,
    toggleHouseholdTask,
    addDelegatedTask,
    toggleDelegatedTask,
    submitReflection,
    loadWorkbook,
    refreshWorkbook: () => loadWorkbook(currentWeekId),
  };
}

// ==================== Get Tasks for a Person ====================

export function usePersonHouseholdTasks(familyId: string | undefined, personId: string | undefined) {
  const { workbook, loading } = useHouseholdWorkbook(familyId);
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);

  useEffect(() => {
    if (!workbook || !personId) {
      setTasks([]);
      return;
    }

    const personTasks = workbook.delegatedTasks.find((d) => d.personId === personId);
    setTasks(personTasks?.tasks || []);
  }, [workbook, personId]);

  return { tasks, loading, workbook };
}

export default useHouseholdWorkbook;
