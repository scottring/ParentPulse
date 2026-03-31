import { Timestamp } from 'firebase/firestore';
import { DimensionDomain, DimensionId } from '@/config/relationship-dimensions';

// ==================== Domain Weights ====================

export interface DomainWeights {
  self: number;             // default 0.333
  couple: number;           // default 0.333
  parent_child: number;     // default 0.333
}

export const DEFAULT_DOMAIN_WEIGHTS: DomainWeights = {
  self: 1 / 3,
  couple: 1 / 3,
  parent_child: 1 / 3,
};

// ==================== Ring Scores ====================

export type ScoreTrend = 'improving' | 'stable' | 'declining' | 'insufficient_data';

export interface DimensionScore {
  dimensionId: DimensionId;
  score: number;            // 1.0-5.0
  confidence: 'low' | 'medium' | 'high';
}

export type PerspectiveType = 'self' | 'spouse' | 'kids';

export interface PerspectiveZone {
  domain: DimensionDomain;
  perspective: PerspectiveType;
  score: number;            // 1.0-5.0
  confidence: 'low' | 'medium' | 'high';
}

export interface DomainScore {
  domain: DimensionDomain;
  score: number;            // 1.0-5.0 avg of constituent dimensions
  dimensionScores: DimensionScore[];
  perspectiveZones: PerspectiveZone[];  // 3 zones per domain (self/spouse/kids)
  confidence: 'low' | 'medium' | 'high';
  trend: ScoreTrend;
}

export interface OverallHealth {
  score: number;            // 1.0-5.0 weighted combo of domains
  weights: DomainWeights;
  domainScores: DomainScore[];
  trend: ScoreTrend;
  lastUpdated: Timestamp | null;
}

// ==================== Acute Events (GPS Interruptions) ====================

export type EventRecommendation = 'urgent_pivot' | 'reinforcement' | 'background_absorption';

export interface AcuteEvent {
  eventId: string;
  familyId: string;
  userId: string;
  freeText: string;
  timestamp: Timestamp;
  aiAnalysis?: {
    affectedDimensions: { dimensionId: DimensionId; impact: number }[];
    recommendation: EventRecommendation;
    suggestedActions: string[];
    reasoning: string;
  };
  status: 'pending' | 'analyzed' | 'resolved';
}

// ==================== Active Trajectory ====================

export interface ActiveTrajectory {
  primaryDimensionId: DimensionId | null;
  primaryDomain: DimensionDomain | null;
  activeArcId: string | null;
  direction: ScoreTrend;
  interruptedBy?: string;   // eventId if temporarily pivoted
}
