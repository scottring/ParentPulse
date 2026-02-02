/**
 * Baseline Requirements Configuration
 *
 * Defines the minimum requirements for each layer that must be met
 * before certain focus domains can be selected for weekly planning.
 */

import type { LayerId, HouseholdManual } from '@/types/household-workbook';
import type { ChildManual, MarriageManual } from '@/types/manual';

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
  layerId: LayerId;
  minCount?: number;
  checkFn: (manual: ChildManual) => boolean;
}

export const CHILD_MANUAL_BASELINES: ChildBaselineRequirement[] = [
  // L1: Triggers (Foundation)
  {
    requirementId: 'child-triggers-min',
    layerId: 1,
    description: 'At least 3 triggers documented',
    minCount: 3,
    checkFn: (manual) => (manual.triggers?.length ?? 0) >= 3,
  },
  {
    requirementId: 'child-triggers-severity',
    layerId: 1,
    description: 'Trigger severity levels assigned',
    checkFn: (manual) => manual.triggers?.some((t) => t.severity !== undefined) ?? false,
  },

  // L4: Strategies
  {
    requirementId: 'child-strategies-min',
    layerId: 4,
    description: 'At least 2 strategies documented',
    minCount: 2,
    checkFn: (manual) => ((manual.whatWorks?.length ?? 0) + (manual.whatDoesntWork?.length ?? 0)) >= 2,
  },
  {
    requirementId: 'child-strategies-effective',
    layerId: 4,
    description: 'At least 1 "what works" strategy',
    checkFn: (manual) => (manual.whatWorks?.length ?? 0) >= 1,
  },

  // L3: Boundaries
  {
    requirementId: 'child-boundaries-min',
    layerId: 3,
    description: 'At least 1 boundary defined',
    minCount: 1,
    checkFn: (manual) => (manual.boundaries?.length ?? 0) >= 1,
  },

  // L2: Connection/Regulation
  {
    requirementId: 'child-regulation',
    layerId: 2,
    description: 'Regulation approach documented',
    checkFn: (manual) =>
      !!manual.coreInfo?.sensoryNeeds ||
      (manual.repairStrategies?.length ?? 0) >= 1,
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

/**
 * Calculate completion percentage for child manual baseline
 */
export function calculateChildManualBaselinePercentage(manual: ChildManual): number {
  const { requirements } = checkChildManualBaseline(manual);
  if (requirements.length === 0) return 100;
  const metCount = requirements.filter((r) => r.isMet).length;
  return Math.round((metCount / requirements.length) * 100);
}

/**
 * Get layer-specific progress for a child manual
 */
export function getChildManualLayerProgress(
  manual: ChildManual
): Record<LayerId, { met: number; total: number; percentage: number }> {
  const { requirements } = checkChildManualBaseline(manual);

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

  return layerProgress;
}

// ==================== Marriage Manual Baseline Checks ====================

export interface MarriageBaselineRequirement {
  requirementId: string;
  description: string;
  layerId: LayerId;
  minCount?: number;
  checkFn: (manual: MarriageManual) => boolean;
}

export const MARRIAGE_MANUAL_BASELINES: MarriageBaselineRequirement[] = [
  // L2: Communication
  {
    requirementId: 'marriage-communication',
    layerId: 2,
    description: 'Communication preferences documented',
    checkFn: (manual) =>
      !!manual.coreInfo?.communicationStyles?.partner1 ||
      (manual.triggers?.length ?? 0) >= 1,
  },
  {
    requirementId: 'marriage-repair',
    layerId: 2,
    description: 'Repair approach defined',
    checkFn: (manual) => (manual.repairStrategies?.length ?? 0) >= 1,
  },

  // L4: Strategies / What Works
  {
    requirementId: 'marriage-strategies',
    layerId: 4,
    description: 'At least 2 connection strategies',
    minCount: 2,
    checkFn: (manual) => (manual.whatWorks?.length ?? 0) >= 2,
  },

  // L6: Values
  {
    requirementId: 'marriage-values',
    layerId: 6,
    description: 'Shared values documented',
    checkFn: (manual) => (manual.coreInfo?.sharedValues?.length ?? 0) >= 1,
  },

  // L3: Boundaries
  {
    requirementId: 'marriage-boundaries',
    layerId: 3,
    description: 'At least 1 relationship boundary',
    checkFn: (manual) => (manual.boundaries?.length ?? 0) >= 1,
  },
];

/**
 * Check if a marriage manual has sufficient baseline
 */
export function checkMarriageManualBaseline(
  manual: MarriageManual
): { complete: boolean; requirements: Array<MarriageBaselineRequirement & { isMet: boolean }> } {
  const requirements = MARRIAGE_MANUAL_BASELINES.map((req) => ({
    ...req,
    isMet: req.checkFn(manual),
  }));

  return {
    complete: requirements.every((r) => r.isMet),
    requirements,
  };
}

/**
 * Calculate completion percentage for marriage manual baseline
 */
export function calculateMarriageManualBaselinePercentage(manual: MarriageManual): number {
  const { requirements } = checkMarriageManualBaseline(manual);
  if (requirements.length === 0) return 100;
  const metCount = requirements.filter((r) => r.isMet).length;
  return Math.round((metCount / requirements.length) * 100);
}

// ==================== Person Manual Baseline Checks (Legacy) ====================

import type { PersonManual } from '@/types/person-manual';

export interface PersonBaselineRequirement {
  requirementId: string;
  description: string;
  layerId: LayerId;
  minCount?: number;
  checkFn: (manual: PersonManual) => boolean;
}

/**
 * Baseline requirements for legacy PersonManual type
 * Maps to the same layer structure as ChildManual
 */
export const PERSON_MANUAL_BASELINES: PersonBaselineRequirement[] = [
  // L1: Triggers (Foundation)
  {
    requirementId: 'person-triggers-min',
    layerId: 1,
    description: 'At least 3 triggers documented',
    minCount: 3,
    checkFn: (manual) => (manual.triggers?.length ?? 0) >= 3,
  },
  {
    requirementId: 'person-triggers-severity',
    layerId: 1,
    description: 'Trigger severity levels assigned',
    checkFn: (manual) => manual.triggers?.some((t) => t.severity !== undefined) ?? false,
  },

  // L4: Strategies
  {
    requirementId: 'person-strategies-min',
    layerId: 4,
    description: 'At least 2 strategies documented',
    minCount: 2,
    checkFn: (manual) => ((manual.whatWorks?.length ?? 0) + (manual.whatDoesntWork?.length ?? 0)) >= 2,
  },
  {
    requirementId: 'person-strategies-effective',
    layerId: 4,
    description: 'At least 1 "what works" strategy',
    checkFn: (manual) => (manual.whatWorks?.length ?? 0) >= 1,
  },

  // L3: Boundaries
  {
    requirementId: 'person-boundaries-min',
    layerId: 3,
    description: 'At least 1 boundary defined',
    minCount: 1,
    checkFn: (manual) => (manual.boundaries?.length ?? 0) >= 1,
  },

  // L2: Connection/Regulation
  {
    requirementId: 'person-regulation',
    layerId: 2,
    description: 'Regulation approach documented',
    checkFn: (manual) =>
      !!manual.coreInfo?.sensoryNeeds?.length ||
      (manual.whatWorks?.length ?? 0) >= 1,
  },
];

/**
 * Check if a person manual has sufficient baseline for workbook generation
 */
export function checkPersonManualBaseline(
  manual: PersonManual
): { complete: boolean; requirements: Array<PersonBaselineRequirement & { isMet: boolean }> } {
  const requirements = PERSON_MANUAL_BASELINES.map((req) => ({
    ...req,
    isMet: req.checkFn(manual),
  }));

  return {
    complete: requirements.every((r) => r.isMet),
    requirements,
  };
}

/**
 * Calculate completion percentage for person manual baseline
 */
export function calculatePersonManualBaselinePercentage(manual: PersonManual): number {
  const { requirements } = checkPersonManualBaseline(manual);
  if (requirements.length === 0) return 100;
  const metCount = requirements.filter((r) => r.isMet).length;
  return Math.round((metCount / requirements.length) * 100);
}

/**
 * Get layer-specific progress for a person manual
 */
export function getPersonManualLayerProgress(
  manual: PersonManual
): Record<LayerId, { met: number; total: number; percentage: number }> {
  const { requirements } = checkPersonManualBaseline(manual);

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

  return layerProgress;
}
