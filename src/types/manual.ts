import { Timestamp } from 'firebase/firestore';
import { LayerId, SpiderAssessment } from './assessment';

// ==================== Manual Base Types ====================

/**
 * Manual types supported in V1
 * - child: One per child (Caleb's Manual, Ella's Manual)
 * - marriage: Shared couple manual (Scott + Iris)
 * - family: Household systems and values
 */
export type ManualType = 'child' | 'marriage' | 'family';

/**
 * Strategy effectiveness rating (1-5 scale)
 */
export type EffectivenessRating = 1 | 2 | 3 | 4 | 5;

/**
 * Confidence level in identified patterns/triggers
 */
export type Confidence = 'low' | 'medium' | 'high';

/**
 * Source of a strategy
 */
export type StrategySource =
  | 'parent_discovery'
  | 'professional'
  | 'knowledge_base'
  | 'ai_suggestion'
  | 'workbook';

/**
 * Boundary category
 */
export type BoundaryCategory = 'immovable' | 'negotiable' | 'preference';

// ==================== Manual Content Types ====================

/**
 * A documented trigger (Layer 1)
 */
export interface ManualTrigger {
  triggerId: string;
  description: string;
  context: string; // When/where this happens
  typicalResponse: string; // What typically follows
  severity: 'mild' | 'moderate' | 'significant';
  layerId: LayerId; // Always 1 for triggers
  confidence: Confidence;
  identifiedDate: Timestamp;
  lastObserved?: Timestamp;
  notes?: string;
}

/**
 * A documented strategy (Layer 4 - What Works / What Doesn't)
 */
export interface ManualStrategy {
  strategyId: string;
  description: string;
  context: string; // When to use this
  effectiveness: EffectivenessRating;
  layerId: LayerId; // Usually 4 for strategies
  sourceType: StrategySource;
  sourceId?: string; // Link to knowledge base, workbook, etc.
  addedDate: Timestamp;
  lastUsed?: Timestamp;
  usageCount: number;
  notes?: string;
}

/**
 * A documented boundary (Layer 3)
 */
export interface ManualBoundary {
  boundaryId: string;
  description: string;
  category: BoundaryCategory;
  context?: string; // When this applies
  consequences?: string; // What happens if crossed
  layerId: LayerId; // Usually 3 for boundaries
  addedDate: Timestamp;
  notes?: string;
}

/**
 * A repair strategy
 */
export interface RepairStrategy {
  repairId: string;
  description: string;
  worksWhen: string; // Context when this repair approach works
  effectiveness: EffectivenessRating;
  addedDate: Timestamp;
  notes?: string;
}

/**
 * An observed pattern
 */
export interface ManualPattern {
  patternId: string;
  description: string;
  frequency: string; // e.g., "daily", "when tired", "during transitions"
  firstObserved: Timestamp;
  lastObserved: Timestamp;
  confidence: Confidence;
  relatedTriggerIds: string[];
  notes?: string;
}

/**
 * A progress note
 */
export interface ManualProgressNote {
  noteId: string;
  date: Timestamp;
  note: string;
  category: 'improvement' | 'challenge' | 'insight' | 'milestone';
  generatedBy: 'parent' | 'ai';
  relatedLayerIds?: LayerId[];
}

// ==================== Child Manual ====================

/**
 * Child-specific core information
 */
export interface ChildCoreInfo {
  sensoryNeeds?: string;
  interests: string[];
  strengths: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'mixed';
  schoolInfo?: {
    grade?: string;
    specialServices?: string[];
    iepOr504?: boolean;
  };
  notes?: string;
}

/**
 * Child Manual - one per child
 */
export interface ChildManual {
  manualId: string;
  familyId: string;
  personId: string; // Child's user ID
  personName: string;
  manualType: 'child';

  // Core info
  coreInfo: ChildCoreInfo;

  // Content organized by layer
  triggers: ManualTrigger[]; // Layer 1
  whatWorks: ManualStrategy[]; // Layer 4 (effective)
  whatDoesntWork: ManualStrategy[]; // Layer 4 (ineffective)
  boundaries: ManualBoundary[]; // Layer 3
  repairStrategies: RepairStrategy[]; // How we repair
  patterns: ManualPattern[];
  progressNotes: ManualProgressNote[];

  // Layer 6 - Values/Principles
  parentingPrinciples: string[]; // e.g., "Connection before correction"

  // Active goals
  activeGoalIds: string[]; // Links to GoalVolume documents

  // Baseline assessment
  baselineAssessment?: SpiderAssessment;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  lastEditedAt: Timestamp;
  lastEditedBy: string;
  version: number;

  // Completeness tracking
  completeness: {
    triggers: number; // Count
    strategies: number;
    boundaries: number;
    repairStrategies: number;
    overallPercent: number; // 0-100
  };
}

// ==================== Marriage Manual ====================

/**
 * Communication style preferences
 */
export type CommunicationStyleManual = 'direct' | 'indirect' | 'reflective' | 'emotional' | 'logical';

/**
 * Conflict handling style
 */
export type ConflictStyleManual = 'avoider' | 'accommodator' | 'competitor' | 'compromiser' | 'collaborator';

/**
 * Love language preference
 */
export type LoveLanguageManual =
  | 'words_of_affirmation'
  | 'quality_time'
  | 'receiving_gifts'
  | 'acts_of_service'
  | 'physical_touch';

/**
 * Marriage/Partner-specific core info
 */
export interface MarriageCoreInfo {
  partnerNames: [string, string]; // Both partners
  anniversaryDate?: Timestamp;
  communicationStyles: {
    partner1: CommunicationStyleManual;
    partner2: CommunicationStyleManual;
  };
  conflictStyles: {
    partner1: ConflictStyleManual;
    partner2: ConflictStyleManual;
  };
  loveLanguages: {
    partner1: LoveLanguageManual[];
    partner2: LoveLanguageManual[];
  };
  sharedValues: string[];
  notes?: string;
}

/**
 * Quality time activity
 */
export interface QualityTimeActivityManual {
  activityId: string;
  activity: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  idealDuration: string; // e.g., "30 minutes"
  energyLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

/**
 * Marriage Manual - shared by couple
 */
export interface MarriageManual {
  manualId: string;
  familyId: string;
  partnerIds: [string, string]; // Both partner user IDs
  manualType: 'marriage';

  // Core info
  coreInfo: MarriageCoreInfo;

  // Content (both partners' perspectives merged)
  triggers: ManualTrigger[]; // Relationship triggers
  whatWorks: ManualStrategy[]; // What strengthens connection
  whatDoesntWork: ManualStrategy[]; // What damages connection
  boundaries: ManualBoundary[]; // Relationship agreements
  repairStrategies: RepairStrategy[]; // How we repair after conflict
  patterns: ManualPattern[];
  progressNotes: ManualProgressNote[];

  // Quality time & connection
  qualityTimeActivities: QualityTimeActivityManual[];
  dateNightIdeas: string[];

  // Shared lifestyle goals (in scope per spec)
  sharedGoals: {
    category: 'date_nights' | 'fitness' | 'sleep' | 'hobbies' | 'other';
    description: string;
    frequency?: string;
  }[];

  // Layer 6 - Relationship values
  relationshipPrinciples: string[];

  // Active goals
  activeGoalIds: string[];

  // Baseline
  baselineAssessment?: SpiderAssessment;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  lastEditedAt: Timestamp;
  lastEditedBy: string;
  version: number;

  completeness: {
    triggers: number;
    strategies: number;
    boundaries: number;
    repairStrategies: number;
    overallPercent: number;
  };
}

// ==================== Family/Household Manual ====================

/**
 * Household system (chore charts, routines, storage, etc.)
 */
export interface HouseholdSystem {
  systemId: string;
  name: string; // e.g., "Toy cleanup routine"
  description: string;
  category: 'chores' | 'routines' | 'storage' | 'meals' | 'schedules' | 'other';
  assignedTo: string[]; // Person IDs
  frequency: 'daily' | 'weekly' | 'as_needed';
  effectiveness: EffectivenessRating;
  relatedTriggerIds: string[]; // Links to triggers this system addresses
  notes?: string;
}

/**
 * Family Manual - one per household
 */
export interface FamilyManual {
  manualId: string;
  familyId: string;
  manualType: 'family';

  // Family info
  familyName: string;
  memberIds: string[]; // All family member user IDs

  // Content
  triggers: ManualTrigger[]; // Household stress triggers
  whatWorks: ManualStrategy[]; // What helps household run
  whatDoesntWork: ManualStrategy[]; // What creates chaos
  boundaries: ManualBoundary[]; // House rules

  // Systems
  householdSystems: HouseholdSystem[];

  // Values (Layer 6)
  familyValues: string[];
  familyMotto?: string;

  // Patterns
  patterns: ManualPattern[];
  progressNotes: ManualProgressNote[];

  // Active goals
  activeGoalIds: string[];

  // Baseline
  baselineAssessment?: SpiderAssessment;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  lastEditedAt: Timestamp;
  lastEditedBy: string;
  version: number;

  completeness: {
    triggers: number;
    systems: number;
    boundaries: number;
    overallPercent: number;
  };
}

// ==================== Union Type ====================

/**
 * Any manual type
 */
export type Manual = ChildManual | MarriageManual | FamilyManual;

// ==================== Firestore Collections ====================

export const MANUAL_COLLECTIONS = {
  CHILD_MANUALS: 'child_manuals',
  MARRIAGE_MANUALS: 'marriage_manuals',
  FAMILY_MANUALS: 'family_manuals',
} as const;
