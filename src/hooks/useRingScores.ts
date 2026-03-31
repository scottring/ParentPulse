'use client';

import { useMemo } from 'react';
import { DimensionAssessment } from '@/types/growth-arc';
import { DomainWeights, OverallHealth, DEFAULT_DOMAIN_WEIGHTS } from '@/types/ring-scores';
import { computeOverallHealth } from '@/lib/scoring-engine';

/**
 * Hook that computes ring scores from dimension assessments.
 * Accepts assessments from useDashboard() to avoid duplicate Firestore listeners.
 */
export function useRingScores(
  assessments: DimensionAssessment[],
  weights?: DomainWeights,
) {
  const health = useMemo(() => {
    if (!assessments || assessments.length === 0) {
      return null;
    }
    return computeOverallHealth(assessments, weights || DEFAULT_DOMAIN_WEIGHTS);
  }, [assessments, weights]);

  return { health };
}
