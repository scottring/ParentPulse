/**
 * Layer Requirements Configuration
 *
 * Defines minimum requirements for each layer per manual type
 * to be considered "complete" during onboarding.
 */

import type { LayerId } from '@/types/assessment';
import type {
  ManualLayerRequirements,
  LayerRequirement,
  ContentRequirement,
} from '@/types/onboarding-progress';
import type { PersonManual } from '@/types/person-manual';
import type { ChildManual } from '@/types/manual';

// ==================== Child Manual Requirements ====================

export const CHILD_LAYER_REQUIREMENTS: ManualLayerRequirements = {
  manualType: 'child',
  layers: [
    // L6: Values & Principles
    {
      layerId: 6,
      layerName: 'Values & Principles',
      contentRequirements: [
        {
          requirementId: 'child-values',
          description: 'Core values documented',
          category: 'values',
          minimumCount: 2,
        },
        {
          requirementId: 'child-principles',
          description: 'Guiding principles identified',
          category: 'principles',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['parent'],
    },
    // L5: Outputs & Growth
    {
      layerId: 5,
      layerName: 'Outputs & Growth',
      contentRequirements: [
        {
          requirementId: 'child-growth-goals',
          description: 'Growth goals defined',
          category: 'goals',
          minimumCount: 2,
        },
        {
          requirementId: 'child-thriving-signs',
          description: 'Signs of thriving identified',
          category: 'thriving',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['parent'],
    },
    // L4: Execution & Strategies
    {
      layerId: 4,
      layerName: 'Execution & Strategies',
      contentRequirements: [
        {
          requirementId: 'child-what-works',
          description: 'What works strategies',
          category: 'strategies',
          minimumCount: 2,
        },
        {
          requirementId: 'child-what-doesnt',
          description: 'What doesn\'t work documented',
          category: 'avoid',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['parent', 'self'],
    },
    // L3: Memory & Structure
    {
      layerId: 3,
      layerName: 'Memory & Structure',
      contentRequirements: [
        {
          requirementId: 'child-boundaries',
          description: 'Boundaries defined',
          category: 'boundaries',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['parent'],
    },
    // L2: Processing & Co-Regulation
    {
      layerId: 2,
      layerName: 'Processing & Co-Regulation',
      contentRequirements: [
        {
          requirementId: 'child-regulation',
          description: 'Regulation approach documented',
          category: 'regulation',
          minimumCount: 1,
        },
        {
          requirementId: 'child-coregulation',
          description: 'Co-regulation needs identified',
          category: 'coregulation',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['parent'],
    },
    // L1: Inputs & Triggers
    {
      layerId: 1,
      layerName: 'Inputs & Triggers',
      contentRequirements: [
        {
          requirementId: 'child-triggers',
          description: 'Triggers documented',
          category: 'triggers',
          minimumCount: 3,
        },
        {
          requirementId: 'child-trigger-severity',
          description: 'Trigger severity rated',
          category: 'severity',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['parent', 'self'],
    },
  ],
};

// ==================== Person Manual Requirements ====================

export const PERSON_LAYER_REQUIREMENTS: ManualLayerRequirements = {
  manualType: 'person',
  layers: [
    // L6: Values & Principles
    {
      layerId: 6,
      layerName: 'Values & Principles',
      contentRequirements: [
        {
          requirementId: 'person-values',
          description: 'Core values documented',
          category: 'values',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 1,
    },
    // L5: Outputs & Growth
    {
      layerId: 5,
      layerName: 'Outputs & Growth',
      contentRequirements: [
        {
          requirementId: 'person-goals',
          description: 'Goals documented',
          category: 'goals',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
    },
    // L4: Execution & Strategies
    {
      layerId: 4,
      layerName: 'Execution & Strategies',
      contentRequirements: [
        {
          requirementId: 'person-strategies',
          description: 'Strategies documented',
          category: 'strategies',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 1,
    },
    // L3: Memory & Structure
    {
      layerId: 3,
      layerName: 'Memory & Structure',
      contentRequirements: [
        {
          requirementId: 'person-boundaries',
          description: 'Boundaries defined',
          category: 'boundaries',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
    },
    // L2: Processing & Co-Regulation
    {
      layerId: 2,
      layerName: 'Processing & Co-Regulation',
      contentRequirements: [
        {
          requirementId: 'person-regulation',
          description: 'Regulation approach documented',
          category: 'regulation',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 1,
    },
    // L1: Inputs & Triggers
    {
      layerId: 1,
      layerName: 'Inputs & Triggers',
      contentRequirements: [
        {
          requirementId: 'person-triggers',
          description: 'Triggers documented',
          category: 'triggers',
          minimumCount: 3,
        },
      ],
      minimumRespondents: 1,
    },
  ],
};

// ==================== Adult Manual Requirements ====================

export const ADULT_LAYER_REQUIREMENTS: ManualLayerRequirements = {
  manualType: 'adult',
  layers: [
    // L6: Values & Principles
    {
      layerId: 6,
      layerName: 'Values & Principles',
      contentRequirements: [
        {
          requirementId: 'adult-values',
          description: 'Core values documented',
          category: 'values',
          minimumCount: 3,
        },
        {
          requirementId: 'adult-principles',
          description: 'Guiding principles identified',
          category: 'principles',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['self'],
    },
    // L5: Outputs & Growth
    {
      layerId: 5,
      layerName: 'Outputs & Growth',
      contentRequirements: [
        {
          requirementId: 'adult-goals',
          description: 'Personal goals defined',
          category: 'goals',
          minimumCount: 3,
        },
        {
          requirementId: 'adult-thriving',
          description: 'Thriving indicators identified',
          category: 'thriving',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['self'],
    },
    // L4: Execution & Strategies
    {
      layerId: 4,
      layerName: 'Execution & Strategies',
      contentRequirements: [
        {
          requirementId: 'adult-strategies',
          description: 'Effective strategies documented',
          category: 'strategies',
          minimumCount: 3,
        },
        {
          requirementId: 'adult-routines',
          description: 'Key routines identified',
          category: 'routines',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['self', 'partner'],
    },
    // L3: Memory & Structure
    {
      layerId: 3,
      layerName: 'Memory & Structure',
      contentRequirements: [
        {
          requirementId: 'adult-immovable-boundaries',
          description: 'Immovable boundaries defined',
          category: 'boundaries-immovable',
          minimumCount: 2,
        },
        {
          requirementId: 'adult-negotiable-boundaries',
          description: 'Negotiable boundaries defined',
          category: 'boundaries-negotiable',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 1,
      requiredRespondentTypes: ['self'],
    },
    // L2: Processing & Co-Regulation
    {
      layerId: 2,
      layerName: 'Processing & Co-Regulation',
      contentRequirements: [
        {
          requirementId: 'adult-communication',
          description: 'Communication style documented',
          category: 'communication',
          minimumCount: 1,
        },
        {
          requirementId: 'adult-repair',
          description: 'Repair approach defined',
          category: 'repair',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['self', 'partner'],
    },
    // L1: Inputs & Triggers
    {
      layerId: 1,
      layerName: 'Inputs & Triggers',
      contentRequirements: [
        {
          requirementId: 'adult-triggers',
          description: 'Triggers documented',
          category: 'triggers',
          minimumCount: 3,
        },
        {
          requirementId: 'adult-warning-signs',
          description: 'Warning signs identified',
          category: 'warning-signs',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['self', 'partner'],
    },
  ],
};

// ==================== Household Manual Requirements ====================

export const HOUSEHOLD_LAYER_REQUIREMENTS: ManualLayerRequirements = {
  manualType: 'household',
  layers: [
    // L6: Values & Principles (Home Charter)
    {
      layerId: 6,
      layerName: 'Home Charter',
      contentRequirements: [
        {
          requirementId: 'household-mission',
          description: 'Family mission defined',
          category: 'mission',
          minimumCount: 1,
        },
        {
          requirementId: 'household-non-negotiables',
          description: 'Non-negotiables documented',
          category: 'non-negotiables',
          minimumCount: 3,
        },
      ],
      minimumRespondents: 2,
      requiredRespondentTypes: ['parent', 'partner'],
    },
    // L5: Outputs (Household Pulse)
    {
      layerId: 5,
      layerName: 'Household Pulse',
      contentRequirements: [
        {
          requirementId: 'household-goals',
          description: 'Shared family goals',
          category: 'goals',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
    },
    // L4: Execution (Roles & Rituals)
    {
      layerId: 4,
      layerName: 'Roles & Rituals',
      contentRequirements: [
        {
          requirementId: 'household-rituals',
          description: 'Family rituals defined',
          category: 'rituals',
          minimumCount: 2,
        },
        {
          requirementId: 'household-fairplay',
          description: 'Fair Play awareness',
          category: 'fairplay',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 2,
    },
    // L3: Memory & Structure (Household Boundaries)
    {
      layerId: 3,
      layerName: 'Household Boundaries',
      contentRequirements: [
        {
          requirementId: 'household-boundaries',
          description: 'Household boundaries',
          category: 'boundaries',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
    },
    // L2: Processing (Communication Rhythm)
    {
      layerId: 2,
      layerName: 'Communication Rhythm',
      contentRequirements: [
        {
          requirementId: 'household-sync',
          description: 'Weekly sync configured',
          category: 'sync',
          minimumCount: 1,
        },
        {
          requirementId: 'household-repair',
          description: 'Repair protocol defined',
          category: 'repair',
          minimumCount: 1,
        },
      ],
      minimumRespondents: 2,
    },
    // L1: Inputs (Sanctuary Map)
    {
      layerId: 1,
      layerName: 'Sanctuary Map',
      contentRequirements: [
        {
          requirementId: 'household-zones',
          description: 'Home zones mapped',
          category: 'zones',
          minimumCount: 2,
        },
        {
          requirementId: 'household-triggers',
          description: 'Household triggers identified',
          category: 'triggers',
          minimumCount: 2,
        },
      ],
      minimumRespondents: 2,
    },
  ],
};

// ==================== Requirements Lookup ====================

/**
 * Get layer requirements for a specific manual type
 */
export function getLayerRequirements(manualType: string): ManualLayerRequirements {
  switch (manualType) {
    case 'child':
      return CHILD_LAYER_REQUIREMENTS;
    case 'person':
      return PERSON_LAYER_REQUIREMENTS;
    case 'adult':
      return ADULT_LAYER_REQUIREMENTS;
    case 'household':
      return HOUSEHOLD_LAYER_REQUIREMENTS;
    default:
      // Default to person requirements
      return PERSON_LAYER_REQUIREMENTS;
  }
}

/**
 * Get requirements for a specific layer within a manual type
 */
export function getLayerRequirement(
  manualType: string,
  layerId: LayerId
): LayerRequirement | undefined {
  const requirements = getLayerRequirements(manualType);
  return requirements.layers.find((l) => l.layerId === layerId);
}

/**
 * Check content count against requirements
 */
export function checkContentRequirement(
  requirement: ContentRequirement,
  count: number
): { met: boolean; current: number; required: number } {
  return {
    met: count >= requirement.minimumCount,
    current: count,
    required: requirement.minimumCount,
  };
}
