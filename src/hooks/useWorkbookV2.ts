'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ParentWorkbook,
  ActivityStatus,
} from '@/types/workbook';
import {
  generateWorkbookContent,
  generateFallbackContent,
  getWeekId,
  getWeekBounds,
  getWeekNumber,
  type WorkbookGenerationContext,
  type GeneratedWorkbookContent,
} from '@/lib/workbookGenerator';

const WORKBOOKS_COLLECTION = 'parent_workbooks';

// ==================== Hook ====================

interface UseWorkbookV2Return {
  workbook: ParentWorkbook | null;
  loading: boolean;
  error: string | null;
  generating: boolean;
  generateWorkbook: (context: WorkbookGenerationContext) => Promise<ParentWorkbook>;
  updateActivity: (activityId: string, status: ActivityStatus, notes?: string) => Promise<void>;
  updateGoalCompletion: (goalId: string, day: number, completed: boolean, notes?: string) => Promise<void>;
  refreshWorkbook: () => Promise<void>;
}

export function useWorkbookV2(
  manualId: string | undefined,
  weekId?: string
): UseWorkbookV2Return {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<ParentWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWeekId = weekId || getWeekId();

  // Fetch workbook
  const fetchWorkbook = useCallback(async () => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(firestore, WORKBOOKS_COLLECTION),
        where('manualId', '==', manualId),
        where('weekId', '==', currentWeekId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setWorkbook(snapshot.docs[0].data() as ParentWorkbook);
      } else {
        setWorkbook(null);
      }
    } catch (err) {
      console.error('Error fetching workbook:', err);
      setError('Failed to load workbook');
    } finally {
      setLoading(false);
    }
  }, [user, manualId, currentWeekId]);

  useEffect(() => {
    fetchWorkbook();
  }, [fetchWorkbook]);

  // Generate new workbook
  const generateWorkbook = useCallback(
    async (context: WorkbookGenerationContext): Promise<ParentWorkbook> => {
      if (!user) {
        throw new Error('Must be signed in');
      }

      setGenerating(true);
      setError(null);

      try {
        // Try AI generation first, fall back to template
        let content: GeneratedWorkbookContent;
        try {
          content = await generateWorkbookContent(context);
        } catch (aiError) {
          console.warn('AI generation failed, using fallback:', aiError);
          content = generateFallbackContent(context);
        }

        // Build full workbook
        const { start, end } = getWeekBounds();
        const workbookId = `wb-${context.manual.manualId}-${currentWeekId}`;

        const newWorkbook: ParentWorkbook = {
          workbookId,
          familyId: context.manual.familyId,
          personId: context.manual.personId,
          manualId: context.manual.manualId,
          manualType: 'child',

          weekId: currentWeekId,
          weekNumber: getWeekNumber(),
          year: new Date().getFullYear(),
          startDate: Timestamp.fromDate(start),
          endDate: Timestamp.fromDate(end),

          goalContext: {
            yearGoal: context.goalContext.yearGoal,
            quarterFocus: context.goalContext.quarterFocus,
            thisMonth: context.goalContext.thisMonth,
            thisWeek: content.thisWeek,
            volumeId: context.goalContext.volumeId,
          },

          parentGoals: content.parentGoals.map((g) => ({
            ...g,
            dailyCompletions: Array.from({ length: 7 }, (_, i) => ({
              day: i,
              completed: false,
            })),
            completedCount: 0,
            totalOpportunities: g.frequency === 'daily' ? 7 : 0,
          })),

          dailyActivities: content.dailyActivities.map((a) => ({
            ...a,
            status: 'pending' as const,
          })),

          suggestedPractices: content.suggestedPractices,

          status: 'active',
          generatedAt: Timestamp.now(),
          generatedBy: 'ai',
          lastUpdatedAt: Timestamp.now(),
        };

        // Save to Firestore
        await setDoc(doc(firestore, WORKBOOKS_COLLECTION, workbookId), newWorkbook);

        setWorkbook(newWorkbook);
        return newWorkbook;
      } catch (err) {
        console.error('Error generating workbook:', err);
        setError('Failed to generate workbook');
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [user, currentWeekId]
  );

  // Update activity status
  const updateActivity = useCallback(
    async (activityId: string, status: ActivityStatus, notes?: string) => {
      if (!workbook) return;

      const updatedActivities = workbook.dailyActivities.map((a) => {
        if (a.activityId !== activityId) return a;

        const updated = {
          ...a,
          status,
          notes: notes !== undefined ? notes : a.notes,
          completedAt: status === 'completed' ? Timestamp.now() : undefined,
        };

        return updated;
      });

      const updates = {
        dailyActivities: updatedActivities,
        lastUpdatedAt: Timestamp.now(),
      };

      await updateDoc(doc(firestore, WORKBOOKS_COLLECTION, workbook.workbookId), updates);

      setWorkbook((prev) =>
        prev
          ? {
              ...prev,
              dailyActivities: updatedActivities,
              lastUpdatedAt: Timestamp.now(),
            }
          : null
      );
    },
    [workbook]
  );

  // Update goal completion for a day
  const updateGoalCompletion = useCallback(
    async (goalId: string, day: number, completed: boolean, notes?: string) => {
      if (!workbook) return;

      const updatedGoals = workbook.parentGoals.map((g) => {
        if (g.goalId !== goalId) return g;

        const dailyCompletions = g.dailyCompletions.map((d) => {
          if (d.day !== day) return d;
          return { ...d, completed, notes: notes !== undefined ? notes : d.notes };
        });

        const completedCount = dailyCompletions.filter((d) => d.completed).length;

        return {
          ...g,
          dailyCompletions,
          completedCount,
        };
      });

      const updates = {
        parentGoals: updatedGoals,
        lastUpdatedAt: Timestamp.now(),
      };

      await updateDoc(doc(firestore, WORKBOOKS_COLLECTION, workbook.workbookId), updates);

      setWorkbook((prev) =>
        prev
          ? {
              ...prev,
              parentGoals: updatedGoals,
              lastUpdatedAt: Timestamp.now(),
            }
          : null
      );
    },
    [workbook]
  );

  return {
    workbook,
    loading,
    error,
    generating,
    generateWorkbook,
    updateActivity,
    updateGoalCompletion,
    refreshWorkbook: fetchWorkbook,
  };
}

// ==================== Workbook History Hook ====================

export function useWorkbookHistory(manualId: string | undefined, limitCount = 10) {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<ParentWorkbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);

      try {
        const q = query(
          collection(firestore, WORKBOOKS_COLLECTION),
          where('manualId', '==', manualId),
          orderBy('startDate', 'desc'),
          limit(limitCount)
        );

        const snapshot = await getDocs(q);
        setWorkbooks(snapshot.docs.map((d) => d.data() as ParentWorkbook));
      } catch (err) {
        console.error('Error fetching workbook history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, manualId, limitCount]);

  return { workbooks, loading };
}
