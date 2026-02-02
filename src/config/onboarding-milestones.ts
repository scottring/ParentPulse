/**
 * Onboarding Milestones Configuration
 *
 * Defines milestone achievements and their trigger conditions
 * for the manual onboarding journey.
 */

import type { MilestoneConfig, OnboardingProgress } from '@/types/onboarding-progress';
import type { RespondentType } from '@/types/multi-perspective';

// ==================== Helper Functions ====================

/**
 * Count unique respondents across all layers
 */
function countUniqueRespondents(progress: OnboardingProgress): number {
  const respondents = new Set<string>();

  for (const layer of Object.values(progress.layers)) {
    for (const respondent of layer.completedRespondents) {
      respondents.add(respondent);
    }
  }

  return respondents.size;
}

/**
 * Check if a specific layer is complete
 */
function isLayerComplete(progress: OnboardingProgress, layerId: number): boolean {
  return progress.completedLayers.includes(layerId as 1 | 2 | 3 | 4 | 5 | 6);
}

// ==================== Milestone Definitions ====================

/**
 * Universal milestones applicable to all manual types
 */
export const UNIVERSAL_MILESTONES: MilestoneConfig[] = [
  {
    milestoneId: 'first-layer',
    name: 'Foundation Set',
    description: 'Values layer (L6) complete - you know your "why"',
    icon: '🏛️',
    triggerCondition: (progress) => isLayerComplete(progress, 6),
  },
  {
    milestoneId: 'halfway',
    name: 'Halfway There',
    description: '3 of 6 layers complete',
    icon: '🌗',
    triggerCondition: (progress) => progress.completedLayers.length >= 3,
  },
  {
    milestoneId: 'multi-perspective',
    name: 'Many Eyes',
    description: 'Collected input from 3+ family members',
    icon: '👀',
    triggerCondition: (progress) => countUniqueRespondents(progress) >= 3,
  },
  {
    milestoneId: 'strategies-complete',
    name: 'Toolbox Ready',
    description: 'Strategies layer (L4) complete - you have your toolkit',
    icon: '🧰',
    triggerCondition: (progress) => isLayerComplete(progress, 4),
  },
  {
    milestoneId: 'triggers-complete',
    name: 'Self-Aware',
    description: 'Triggers layer (L1) complete - you know your signals',
    icon: '🔔',
    triggerCondition: (progress) => isLayerComplete(progress, 1),
  },
  {
    milestoneId: 'graduation',
    name: 'Ready to Breathe',
    description: 'All 6 layers baselined - manual is alive!',
    icon: '🎉',
    triggerCondition: (progress) => progress.completedLayers.length === 6,
  },
];

/**
 * Child manual specific milestones
 */
export const CHILD_MANUAL_MILESTONES: MilestoneConfig[] = [
  ...UNIVERSAL_MILESTONES,
  {
    milestoneId: 'child-voice',
    name: 'Their Voice Heard',
    description: 'Child contributed their own perspective',
    icon: '🗣️',
    triggerCondition: (progress) => {
      for (const layer of Object.values(progress.layers)) {
        if (layer.completedRespondents.includes('self')) {
          return true;
        }
      }
      return false;
    },
  },
];

/**
 * Adult manual specific milestones
 */
export const ADULT_MANUAL_MILESTONES: MilestoneConfig[] = [
  ...UNIVERSAL_MILESTONES,
  {
    milestoneId: 'partner-input',
    name: 'Partner Perspective',
    description: 'Partner contributed their observations',
    icon: '💑',
    triggerCondition: (progress) => {
      for (const layer of Object.values(progress.layers)) {
        if (layer.completedRespondents.includes('partner')) {
          return true;
        }
      }
      return false;
    },
  },
];

/**
 * Household manual specific milestones
 */
export const HOUSEHOLD_MANUAL_MILESTONES: MilestoneConfig[] = [
  ...UNIVERSAL_MILESTONES,
  {
    milestoneId: 'charter-complete',
    name: 'Charter Drafted',
    description: 'Home Charter (values & non-negotiables) complete',
    icon: '📜',
    triggerCondition: (progress) => isLayerComplete(progress, 6),
  },
  {
    milestoneId: 'rhythm-established',
    name: 'Rhythm Established',
    description: 'Communication rhythm and repair protocol defined',
    icon: '🎵',
    triggerCondition: (progress) => isLayerComplete(progress, 2),
  },
];

// ==================== Milestone Lookup ====================

/**
 * Get milestones for a specific manual type
 */
export function getMilestonesForManualType(manualType: string): MilestoneConfig[] {
  switch (manualType) {
    case 'child':
      return CHILD_MANUAL_MILESTONES;
    case 'adult':
      return ADULT_MANUAL_MILESTONES;
    case 'household':
      return HOUSEHOLD_MANUAL_MILESTONES;
    default:
      return UNIVERSAL_MILESTONES;
  }
}

/**
 * Check which milestones have been newly achieved
 */
export function checkNewlyAchievedMilestones(
  progress: OnboardingProgress,
  manualType: string
): MilestoneConfig[] {
  const milestoneConfigs = getMilestonesForManualType(manualType);
  const achievedMilestoneIds = new Set(
    progress.milestones.filter((m) => m.achievedAt).map((m) => m.milestoneId)
  );

  return milestoneConfigs.filter((config) => {
    // Not already achieved and condition is met
    return !achievedMilestoneIds.has(config.milestoneId) && config.triggerCondition(progress);
  });
}

/**
 * Get milestone progress summary
 */
export function getMilestoneProgress(
  progress: OnboardingProgress,
  manualType: string
): {
  achieved: number;
  total: number;
  percentage: number;
  nextMilestone?: MilestoneConfig;
} {
  const milestoneConfigs = getMilestonesForManualType(manualType);
  const achieved = progress.milestones.filter((m) => m.achievedAt).length;
  const total = milestoneConfigs.length;

  // Find next unachieved milestone
  const achievedIds = new Set(
    progress.milestones.filter((m) => m.achievedAt).map((m) => m.milestoneId)
  );
  const nextMilestone = milestoneConfigs.find(
    (config) => !achievedIds.has(config.milestoneId)
  );

  return {
    achieved,
    total,
    percentage: Math.round((achieved / total) * 100),
    nextMilestone,
  };
}

// ==================== Celebration Messages ====================

/**
 * Get celebration message for a milestone
 */
export function getCelebrationMessage(milestoneId: string): {
  title: string;
  message: string;
  encouragement: string;
} {
  const celebrations: Record<string, { title: string; message: string; encouragement: string }> = {
    'first-layer': {
      title: 'Foundation Set! 🏛️',
      message: 'You\'ve established your core values - the foundation everything else builds on.',
      encouragement: 'This clarity will guide every decision in the manual.',
    },
    'halfway': {
      title: 'Halfway There! 🌗',
      message: 'Three layers complete. You\'re building something meaningful.',
      encouragement: 'The momentum is building. Keep going!',
    },
    'multi-perspective': {
      title: 'Many Eyes! 👀',
      message: 'Multiple family members have contributed their perspectives.',
      encouragement: 'Different viewpoints create a richer, more accurate picture.',
    },
    'strategies-complete': {
      title: 'Toolbox Ready! 🧰',
      message: 'You now have a complete toolkit of strategies that work.',
      encouragement: 'These proven approaches will serve you well.',
    },
    'triggers-complete': {
      title: 'Self-Aware! 🔔',
      message: 'You\'ve mapped out the warning signs and triggers.',
      encouragement: 'Awareness is the first step to better responses.',
    },
    'graduation': {
      title: 'Ready to Breathe! 🎉',
      message: 'All six layers are complete. Your manual is alive!',
      encouragement: 'This is just the beginning - your manual will grow with you.',
    },
    'child-voice': {
      title: 'Their Voice Heard! 🗣️',
      message: 'The child has shared their own perspective.',
      encouragement: 'Their input makes this manual truly theirs too.',
    },
    'partner-input': {
      title: 'Partner Perspective! 💑',
      message: 'Your partner has contributed their observations.',
      encouragement: 'Two perspectives create a more complete picture.',
    },
    'charter-complete': {
      title: 'Charter Drafted! 📜',
      message: 'Your family\'s values and non-negotiables are documented.',
      encouragement: 'This charter will guide your household decisions.',
    },
    'rhythm-established': {
      title: 'Rhythm Established! 🎵',
      message: 'Your communication rhythm and repair protocols are set.',
      encouragement: 'Healthy communication is the heartbeat of family life.',
    },
  };

  return celebrations[milestoneId] || {
    title: 'Milestone Achieved!',
    message: 'You\'ve made important progress.',
    encouragement: 'Keep building your manual!',
  };
}
