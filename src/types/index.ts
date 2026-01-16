import { Timestamp } from 'firebase/firestore';

// ==================== User & Family Types ====================

export type UserRole = 'parent' | 'child';

export interface User {
  userId: string;
  familyId: string;
  role: UserRole;
  name: string;
  email?: string;           // Optional for children
  dateOfBirth?: Timestamp;  // For children
  avatarUrl?: string;
  chipBalance?: number;     // For children - chip economy balance
  createdAt: Timestamp;
  settings: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

export interface Family {
  familyId: string;
  name: string;
  createdAt: Timestamp;
  parentIds: string[];
  childIds: string[];
  settings: {
    chipSystemEnabled: boolean;
    dailyCheckInReminder: boolean;
    weeklyInsightsEnabled: boolean;
  };
}

// ==================== Journal Types ====================

export type JournalCategory =
  | 'behavior'
  | 'discipline'
  | 'emotion'
  | 'milestone'
  | 'challenge'
  | 'win';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface JournalContext {
  timeOfDay: TimeOfDay;
  location?: string;
  stressLevel: number; // 1-5
}

export interface AIAnalysis {
  summary: string;
  sentiment: Sentiment;
  suggestedStrategies: string[];
  relatedKnowledgeIds: string[];
  analyzedAt: Timestamp;
}

export interface JournalEntry {
  entryId: string;
  familyId: string;
  authorId: string;
  authorName?: string;
  childId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Entry content
  text: string;
  voiceNoteUrl?: string;
  photoUrls?: string[];

  // Metadata
  category: JournalCategory;
  tags?: string[];
  context: JournalContext;

  // AI Analysis (populated by Cloud Function)
  aiAnalysis?: AIAnalysis;
}

// ==================== Child Check-In Types ====================

export type ChildMood =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'worried'
  | 'excited'
  | 'tired';

export interface CheckInResponse {
  questionId: string;
  answer: string | number;
}

export interface ChildCheckIn {
  checkinId: string;
  familyId: string;
  childId: string;
  timestamp: Timestamp;

  // Check-in data
  mood: ChildMood;
  responses: CheckInResponse[];
  voiceMessageUrl?: string;
  drawingUrl?: string;

  // Parent viewing
  viewedByParents: string[];
  parentNotes?: string;
}

// ==================== Chip Economy Types ====================

export type TaskCategory = 'chore' | 'behavior' | 'achievement';

export interface ChipTask {
  taskId: string;
  name: string;
  description: string;
  chipValue: number;
  category: TaskCategory;
  icon: string;
  active: boolean;
}

export interface ChipReward {
  rewardId: string;
  name: string;
  description: string;
  chipCost: number;
  imageUrl?: string;
  available: boolean;
}

export interface ChipEconomy {
  economyId: string;
  familyId: string;
  tasks: ChipTask[];
  rewards: ChipReward[];
}

export type TransactionType = 'earn' | 'spend' | 'adjust';

export interface ChipTransaction {
  transactionId: string;
  familyId: string;
  childId: string;
  timestamp: Timestamp;

  type: TransactionType;
  amount: number;  // Positive or negative

  // Earn transaction
  taskId?: string;
  taskName?: string;

  // Spend transaction
  rewardId?: string;
  rewardName?: string;

  // Manual adjustment
  reason?: string;
  adjustedByParentId?: string;

  balanceAfter: number;  // Running balance
}

// ==================== Knowledge Base Types ====================

export type SourceType = 'book' | 'podcast' | 'article' | 'research' | 'video';

export interface AIExtraction {
  keyInsights: string[];
  actionableStrategies: string[];
  relevantConcepts: string[];
  summary: string;
}

export interface KnowledgeBase {
  knowledgeId: string;
  familyId: string;
  addedByParentId: string;
  timestamp: Timestamp;

  // Source info
  sourceType: SourceType;
  title: string;
  author?: string;
  url?: string;

  // Content
  excerpt: string;
  notes?: string;

  // AI Extraction
  aiExtraction: AIExtraction;

  // Vector embedding for RAG
  embedding?: number[];

  // Linking
  relatedJournalEntries: string[];
  tags: string[];
}

// ==================== Daily Action Items ====================

export type ActionPriority = 'low' | 'medium' | 'high';
export type ActionStatus = 'pending' | 'completed' | 'skipped';
export type SkipReason = 'too_busy' | 'not_relevant' | 'already_done' | 'too_hard' | 'other';

export interface DailyAction {
  actionId: string;
  familyId: string;
  generatedAt: Timestamp;
  targetDate: Timestamp; // The day this action is for

  // Action details
  title: string;
  description: string;
  estimatedMinutes: number; // Realistic time estimate
  priority: ActionPriority;
  category?: string; // e.g., 'one-on-one', 'self-care', 'discipline'

  // Context from AI analysis
  reasoning: string; // Why this action matters
  relatedJournalEntries: string[]; // IDs of relevant journal entries
  relatedKnowledgeIds: string[]; // IDs of relevant knowledge base items

  // Enhanced: Detailed implementation
  detailedScript?: ActionScript;
  resources: ActionResource[];

  // Strategic plan integration
  strategicPlanId?: string;
  phaseId?: string;
  contributesToMilestone?: string;

  // Completion tracking
  status: ActionStatus;
  completedAt?: Timestamp;
  skippedAt?: Timestamp;
  skipReason?: SkipReason;
  parentNotes?: string; // Optional notes after completion

  // Feedback (collected after completion)
  feedback?: {
    useful: boolean; // Quick thumbs up/down
    difficulty: 1 | 2 | 3 | 4 | 5; // How hard was it? (1=easy, 5=very hard)
    timeActual?: number; // Actual minutes spent
    comment?: string; // Optional free text
    collectedAt: Timestamp;
  };
}

export interface DailyAnalysis {
  analysisId: string;
  familyId: string;
  generatedAt: Timestamp;
  analysisDate: Timestamp; // The date being analyzed

  // AI-generated insights
  summary: string; // Overall summary of the day
  themes: string[]; // Key themes identified
  emotionalTrend: 'positive' | 'neutral' | 'challenging';

  // Recommended actions for tomorrow
  actionIds: string[]; // References to DailyAction documents

  // Source material
  journalEntriesAnalyzed: string[];
  knowledgeItemsReferenced: string[];
}

export interface ActionAnalytics {
  analyticsId: string;
  familyId: string;
  weekStartDate: Timestamp;
  weekEndDate: Timestamp;

  // Completion metrics
  totalActions: number;
  completedActions: number;
  skippedActions: number;
  completionRate: number; // 0-1

  // Timing analysis
  averageEstimatedMinutes: number;
  averageActualMinutes: number;
  timeAccuracyScore: number; // 0-1, how accurate time estimates are

  // Priority breakdown
  priorityBreakdown: {
    high: { total: number; completed: number; };
    medium: { total: number; completed: number; };
    low: { total: number; completed: number; };
  };

  // Feedback aggregation
  usefulCount: number; // Actions rated as useful
  notUsefulCount: number; // Actions rated as not useful
  averageDifficulty: number; // 1-5 scale

  // Skip reasons
  skipReasons: {
    too_busy: number;
    not_relevant: number;
    already_done: number;
    too_hard: number;
    other: number;
  };

  generatedAt: Timestamp;
}

// ==================== AI Insights Types ====================

export type InsightType =
  | 'pattern'
  | 'recommendation'
  | 'weekly_summary'
  | 'progress';

export interface PatternInsight {
  description: string;
  frequency: string;
  relatedEntries: string[];
  suggestedAction: string;
}

export interface Recommendation {
  situation: string;
  strategy: string;
  reasoning: string;
  sourceKnowledgeIds: string[];
}

export interface WeeklySummary {
  startDate: Timestamp;
  endDate: Timestamp;
  highlights: string[];
  challenges: string[];
  suggestions: string[];
}

export interface AIInsight {
  insightId: string;
  familyId: string;
  generatedAt: Timestamp;

  type: InsightType;

  // Pattern detection
  pattern?: PatternInsight;

  // Recommendation
  recommendation?: Recommendation;

  // Weekly summary
  weeklySummary?: WeeklySummary;

  // Metadata
  readBy: string[];
  dismissed: boolean;
}

// ==================== Authentication Types ====================

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  familyName: string;
}

export interface ChildRegistrationData {
  name: string;
  dateOfBirth: Date;
  username: string;
  pin: string;
}

// ==================== Navigation Types ====================

export type RootStackParamList = {
  Auth: undefined;
  ParentTabs: undefined;
  ChildStack: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RoleSelection: undefined;
};

export type ParentTabParamList = {
  Home: undefined;
  Journal: undefined;
  Children: undefined;
  Knowledge: undefined;
  Insights: undefined;
};

export type JournalStackParamList = {
  JournalList: undefined;
  NewJournalEntry: { childId?: string };
  JournalDetail: { entryId: string };
};

export type ChildStackParamList = {
  ChildHome: undefined;
  CheckIn: undefined;
  ChipTracker: undefined;
  Settings: undefined;
};

// ==================== Child Profile & Strategic Planning Types ====================

// Child Baseline Profile Types
export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'mixed';
export type ChallengeCategory = 'adhd' | 'anxiety' | 'sensory' | 'behavioral' | 'learning' | 'social' | 'other';
export type ChallengeSeverity = 'mild' | 'moderate' | 'significant';
export type TriggerConfidence = 'low' | 'medium' | 'high';
export type StrategySourceType = 'parent_discovery' | 'professional' | 'knowledge_base' | 'ai_suggestion';
export type PatternConfidence = 'emerging' | 'consistent' | 'validated';
export type ProgressNoteCategory = 'improvement' | 'challenge' | 'insight' | 'milestone';
export type ProgressNoteSource = 'ai' | 'parent';

export interface ChildChallenge {
  id: string;
  category: ChallengeCategory;
  description: string;
  severity: ChallengeSeverity;
  diagnosed: boolean;
  professionalSupport: boolean;
  notes?: string;
  identifiedDate: Timestamp;
}

export interface Trigger {
  id: string;
  description: string;
  context: string;
  typicalResponse: string;
  identifiedDate: Timestamp;
  confidence: TriggerConfidence;
}

export interface Strategy {
  id: string;
  description: string;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  context: string;
  sourceType: StrategySourceType;
  sourceId?: string;
  addedDate: Timestamp;
}

export interface Pattern {
  id: string;
  description: string;
  frequency: string;
  firstObserved: Timestamp;
  lastObserved: Timestamp;
  confidence: PatternConfidence;
  relatedEntries: string[];
}

export interface ProgressNote {
  id: string;
  date: Timestamp;
  note: string;
  category: ProgressNoteCategory;
  generatedBy: ProgressNoteSource;
}

export interface ChildBaselineProfile {
  profileId: string;
  familyId: string;
  childId: string;

  // Comprehensive assessment data
  challenges: ChildChallenge[];
  strengths: string[];
  interests: string[];
  learningStyle: LearningStyle;
  triggers: Trigger[];
  whatWorks: Strategy[];
  whatDoesntWork: Strategy[];

  // School/environment
  schoolInfo?: {
    grade?: string;
    specialServices?: string[];
    iepOrFiveOFour?: boolean;
  };

  // Living document metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;

  // AI-discovered patterns from journals
  emergingPatterns: Pattern[];
  progressNotes: ProgressNote[];

  // References
  relatedJournalEntries: string[];
  relatedKnowledgeIds: string[];
}

// Strategic Plan Types
export type PlanStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'cancelled';
export type PlanFrequency = 'daily' | 'every_other_day' | 'twice_week' | 'weekly';
export type ResourceType = 'physical_item' | 'printable' | 'article' | 'video' | 'app';
export type ResourceCost = 'free' | 'low' | 'medium' | 'high';
export type AdaptationTrigger = 'parent_request' | 'ai_analysis' | 'milestone_failure';
export type ProgressAssessment = 'behind' | 'on_track' | 'ahead' | 'needs_adjustment';

export interface Resource {
  type: ResourceType;
  name: string;
  description?: string;
  url?: string;
  knowledgeId?: string;
  cost?: ResourceCost;
}

export interface PhaseActivity {
  activityId: string;
  title: string;
  description: string;
  frequency: PlanFrequency;
  estimatedMinutes: number;
  requiredResources: Resource[];
}

export interface PlanPhase {
  phaseId: string;
  title: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  focus: string;
  activities: PhaseActivity[];
  successCriteria: string[];
}

export interface Milestone {
  milestoneId: string;
  title: string;
  description: string;
  targetWeek: number;
  achieved: boolean;
  achievedAt?: Timestamp;
  notes?: string;
}

export interface PlanAdaptation {
  adaptationId: string;
  timestamp: Timestamp;
  reason: string;
  changesMade: string;
  triggeredBy: AdaptationTrigger;
}

export interface ParentApproval {
  approved: boolean;
  timestamp: Timestamp;
  notes?: string;
}

export interface StrategicPlan {
  planId: string;
  familyId: string;
  childId: string;
  profileId: string;

  // Plan details
  title: string;
  description: string;
  targetChallenge: string;
  duration: number; // Days (30, 60, or 90)

  // Plan structure
  phases: PlanPhase[];
  milestones: Milestone[];

  // Status & tracking
  status: PlanStatus;
  startDate?: Timestamp;
  endDate?: Timestamp;

  // Parent interaction
  parentApprovals: {
    [parentId: string]: ParentApproval;
  };
  approvalRequired: string[]; // Array of parent IDs that need to approve

  // Generation context
  generatedAt: Timestamp;
  aiReasoning: string;

  // Related data
  relatedKnowledgeIds: string[];
  relatedJournalEntries: string[];

  // Adaptations
  adaptations: PlanAdaptation[];
}

export interface WeeklySnapshot {
  week: number;
  startDate: Timestamp;
  endDate: Timestamp;
  phaseId: string;
  actionsCompleted: number;
  actionsSkipped: number;
  journalEntriesCount: number;
  progressAssessment: ProgressAssessment;
  insights: string;
  recommendedAdjustments?: string;
}

export interface PlanProgress {
  progressId: string;
  familyId: string;
  planId: string;
  childId: string;

  weeklySnapshots: WeeklySnapshot[];

  totalActionsGenerated: number;
  totalActionsCompleted: number;
  completionRate: number;
  milestonesAchieved: number;
  milestonesTotal: number;

  parentSatisfaction?: 1 | 2 | 3 | 4 | 5;
  lastUpdatedAt: Timestamp;
}

// Enhanced Daily Action Types
export interface TroubleshootingTip {
  scenario: string;
  response: string;
}

export interface ScriptStep {
  stepNumber: number;
  action: string;
  wordForWordScript?: string;
  visualAid?: string;
  duration?: string;
}

export interface ActionScript {
  situation: string;
  steps: ScriptStep[];
  expectedOutcome: string;
  troubleshooting?: TroubleshootingTip[];
}

export type ActionResourceType = 'article' | 'video' | 'printable' | 'product' | 'app' | 'book';

export interface ActionResource {
  type: ActionResourceType;
  title: string;
  description: string;
  url?: string;
  knowledgeId?: string;
  isPrimary: boolean;
}

// ==================== Component Props Types ====================

export interface ChildProfile {
  userId: string;
  name: string;
  avatarUrl?: string;
  dateOfBirth: Timestamp;
  chipBalance?: number;
  lastCheckInMood?: ChildMood;
}

export interface JournalEntryPreview {
  entryId: string;
  text: string;
  timestamp: Timestamp;
  category: JournalCategory;
  childName?: string;
  aiSummary?: string;
}

// ==================== Utility Types ====================

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: AppError | null;
}

// ==================== Firestore Document References ====================

export const COLLECTIONS = {
  FAMILIES: 'families',
  USERS: 'users',
  JOURNAL_ENTRIES: 'journal_entries',
  CHILD_CHECKINS: 'child_checkins',
  CHIP_ECONOMY: 'chip_economy',
  CHIP_TRANSACTIONS: 'chip_transactions',
  KNOWLEDGE_BASE: 'knowledge_base',
  AI_INSIGHTS: 'ai_insights',
  DAILY_ACTIONS: 'daily_actions',
  DAILY_ANALYSES: 'daily_analyses',
  CHILD_PROFILES: 'child_profiles',
  STRATEGIC_PLANS: 'strategic_plans',
  PLAN_PROGRESS: 'plan_progress',
} as const;

// ==================== Firebase Storage Paths ====================

export const STORAGE_PATHS = {
  JOURNAL_PHOTOS: (familyId: string, entryId: string, photoId: string) =>
    `families/${familyId}/journal-photos/${entryId}/${photoId}.jpg`,
  JOURNAL_AUDIO: (familyId: string, entryId: string) =>
    `families/${familyId}/journal-audio/${entryId}/recording.m4a`,
  CHECKIN_AUDIO: (familyId: string, checkinId: string) =>
    `families/${familyId}/checkin-audio/${checkinId}/message.m4a`,
  CHECKIN_DRAWINGS: (familyId: string, checkinId: string) =>
    `families/${familyId}/checkin-drawings/${checkinId}/drawing.png`,
  AVATARS: (userId: string) =>
    `avatars/${userId}/avatar.jpg`,
  REWARD_IMAGES: (familyId: string, rewardId: string) =>
    `families/${familyId}/rewards/${rewardId}/image.jpg`,
} as const;
