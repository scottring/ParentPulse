'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  DomainProgression,
  GrowthStage,
  ARC_COLLECTIONS,
} from '@/types/growth-arc';
import {
  computeOverallStage,
  computeStageProgress,
  getAdvancementRequirements,
  getStageDisplay,
} from '@/lib/progression-engine';

export interface DomainProgressionView extends DomainProgression {
  display: ReturnType<typeof getStageDisplay>;
  requirements: string[];
}

interface UseProgressionReturn {
  domainProgressions: DomainProgressionView[];
  overallStage: GrowthStage;
  overallDisplay: ReturnType<typeof getStageDisplay>;
  loading: boolean;
  error: string | null;
  seedProgressions: () => Promise<void>;
}

export function useProgression(): UseProgressionReturn {
  const { user } = useAuth();
  const [progressions, setProgressions] = useState<DomainProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to domain_progressions in real-time
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, ARC_COLLECTIONS.DOMAIN_PROGRESSIONS),
      where('familyId', '==', user.familyId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const progs: DomainProgression[] = [];
        snap.forEach((doc) => {
          progs.push(doc.data() as DomainProgression);
        });
        setProgressions(progs);
        setLoading(false);
      },
      (err) => {
        console.error('Progression listener error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [user?.familyId]);

  const seedProgressions = useCallback(async () => {
    try {
      const fn = httpsCallable(functions, 'seedDomainProgressions');
      await fn({});
    } catch (err: any) {
      console.error('Failed to seed progressions:', err);
      setError(err.message);
    }
  }, []);

  // Compute views with display metadata
  const domainProgressions: DomainProgressionView[] = progressions.map((p) => ({
    ...p,
    display: getStageDisplay(p.stage),
    requirements: getAdvancementRequirements(p.stage, p.criteria),
  }));

  const overallStage = computeOverallStage(
    progressions.map((p) => p.stage),
  );

  const overallDisplay = getStageDisplay(overallStage);

  return {
    domainProgressions,
    overallStage,
    overallDisplay,
    loading,
    error,
    seedProgressions,
  };
}
