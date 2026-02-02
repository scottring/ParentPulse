/**
 * Baseline Requirements Configuration
 *
 * Defines the minimum requirements for each layer that must be met
 * before certain focus domains can be selected for weekly planning.
 */

import type { LayerId, HouseholdManual } from '@/types/household-workbook';
import type { ChildManual } from '@/types/manual';

// ==================== Types ====================

export interface BaselineRequirement {
  requirementId: string;
  description: string;
  layerId: LayerId;
  minCount?: number;
  checkFn: (manual: HouseholdManual) => boolean;
}

export interface LayerBaselineConfig {
  layerId: LayerId;
  layerName: string;
  requirements: Omit<BaselineRequirement, 'layerId'>[];
}

// ==================== Layer Baseline Configurations ====================

export const LAYER_BASELINES: Record<LayerId, LayerBaselineConfig> = {
  1: {
    layerId: 1,
    layerName: 'Inputs/Triggers',
    requirements: [
      {
        requirementId: 'l1-triggers-min',
        description: 'At least 2 household triggers documented',
        minCount: 2,
        checkFn: (manual) => manual.triggers.filter((t) => t.layerId === 1).length >= 2,
      },
      {
        requirementId: 'l1-sanctuary-map',
        description: 'Sanctuary Map section started',
        checkFn: (manual) => !!manual.sanctuaryMap && (
          (manual.sanctuaryMap.zones?.length ?? 0) > 0 ||
          (manual.sanctuaryMap.lightAudit?.length ?? 0) > 0
        ),
      },
    ],
  },
  2: {
    layerId: 2,
    layerName: 'Processing/Co-regulation',
    requirements: [
      {
        requirementId: 'l2-communication',
        description: 'Communication Rhythm section completed',
        checkFn: (manual) => !!manual.communicationRhythm && (
          !!manual.communicationRhythm.repairProtocol ||
          !!manual.communicationRhythm.weeklySyncConfig
        ),
      },
      {
        requirementId: 'l2-repair-protocol',
        description: 'Repair protocol defined',
        checkFn: (manual) =>
          !!manual.communicationRhythm?.repairProtocol?.steps &&
          manual.communicationRhythm.repairProtocol.steps.length >= 2,
      },
    ],
  },
  3: {
    layerId: 3,
    layerName: 'Memory/Structure',
    requirements: [
      {
        requirementId: 'l3-boundaries-min',
        description: 'At least 2 boundaries defined',
        minCount: 2,
        checkFn: (manual) => manual.boundaries.length >= 2,
      },
      {
        requirementId: 'l3-boundaries-categorized',
        description: 'Boundaries categorized (immovable/negotiable)',
        checkFn: (manual) => manual.boundaries.some((b) => b.category === 'immovable'),
      },
    ],
  },
  4: {
    layerId: 4,
    layerName: 'Execution/Strategies',
    requirements: [
      {
        requirementId: 'l4-strategies-min',
        description: 'At least 2 strategies documented',
        minCount: 2,
        checkFn: (manual) => manual.strategies.length >= 2,
      },
      {
        requirementId: 'l4-rituals',
        description: 'At least 1 weekly ritual defined',
        checkFn: (manual) =>
          !!manual.rolesAndRituals?.weeklyRituals &&
          manual.rolesAndRituals.weeklyRituals.length >= 1,
      },
    ],
  },
  5: {
    layerId: 5,
    layerName: 'Outputs/Growth',
    requirements: [
      {
        requirementId: 'l5-pulse-assessment',
        description: 'Household Pulse assessment completed',
        checkFn: (manual) =>
          !!manual.householdPulse?.currentAssessment &&
          Object.keys(manual.householdPulse.currentAssessment).length > 0,
      },
    ],
  },
  6: {
    layerId: 6,
    layerName: 'Values/Principles',
    requirements: [
      {
        requirementId: 'l6-values-min',
        description: 'At least 3 family values documented',
        minCount: 3,
        checkFn: (manual) => manual.familyValues.length >= 3,
      },
      {
        requirementId: 'l6-charter-mission',
        description: 'Family mission defined in Home Charter',
        checkFn: (manual) => !!manual.homeCharter?.familyMission,
      },
      {
        requirementId: 'l6-non-negotiables',
        description: 'At least 2 non-negotiables documented',
        minCount: 2,
        checkFn: (manual) =>
          !!manual.homeCharter?.nonNegotiables &&
          manual.homeCharter.nonNegotiables.length >= 2,
      },
    ],
  },
};

// ==================== Helper Functions ====================

/**
 * Check all baseline requirements for a specific layer
 */
export function checkLayerBaseline(
  manual: HouseholdManual,
  layerId: LayerId
): { complete: boolean; requirements: Array<BaselineRequirement & { isMet: boolean }> } {
  const config = LAYER_BASELINES[layerId];
  const requirements = config.requirements.map((req) => ({
    ...req,
    layerId,
    isMet: req.checkFn(manual),
  }));

  return {
    complete: requirements.every((r) => r.isMet),
    requirements,
  };
}

/**
 * Calculate completion percentage for a layer's baseline
 */
export function calculateLayerBaselinePercentage(
  manual: HouseholdManual,
  layerId: LayerId
): number {
  const { requirements } = checkLayerBaseline(manual, layerId);
  if (requirements.length === 0) return 100;
  const metCount = requirements.filter((r) => r.isMet).length;
  return Math.round((metCount / requirements.length) * 100);
}

/**
 * Get all missing baseline requirements for specified layers
 */
export function getMissingBaselines(
  manual: HouseholdManual,
  layerIds: LayerId[]
): Array<BaselineRequirement & { isMet: boolean }> {
  const missing: Array<BaselineRequirement & { isMet: boolean }> = [];

  for (const layerId of layerIds) {
    const { requirements } = checkLayerBaseline(manual, layerId);
    const unmet = requirements.filter((r) => !r.isMet);
    missing.push(...unmet);
  }

  return missing;
}

/**
 * Check if all required layers for a focus domain are complete
 */
export function areDomainBaselinesComplete(
  manual: HouseholdManual,
  requiredLayers: LayerId[]
): boolean {
  return requiredLayers.every((layerId) => {
    const { complete } = checkLayerBaseline(manual, layerId);
    return complete;
  });
}

// ==================== Child Manual Baseline Checks ====================

export interface ChildBaselineRequirement {
  requirementId: string;
  description: string;
  checkFn: (manual: ChildManual) => boolean;
}

export const CHILD_MANUAL_BASELINES: ChildBaselineRequirement[] = [
  {
    requirementId: 'child-triggers',
    description: 'At least 3 triggers documented',
    checkFn: (manual) => (manual.triggers?.length ?? 0) >= 3,
  },
  {
    requirementId: 'child-strategies',
    description: 'At least 2 strategies documented',
    checkFn: (manual) => (manual.strategies?.length ?? 0) >= 2,
  },
  {
    requirementId: 'child-boundaries',
    description: 'At least 1 boundary defined',
    checkFn: (manual) => (manual.boundaries?.length ?? 0) >= 1,
  },
];

/**
 * Check if a child manual has sufficient baseline for workbook generation
 */
export function checkChildManualBaseline(
  manual: ChildManual
): { complete: boolean; requirements: Array<ChildBaselineRequirement & { isMet: boolean }> } {
  const requirements = CHILD_MANUAL_BASELINES.map((req) => ({
    ...req,
    isMet: req.checkFn(manual),
  }));

  return {
    complete: requirements.every((r) => r.isMet),
    requirements,
  };
}
