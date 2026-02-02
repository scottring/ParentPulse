'use client';

import { useMemo } from 'react';
import type { ChildManual, MarriageManual } from '@/types/manual';
import type { PersonManual } from '@/types/person-manual';
import type { LayerId } from '@/types/household-workbook';
import {
  checkChildManualBaseline,
  calculateChildManualBaselinePercentage,
  getChildManualLayerProgress,
  checkMarriageManualBaseline,
  calculateMarriageManualBaselinePercentage,
  checkPersonManualBaseline,
  calculatePersonManualBaselinePercentage,
  getPersonManualLayerProgress,
} from '@/config/baseline-requirements';

// ==================== Types ====================

export interface ManualProgressStatus {
  totalRequirements: number;
  metRequirements: number;
  completionPercentage: number;
  isReadyForWorkbook: boolean;
  missingRequirements: Array<{
    requirementId: string;
    description: string;
    layerId: LayerId;
  }>;
  layerProgress: Record<LayerId, { met: number; total: number; percentage: number }>;
}

function emptyStatus(): ManualProgressStatus {
  return {
    totalRequirements: 0,
    metRequirements: 0,
    completionPercentage: 0,
    isReadyForWorkbook: false,
    missingRequirements: [],
    layerProgress: {
      1: { met: 0, total: 0, percentage: 0 },
      2: { met: 0, total: 0, percentage: 0 },
      3: { met: 0, total: 0, percentage: 0 },
      4: { met: 0, total: 0, percentage: 0 },
      5: { met: 0, total: 0, percentage: 0 },
      6: { met: 0, total: 0, percentage: 0 },
    },
  };
}

// ==================== Child Manual Progress Hook ====================

export function useChildManualProgress(manual: ChildManual | null): ManualProgressStatus {
  return useMemo(() => {
    if (!manual) return emptyStatus();

    const { requirements } = checkChildManualBaseline(manual);

    const met = requirements.filter((r) => r.isMet).length;
    const missing = requirements.filter((r) => !r.isMet);
    const layerProgress = getChildManualLayerProgress(manual);

    return {
      totalRequirements: requirements.length,
      metRequirements: met,
      completionPercentage: calculateChildManualBaselinePercentage(manual),
      // Allow 1 missing requirement for flexibility
      isReadyForWorkbook: met >= requirements.length - 1,
      missingRequirements: missing.map((m) => ({
        requirementId: m.requirementId,
        description: m.description,
        layerId: m.layerId,
      })),
      layerProgress,
    };
  }, [manual]);
}

// ==================== Marriage Manual Progress Hook ====================

export function useMarriageManualProgress(manual: MarriageManual | null): ManualProgressStatus {
  return useMemo(() => {
    if (!manual) return emptyStatus();

    const { requirements } = checkMarriageManualBaseline(manual);

    const met = requirements.filter((r) => r.isMet).length;
    const missing = requirements.filter((r) => !r.isMet);

    // Group by layer for progress display
    const layerProgress: Record<LayerId, { met: number; total: number; percentage: number }> = {
      1: { met: 0, total: 0, percentage: 0 },
      2: { met: 0, total: 0, percentage: 0 },
      3: { met: 0, total: 0, percentage: 0 },
      4: { met: 0, total: 0, percentage: 0 },
      5: { met: 0, total: 0, percentage: 0 },
      6: { met: 0, total: 0, percentage: 0 },
    };

    for (const req of requirements) {
      layerProgress[req.layerId].total++;
      if (req.isMet) layerProgress[req.layerId].met++;
    }

    for (const layerId of Object.keys(layerProgress) as unknown as LayerId[]) {
      const layer = layerProgress[layerId];
      layer.percentage = layer.total > 0 ? Math.round((layer.met / layer.total) * 100) : 100;
    }

    return {
      totalRequirements: requirements.length,
      metRequirements: met,
      completionPercentage: calculateMarriageManualBaselinePercentage(manual),
      isReadyForWorkbook: met >= requirements.length - 1,
      missingRequirements: missing.map((m) => ({
        requirementId: m.requirementId,
        description: m.description,
        layerId: m.layerId,
      })),
      layerProgress,
    };
  }, [manual]);
}

// ==================== Layer Display Helpers ====================

export const LAYER_NAMES: Record<LayerId, string> = {
  1: 'Triggers',
  2: 'Regulation',
  3: 'Boundaries',
  4: 'Strategies',
  5: 'Growth',
  6: 'Values',
};

export const LAYER_ICONS: Record<LayerId, string> = {
  1: 'BoltIcon',
  2: 'HeartIcon',
  3: 'ShieldCheckIcon',
  4: 'SparklesIcon',
  5: 'ArrowTrendingUpIcon',
  6: 'StarIcon',
};

/**
 * Get the section navigation path for a missing requirement
 */
export function getRequirementSectionPath(
  requirementId: string,
  personId: string,
  manualType: 'child' | 'marriage' | 'person'
): string {
  const basePath = `/people/${personId}/manual`;

  // Map requirement IDs to manual sections
  if (requirementId.includes('trigger')) {
    return `${basePath}#triggers`;
  }
  if (requirementId.includes('strateg') || requirementId.includes('works')) {
    return `${basePath}#strategies`;
  }
  if (requirementId.includes('boundar')) {
    return `${basePath}#boundaries`;
  }
  if (requirementId.includes('regul') || requirementId.includes('repair')) {
    return `${basePath}#regulation`;
  }
  if (requirementId.includes('value')) {
    return `${basePath}#values`;
  }
  if (requirementId.includes('commun')) {
    return `${basePath}#communication`;
  }

  return basePath;
}

// ==================== Person Manual Progress Hook (Legacy) ====================

/**
 * Hook for tracking progress on legacy PersonManual type
 * Used by the existing manual page which uses usePersonManual hook
 */
export function usePersonManualProgress(manual: PersonManual | null): ManualProgressStatus {
  return useMemo(() => {
    if (!manual) return emptyStatus();

    const { requirements } = checkPersonManualBaseline(manual);

    const met = requirements.filter((r) => r.isMet).length;
    const missing = requirements.filter((r) => !r.isMet);
    const layerProgress = getPersonManualLayerProgress(manual);

    return {
      totalRequirements: requirements.length,
      metRequirements: met,
      completionPercentage: calculatePersonManualBaselinePercentage(manual),
      // Allow 1 missing requirement for flexibility
      isReadyForWorkbook: met >= requirements.length - 1,
      missingRequirements: missing.map((m) => ({
        requirementId: m.requirementId,
        description: m.description,
        layerId: m.layerId,
      })),
      layerProgress,
    };
  }, [manual]);
}

export default useChildManualProgress;
