import { Timestamp } from 'firebase/firestore';

// ==================== 6-Layer Assessment Types ====================

/**
 * Layer IDs map to the 6-layer scaffolding framework:
 * 1. Inputs (Triggers/Patterns)
 * 2. Processing (Understanding/Co-regulation)
 * 3. Memory & Structure (Routines/Boundaries)
 * 4. Execution (Daily Strategies)
 * 5. Outputs (Growth/Connection)
 * 6. Supervisory (Values/Principles)
 */
export type LayerId = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Assessment score on a 1-10 scale
 * Frame: "How did I SHOW UP this week?" (not achievement-based)
 * 1-3: Rarely showed up this way
 * 4-6: Sometimes showed up this way
 * 7-8: Usually showed up this way
 * 9-10: Consistently showed up this way
 */
export type AssessmentScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Individual layer assessment within a weekly reflection
 */
export interface LayerAssessment {
  layerId: LayerId;
  score: AssessmentScore;
  notes?: string; // "What helped? What got in the way?"
}

/**
 * Complete 6-layer spider assessment
 * Captured weekly during workbook reflection
 */
export interface SpiderAssessment {
  assessmentId: string;
  personId: string; // The person this assessment is about
  manualId: string; // Link to their manual
  weekId?: string; // Link to workbook week
  planId?: string; // Link to strategic plan/goal

  layers: LayerAssessment[]; // Always 6 items, one per layer

  assessedAt: Timestamp;
  assessedBy: string; // userId of person completing assessment
}

/**
 * Repair tracking - separate from layer scores
 * Repair is a core practice, not a failure metric
 */
export interface RepairLog {
  repairId: string;
  personId: string; // Who was repair with
  weekId: string;

  // Repair details
  neededRepair: boolean;
  repairCount?: number; // How many times this week
  whatHelped?: string; // What helped repair happen

  // Self-compassion check
  wasKindToSelf: boolean;
  modeledApology: boolean; // Did child see parent apologize

  createdAt: Timestamp;
}

// ==================== Goal Hierarchy Types ====================

/**
 * Time commitment for a goal (daily minutes)
 */
export type DailyMinutes = 15 | 30 | 45 | 60 | 90;

/**
 * Goal status progression
 */
export type GoalStatus = 'draft' | 'active' | 'paused' | 'completed';

/**
 * A year-level goal with quarter/month/week breakdown
 * Backend structure - users see friendly names
 */
export interface GoalVolume {
  volumeId: string;
  manualId: string;
  personId: string;
  familyId: string;

  // User-facing content
  yearGoal: string; // "What we're working on this year"
  description?: string;

  // Quarter focuses (3-4 per year)
  quarterlyMilestones: QuarterlyMilestone[];

  // Tracking
  status: GoalStatus;
  startDate: Timestamp;
  targetEndDate?: Timestamp;

  // Capacity
  estimatedDailyMinutes: DailyMinutes;

  // Baseline captured at start
  baselineAssessment?: SpiderAssessment;

  // Progress snapshots
  assessments: SpiderAssessment[];

  createdAt: Timestamp;
  createdBy: string;
  lastUpdatedAt: Timestamp;
}

/**
 * Quarter-level focus within a year goal
 */
export interface QuarterlyMilestone {
  milestoneId: string;
  volumeId: string;

  // User-facing
  quarterFocus: string; // "What we're emphasizing this quarter"
  quarterNumber: 1 | 2 | 3 | 4;
  year: number;

  // Monthly themes within this quarter
  monthlyFocuses: MonthlyFocus[];

  // Status
  status: GoalStatus;
  startDate: Timestamp;
  endDate?: Timestamp;
}

/**
 * Month-level focus within a quarter
 */
export interface MonthlyFocus {
  focusId: string;
  milestoneId: string;

  // User-facing
  thisMonth: string; // "Our specific focus right now"
  month: number; // 1-12
  year: number;

  // Weekly workbooks generated for this month
  weeklyWorkbookIds: string[];

  // Status
  status: GoalStatus;
  startDate: Timestamp;
  endDate?: Timestamp;
}

// ==================== Baseline & Progress Types ====================

/**
 * Confidence level in assessment data
 */
export type AssessmentConfidence = 'emerging' | 'consistent' | 'validated';

/**
 * Extended layer assessment with historical context
 */
export interface LayerProgress {
  layerId: LayerId;
  currentScore: AssessmentScore;
  baseline: AssessmentScore;
  target?: AssessmentScore;
  confidence: AssessmentConfidence;
  trend: 'improving' | 'stable' | 'declining';
  weeklyScores: { weekId: string; score: AssessmentScore; date: Timestamp }[];
}

/**
 * Overall progress timeline for a person/goal
 */
export interface ProgressTimeline {
  timelineId: string;
  personId: string;
  volumeId: string; // Goal this tracks

  layerProgress: LayerProgress[]; // 6 items

  // Aggregates
  overallTrend: 'improving' | 'stable' | 'declining';
  weeksTracked: number;

  lastUpdatedAt: Timestamp;
}

// ==================== Firestore Collections ====================

export const ASSESSMENT_COLLECTIONS = {
  ASSESSMENTS: 'assessments', // SpiderAssessment documents
  REPAIR_LOGS: 'repair_logs', // RepairLog documents
  GOAL_VOLUMES: 'goal_volumes', // GoalVolume documents
  PROGRESS_TIMELINES: 'progress_timelines', // ProgressTimeline documents
} as const;
