/**
 * Surface Recipe Definitions + Eligibility Engine
 *
 * Two exported functions:
 *   getRecipeForStage — returns the ordered candidate lists for a given dashboard stage
 *   resolveRecipe     — evaluates eligibility against live data and returns which
 *                       hero + grid tiles to show
 */

import type {
  HeroModuleId,
  GridModuleId,
  SurfaceData,
  SurfaceRecipe,
  ResolvedSurface,
} from '@/types/surface-recipe';
import type { DashboardState } from '@/hooks/useDashboard';

// ==================== Stage Recipes ====================

const RECIPES: Record<DashboardState, SurfaceRecipe> = {
  loading: {
    heroCandidates: ['stage-cta-self'],
    gridCandidates: [],
    maxGridTiles: 0,
  },
  new_user: {
    heroCandidates: ['stage-cta-self'],
    gridCandidates: [],
    maxGridTiles: 0,
  },
  self_complete: {
    heroCandidates: ['stage-cta-add-person'],
    gridCandidates: ['reflection-prompt'],
    maxGridTiles: 1,
  },
  has_people: {
    heroCandidates: ['stage-cta-contribute'],
    gridCandidates: ['contribution-needed', 'invite-spouse'],
    maxGridTiles: 2,
  },
  has_contributions: {
    heroCandidates: ['fresh-synthesis', 'stage-cta-contribute'],
    gridCandidates: ['ritual-setup', 'perspective-gap'],
    maxGridTiles: 2,
  },
  active: {
    heroCandidates: [
      'fresh-synthesis',
      'person-spotlight',
      'journal-echo',
      'next-action',
      'calm',
    ],
    gridCandidates: [
      'ritual-info',
      'micro-activity',
      'pattern-detected',
      'blind-spot',
      'growth-arc',
      'recent-journal',
      'family-freshness',
    ],
    maxGridTiles: 6,
  },
};

/**
 * Returns the SurfaceRecipe for the given dashboard stage.
 * `loading` maps to the new_user recipe (same conservative defaults).
 */
export function getRecipeForStage(stage: DashboardState): SurfaceRecipe {
  return RECIPES[stage] ?? RECIPES['new_user'];
}

// ==================== Eligibility Checks ====================

type HeroEligibilityFn = (data: SurfaceData) => boolean;
type GridEligibilityFn = (data: SurfaceData) => boolean;

const HERO_ELIGIBILITY: Record<HeroModuleId, HeroEligibilityFn> = {
  'stage-cta-self': (data) => !data.hasSelfContribution,

  'stage-cta-add-person': (data) =>
    data.hasSelfContribution && data.people.length <= 1,

  'stage-cta-contribute': (data) =>
    data.peopleNeedingContributions.length > 0,

  'fresh-synthesis': (data) =>
    data.manuals.some((m) => m.synthesizedContent?.lastSynthesizedAt != null),

  'person-spotlight': (data) =>
    data.manuals.some(
      (m) =>
        (m.synthesizedContent?.alignments?.length ?? 0) > 0 ||
        (m.synthesizedContent?.gaps?.length ?? 0) > 0 ||
        (m.synthesizedContent?.blindSpots?.length ?? 0) > 0
    ),

  'journal-echo': (data) => data.echo != null,

  'next-action': (data) =>
    data.actionItems.length > 0 || data.ritual != null,

  // terminal fallback — always eligible
  calm: () => true,
};

const GRID_ELIGIBILITY: Record<GridModuleId, GridEligibilityFn> = {
  'ritual-info': (data) =>
    data.ritual != null && data.ritual.status === 'active',

  'micro-activity': (data) =>
    data.activeGrowthItems.some((item) => item.type === 'micro_activity'),

  'pattern-detected': (data) =>
    data.journalEntries.some(
      (entry) => (entry.enrichment?.themes?.length ?? 0) > 0
    ),

  'blind-spot': (data) =>
    data.manuals.some(
      (m) => (m.synthesizedContent?.blindSpots?.length ?? 0) > 0
    ),

  'growth-arc': (data) =>
    data.arcGroups.some((group) => group.arc.status === 'active'),

  'dinner-prompt': (data) => data.dinnerPrompt != null,

  'recent-journal': (data) => data.journalEntries.length > 0,

  'family-freshness': (data) => data.people.length > 1,

  'reflection-prompt': (data) =>
    data.activeGrowthItems.some((item) => item.type === 'reflection_prompt'),

  'perspective-gap': (data) =>
    data.manuals.some(
      (m) => (m.perspectives?.observers?.length ?? 0) === 0
    ),

  'ritual-setup': (data) => data.ritual == null && data.spouse != null,

  'invite-spouse': (data) =>
    data.spouse != null && (data.spouse.linkedUserId == null || data.spouse.linkedUserId === undefined),

  'contribution-needed': (data) =>
    data.peopleNeedingContributions.length > 0,
};

// ==================== Resolver ====================

/**
 * Evaluates eligibility against live SurfaceData and returns the resolved surface:
 * - hero: first eligible hero candidate, defaulting to 'calm'
 * - gridTiles: first N eligible grid candidates up to maxGridTiles
 */
export function resolveRecipe(data: SurfaceData): ResolvedSurface {
  const recipe = getRecipeForStage(data.stage);

  // Resolve hero: first eligible candidate wins
  let hero: HeroModuleId = 'calm';
  for (const candidate of recipe.heroCandidates) {
    const eligible = HERO_ELIGIBILITY[candidate];
    if (eligible && eligible(data)) {
      hero = candidate;
      break;
    }
  }

  // Resolve grid: collect eligible candidates up to maxGridTiles
  const gridTiles: GridModuleId[] = [];
  for (const candidate of recipe.gridCandidates) {
    if (gridTiles.length >= recipe.maxGridTiles) break;
    const eligible = GRID_ELIGIBILITY[candidate];
    if (eligible && eligible(data)) {
      gridTiles.push(candidate);
    }
  }

  return { hero, gridTiles };
}
