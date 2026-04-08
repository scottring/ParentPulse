import { Timestamp } from 'firebase/firestore';
import { DimensionId, DimensionDomain } from '@/config/relationship-dimensions';

// ==================== Arc Types ====================

export type ArcPhase = 'awareness' | 'practice' | 'integration';
export type ArcStatus = 'active' | 'paused' | 'completed' | 'graduated';

export interface ArcPhaseDefinition {
  phase: ArcPhase;
  weekStart: number;
  weekEnd: number;
  title: string;
  description: string;
  itemCount: number;
}

export interface ArcItemRef {
  growthItemId: string;
  sequenceNumber: number;
  phase: ArcPhase;
  week: number;
  isRequired: boolean;
  isAssessment: boolean;
}

export interface GrowthArc {
  arcId: string;
  familyId: string;

  // Target dimension
  dimensionId: DimensionId;
  dimensionName: string;
  domain: DimensionDomain;

  // Participants
  participantIds: string[];
  participantNames: string[];

  // Arc content
  title: string;
  subtitle: string;
  emoji: string;
  researchBasis: string;
  outcomeStatement: string;    // "After this, hard topics should feel safer"

  // Level progression
  level: 1 | 2 | 3;
  levelTitle: string;

  // Timing
  durationWeeks: number;
  startDate: Timestamp;
  targetEndDate: Timestamp;
  actualEndDate?: Timestamp;

  // Structure
  phases: ArcPhaseDefinition[];
  arcItems: ArcItemRef[];

  // Status
  status: ArcStatus;
  currentPhase: ArcPhase;
  currentWeek: number;

  // Assessment bookends
  preScore: number;
  postScore?: number;
  preConfidence: 'low' | 'medium' | 'high';
  postConfidence?: 'low' | 'medium' | 'high';

  // Graduation criteria
  graduationCriteria: {
    minItemsCompleted: number;
    minPositiveReactions: number;
    minScoreImprovement: number;
    targetPostScore: number;
  };

  // Progress tracking
  completedItemCount: number;
  totalItemCount: number;
  averageImpactRating: number;
  positiveReactionCount: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  generatedBy: 'ai';
}

// ==================== Dimension Assessment ====================

export interface ScoreSnapshot {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  timestamp: Timestamp;
  trigger: 'initial' | 'assessment_prompt' | 'arc_completion' | 'feedback_signal';
  isBaseline?: boolean;
}

export interface DimensionDataSource {
  sourceType: 'onboarding_answer' | 'assessment_prompt' | 'growth_feedback' | 'synthesis_insight';
  sourceId: string;
  signal: number;                // normalized 1-5
  weight: number;                // 0.0-1.0
  capturedAt: Timestamp;
}

export interface DimensionAssessment {
  assessmentId: string;
  familyId: string;
  dimensionId: DimensionId;
  domain: DimensionDomain;

  // Participants
  participantIds: string[];
  participantNames: string[];

  // Score
  currentScore: number;          // 1.0 - 5.0
  confidence: 'low' | 'medium' | 'high';
  dataPointCount: number;

  // Per-perspective sub-scores (for 9-zone visualization)
  perspectiveScores?: {
    self?: number;               // 1.0 - 5.0
    spouse?: number;
    kids?: number;
  };

  // History
  scoreHistory: ScoreSnapshot[];

  // Data sources
  dataSources: DimensionDataSource[];

  // Assessment progress
  assessmentProgress: {
    promptsDelivered: string[];
    promptsAnswered: string[];
    existingDataUsed: boolean;
  };

  // Arc linkage
  activeArcId?: string;
  completedArcIds: string[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAssessedAt: Timestamp;
}

// ==================== Domain Progression ====================

export type GrowthStage = 'learning' | 'growing' | 'mastering' | 'assimilating';

export interface StageCriteria {
  dimensionsAtLevel: number;
  averageDomainScore: number;
  totalItemsCompleted: number;
  positiveReactionRate: number;
  streakDays: number;
}

export interface DomainProgression {
  progressionId: string;
  familyId: string;
  domain: DimensionDomain;

  stage: GrowthStage;
  stageEnteredAt: Timestamp;
  stageProgress: number; // 0.0 - 1.0

  criteria: StageCriteria;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Stage advancement thresholds
export const STAGE_THRESHOLDS: Record<GrowthStage, Partial<StageCriteria>> = {
  learning: {}, // starting stage — no requirements
  growing: {
    dimensionsAtLevel: 2,
    averageDomainScore: 2.5,
    totalItemsCompleted: 20,
  },
  mastering: {
    dimensionsAtLevel: 4,
    averageDomainScore: 3.5,
    totalItemsCompleted: 60,
    positiveReactionRate: 0.7,
  },
  assimilating: {
    dimensionsAtLevel: 5, // all dims at level 3
    averageDomainScore: 4.2,
    totalItemsCompleted: 120,
    positiveReactionRate: 0.8,
    streakDays: 30,
  },
};

// ==================== Collections ====================

export const ARC_COLLECTIONS = {
  GROWTH_ARCS: 'growth_arcs',
  DIMENSION_ASSESSMENTS: 'dimension_assessments',
  DOMAIN_PROGRESSIONS: 'domain_progressions',
} as const;
