import { DimensionScore, ScoreTrend, OverallHealth } from '@/types/ring-scores';
import { getDimension, DimensionId, DimensionDomain } from '@/config/relationship-dimensions';
import type { DashboardState, UserRole } from '@/hooks/useDashboard';

// ==================== Climate Types ====================

export type ClimateState = 'clear' | 'mostly_sunny' | 'partly_cloudy' | 'overcast' | 'stormy';

export interface Climate {
  state: ClimateState;
  gradient: string;
  label: string;
  trendPhrase: string;
  iconName: ClimateState;
}

export interface Force {
  dimensionId: DimensionId;
  name: string;
  shortDescription: string;
  score: number;
  direction: 'lifting' | 'weighing';
}

export interface ForcesResult {
  lifting: Force[];
  weighing: Force[];
}

// ==================== Score → Climate Mapping ====================

const TREND_PHRASES: Record<ScoreTrend, string> = {
  improving: 'and brightening',
  stable: 'holding steady',
  declining: 'with some shifts ahead',
  insufficient_data: 'still reading the skies',
};

export function scoreToClimate(score: number, trend: ScoreTrend): Climate {
  let state: ClimateState;
  let gradient: string;
  let label: string;

  if (score >= 4.0) {
    state = 'clear';
    gradient = 'linear-gradient(135deg, #FAF8F5 0%, #E8DFD4 40%, #B8C5B5 100%)';
    label = 'Clear skies';
  } else if (score >= 3.5) {
    state = 'mostly_sunny';
    gradient = 'linear-gradient(135deg, #FAF8F5 0%, #E2DDD6 50%, #C4CFC7 100%)';
    label = 'Mostly sunny';
  } else if (score >= 3.0) {
    state = 'partly_cloudy';
    gradient = 'linear-gradient(135deg, #F5F2EE 0%, #DDD8D1 50%, #C8C3BC 100%)';
    label = 'Partly cloudy';
  } else if (score >= 2.0) {
    state = 'overcast';
    gradient = 'linear-gradient(135deg, #E8E3DC 0%, #B8C5B5 40%, #7C9082 100%)';
    label = 'Overcast';
  } else {
    state = 'stormy';
    gradient = 'linear-gradient(135deg, #7C9082 0%, #4A6B5E 50%, #2D5F5D 100%)';
    label = 'Heavy weather';
  }

  const trendPhrase = TREND_PHRASES[trend];

  return {
    state,
    gradient,
    label: `${label}, ${trendPhrase}`,
    trendPhrase,
    iconName: state,
  };
}

// ==================== Onboarding Climate ====================

interface OnboardingClimate {
  gradient: string;
  message: string;
}

export function getOnboardingClimate(state: DashboardState, userName?: string): OnboardingClimate {
  const name = userName || 'there';

  switch (state) {
    case 'new_user':
      return {
        gradient: 'linear-gradient(135deg, #FDF6EE 0%, #F5E6D3 50%, #E8DFD4 100%)',
        message: `Welcome, ${name}. Let\u2019s start with you.`,
      };
    case 'self_complete':
      return {
        gradient: 'linear-gradient(135deg, #FAF8F5 0%, #F0E8DD 50%, #D4CFC7 100%)',
        message: `Nice start. Now let\u2019s add the people in your life.`,
      };
    case 'has_people':
      return {
        gradient: 'linear-gradient(135deg, #FAF8F5 0%, #E8E0D6 50%, #C8C3BC 100%)',
        message: `Almost there. Share what you\u2019ve noticed.`,
      };
    case 'has_contributions':
      return {
        gradient: 'linear-gradient(135deg, #FAF8F5 0%, #E2DDD6 50%, #C4CFC7 100%)',
        message: `Ready to see the picture.`,
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #FAF8F5 0%, #E8DFD4 100%)',
        message: `Welcome back, ${name}.`,
      };
  }
}

// ==================== Force Classification ====================

export function classifyForces(dimensionScores: DimensionScore[]): ForcesResult {
  const forces: Force[] = dimensionScores
    .filter((d) => d.score > 0)
    .map((d) => {
      const def = getDimension(d.dimensionId);
      return {
        dimensionId: d.dimensionId,
        name: def?.name || d.dimensionId,
        shortDescription: def?.shortDescription || '',
        score: d.score,
        direction: d.score >= 3.5 ? 'lifting' as const : d.score < 3.0 ? 'weighing' as const : null,
      };
    })
    .filter((f): f is Force => f.direction !== null);

  const lifting = forces
    .filter((f) => f.direction === 'lifting')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const weighing = forces
    .filter((f) => f.direction === 'weighing')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return { lifting, weighing };
}

// ==================== Time-of-Day Greeting ====================

export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const displayName = name || 'there';

  if (hour < 12) return `Good morning, ${displayName}`;
  if (hour < 17) return `Good afternoon, ${displayName}`;
  return `Good evening, ${displayName}`;
}

// ==================== Climate Summary ====================

const DIMENSION_PHRASES_LOW: Partial<Record<DimensionId, string>> = {
  love_maps: 'You could know each other\u2019s worlds better.',
  fondness_admiration: 'Appreciation has been quiet lately.',
  turning_toward: 'Bids for connection are getting missed.',
  conflict_style: 'Conflict patterns need attention.',
  emotional_accessibility: 'It\u2019s hard to reach each other right now.',
  emotional_responsiveness: 'Emotional responses feel distant.',
  attachment_security: 'The sense of security feels shaky.',
  shared_meaning: 'Shared purpose could use some tending.',
  practical_partnership: 'The daily logistics feel uneven.',
  negative_cycles: 'Old patterns keep surfacing.',
  warmth_responsiveness: 'Warmth and attunement could be stronger.',
  structure_consistency: 'Routines and boundaries need some work.',
  autonomy_support: 'There\u2019s tension around independence.',
  repair_after_rupture: 'Repair after conflict isn\u2019t landing.',
  mindsight: 'Understanding their inner world is harder right now.',
  emotional_regulation: 'Emotional regulation is stretched thin.',
  self_care_burnout: 'Burnout is creeping in.',
  personal_growth: 'Personal growth feels stalled.',
  stress_management: 'Stress is piling up.',
  self_awareness: 'Self-awareness could use some space.',
};

function dimensionToPhrase(force: Force): string {
  return DIMENSION_PHRASES_LOW[force.dimensionId] || `${force.name} needs attention.`;
}

export function buildClimateSummary(health: OverallHealth, roles: UserRole[]): string {
  const parts: string[] = [];

  // Sentence 1: overall state
  const { score, trend } = health;
  if (score >= 4.0) {
    parts.push(trend === 'improving' ? 'Things are feeling really good.' : 'Things are feeling good.');
  } else if (score >= 3.5) {
    parts.push('Things are mostly steady.');
  } else if (score >= 3.0) {
    parts.push('There\u2019s some tension to work through.');
  } else if (score >= 2.0) {
    parts.push('It\u2019s a harder stretch right now.');
  } else if (score > 0) {
    parts.push('Things are really tough. But you\u2019re here.');
  }

  // Sentence 2: weakest dimension
  const allDimScores = health.domainScores.flatMap((d) => d.dimensionScores);
  const forces = classifyForces(allDimScores);
  if (forces.weighing.length > 0) {
    parts.push(dimensionToPhrase(forces.weighing[0]));
  }

  // Sentence 3: strongest relationship
  const coupleScore = health.domainScores.find((d) => d.domain === 'couple');
  if (coupleScore && coupleScore.score >= 3.5) {
    const spouseName = roles.find((r) => r.domain === 'couple')?.otherPerson.name;
    if (spouseName) {
      parts.push(`You and ${spouseName} are strong right now.`);
    }
  }

  return parts.join(' ');
}

// ==================== Relationship Phrases ====================

export function scoreToRelationshipPhrase(score: number, domain: DimensionDomain): string {
  if (score <= 0) return 'Not enough data yet';

  if (domain === 'couple') {
    if (score >= 4.0) return 'Warm & connected';
    if (score >= 3.5) return 'Strong foundation';
    if (score >= 3.0) return 'Some distance to close';
    if (score >= 2.0) return 'Needs attention';
    return 'In a rough patch';
  } else {
    if (score >= 4.0) return 'Bright & steady';
    if (score >= 3.5) return 'Good connection';
    if (score >= 3.0) return 'Getting there';
    if (score >= 2.0) return 'Needs more time together';
    return 'Struggling right now';
  }
}

// ==================== Data Confidence ====================

export interface DataConfidence {
  assessed: number;
  total: number;
  percentage: number;
  label: string;
  needsTopUp: boolean;
  topUpHref: string;
  topUpLabel: string;
}

export function computeDataConfidence(role: UserRole, demoQ: string = ''): DataConfidence {
  const totalDimensions = role.domain === 'couple' ? 10 : 5;
  const assessed = role.assessments.filter((a) => a.dataPointCount > 0).length;
  const percentage = Math.round((assessed / totalDimensions) * 100);
  const needsTopUp = percentage < 50 || !role.hasObserverContribution;

  const isChild = role.otherPerson.relationshipType === 'child';
  const topUpHref = isChild
    ? `/people/${role.otherPerson.personId}/manual/kid-session${demoQ}`
    : `/people/${role.otherPerson.personId}/manual/onboard${demoQ}`;
  const topUpLabel = isChild ? 'Start portrait session' : 'Add observations';

  return {
    assessed,
    total: totalDimensions,
    percentage,
    label: `${assessed} of ${totalDimensions} assessed`,
    needsTopUp,
    topUpHref,
    topUpLabel,
  };
}
