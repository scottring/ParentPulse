'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  GoalVolume,
  QuarterlyMilestone,
  MonthlyFocus,
  SpiderAssessment,
  DailyMinutes,
} from '@/types/assessment';

const GOALS_COLLECTION = 'goal_volumes';

// ==================== Goal Volume Hook ====================

interface UseGoalV2Return {
  goal: GoalVolume | null;
  loading: boolean;
  error: string | null;
  createGoal: (data: CreateGoalData) => Promise<GoalVolume>;
  updateGoal: (updates: Partial<GoalVolume>) => Promise<void>;
  addQuarterlyMilestone: (milestone: QuarterlyMilestone) => Promise<void>;
  updateQuarterlyMilestone: (
    milestoneId: string,
    updates: Partial<QuarterlyMilestone>
  ) => Promise<void>;
  addMonthlyFocus: (quarterIndex: number, focus: MonthlyFocus) => Promise<void>;
  updateMonthlyFocus: (
    quarterIndex: number,
    focusId: string,
    updates: Partial<MonthlyFocus>
  ) => Promise<void>;
  refreshGoal: () => Promise<void>;
}

interface CreateGoalData {
  manualId: string;
  personId: string;
  familyId: string;
  yearGoal: string;
  description?: string;
  estimatedDailyMinutes: DailyMinutes;
  baselineAssessment?: SpiderAssessment;
}

export function useGoalV2(goalId: string | undefined): UseGoalV2Return {
  const { user } = useAuth();
  const [goal, setGoal] = useState<GoalVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch goal
  const fetchGoal = useCallback(async () => {
    if (!user || !goalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(firestore, GOALS_COLLECTION, goalId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setGoal(docSnap.data() as GoalVolume);
      } else {
        setGoal(null);
      }
    } catch (err) {
      console.error('Error fetching goal:', err);
      setError('Failed to load goal');
    } finally {
      setLoading(false);
    }
  }, [user, goalId]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Create new goal
  const createGoal = useCallback(
    async (data: CreateGoalData): Promise<GoalVolume> => {
      if (!user) throw new Error('Must be signed in');

      const now = Timestamp.now();
      const year = new Date().getFullYear();
      const volumeId = `vol-${data.manualId}-${year}`;

      const newGoal: GoalVolume = {
        volumeId,
        manualId: data.manualId,
        personId: data.personId,
        familyId: data.familyId,
        yearGoal: data.yearGoal,
        description: data.description,
        quarterlyMilestones: [],
        status: 'active',
        startDate: now,
        estimatedDailyMinutes: data.estimatedDailyMinutes,
        baselineAssessment: data.baselineAssessment,
        assessments: [],
        createdAt: now,
        createdBy: user.userId,
        lastUpdatedAt: now,
      };

      const docRef = doc(firestore, GOALS_COLLECTION, volumeId);
      await setDoc(docRef, newGoal);

      setGoal(newGoal);
      return newGoal;
    },
    [user]
  );

  // Update goal
  const updateGoal = useCallback(
    async (updates: Partial<GoalVolume>) => {
      if (!user || !goal) throw new Error('Must be signed in with goal loaded');

      const docRef = doc(firestore, GOALS_COLLECTION, goal.volumeId);
      await updateDoc(docRef, updates);

      setGoal({ ...goal, ...updates });
    },
    [user, goal]
  );

  // Add quarterly milestone
  const addQuarterlyMilestone = useCallback(
    async (milestone: QuarterlyMilestone) => {
      if (!goal) return;

      const quarterlyMilestones = [...goal.quarterlyMilestones, milestone];
      await updateGoal({ quarterlyMilestones });
    },
    [goal, updateGoal]
  );

  // Update quarterly milestone
  const updateQuarterlyMilestone = useCallback(
    async (milestoneId: string, updates: Partial<QuarterlyMilestone>) => {
      if (!goal) return;

      const quarterlyMilestones = goal.quarterlyMilestones.map((m) =>
        m.milestoneId === milestoneId ? { ...m, ...updates } : m
      );
      await updateGoal({ quarterlyMilestones });
    },
    [goal, updateGoal]
  );

  // Add monthly focus to a quarter
  const addMonthlyFocus = useCallback(
    async (quarterIndex: number, focus: MonthlyFocus) => {
      if (!goal || quarterIndex >= goal.quarterlyMilestones.length) return;

      const quarterlyMilestones = goal.quarterlyMilestones.map((m, i) => {
        if (i !== quarterIndex) return m;
        return {
          ...m,
          monthlyFocuses: [...m.monthlyFocuses, focus],
        };
      });
      await updateGoal({ quarterlyMilestones });
    },
    [goal, updateGoal]
  );

  // Update monthly focus
  const updateMonthlyFocus = useCallback(
    async (quarterIndex: number, focusId: string, updates: Partial<MonthlyFocus>) => {
      if (!goal || quarterIndex >= goal.quarterlyMilestones.length) return;

      const quarterlyMilestones = goal.quarterlyMilestones.map((m, i) => {
        if (i !== quarterIndex) return m;
        return {
          ...m,
          monthlyFocuses: m.monthlyFocuses.map((f) =>
            f.focusId === focusId ? { ...f, ...updates } : f
          ),
        };
      });
      await updateGoal({ quarterlyMilestones });
    },
    [goal, updateGoal]
  );

  return {
    goal,
    loading,
    error,
    createGoal,
    updateGoal,
    addQuarterlyMilestone,
    updateQuarterlyMilestone,
    addMonthlyFocus,
    updateMonthlyFocus,
    refreshGoal: fetchGoal,
  };
}

// ==================== Goals List Hook ====================

export function useGoalsListV2(manualId: string | undefined) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    const fetchGoals = async () => {
      setLoading(true);

      try {
        const q = query(
          collection(firestore, GOALS_COLLECTION),
          where('manualId', '==', manualId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        setGoals(snapshot.docs.map((d) => d.data() as GoalVolume));
      } catch (err) {
        console.error('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user, manualId]);

  return { goals, loading };
}

// ==================== Active Goal Hook ====================

export function useActiveGoalV2(manualId: string | undefined) {
  const { goals, loading } = useGoalsListV2(manualId);

  // Return the first active goal
  const activeGoal = goals.find((g) => g.status === 'active') || null;

  return { activeGoal, loading };
}

// ==================== Current Focus Helper ====================

interface CurrentFocus {
  yearGoal: string;
  quarterFocus: string;
  monthFocus: string;
  volumeId: string;
}

export function getCurrentFocus(goal: GoalVolume): CurrentFocus | null {
  if (!goal) return null;

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentQuarterNum = Math.floor(currentMonth / 3) + 1; // 1-4

  // Find current quarter by quarterNumber
  const quarter = goal.quarterlyMilestones.find(
    (m) => m.quarterNumber === currentQuarterNum
  );

  if (!quarter) {
    return {
      yearGoal: goal.yearGoal,
      quarterFocus: 'No quarterly focus set',
      monthFocus: 'No monthly focus set',
      volumeId: goal.volumeId,
    };
  }

  // Find current month (1-12)
  const monthNum = currentMonth + 1;
  const monthFocus = quarter.monthlyFocuses.find((f) => f.month === monthNum);

  return {
    yearGoal: goal.yearGoal,
    quarterFocus: quarter.quarterFocus,
    monthFocus: monthFocus?.thisMonth || 'No monthly focus set',
    volumeId: goal.volumeId,
  };
}

// ==================== Create Helpers ====================

export function createQuarterlyMilestone(
  volumeId: string,
  quarterNumber: 1 | 2 | 3 | 4,
  quarterFocus: string,
  year: number
): QuarterlyMilestone {
  return {
    milestoneId: `q${quarterNumber}-${Date.now()}`,
    volumeId,
    quarterFocus,
    quarterNumber,
    year,
    monthlyFocuses: [],
    status: 'draft',
    startDate: Timestamp.now(),
  };
}

export function createMonthlyFocus(
  milestoneId: string,
  month: number,
  thisMonth: string,
  year: number
): MonthlyFocus {
  return {
    focusId: `m${month}-${Date.now()}`,
    milestoneId,
    thisMonth,
    month,
    year,
    weeklyWorkbookIds: [],
    status: 'draft',
    startDate: Timestamp.now(),
  };
}
