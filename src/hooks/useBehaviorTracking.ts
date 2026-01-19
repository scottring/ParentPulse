/**
 * useBehaviorTracking Hook
 *
 * Manages behavior tracking for child workbooks
 * - Fetch behavior instances for a workbook
 * - Create new behavior instance (ABC model)
 * - Update behavior instance
 * - Delete behavior instance
 * - Analytics and patterns
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
  BehaviorInstance,
  WORKBOOK_COLLECTIONS
} from '@/types/workbook';
import { useAuth } from '@/context/AuthContext';

interface UseBehaviorTrackingResult {
  behaviors: BehaviorInstance[];
  loading: boolean;
  error: string | null;
  addBehavior: (behaviorData: Omit<BehaviorInstance, 'instanceId' | 'familyId' | 'recordedBy' | 'recordedByName' | 'timestamp'>) => Promise<BehaviorInstance>;
  updateBehavior: (instanceId: string, updates: Partial<BehaviorInstance>) => Promise<void>;
  deleteBehavior: (instanceId: string) => Promise<void>;
  getBehaviorStats: () => BehaviorStats;
}

interface BehaviorStats {
  totalInstances: number;
  severityBreakdown: {
    mild: number;
    moderate: number;
    significant: number;
  };
  successRate?: number; // For positive behaviors
  commonAntecedents: string[];
  effectiveStrategies: Array<{ strategy: string; effectiveness: number }>;
}

/**
 * Hook to manage behavior tracking for a workbook
 */
export function useBehaviorTracking(
  workbookId: string | null,
  familyId: string | null,
  personId: string | null,
  limitCount: number = 50
): UseBehaviorTrackingResult {
  const { user } = useAuth();
  const [behaviors, setBehaviors] = useState<BehaviorInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to behavior instances
  useEffect(() => {
    if (!workbookId || !familyId) {
      setBehaviors([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING),
      where('workbookId', '==', workbookId),
      where('familyId', '==', familyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const behaviorsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          instanceId: doc.id
        })) as BehaviorInstance[];

        setBehaviors(behaviorsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error in behavior tracking subscription:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workbookId, familyId, limitCount]);

  // Add new behavior instance
  const addBehavior = useCallback(
    async (
      behaviorData: Omit<BehaviorInstance, 'instanceId' | 'familyId' | 'recordedBy' | 'recordedByName' | 'timestamp'>
    ): Promise<BehaviorInstance> => {
      if (!user || !familyId) {
        throw new Error('Missing required data to create behavior instance');
      }

      const newBehavior: Omit<BehaviorInstance, 'instanceId'> = {
        ...behaviorData,
        familyId,
        timestamp: Timestamp.now(),
        recordedBy: user.userId,
        recordedByName: user.name
      };

      try {
        const docRef = await addDoc(
          collection(db, WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING),
          newBehavior
        );

        const createdBehavior: BehaviorInstance = {
          ...newBehavior,
          instanceId: docRef.id
        };

        return createdBehavior;
      } catch (err) {
        console.error('Error creating behavior instance:', err);
        throw new Error('Failed to create behavior instance');
      }
    },
    [user, familyId]
  );

  // Update behavior instance
  const updateBehavior = useCallback(
    async (instanceId: string, updates: Partial<BehaviorInstance>) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const behaviorRef = doc(
          db,
          WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING,
          instanceId
        );

        await updateDoc(behaviorRef, updates);

        // Optimistic update
        setBehaviors(prev =>
          prev.map(behavior =>
            behavior.instanceId === instanceId ? { ...behavior, ...updates } : behavior
          )
        );
      } catch (err) {
        console.error('Error updating behavior:', err);
        throw new Error('Failed to update behavior');
      }
    },
    [user]
  );

  // Delete behavior instance
  const deleteBehavior = useCallback(
    async (instanceId: string) => {
      if (!user) throw new Error('User not authenticated');

      try {
        const behaviorRef = doc(
          db,
          WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING,
          instanceId
        );

        await deleteDoc(behaviorRef);

        // Optimistic update
        setBehaviors(prev =>
          prev.filter(behavior => behavior.instanceId !== instanceId)
        );
      } catch (err) {
        console.error('Error deleting behavior:', err);
        throw new Error('Failed to delete behavior');
      }
    },
    [user]
  );

  // Calculate behavior statistics
  const getBehaviorStats = useCallback((): BehaviorStats => {
    const stats: BehaviorStats = {
      totalInstances: behaviors.length,
      severityBreakdown: {
        mild: 0,
        moderate: 0,
        significant: 0
      },
      commonAntecedents: [],
      effectiveStrategies: []
    };

    if (behaviors.length === 0) return stats;

    // Severity breakdown
    behaviors.forEach(behavior => {
      if (behavior.severity) {
        if (behavior.severity === 'mild') stats.severityBreakdown.mild++;
        else if (behavior.severity === 'moderate') stats.severityBreakdown.moderate++;
        else if (behavior.severity === 'significant') stats.severityBreakdown.significant++;
      }
    });

    // Success rate for positive behaviors
    const positiveBehaviors = behaviors.filter(b => b.success !== undefined);
    if (positiveBehaviors.length > 0) {
      const successCount = positiveBehaviors.filter(b => b.success === true).length;
      stats.successRate = (successCount / positiveBehaviors.length) * 100;
    }

    // Common antecedents
    const antecedentCounts: { [key: string]: number } = {};
    behaviors.forEach(behavior => {
      if (behavior.antecedent) {
        antecedentCounts[behavior.antecedent] = (antecedentCounts[behavior.antecedent] || 0) + 1;
      }
    });
    stats.commonAntecedents = Object.entries(antecedentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([antecedent]) => antecedent);

    // Effective strategies
    const strategyEffectiveness: { [key: string]: { effective: number; total: number } } = {};
    behaviors.forEach(behavior => {
      if (behavior.strategyUsed && behavior.strategyEffective !== undefined) {
        if (!strategyEffectiveness[behavior.strategyUsed]) {
          strategyEffectiveness[behavior.strategyUsed] = { effective: 0, total: 0 };
        }
        strategyEffectiveness[behavior.strategyUsed].total++;
        if (behavior.strategyEffective) {
          strategyEffectiveness[behavior.strategyUsed].effective++;
        }
      }
    });
    stats.effectiveStrategies = Object.entries(strategyEffectiveness)
      .map(([strategy, counts]) => ({
        strategy,
        effectiveness: (counts.effective / counts.total) * 100
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5);

    return stats;
  }, [behaviors]);

  return {
    behaviors,
    loading,
    error,
    addBehavior,
    updateBehavior,
    deleteBehavior,
    getBehaviorStats
  };
}

/**
 * Hook to get behavior history for a person across all workbooks
 */
export function usePersonBehaviorHistory(personId: string | null, limitCount: number = 100) {
  const { user } = useAuth();
  const [behaviors, setBehaviors] = useState<BehaviorInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId || !user) {
      setBehaviors([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING),
      where('personId', '==', personId),
      where('familyId', '==', user.familyId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const behaviorsData = snapshot.docs.map(doc => ({
          ...doc.data(),
          instanceId: doc.id
        })) as BehaviorInstance[];

        setBehaviors(behaviorsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching person behavior history:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [personId, user, limitCount]);

  return { behaviors, loading, error };
}

/**
 * Hook to track behavior patterns over time
 */
export function useBehaviorPatterns(personId: string | null, daysBack: number = 30) {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<{
    behaviorName: string;
    frequency: number;
    averageSeverity?: number;
    trendingUp: boolean;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personId || !user) {
      setPatterns([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const q = query(
      collection(db, WORKBOOK_COLLECTIONS.BEHAVIOR_TRACKING),
      where('personId', '==', personId),
      where('familyId', '==', user.familyId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const behaviors = snapshot.docs.map(doc => doc.data()) as BehaviorInstance[];

        // Analyze patterns
        const behaviorCounts: { [name: string]: { count: number; severities: Array<'mild' | 'moderate' | 'significant'> } } = {};

        behaviors.forEach(behavior => {
          if (!behaviorCounts[behavior.behaviorType]) {
            behaviorCounts[behavior.behaviorType] = { count: 0, severities: [] };
          }
          behaviorCounts[behavior.behaviorType].count++;
          if (behavior.severity) {
            behaviorCounts[behavior.behaviorType].severities.push(behavior.severity);
          }
        });

        const patternsData = Object.entries(behaviorCounts)
          .map(([behaviorName, data]) => ({
            behaviorName,
            frequency: data.count,
            averageSeverity: data.severities.length > 0
              ? data.severities.reduce((sum, s) => sum + (s === 'mild' ? 1 : s === 'moderate' ? 2 : 3), 0) / data.severities.length
              : undefined,
            trendingUp: false // TODO: Implement trend analysis
          }))
          .sort((a, b) => b.frequency - a.frequency);

        setPatterns(patternsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error analyzing behavior patterns:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [personId, user, daysBack]);

  return { patterns, loading };
}
