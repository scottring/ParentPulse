/**
 * Onboarding Journey Progress Types
 *
 * Tracks structured progress through the 6-layer manual onboarding,
 * including milestones and graduation status.
 */

import { Timestamp } from 'firebase/firestore';
import type { LayerId } from './assessment';
import type { RespondentType } from './multi-perspective';

// ==================== Progress Status Types ====================

/**
 * Status of a single layer's onboarding progress
 */
export type LayerOnboardingStatusType =
  | 'not_started'
  | 'in_progress'
  | 'awaiting_input'   // Waiting for other respondents
  | 'synthesizing'     // AI synthesis in progress
  | 'complete';

/**
 * Status of AI synthesis for a layer
 */
export type SynthesisStatusType = 'pending' | 'complete' | 'needs_review';

/**
 * Manual types that support onboarding journey
 */
export type OnboardingManualType = 'child' | 'adult' | 'marriage' | 'household' | 'person';

// ==================== Layer Progress Types ====================

/**
 * Detailed status for a single layer's onboarding
 */
export interface LayerOnboardingStatus {
  layerId: LayerId;
  layerName: string;
  status: LayerOnboardingStatusType;

  // Content tracking
  requiredItems: number;
  completedItems: number;
  contentPercentage: number;

  // Multi-perspective tracking
  requiredRespondents: RespondentType[];
  completedRespondents: RespondentType[];
  perspectivePercentage: number;

  // Synthesis status
  synthesisStatus: SynthesisStatusType;

  // Timestamps
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

// ==================== Milestone Types ====================

/**
 * A milestone achievement in the onboarding journey
 */
export interface OnboardingMilestone {
  milestoneId: string;
  name: string;
  description: string;
  icon?: string;
  achievedAt?: Timestamp;
  celebrationShown: boolean;
}

/**
 * Configuration for defining milestones
 */
export interface MilestoneConfig {
  milestoneId: string;
  name: string;
  description: string;
  icon?: string;
  triggerCondition: (progress: OnboardingProgress) => boolean;
}

// ==================== Main Progress Types ====================

/**
 * Complete onboarding progress for a manual
 */
export interface OnboardingProgress {
  progressId: string;
  manualId: string;
  manualType: OnboardingManualType;
  personId?: string;    // For individual manuals
  familyId: string;

  // Timeline
  startedAt: Timestamp;
  graduatedAt?: Timestamp;  // Set when complete

  // Layer-by-layer progress (keyed by layer number 1-6)
  layers: {
    [layerId: number]: LayerOnboardingStatus;
  };

  // Overall status
  currentLayer: LayerId;           // Which layer user is working on
  completedLayers: LayerId[];      // Fully graduated layers
  overallPercentage: number;       // 0-100

  // Milestones
  milestones: OnboardingMilestone[];

  // Metadata
  lastActivityAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== Layer Requirement Types ====================

/**
 * Minimum requirements for a layer to be considered complete
 */
export interface LayerRequirement {
  layerId: LayerId;
  layerName: string;

  // Content requirements
  contentRequirements: ContentRequirement[];

  // Respondent requirements
  minimumRespondents: number;
  requiredRespondentTypes?: RespondentType[];
}

/**
 * A specific content requirement within a layer
 */
export interface ContentRequirement {
  requirementId: string;
  description: string;
  category: string;       // e.g., 'triggers', 'strategies', 'boundaries'
  minimumCount: number;
  checkFn?: (manual: any) => number;  // Returns count of items meeting requirement
}

/**
 * Complete requirements configuration for a manual type
 */
export interface ManualLayerRequirements {
  manualType: OnboardingManualType;
  layers: LayerRequirement[];
}

// ==================== Journey Configuration Types ====================

/**
 * Configuration for the onboarding journey
 */
export interface JourneyConfig {
  manualType: OnboardingManualType;

  // Layer order (top-down: L6 → L1)
  layerOrder: LayerId[];

  // Requirements per layer
  requirements: ManualLayerRequirements;

  // Milestones
  milestones: MilestoneConfig[];

  // Display strings
  layerDisplayNames: Record<LayerId, string>;
  layerDescriptions: Record<LayerId, string>;
}

// ==================== Constants ====================

/**
 * Default layer order: Values → Outputs → Execution → Structure → Processing → Inputs
 */
export const DEFAULT_LAYER_ORDER: LayerId[] = [6, 5, 4, 3, 2, 1];

/**
 * Layer display names
 */
export const LAYER_DISPLAY_NAMES: Record<LayerId, string> = {
  1: 'Inputs & Triggers',
  2: 'Processing & Co-Regulation',
  3: 'Memory & Structure',
  4: 'Execution & Strategies',
  5: 'Outputs & Growth',
  6: 'Values & Principles',
};

/**
 * Layer descriptions for onboarding
 */
export const LAYER_DESCRIPTIONS: Record<LayerId, string> = {
  1: 'What sets us off - triggers, sensory sensitivities, warning signs',
  2: 'How we help each other regulate - co-regulation needs, communication style',
  3: 'What boundaries and structures support us - routines, expectations',
  4: 'What works and doesn\'t work - strategies, daily routines',
  5: 'What does flourishing look like - goals, aspirations, signs of thriving',
  6: 'What matters most - core values, guiding principles, non-negotiables',
};

// ==================== Helper Functions ====================

/**
 * Calculate overall completion percentage from layer statuses
 */
export function calculateOverallPercentage(layers: Record<number, LayerOnboardingStatus>): number {
  const layerValues = Object.values(layers);
  if (layerValues.length === 0) return 0;

  const totalPercentage = layerValues.reduce((sum, layer) => {
    // Weight content and perspective equally
    const layerPercentage = (layer.contentPercentage + layer.perspectivePercentage) / 2;
    return sum + layerPercentage;
  }, 0);

  return Math.round(totalPercentage / layerValues.length);
}

/**
 * Check if a layer is ready to start (previous layers complete)
 */
export function isLayerReady(
  layerId: LayerId,
  completedLayers: LayerId[],
  layerOrder: LayerId[] = DEFAULT_LAYER_ORDER
): boolean {
  const layerIndex = layerOrder.indexOf(layerId);
  if (layerIndex === 0) return true; // First layer is always ready

  // Check all previous layers are complete
  for (let i = 0; i < layerIndex; i++) {
    if (!completedLayers.includes(layerOrder[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Get the next layer to work on
 */
export function getNextLayer(
  completedLayers: LayerId[],
  layerOrder: LayerId[] = DEFAULT_LAYER_ORDER
): LayerId | null {
  for (const layerId of layerOrder) {
    if (!completedLayers.includes(layerId)) {
      return layerId;
    }
  }
  return null; // All layers complete
}

/**
 * Check if all layers are complete (ready for graduation)
 */
export function isReadyForGraduation(
  completedLayers: LayerId[],
  layerOrder: LayerId[] = DEFAULT_LAYER_ORDER
): boolean {
  return layerOrder.every((layerId) => completedLayers.includes(layerId));
}

/**
 * Create initial layer status for a new journey
 */
export function createInitialLayerStatus(
  layerId: LayerId,
  requirement: LayerRequirement
): LayerOnboardingStatus {
  return {
    layerId,
    layerName: requirement.layerName,
    status: 'not_started',
    requiredItems: requirement.contentRequirements.reduce((sum, r) => sum + r.minimumCount, 0),
    completedItems: 0,
    contentPercentage: 0,
    requiredRespondents: requirement.requiredRespondentTypes || [],
    completedRespondents: [],
    perspectivePercentage: 0,
    synthesisStatus: 'pending',
  };
}
