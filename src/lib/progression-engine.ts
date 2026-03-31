import {
  GrowthStage,
  StageCriteria,
  STAGE_THRESHOLDS,
} from '@/types/growth-arc';

/**
 * Compute what stage a domain should be at based on criteria.
 */
export function computeStage(criteria: StageCriteria): GrowthStage {
  const stages: GrowthStage[] = ['learning', 'growing', 'mastering', 'assimilating'];

  for (let i = stages.length - 1; i >= 1; i--) {
    const stage = stages[i];
    const thresholds = STAGE_THRESHOLDS[stage];
    if (meetsThresholds(criteria, thresholds)) {
      return stage;
    }
  }

  return 'learning';
}

/**
 * Compute progress (0.0 - 1.0) toward the next stage.
 */
export function computeStageProgress(
  currentStage: GrowthStage,
  criteria: StageCriteria,
): number {
  const nextStageMap: Record<GrowthStage, GrowthStage | null> = {
    learning: 'growing',
    growing: 'mastering',
    mastering: 'assimilating',
    assimilating: null,
  };

  const nextStage = nextStageMap[currentStage];
  if (!nextStage) return 1.0; // Already at top

  const thresholds = STAGE_THRESHOLDS[nextStage];
  const factors: number[] = [];

  if (thresholds.dimensionsAtLevel !== undefined) {
    factors.push(Math.min(1, criteria.dimensionsAtLevel / thresholds.dimensionsAtLevel));
  }
  if (thresholds.averageDomainScore !== undefined) {
    factors.push(Math.min(1, criteria.averageDomainScore / thresholds.averageDomainScore));
  }
  if (thresholds.totalItemsCompleted !== undefined) {
    factors.push(Math.min(1, criteria.totalItemsCompleted / thresholds.totalItemsCompleted));
  }
  if (thresholds.positiveReactionRate !== undefined && thresholds.positiveReactionRate > 0) {
    factors.push(Math.min(1, criteria.positiveReactionRate / thresholds.positiveReactionRate));
  }
  if (thresholds.streakDays !== undefined && thresholds.streakDays > 0) {
    factors.push(Math.min(1, criteria.streakDays / thresholds.streakDays));
  }

  if (factors.length === 0) return 0;
  return factors.reduce((a, b) => a + b, 0) / factors.length;
}

/**
 * Get human-readable requirements for advancing to the next stage.
 */
export function getAdvancementRequirements(
  currentStage: GrowthStage,
  criteria: StageCriteria,
): string[] {
  const nextStageMap: Record<GrowthStage, GrowthStage | null> = {
    learning: 'growing',
    growing: 'mastering',
    mastering: 'assimilating',
    assimilating: null,
  };

  const nextStage = nextStageMap[currentStage];
  if (!nextStage) return ['You have reached completeness.'];

  const thresholds = STAGE_THRESHOLDS[nextStage];
  const remaining: string[] = [];

  if (thresholds.dimensionsAtLevel !== undefined &&
      criteria.dimensionsAtLevel < thresholds.dimensionsAtLevel) {
    const needed = thresholds.dimensionsAtLevel - criteria.dimensionsAtLevel;
    remaining.push(`Complete ${needed} more growth arc${needed > 1 ? 's' : ''}`);
  }
  if (thresholds.averageDomainScore !== undefined &&
      criteria.averageDomainScore < thresholds.averageDomainScore) {
    remaining.push(`Raise average score to ${thresholds.averageDomainScore}`);
  }
  if (thresholds.totalItemsCompleted !== undefined &&
      criteria.totalItemsCompleted < thresholds.totalItemsCompleted) {
    const needed = thresholds.totalItemsCompleted - criteria.totalItemsCompleted;
    remaining.push(`Complete ${needed} more activities`);
  }
  if (thresholds.positiveReactionRate !== undefined &&
      criteria.positiveReactionRate < thresholds.positiveReactionRate) {
    remaining.push(`Reach ${Math.round(thresholds.positiveReactionRate * 100)}% positive reaction rate`);
  }
  if (thresholds.streakDays !== undefined &&
      criteria.streakDays < thresholds.streakDays) {
    const needed = thresholds.streakDays - criteria.streakDays;
    remaining.push(`Build a ${needed}-day streak`);
  }

  return remaining.length > 0 ? remaining : ['All requirements met!'];
}

/**
 * Get display metadata for a stage.
 */
export function getStageDisplay(stage: GrowthStage) {
  const displays: Record<GrowthStage, {
    label: string;
    emoji: string;
    color: string;
    description: string;
    philosophy: string;
  }> = {
    learning: {
      label: 'LEARNING',
      emoji: '🌱',
      color: '#d97706',
      description: 'Understand yourself and your relationships',
      philosophy: 'Every journey begins with honest observation.',
    },
    growing: {
      label: 'GROWING',
      emoji: '🌿',
      color: '#65a30d',
      description: 'Practice new patterns daily',
      philosophy: 'Growth happens in the small, repeated moments.',
    },
    mastering: {
      label: 'MASTERING',
      emoji: '🌳',
      color: '#16a34a',
      description: 'Refine and integrate what you\'ve learned',
      philosophy: 'Mastery is not perfection — it\'s deep familiarity.',
    },
    assimilating: {
      label: 'ASSIMILATING',
      emoji: '🏔️',
      color: '#b8860b',
      description: 'The practices are part of who you are',
      philosophy: 'What was once effort is now nature.',
    },
  };

  return displays[stage];
}

/**
 * Compute overall stage from domain progressions (minimum of all domains).
 */
export function computeOverallStage(
  domainStages: GrowthStage[],
): GrowthStage {
  const order: GrowthStage[] = ['learning', 'growing', 'mastering', 'assimilating'];

  if (domainStages.length === 0) return 'learning';

  let minIndex = order.length - 1;
  for (const stage of domainStages) {
    const idx = order.indexOf(stage);
    if (idx < minIndex) minIndex = idx;
  }

  return order[minIndex];
}

function meetsThresholds(
  criteria: StageCriteria,
  thresholds: Partial<StageCriteria>,
): boolean {
  if (thresholds.dimensionsAtLevel !== undefined &&
      criteria.dimensionsAtLevel < thresholds.dimensionsAtLevel) return false;
  if (thresholds.averageDomainScore !== undefined &&
      criteria.averageDomainScore < thresholds.averageDomainScore) return false;
  if (thresholds.totalItemsCompleted !== undefined &&
      criteria.totalItemsCompleted < thresholds.totalItemsCompleted) return false;
  if (thresholds.positiveReactionRate !== undefined &&
      criteria.positiveReactionRate < thresholds.positiveReactionRate) return false;
  if (thresholds.streakDays !== undefined &&
      criteria.streakDays < thresholds.streakDays) return false;
  return true;
}
