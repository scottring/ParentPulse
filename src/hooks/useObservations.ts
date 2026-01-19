import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  Timestamp,
  limit,
  getDocs,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { BehaviorObservation } from '@/types/child-manual';

const COLLECTIONS = {
  BEHAVIOR_OBSERVATIONS: 'behavior_observations',
};

export function useObservations(childId?: string) {
  const { user } = useAuth();
  const [observations, setObservations] = useState<BehaviorObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for observations
  useEffect(() => {
    if (!user || !childId) {
      setObservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.BEHAVIOR_OBSERVATIONS),
      where('childId', '==', childId),
      where('familyId', '==', user.familyId),
      orderBy('createdAt', 'desc'),
      limit(50) // Last 50 observations
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const obs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          observationId: doc.id,
        })) as BehaviorObservation[];

        setObservations(obs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching behavior observations:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, childId]);

  /**
   * Log a new behavior observation
   */
  const logObservation = async (data: {
    childId: string;
    situation: string;
    description: string;
    strategyUsed?: {
      strategyId?: string;
      strategyText: string;
    };
    outcome: 'worked_great' | 'worked_okay' | 'didnt_work' | 'made_worse';
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const observationId = doc(collection(firestore, COLLECTIONS.BEHAVIOR_OBSERVATIONS)).id;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const observation: BehaviorObservation = {
      observationId,
      childId: data.childId,
      familyId: user.familyId,
      userId: user.userId,
      situation: data.situation,
      description: data.description,
      strategyUsed: data.strategyUsed,
      outcome: data.outcome,
      notes: data.notes,
      createdAt: Timestamp.now(),
      date: dateStr,
    };

    await setDoc(
      doc(firestore, COLLECTIONS.BEHAVIOR_OBSERVATIONS, observationId),
      observation
    );

    console.log('Behavior observation logged:', observationId);
    return observationId;
  };

  /**
   * Get success rate for a specific strategy
   */
  const getStrategySuccessRate = async (childId: string, strategyId: string) => {
    if (!user) return null;

    const q = query(
      collection(firestore, COLLECTIONS.BEHAVIOR_OBSERVATIONS),
      where('childId', '==', childId),
      where('familyId', '==', user.familyId),
      where('strategyUsed.strategyId', '==', strategyId)
    );

    const snapshot = await getDocs(q);
    const total = snapshot.size;

    if (total === 0) return null;

    const successful = snapshot.docs.filter((doc) => {
      const data = doc.data() as BehaviorObservation;
      return data.outcome === 'worked_great' || data.outcome === 'worked_okay';
    }).length;

    return {
      total,
      successful,
      successRate: Math.round((successful / total) * 100),
    };
  };

  /**
   * Get observations for a specific situation
   */
  const getObservationsForSituation = (situation: string) => {
    return observations.filter((obs) =>
      obs.situation.toLowerCase().includes(situation.toLowerCase())
    );
  };

  /**
   * Get recent observations (last N days)
   */
  const getRecentObservations = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return observations.filter((obs) => obs.date >= cutoffStr);
  };

  return {
    observations,
    loading,
    error,
    logObservation,
    getStrategySuccessRate,
    getObservationsForSituation,
    getRecentObservations,
  };
}
