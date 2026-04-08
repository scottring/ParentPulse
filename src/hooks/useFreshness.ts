'use client';

import { useMemo } from 'react';
import { Person, PersonManual, Contribution } from '@/types/person-manual';
import {
  computeFamilyCompleteness,
  computeFreshness,
  computeContributionCoverage,
  freshnessLabel,
  FamilyCompleteness,
  FreshnessStatus,
  ContributionCoverage,
} from '@/lib/freshness-engine';

interface UseFreshnessParams {
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
}

export function useFreshness(params: UseFreshnessParams) {
  const { people, manuals, contributions } = params;

  const familyCompleteness: FamilyCompleteness = useMemo(
    () => computeFamilyCompleteness(people, manuals, contributions),
    [people, manuals, contributions],
  );

  return { familyCompleteness, computeFreshness, computeContributionCoverage, freshnessLabel };
}
