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
  Intervention,
  InterventionTask,
  InterventionSeverity,
  ManualUpdateSuggestion,
  InterventionLog,
} from '@/types/intervention';

// ==================== Intervention Hook ====================

interface UseInterventionReturn {
  intervention: Intervention | null;
  loading: boolean;
  error: string | null;

  // CRUD operations
  createIntervention: (data: {
    title: string;
    description: string;
    whatHappened: string;
    severity: InterventionSeverity;
    personId?: string;
    personName?: string;
    environmentalFactors?: string[];
  }) => Promise<string>;
  updateIntervention: (updates: Partial<Intervention>) => Promise<void>;
  stabilize: (notes?: string) => Promise<void>;
  resolve: (notes?: string, lessonsLearned?: string) => Promise<void>;

  // Task operations
  addEmergencyTask: (task: Omit<InterventionTask, 'taskId' | 'isCompleted'>) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;

  // Strategy logging
  logStrategyUsed: (strategy: {
    strategyId?: string;
    description: string;
    effectiveness: 'helped' | 'didnt-help' | 'made-worse' | 'unknown';
  }) => Promise<void>;

  // Manual update suggestions
  approveSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;

  refreshIntervention: () => Promise<void>;
}

export function useIntervention(interventionId: string | undefined): UseInterventionReturn {
  const { user } = useAuth();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntervention = useCallback(async () => {
    if (!user || !interventionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(firestore, COLLECTIONS.INTERVENTIONS, interventionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setIntervention(docSnap.data() as Intervention);
      } else {
        setIntervention(null);
      }
    } catch (err) {
      console.error('Error fetching intervention:', err);
      setError('Failed to load intervention');
    } finally {
      setLoading(false);
    }
  }, [user, interventionId]);

  useEffect(() => {
    fetchIntervention();
  }, [fetchIntervention]);

  const createIntervention = useCallback(
    async (data: {
      title: string;
      description: string;
      whatHappened: string;
      severity: InterventionSeverity;
      personId?: string;
      personName?: string;
      environmentalFactors?: string[];
    }) => {
      if (!user?.familyId) throw new Error('Must be signed in');

      const newInterventionId = `int_${Date.now()}`;
      const now = Timestamp.now();

      const newIntervention: Intervention = {
        interventionId: newInterventionId,
        familyId: user.familyId,
        personId: data.personId,
        personName: data.personName,
        title: data.title,
        description: data.description,
        whatHappened: data.whatHappened,
        severity: data.severity,
        triggeredAt: now,
        environmentalFactors: data.environmentalFactors || [],
        strategiesUsed: [],
        emergencyTasks: [],
        status: 'active',
        suggestedManualUpdates: [],
        createdAt: now,
        updatedAt: now,
        createdBy: user.userId,
      };

      const docRef = doc(firestore, COLLECTIONS.INTERVENTIONS, newInterventionId);
      await setDoc(docRef, newIntervention);

      setIntervention(newIntervention);
      return newInterventionId;
    },
    [user]
  );

  const updateIntervention = useCallback(
    async (updates: Partial<Intervention>) => {
      if (!user || !intervention) throw new Error('Must be signed in with intervention loaded');

      const docRef = doc(firestore, COLLECTIONS.INTERVENTIONS, intervention.interventionId);
      const fullUpdates = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, fullUpdates);
      setIntervention({ ...intervention, ...fullUpdates } as Intervention);
    },
    [user, intervention]
  );

  const stabilize = useCallback(
    async (notes?: string) => {
      await updateIntervention({
        status: 'stabilized',
        stabilizedAt: Timestamp.now(),
        resolutionNotes: notes,
      });
    },
    [updateIntervention]
  );

  const resolve = useCallback(
    async (notes?: string, lessonsLearned?: string) => {
      await updateIntervention({
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        resolutionNotes: notes,
        lessonsLearned,
      });
    },
    [updateIntervention]
  );

  const addEmergencyTask = useCallback(
    async (task: Omit<InterventionTask, 'taskId' | 'isCompleted'>) => {
      if (!intervention) return;

      const newTask: InterventionTask = {
        ...task,
        taskId: `et_${Date.now()}`,
        isCompleted: false,
      };

      await updateIntervention({
        emergencyTasks: [...intervention.emergencyTasks, newTask],
      });
    },
    [intervention, updateIntervention]
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      if (!intervention) return;

      const tasks = intervention.emergencyTasks.map((t) => {
        if (t.taskId === taskId) {
          return {
            ...t,
            isCompleted: !t.isCompleted,
            completedAt: !t.isCompleted ? Timestamp.now() : undefined,
          };
        }
        return t;
      });

      await updateIntervention({ emergencyTasks: tasks });
    },
    [intervention, updateIntervention]
  );

  const logStrategyUsed = useCallback(
    async (strategy: {
      strategyId?: string;
      description: string;
      effectiveness: 'helped' | 'didnt-help' | 'made-worse' | 'unknown';
    }) => {
      if (!intervention) return;

      await updateIntervention({
        strategiesUsed: [...intervention.strategiesUsed, strategy],
        whatWorked: strategy.effectiveness === 'helped'
          ? [...(intervention.whatWorked ? [intervention.whatWorked] : []), strategy.description].join('; ')
          : intervention.whatWorked,
        whatDidntWork: strategy.effectiveness === 'didnt-help' || strategy.effectiveness === 'made-worse'
          ? [...(intervention.whatDidntWork ? [intervention.whatDidntWork] : []), strategy.description].join('; ')
          : intervention.whatDidntWork,
      });
    },
    [intervention, updateIntervention]
  );

  const approveSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!intervention) return;

      const suggestions = intervention.suggestedManualUpdates.map((s) =>
        s.suggestionId === suggestionId
          ? { ...s, approved: true, reviewedAt: Timestamp.now() }
          : s
      );

      await updateIntervention({ suggestedManualUpdates: suggestions });
    },
    [intervention, updateIntervention]
  );

  const rejectSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!intervention) return;

      const suggestions = intervention.suggestedManualUpdates.map((s) =>
        s.suggestionId === suggestionId
          ? { ...s, approved: false, reviewedAt: Timestamp.now() }
          : s
      );

      await updateIntervention({ suggestedManualUpdates: suggestions });
    },
    [intervention, updateIntervention]
  );

  return {
    intervention,
    loading,
    error,
    createIntervention,
    updateIntervention,
    stabilize,
    resolve,
    addEmergencyTask,
    toggleTask,
    logStrategyUsed,
    approveSuggestion,
    rejectSuggestion,
    refreshIntervention: fetchIntervention,
  };
}

// ==================== Active Interventions Hook ====================

interface UseActiveInterventionsReturn {
  interventions: InterventionLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActiveInterventions(familyId: string | undefined): UseActiveInterventionsReturn {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<InterventionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterventions = useCallback(async () => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch active and stabilized interventions
      const interventionQuery = query(
        collection(firestore, COLLECTIONS.INTERVENTIONS),
        where('familyId', '==', familyId),
        where('status', 'in', ['active', 'stabilized']),
        orderBy('triggeredAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(interventionQuery);

      const logs: InterventionLog[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Intervention;
        return {
          interventionId: data.interventionId,
          title: data.title,
          personName: data.personName,
          severity: data.severity,
          triggeredAt: data.triggeredAt,
          status: data.status,
          resolvedAt: data.resolvedAt,
          suggestionsApproved: data.suggestedManualUpdates.filter((s) => s.approved === true).length,
          suggestionsTotal: data.suggestedManualUpdates.length,
        };
      });

      setInterventions(logs);
    } catch (err) {
      console.error('Error fetching active interventions:', err);
      setError('Failed to load interventions');
    } finally {
      setLoading(false);
    }
  }, [user, familyId]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  return {
    interventions,
    loading,
    error,
    refresh: fetchInterventions,
  };
}

// ==================== Intervention History Hook ====================

export function useInterventionHistory(familyId: string | undefined, limitCount: number = 20) {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<InterventionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const historyQuery = query(
        collection(firestore, COLLECTIONS.INTERVENTIONS),
        where('familyId', '==', familyId),
        orderBy('triggeredAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(historyQuery);

      const logs: InterventionLog[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Intervention;
        return {
          interventionId: data.interventionId,
          title: data.title,
          personName: data.personName,
          severity: data.severity,
          triggeredAt: data.triggeredAt,
          status: data.status,
          resolvedAt: data.resolvedAt,
          suggestionsApproved: data.suggestedManualUpdates.filter((s) => s.approved === true).length,
          suggestionsTotal: data.suggestedManualUpdates.length,
        };
      });

      setInterventions(logs);
    } catch (err) {
      console.error('Error fetching intervention history:', err);
    } finally {
      setLoading(false);
    }
  }, [user, familyId, limitCount]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { interventions, loading, refresh: fetchHistory };
}

export default useIntervention;
