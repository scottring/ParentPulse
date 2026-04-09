import { DimensionDomain } from '@/config/relationship-dimensions';
import { DimensionAssessment, ScoreSnapshot } from '@/types/growth-arc';
import {
  DomainScore,
  DomainWeights,
  DimensionScore,
  PerspectiveZone,
  PerspectiveType,
  OverallHealth,
  ScoreTrend,
  DEFAULT_DOMAIN_WEIGHTS,
} from '@/types/ring-scores';
import { Timestamp } from 'firebase/firestore';

/**
 * Compute score for a single domain by averaging its constituent dimension assessments.
 */
export function computeDomainScore(
  assessments: DimensionAssessment[],
  domain: DimensionDomain,
): DomainScore {
  const domainAssessments = assessments.filter((a) => a.domain === domain);

  if (domainAssessments.length === 0) {
    return {
      domain,
      score: 0,
      dimensionScores: [],
      perspectiveZones: [],
      confidence: 'low',
      trend: 'insufficient_data',
    };
  }

  const dimensionScores: DimensionScore[] = domainAssessments.map((a) => ({
    dimensionId: a.dimensionId,
    score: a.currentScore,
    confidence: a.confidence,
  }));

  const avgScore =
    dimensionScores.reduce((sum, d) => sum + d.score, 0) /
    dimensionScores.length;

  // Aggregate confidence: if any are low → low, if all high → high, else medium
  const confidences = dimensionScores.map((d) => d.confidence);
  const confidence = confidences.includes('low')
    ? 'low'
    : confidences.every((c) => c === 'high')
      ? 'high'
      : 'medium';

  // Compute perspective zones (self/spouse/kids scores for this domain)
  const perspectiveZones = computePerspectiveZones(domainAssessments, domain);

  // Compute trend from all score histories in this domain
  const allHistories = domainAssessments.flatMap((a) => a.scoreHistory || []);
  const trend = computeTrend(allHistories);

  return {
    domain,
    score: Math.round(avgScore * 10) / 10,
    dimensionScores,
    perspectiveZones,
    confidence,
    trend,
  };
}

/**
 * Compute overall health from domain scores with weights.
 */
export function computeOverallHealth(
  assessments: DimensionAssessment[],
  weights: DomainWeights = DEFAULT_DOMAIN_WEIGHTS,
): OverallHealth {
  const domains: DimensionDomain[] = ['self', 'couple', 'parent_child'];
  const domainScores = domains.map((d) => computeDomainScore(assessments, d));

  // Only include domains that have scores
  const scoredDomains = domainScores.filter((d) => d.score > 0);

  let overallScore = 0;
  if (scoredDomains.length > 0) {
    const weightMap: Record<DimensionDomain, number> = {
      self: weights.self,
      couple: weights.couple,
      parent_child: weights.parent_child,
    };

    // Normalize weights to only scored domains
    const totalWeight = scoredDomains.reduce(
      (sum, d) => sum + weightMap[d.domain],
      0,
    );

    if (totalWeight > 0) {
      overallScore = scoredDomains.reduce(
        (sum, d) => sum + d.score * (weightMap[d.domain] / totalWeight),
        0,
      );
    }
  }

  // Overall trend from domain trends
  const trends = scoredDomains.map((d) => d.trend);
  const overallTrend = aggregateTrends(trends);

  // Find most recent assessment update
  let lastUpdated: Timestamp | null = null;
  for (const a of assessments) {
    if (!lastUpdated || (a.updatedAt && a.updatedAt.toMillis() > lastUpdated.toMillis())) {
      lastUpdated = a.updatedAt;
    }
  }

  return {
    score: Math.round(overallScore * 10) / 10,
    weights,
    domainScores,
    trend: overallTrend,
    lastUpdated,
  };
}

/**
 * Map a 1.0-5.0 score to a CSS color on the red-amber-green spectrum.
 */
export function scoreToColor(score: number): string {
  if (score <= 0) return '#4A4238'; // gray for no data
  if (score < 2.0) return '#dc2626'; // red-600
  if (score < 3.0) return '#ea580c'; // orange-600
  if (score < 3.5) return '#d97706'; // amber-600
  if (score < 4.0) return '#65a30d'; // lime-600
  return '#16a34a'; // green-600
}

/**
 * Generate a CSS radial gradient for the center ring based on score.
 */
export function scoreToGradient(score: number): string {
  const color = scoreToColor(score);
  return `radial-gradient(circle, ${color}40, ${color}20)`;
}

/**
 * Compute trend from score history snapshots.
 * Looks at the last 3+ snapshots to determine direction.
 */
export function computeTrend(history: ScoreSnapshot[]): ScoreTrend {
  if (!history || history.length < 2) return 'insufficient_data';

  // Sort by timestamp, most recent last
  const sorted = [...history].sort(
    (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis(),
  );

  // Use last 5 snapshots max
  const recent = sorted.slice(-5);
  if (recent.length < 2) return 'insufficient_data';

  const first = recent[0].score;
  const last = recent[recent.length - 1].score;
  const diff = last - first;

  if (diff > 0.3) return 'improving';
  if (diff < -0.3) return 'declining';
  return 'stable';
}

/**
 * Compute perspective zones for a domain.
 * Aggregates perspectiveScores from constituent dimension assessments.
 */
function computePerspectiveZones(
  domainAssessments: DimensionAssessment[],
  domain: DimensionDomain,
): PerspectiveZone[] {
  const perspectives: PerspectiveType[] = ['self', 'spouse', 'kids'];

  return perspectives.map((perspective) => {
    const scores = domainAssessments
      .map((a) => a.perspectiveScores?.[perspective])
      .filter((s): s is number => s !== undefined && s > 0);

    const score = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
      : 0;

    return {
      domain,
      perspective,
      score,
      confidence: scores.length >= 3 ? 'high' : scores.length >= 1 ? 'medium' : 'low',
    };
  });
}

/**
 * Find the baseline (first "initial") snapshot for a dimension assessment.
 * Returns null if no baseline exists.
 */
export function getBaselineSnapshot(assessment: DimensionAssessment): ScoreSnapshot | null {
  if (!assessment.scoreHistory || assessment.scoreHistory.length === 0) return null;

  // Prefer explicitly flagged baseline
  const flagged = assessment.scoreHistory.find((s) => s.isBaseline);
  if (flagged) return flagged;

  // Fall back to first 'initial' trigger
  const sorted = [...assessment.scoreHistory].sort(
    (a, b) => a.timestamp.toMillis() - b.timestamp.toMillis(),
  );
  return sorted.find((s) => s.trigger === 'initial') ?? sorted[0];
}

function aggregateTrends(trends: ScoreTrend[]): ScoreTrend {
  const meaningful = trends.filter((t) => t !== 'insufficient_data');
  if (meaningful.length === 0) return 'insufficient_data';

  const improving = meaningful.filter((t) => t === 'improving').length;
  const declining = meaningful.filter((t) => t === 'declining').length;

  if (improving > declining) return 'improving';
  if (declining > improving) return 'declining';
  return 'stable';
}
