'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DimensionAssessment } from '@/types/growth-arc';
import { DimensionId } from '@/config/relationship-dimensions';
import {
  computeAssessmentNeeds,
  AssessmentNeed,
} from '@/lib/assessment-needs-engine';

const DISMISS_STORAGE_KEY = 'relish_deepen_dismissals';
const CONTRADICTION_STORAGE_KEY = 'relish_contradictions';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Dismissal {
  dimensionId: string;
  dismissedAt: number;
}

function loadDismissals(): Dismissal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Dismissal[] = JSON.parse(raw);
    // Prune expired dismissals
    const now = Date.now();
    return parsed.filter((d) => now - d.dismissedAt < DISMISS_DURATION_MS);
  } catch {
    return [];
  }
}

function saveDismissals(dismissals: Dismissal[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(dismissals));
}

interface UseAssessmentNeedsReturn {
  /** All computed needs (unfiltered) */
  allNeeds: AssessmentNeed[];
  /** Visible needs: non-dismissed, max 2, high/medium priority only */
  visibleNeeds: AssessmentNeed[];
  /** Navigate to the mini-assessment flow for a need */
  startAssessment: (need: AssessmentNeed) => void;
  /** Dismiss a need for 7 days */
  dismissNeed: (need: AssessmentNeed) => void;
}

export function useAssessmentNeeds(
  assessments: DimensionAssessment[],
  activeWorkbookDimensionIds: DimensionId[],
  recentAcuteEventDimensionIds?: DimensionId[],
  contradictionDimensionIds?: DimensionId[],
): UseAssessmentNeedsReturn {
  const router = useRouter();
  const [dismissals, setDismissals] = useState<Dismissal[]>([]);

  // Load dismissals on mount
  useEffect(() => {
    setDismissals(loadDismissals());
  }, []);

  const allNeeds = useMemo(
    () =>
      computeAssessmentNeeds(
        assessments,
        activeWorkbookDimensionIds,
        recentAcuteEventDimensionIds,
        contradictionDimensionIds,
      ),
    [assessments, activeWorkbookDimensionIds, recentAcuteEventDimensionIds, contradictionDimensionIds],
  );

  const visibleNeeds = useMemo(() => {
    const dismissedIds = new Set(dismissals.map((d) => d.dimensionId));
    return allNeeds
      .filter((n) => !dismissedIds.has(n.dimensionId))
      .filter((n) => n.priority === 'high' || n.priority === 'medium')
      .slice(0, 2);
  }, [allNeeds, dismissals]);

  const startAssessment = useCallback(
    (need: AssessmentNeed) => {
      router.push(`/deepen/${need.dimensionId}`);
    },
    [router],
  );

  const dismissNeed = useCallback((need: AssessmentNeed) => {
    setDismissals((prev) => {
      const updated = [
        ...prev.filter((d) => d.dimensionId !== need.dimensionId),
        { dimensionId: need.dimensionId, dismissedAt: Date.now() },
      ];
      saveDismissals(updated);
      return updated;
    });
  }, []);

  return {
    allNeeds,
    visibleNeeds,
    startAssessment,
    dismissNeed,
  };
}

// ==================== Contradiction tracking ====================

/**
 * Record a contradiction detected from a workbook reflection.
 * Stored in localStorage so it can be picked up by useAssessmentNeeds.
 */
export function recordContradiction(dimensionId: DimensionId): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CONTRADICTION_STORAGE_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (!existing.includes(dimensionId)) {
      existing.push(dimensionId);
      localStorage.setItem(CONTRADICTION_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
    // Ignore
  }
}

/**
 * Load and clear stored contradictions (consumed once by useAssessmentNeeds callers).
 */
export function loadAndClearContradictions(): DimensionId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTRADICTION_STORAGE_KEY);
    if (!raw) return [];
    const ids: DimensionId[] = JSON.parse(raw);
    localStorage.removeItem(CONTRADICTION_STORAGE_KEY);
    return ids;
  } catch {
    return [];
  }
}
