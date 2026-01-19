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
  isAdmin?: boolean;        // Admin privileges for accessing admin dashboard
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
  isRecurring?: boolean;  // Whether the task repeats
  recurring?: boolean;    // Alias for backwards compatibility
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

// ==================== Universal Relationship Types ====================

/**
 * Universal Relationship System
 * Supports operating manuals for any important relationship:
 * - Children (parenting challenges, development)
 * - Spouse/Partner (communication, emotional needs)
 * - Elderly Parents (care needs, memory support)
 * - Friends (boundaries, interaction preferences)
 * - Professional (work style, communication)
 */

export type RelationType = 'children' | 'spouse' | 'parent' | 'friend' | 'professional';

// Base profile interface - shared across all relationship types
export interface BaseRelationshipProfile {
  profileId: string;
  familyId: string;
  relationshipMemberId: string; // The person this profile is about
  relationshipType: RelationType;

  // Common elements across all relationships
  triggers: Trigger[];
  whatWorks: Strategy[];
  whatDoesntWork: Strategy[];

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

// Spouse/Partner Profile
export type CommunicationStyle = 'direct' | 'indirect' | 'reflective' | 'emotional' | 'logical';
export type ConflictStyle = 'avoider' | 'accommodator' | 'competitor' | 'compromiser' | 'collaborator';
export type LoveLanguage = 'words_of_affirmation' | 'quality_time' | 'receiving_gifts' | 'acts_of_service' | 'physical_touch';
export type StressLevel = 1 | 2 | 3 | 4 | 5;

export interface EmotionalTrigger {
  id: string;
  description: string;
  context: string;
  typicalResponse: string; // What happens when triggered
  deescalationStrategy?: string; // What helps in the moment
  identifiedDate: Timestamp;
  severity: 'mild' | 'moderate' | 'significant';
}

export interface Boundary {
  id: string;
  description: string;
  category: 'immovable' | 'negotiable' | 'preference';
  context?: string;
  consequences?: string; // What happens if crossed
  addedDate: Timestamp;
}

export interface QualityTimePreference {
  id: string;
  activity: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  idealDuration: string; // e.g., "30 minutes", "2 hours"
  energyLevel: 'low' | 'medium' | 'high'; // Energy required
  notes?: string;
}

export interface SpouseProfile extends BaseRelationshipProfile {
  relationshipType: 'spouse';

  // Communication & conflict
  communicationStyle: CommunicationStyle;
  conflictStyle: ConflictStyle;
  processingTime: 'immediate' | 'hours' | 'days'; // Time needed to process emotions
  feedbackPreference: 'direct' | 'gentle' | 'sandwich_method';

  // Emotional landscape
  emotionalTriggers: EmotionalTrigger[];
  stressIndicators: string[]; // Early warning signs of stress
  supportPreference: 'help' | 'space' | 'listen' | 'problem_solve';

  // Connection & intimacy
  loveLanguages: LoveLanguage[]; // Primary and secondary
  qualityTimePreferences: QualityTimePreference[];
  appreciationStyle: string[]; // How they like to be appreciated

  // Boundaries & values
  boundaries: Boundary[];
  coreValues: string[];
  dealbreakers: string[];

  // Practical considerations
  energyPatterns?: {
    morningPerson: boolean;
    bestTimeForDifficultConversations?: string;
    rechargeMethod: 'alone' | 'social' | 'activity';
  };
}

// Elderly Parent Profile
export type CareLevel = 'independent' | 'some_assistance' | 'significant_support' | 'full_care';
export type MemoryStatus = 'sharp' | 'mild_decline' | 'moderate_decline' | 'significant_decline';

export interface HealthCondition {
  id: string;
  condition: string;
  diagnosed: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  medications?: string[];
  specialConsiderations?: string;
  diagnosedDate?: Timestamp;
}

export interface CareNeed {
  id: string;
  category: 'medical' | 'mobility' | 'cognitive' | 'emotional' | 'social' | 'daily_living';
  description: string;
  frequency: 'constant' | 'daily' | 'weekly' | 'as_needed';
  supportRequired: string;
  notes?: string;
}

export interface ParentProfile extends BaseRelationshipProfile {
  relationshipType: 'parent';

  // Care level & health
  careLevel: CareLevel;
  memoryStatus: MemoryStatus;
  healthConditions: HealthCondition[];
  mobility: 'full' | 'walker' | 'wheelchair' | 'bedridden';

  // Care needs
  careNeeds: CareNeed[];
  dailyRoutine?: string; // Important routines and schedules

  // Communication
  hearingStatus: 'good' | 'mild_loss' | 'significant_loss' | 'deaf';
  visionStatus: 'good' | 'mild_loss' | 'significant_loss' | 'blind';
  communicationAdjustments: string[]; // e.g., "Speak slowly", "Use large print"

  // Memory support (for cognitive decline)
  memoryAids?: {
    importantPeople: Array<{ name: string; relationship: string; photoUrl?: string }>;
    favoriteMusicEra?: string;
    lifeStoryHighlights: string[];
    validationTechniques: string[];
  };

  // Dignity & personhood
  preferences: string[]; // Things they love and want to maintain
  dignityConsiderations: string[]; // What's important to preserve
  lifeLongInterests: string[];

  // Practical
  livingSituation: 'independent' | 'with_family' | 'assisted_living' | 'nursing_home';
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }>;
}

// Friend Profile
export type FriendshipIntensity = 'acquaintance' | 'casual' | 'close' | 'best_friend';
export type InteractionFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'occasional';

export interface InteractionPreference {
  id: string;
  type: 'one_on_one' | 'small_group' | 'large_group' | 'activity_based';
  preference: 'loves' | 'enjoys' | 'tolerates' | 'dislikes';
  notes?: string;
}

export interface FriendProfile extends BaseRelationshipProfile {
  relationshipType: 'friend';

  // Friendship dynamics
  friendshipIntensity: FriendshipIntensity;
  interactionFrequency: InteractionFrequency;
  interactionPreferences: InteractionPreference[];

  // Communication
  communicationStyle: 'texter' | 'caller' | 'in_person_only' | 'social_media';
  responseTimeExpectation: 'immediate' | 'same_day' | 'flexible' | 'sporadic';
  depthOfConversation: 'surface' | 'moderate' | 'deep' | 'varies';

  // Boundaries
  boundaries: Boundary[];
  topicsToAvoid: string[];
  comfortWithVulnerability: 'high' | 'medium' | 'low';

  // Shared interests
  sharedInterests: string[];
  preferredActivities: string[];

  // Support style
  supportNeeds: 'frequent_checkins' | 'crisis_only' | 'mutual' | 'independent';
  givesAdvice: boolean;
  wantsAdvice: boolean;
}

// Professional Relationship Profile
export type ProfessionalRelationship = 'colleague' | 'manager' | 'direct_report' | 'client' | 'vendor' | 'mentor';
export type WorkStyle = 'collaborative' | 'independent' | 'structured' | 'flexible' | 'detail_oriented' | 'big_picture';

export interface WorkingPreference {
  id: string;
  aspect: string;
  preference: string;
  reasoning?: string;
}

export interface ProfessionalProfile extends BaseRelationshipProfile {
  relationshipType: 'professional';

  // Professional context
  relationship: ProfessionalRelationship;
  organizationRole?: string;
  workingRelationshipDuration?: string;

  // Work style
  workStyle: WorkStyle[];
  communicationPreference: 'email' | 'slack' | 'phone' | 'in_person' | 'video_call';
  meetingPreference: 'agenda_required' | 'flexible' | 'standing_only' | 'minimize';
  feedbackStyle: 'direct' | 'constructive' | 'gentle';

  // Boundaries
  boundaries: Boundary[];
  workLifeBalance: 'strict' | 'flexible' | 'permeable';
  availabilityExpectations: string;

  // Working preferences
  workingPreferences: WorkingPreference[];
  petPeeves: string[];
  strengths: string[];

  // Collaboration
  decisionMakingStyle: 'decisive' | 'consultative' | 'consensus' | 'delegator';
  conflictApproach: 'direct_discussion' | 'email_followup' | 'third_party' | 'avoid';
}

// Union type for all profile types
export type RelationshipProfile = SpouseProfile | ParentProfile | FriendProfile | ProfessionalProfile | ChildBaselineProfile;

// Relationship Member Entity (replaces child-specific User)
export interface RelationshipMember {
  memberId: string;
  familyId: string;
  relationshipType: RelationType;

  // Basic info
  name: string;
  dateOfBirth?: Timestamp;
  avatarUrl?: string;

  // Profile reference
  hasProfile: boolean;
  profileId?: string;

  // Strategic plan reference
  hasActivePlan: boolean;
  activePlanId?: string;

  // Metadata
  addedAt: Timestamp;
  addedByUserId: string;

  // Relationship-specific data
  childData?: {
    chipBalance: number;
    lastCheckInMood?: ChildMood;
  };

  spouseData?: {
    anniversaryDate?: Timestamp;
    yearsKnown?: number;
  };

  parentData?: {
    livingWith: boolean;
    primaryCaregiver?: string; // user ID
  };

  friendData?: {
    metDate?: Timestamp;
    lastContact?: Timestamp;
  };

  professionalData?: {
    company?: string;
    position?: string;
  };
}

// ==================== Child Profile & Strategic Planning Types ====================
// NOTE: These types are kept for backward compatibility
// New implementations should use RelationshipProfile types above

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

export interface ChildBaselineProfile extends BaseRelationshipProfile {
  relationshipType: 'children';
  relationshipMemberId: string; // Maps to child's user ID

  // Backward compatibility
  /** @deprecated Use relationshipMemberId instead */
  childId?: string;

  // Comprehensive assessment data
  challenges: ChildChallenge[];
  strengths: string[];
  interests: string[];
  learningStyle: LearningStyle;

  // School/environment
  schoolInfo?: {
    grade?: string;
    specialServices?: string[];
    iepOrFiveOFour?: boolean;
  };

  // Note: triggers, whatWorks, whatDoesntWork, emergingPatterns, progressNotes,
  // relatedJournalEntries, relatedKnowledgeIds, createdAt, updatedAt, version
  // are inherited from BaseRelationshipProfile
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
  relationshipMemberId: string; // The person this plan is for
  relationshipType: RelationType; // Type of relationship
  profileId: string;

  // Backward compatibility (deprecated - use relationshipMemberId)
  /** @deprecated Use relationshipMemberId instead */
  childId?: string;

  // Plan details
  title: string;
  description: string;
  targetChallenge: string; // e.g., "ADHD focus issues" or "Communication during conflict"
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
  relationshipMemberId: string; // The person this plan is for
  relationshipType: RelationType;

  // Backward compatibility
  /** @deprecated Use relationshipMemberId instead */
  childId?: string;

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

  // Universal Relationship System
  RELATIONSHIP_MEMBERS: 'relationship_members', // New: Universal entity for all relationships
  RELATIONSHIP_PROFILES: 'relationship_profiles', // New: Universal profiles (spouse, parent, friend, professional, child)

  // Legacy (backward compatibility)
  CHILD_PROFILES: 'child_profiles', // Deprecated: Use RELATIONSHIP_PROFILES with relationshipType: 'children'
  STRATEGIC_PLANS: 'strategic_plans',
  PLAN_PROGRESS: 'plan_progress',

  // NEW: Child Manual System (MVP v1)
  CHILDREN: 'children',
  CHILD_MANUALS: 'child_manuals',
  DAILY_OBSERVATIONS: 'daily_observations',
  COACHING_SESSIONS: 'coaching_sessions',
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
  WORKBOOK_OBSERVATIONS_PHOTOS: (familyId: string, observationId: string, photoId: string) =>
    `families/${familyId}/workbook-photos/${observationId}/${photoId}.jpg`,
  WORKBOOK_OBSERVATIONS_VOICE: (familyId: string, observationId: string) =>
    `families/${familyId}/workbook-voice/${observationId}/note.m4a`,
  WEEKLY_REFLECTION_AUDIO: (familyId: string, workbookId: string) =>
    `families/${familyId}/weekly-reflections/${workbookId}/reflection.m4a`,
} as const;

// ==================== Weekly Workbooks System ====================

export * from './workbook';
