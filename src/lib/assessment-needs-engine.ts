import { DimensionAssessment } from '@/types/growth-arc';
import {
  DimensionId,
  getDimension,
  ALL_DIMENSIONS,
  AssessmentPromptTemplate,
} from '@/config/relationship-dimensions';

// ==================== Types ====================

export type AssessmentNeedReason =
  | 'below_minimum_data'
  | 'low_confidence'
  | 'stale_data'
  | 'contradiction_detected'
  | 'acute_event_impact'
  | 'user_requested';

export interface AssessmentNeed {
  dimensionId: DimensionId;
  reason: AssessmentNeedReason;
  priority: 'high' | 'medium' | 'low';
  suggestedPrompts: AssessmentPromptTemplate[];
  promptCount: number;
  contextMessage: string;
}

// ==================== Constants ====================

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_ACTIVE_DAYS = 30;
const STALE_LOW_CONFIDENCE_DAYS = 14;
const STALE_GENERAL_DAYS = 60;

// ==================== Context message templates ====================

function contextMessage(reason: AssessmentNeedReason, dimensionName: string): string {
  switch (reason) {
    case 'below_minimum_data':
      return `We don\u2019t have a clear picture of ${dimensionName} yet. Two quick questions would help.`;
    case 'low_confidence':
      return `Your ${dimensionName} score is based on limited data. Want to sharpen the picture?`;
    case 'stale_data':
      return `It\u2019s been a while since we checked in on ${dimensionName}. Things may have shifted.`;
    case 'contradiction_detected':
      return `Your recent reflection suggests something new about ${dimensionName}. Let\u2019s update the picture.`;
    case 'acute_event_impact':
      return `That event may have affected ${dimensionName}. A couple of questions would help us understand.`;
    case 'user_requested':
      return `Let\u2019s go deeper on ${dimensionName}.`;
  }
}

// ==================== Prompt selection ====================

/**
 * Select unanswered prompts for a dimension, sorted by weight descending.
 * Filters by perspective if provided.
 */
function selectPrompts(
  dimensionId: DimensionId,
  answeredIds: string[],
  count: number,
  perspective?: 'self' | 'observer',
): AssessmentPromptTemplate[] {
  const dim = getDimension(dimensionId);
  if (!dim) return [];

  const available = dim.assessmentPrompts.filter((p) => {
    if (answeredIds.includes(p.promptId)) return false;
    if (perspective) {
      return p.forPerspective === perspective || p.forPerspective === 'either';
    }
    return true;
  });

  return [...available]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);
}

// ==================== Staleness helper ====================

function daysSinceLastAssessment(assessment: DimensionAssessment): number {
  const lastAt = assessment.lastAssessedAt?.toMillis?.();
  if (!lastAt) return Infinity;
  return (Date.now() - lastAt) / DAY_MS;
}

// ==================== Core engine ====================

/**
 * Compute which dimensions need more data and which questions to surface.
 *
 * Priority logic:
 *   HIGH (2-3 questions):
 *     - below minDataPointsForScore AND active workbook dimension
 *     - acute event on low-confidence dimension
 *     - contradiction detected
 *   MEDIUM (1-2 questions):
 *     - low confidence + stale (14+ days)
 *     - active workbook dimension stale (30+ days)
 *   LOW (1 question):
 *     - any dimension below 'high' confidence stale 60+ days
 *     - only onboarding data (no post-onboarding prompts answered)
 */
export function computeAssessmentNeeds(
  assessments: DimensionAssessment[],
  activeWorkbookDimensionIds: DimensionId[],
  recentAcuteEventDimensionIds?: DimensionId[],
  contradictionDimensionIds?: DimensionId[],
  userRequestedDimensionIds?: DimensionId[],
): AssessmentNeed[] {
  const needs: AssessmentNeed[] = [];
  const acuteIds = recentAcuteEventDimensionIds || [];
  const contradictionIds = contradictionDimensionIds || [];
  const requestedIds = userRequestedDimensionIds || [];

  // Build a lookup of assessments by dimensionId
  const assessmentMap = new Map<DimensionId, DimensionAssessment>();
  for (const a of assessments) {
    assessmentMap.set(a.dimensionId, a);
  }

  // Track which dimensions already have a need (avoid duplicates — keep highest priority)
  const handled = new Set<DimensionId>();

  // --------------- User requested (always high priority) ---------------
  for (const dimId of requestedIds) {
    const dim = getDimension(dimId);
    if (!dim) continue;
    const assessment = assessmentMap.get(dimId);
    const answered = assessment?.assessmentProgress?.promptsAnswered || [];
    const prompts = selectPrompts(dimId, answered, 3);
    if (prompts.length === 0) continue;

    needs.push({
      dimensionId: dimId,
      reason: 'user_requested',
      priority: 'high',
      suggestedPrompts: prompts,
      promptCount: prompts.length,
      contextMessage: contextMessage('user_requested', dim.name),
    });
    handled.add(dimId);
  }

  // --------------- High priority ---------------

  // Contradiction detected
  for (const dimId of contradictionIds) {
    if (handled.has(dimId)) continue;
    const dim = getDimension(dimId);
    if (!dim) continue;
    const assessment = assessmentMap.get(dimId);
    const answered = assessment?.assessmentProgress?.promptsAnswered || [];
    const prompts = selectPrompts(dimId, answered, 3);
    if (prompts.length === 0) continue;

    needs.push({
      dimensionId: dimId,
      reason: 'contradiction_detected',
      priority: 'high',
      suggestedPrompts: prompts,
      promptCount: prompts.length,
      contextMessage: contextMessage('contradiction_detected', dim.name),
    });
    handled.add(dimId);
  }

  // Below minimum data + active workbook
  for (const dimId of activeWorkbookDimensionIds) {
    if (handled.has(dimId)) continue;
    const dim = getDimension(dimId);
    if (!dim) continue;
    const assessment = assessmentMap.get(dimId);
    const dataPoints = assessment?.dataPointCount || 0;

    if (dataPoints < dim.minDataPointsForScore) {
      const answered = assessment?.assessmentProgress?.promptsAnswered || [];
      const prompts = selectPrompts(dimId, answered, 3);
      if (prompts.length === 0) continue;

      needs.push({
        dimensionId: dimId,
        reason: 'below_minimum_data',
        priority: 'high',
        suggestedPrompts: prompts,
        promptCount: prompts.length,
        contextMessage: contextMessage('below_minimum_data', dim.name),
      });
      handled.add(dimId);
    }
  }

  // Acute event on low-confidence dimension
  for (const dimId of acuteIds) {
    if (handled.has(dimId)) continue;
    const dim = getDimension(dimId);
    if (!dim) continue;
    const assessment = assessmentMap.get(dimId);
    if (!assessment || assessment.confidence === 'high') continue;

    const answered = assessment.assessmentProgress?.promptsAnswered || [];
    const prompts = selectPrompts(dimId, answered, 2);
    if (prompts.length === 0) continue;

    needs.push({
      dimensionId: dimId,
      reason: 'acute_event_impact',
      priority: 'high',
      suggestedPrompts: prompts,
      promptCount: prompts.length,
      contextMessage: contextMessage('acute_event_impact', dim.name),
    });
    handled.add(dimId);
  }

  // --------------- Medium priority ---------------

  for (const assessment of assessments) {
    const dimId = assessment.dimensionId;
    if (handled.has(dimId)) continue;
    const dim = getDimension(dimId);
    if (!dim) continue;
    const staleDays = daysSinceLastAssessment(assessment);
    const answered = assessment.assessmentProgress?.promptsAnswered || [];

    // Low confidence + stale 14+ days
    if (assessment.confidence === 'low' && staleDays >= STALE_LOW_CONFIDENCE_DAYS) {
      const prompts = selectPrompts(dimId, answered, 2);
      if (prompts.length === 0) continue;

      needs.push({
        dimensionId: dimId,
        reason: 'low_confidence',
        priority: 'medium',
        suggestedPrompts: prompts,
        promptCount: prompts.length,
        contextMessage: contextMessage('low_confidence', dim.name),
      });
      handled.add(dimId);
      continue;
    }

    // Active workbook dimension stale 30+ days
    if (activeWorkbookDimensionIds.includes(dimId) && staleDays >= STALE_ACTIVE_DAYS) {
      const prompts = selectPrompts(dimId, answered, 2);
      if (prompts.length === 0) continue;

      needs.push({
        dimensionId: dimId,
        reason: 'stale_data',
        priority: 'medium',
        suggestedPrompts: prompts,
        promptCount: prompts.length,
        contextMessage: contextMessage('stale_data', dim.name),
      });
      handled.add(dimId);
    }
  }

  // --------------- Low priority ---------------

  for (const assessment of assessments) {
    const dimId = assessment.dimensionId;
    if (handled.has(dimId)) continue;
    const dim = getDimension(dimId);
    if (!dim) continue;
    const staleDays = daysSinceLastAssessment(assessment);
    const answered = assessment.assessmentProgress?.promptsAnswered || [];

    // Below high confidence + stale 60+ days
    if (assessment.confidence !== 'high' && staleDays >= STALE_GENERAL_DAYS) {
      const prompts = selectPrompts(dimId, answered, 1);
      if (prompts.length === 0) continue;

      needs.push({
        dimensionId: dimId,
        reason: 'stale_data',
        priority: 'low',
        suggestedPrompts: prompts,
        promptCount: prompts.length,
        contextMessage: contextMessage('stale_data', dim.name),
      });
      handled.add(dimId);
      continue;
    }

    // Only onboarding data — no post-onboarding prompts answered yet
    if (answered.length === 0 && assessment.dataPointCount > 0) {
      const prompts = selectPrompts(dimId, answered, 1);
      if (prompts.length === 0) continue;

      needs.push({
        dimensionId: dimId,
        reason: 'low_confidence',
        priority: 'low',
        suggestedPrompts: prompts,
        promptCount: prompts.length,
        contextMessage: contextMessage('low_confidence', dim.name),
      });
      handled.add(dimId);
    }
  }

  // Sort: high first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  needs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return needs;
}

/**
 * Detect workbook reflection contradictions.
 * Returns dimension IDs where the reflection rating contradicts the current score.
 */
export function detectContradictions(
  dimensionId: DimensionId,
  reflectionRating: 'didnt_try' | 'tried_hard' | 'went_okay' | 'went_well',
  currentScore: number,
): boolean {
  // "went_well" but score is low → contradiction
  if (reflectionRating === 'went_well' && currentScore < 2.0) return true;
  // "tried_hard" (struggled) but score is high → contradiction
  if (reflectionRating === 'tried_hard' && currentScore > 4.0) return true;
  return false;
}
