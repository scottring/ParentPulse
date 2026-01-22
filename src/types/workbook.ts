/**
 * Weekly Workbook System - Phase 1 (Simplified)
 *
 * Parent-driven weekly goals and tracking with tablet-friendly
 * interactive activities for parent-child engagement.
 *
 * Philosophy:
 * - Parent manages and tracks their own behavior changes
 * - Simple tablet activities for parent + child moments
 * - AI generates goals from manual content
 * - Weekly rhythm with reflection and adjustment
 *
 * @deprecated This unified workbook model is being replaced by separate
 * ParentWorkbook and ChildWorkbook types for better separation of concerns.
 * See /src/types/parent-workbook.ts and /src/types/child-workbook.ts
 */

import { Timestamp } from 'firebase/firestore';

// ==================== Weekly Workbook ====================

/**
 * @deprecated Use ParentWorkbook and ChildWorkbook instead
 * This type is kept for backward compatibility with existing workbooks
 */
export interface WeeklyWorkbook {
  workbookId: string;
  familyId: string;
  manualId: string;
  personId: string;
  personName: string; // Denormalized for display

  // Week identification
  weekNumber: number; // Week 1, Week 2, etc.
  startDate: Timestamp;
  endDate: Timestamp;

  // Parent-focused behavior goals
  parentGoals: ParentBehaviorGoal[];

  // Optional: Child behavior observation tracking (parent tracks occurrences)
  childBehaviorTracking?: ChildBehaviorObservation[];

  // Interactive activities for parent + child
  dailyActivities: DailyActivity[];

  // Weekly reflection (completed at end of week)
  weeklyReflection?: WeeklyReflection;

  // Metadata
  status: 'active' | 'completed';
  createdAt: Timestamp;
  generatedBy: 'ai';
  approvedBy?: string; // User ID who approved
  approvedAt?: Timestamp;

  // Archival fields
  isArchived?: boolean;              // True if workbook has been archived
  archivedAt?: Timestamp;            // When workbook was archived
  archivedReason?: string;           // Why archived (e.g., "replaced", "manual", "outdated")
  replacedByWorkbookId?: string;     // ID of workbook that replaced this one
}

// ==================== Parent Behavior Goals ====================

export interface ParentBehaviorGoal {
  id: string;
  description: string; // "Give 5-minute warning before transitions"
  targetFrequency: string; // "Daily", "3x per week", etc.

  // Links to manual content
  relatedTriggerId?: string;
  relatedStrategyId?: string;

  // Completion tracking
  completionLog: GoalCompletion[];

  // Metadata
  createdDate: Timestamp;
}

export interface GoalCompletion {
  date: Timestamp;
  completed: boolean;
  notes?: string;
  addedBy: string; // User ID
}

// ==================== Child Behavior Observation ====================

export interface ChildBehaviorObservation {
  id: string;
  targetBehavior: string; // "Fewer transition meltdowns"
  measurementType: 'occurrence' | 'frequency' | 'duration';
  frequency: 'daily' | 'weekly';

  observations: BehaviorObservation[];

  // Link to manual trigger
  relatedTriggerId?: string;
}

export interface BehaviorObservation {
  date: Timestamp;
  occurred: boolean;
  severity?: 'mild' | 'moderate' | 'significant';
  context?: string;
  notes?: string;
  recordedBy: string; // User ID
}

// ==================== Workbook Statistics ====================

export interface WorkbookStats {
  activityLevel: number; // 0-5
  priorityItems: string[];
  observationsCount: number;
  behaviorInstancesCount?: number;
  chipTransactionsCount?: number;
}

// ==================== Workbook Observations ====================

export interface WorkbookObservation {
  observationId: string;
  workbookId: string;
  familyId: string;
  personId: string;
  text: string;
  timestamp: Timestamp;
  category: 'positive' | 'challenging' | 'neutral' | 'milestone';
  tags: string[];
  aiAnalyzed: boolean;
  authorId: string;
  authorName: string;

  // Archival fields (archived when parent workbook is archived)
  isArchived?: boolean;
  archivedAt?: Timestamp;
  archivedWithWorkbookId?: string;  // ID of workbook that was archived with this observation
}

// ==================== Behavior Tracking ====================

export interface BehaviorInstance {
  instanceId: string;
  familyId: string;
  personId: string;
  workbookId?: string;
  behaviorType: string;
  severity: 'mild' | 'moderate' | 'significant';
  antecedent?: string; // What happened before/trigger
  strategyUsed?: string; // Strategy from manual that was used
  strategyEffective?: boolean; // Was the strategy effective?
  context?: string;
  notes?: string;
  success?: boolean; // For positive behaviors - did they succeed?
  timestamp: Timestamp;
  recordedBy: string;
  recordedByName: string;

  // Archival fields (archived when parent workbook is archived)
  isArchived?: boolean;
  archivedAt?: Timestamp;
  archivedWithWorkbookId?: string;  // ID of workbook that was archived with this instance
}

// ==================== Daily Interactive Activities ====================

export type ActivityType =
  // Original 6 activities
  | 'emotion-checkin'
  | 'choice-board'
  | 'daily-win'
  | 'visual-schedule'
  | 'gratitude'
  | 'feeling-thermometer'
  // Self-worth focused activities
  | 'strength-reflection'        // Child identifies their strengths
  | 'courage-moment'             // Child recalls a brave action
  | 'affirmation-practice'       // Daily positive self-statements
  | 'growth-mindset-reflection'  // Reframe challenges as learning
  | 'accomplishment-tracker'     // Track weekly wins
  | 'story-reflection'           // NEW: Reflect on weekly story character
  // TDD Phase 1: 20 New Activity Types
  // Category 1: Emotional Regulation & Coping (5)
  | 'worry-box'                  // Categorize worries as controllable/uncontrollable
  | 'emotion-wheel'              // Identify secondary emotions beneath primary ones
  | 'calm-down-toolbox'          // Build personalized calming strategies
  | 'body-signals'               // Map physical sensations to emotions
  | 'safe-person-map'            // Identify support network by situation type
  // Category 2: Executive Function & Routines (4)
  | 'time-captain'               // Time estimation vs. reality tracking
  | 'priority-picker'            // Important/urgent matrix for task prioritization
  | 'energy-tracker'             // Daily energy patterns for optimal scheduling
  | 'transition-timer'           // Visual countdown for difficult transitions
  // Category 3: Relationship & Social Skills (4)
  | 'friendship-builder'         // Friendship qualities self-assessment
  | 'conflict-detective'         // "I felt ___ when ___ because ___" framework
  | 'kindness-catcher'           // Notice and record kindness (given/received/observed)
  | 'share-or-boundaries'        // Practice saying yes/no with confidence
  // Category 4: Self-Awareness & Identity (4)
  | 'value-compass'              // Identify and rank personal values
  | 'inner-voice-check'          // Self-talk pattern recognition and reframing
  | 'compare-and-care'           // Address social comparison with growth focus
  | 'mood-journal'               // Color-coded emotional journey throughout day
  // Category 5: Growth Mindset & Resilience (3)
  | 'mistake-magic'              // Reframe mistakes as learning opportunities
  | 'hard-thing-hero'            // Celebrate attempting difficult tasks
  | 'yet-power';                 // Transform "I can't" to "I can't... yet"

export interface DailyActivity {
  id: string;
  type: ActivityType;
  date: Timestamp;
  completed: boolean;

  // Child's response (varies by activity type)
  childResponse?:
    // Original activity responses
    | EmotionCheckinResponse
    | ChoiceBoardResponse
    | DailyWinResponse
    | VisualScheduleResponse
    | StrengthReflectionResponse
    | CourageMomentResponse
    | AffirmationPracticeResponse
    | GrowthMindsetReflectionResponse
    | AccomplishmentTrackerResponse
    // TDD Phase 1: New activity responses
    // Category 1: Emotional Regulation & Coping
    | WorryBoxResponse
    | EmotionWheelResponse
    | CalmDownToolboxResponse
    | BodySignalsResponse
    | SafePersonMapResponse
    // Category 2: Executive Function & Routines
    | TimeCaptainResponse
    | PriorityPickerResponse
    | EnergyTrackerResponse
    | TransitionTimerResponse
    // Category 3: Relationship & Social Skills
    | FriendshipBuilderResponse
    | ConflictDetectiveResponse
    | KindnessCatcherResponse
    | ShareOrBoundariesResponse
    // Category 4: Self-Awareness & Identity
    | ValueCompassResponse
    | InnerVoiceCheckResponse
    | CompareAndCareResponse
    | MoodJournalResponse
    // Category 5: Growth Mindset & Resilience
    | MistakeMagicResponse
    | HardThingHeroResponse
    | YetPowerResponse;

  // Parent notes
  parentNotes?: string;

  // Metadata
  recordedBy?: string; // User ID
}

// Activity-specific response types

export interface EmotionCheckinResponse {
  emotion: 'happy' | 'worried' | 'frustrated' | 'tired' | 'excited' | 'sad' | 'angry' | 'calm';
  intensity?: 1 | 2 | 3 | 4 | 5; // 1 = mild, 5 = very intense
  trigger?: string; // What caused this feeling
}

export interface ChoiceBoardResponse {
  chosenStrategy: string; // Which calming strategy they picked
  effectiveness?: 1 | 2 | 3 | 4 | 5; // How well it worked
}

export interface DailyWinResponse {
  category: 'creative' | 'helping' | 'learning' | 'energy' | 'kindness' | 'brave';
  description: string;
}

export interface ScheduleTask {
  id: string;
  emoji: string;
  label: string;
  time?: string; // Optional time like "7:30 AM"
}

export interface VisualScheduleResponse {
  tasks: ScheduleTask[]; // Custom schedule with times
  tasksCompleted: string[]; // IDs of completed tasks
  totalTasks: number;
}

export interface StrengthReflectionResponse {
  strengths: string[];  // List of strengths they identified
  category: 'academic' | 'social' | 'creative' | 'physical' | 'other';
}

export interface CourageMomentResponse {
  description: string;  // What brave thing they did
  feeling: 'proud' | 'nervous' | 'excited' | 'scared-but-did-it';
}

export interface AffirmationPracticeResponse {
  affirmations: string[];  // 3 positive "I am..." statements
  favorite?: string;       // Which one felt best
}

export interface GrowthMindsetReflectionResponse {
  challenge: string;              // Something that was hard
  whatLearned: string;           // What they learned from it
  nextTime: string;              // What they'll try next time
  mindsetShift: 'fixed' | 'growth' | 'mixed';  // Did they show growth mindset?
}

export interface AccomplishmentTrackerResponse {
  accomplishments: Array<{
    description: string;
    day: string;  // 'monday', 'tuesday', etc.
    category: 'academic' | 'social' | 'creative' | 'physical' | 'personal';
  }>;
}

// ==================== TDD Phase 1: New Activity Response Types ====================

// =============================================================================
// TDD Phase 1: New Activity Response Interfaces
// =============================================================================

/**
 * Common rating scale used across multiple activities
 * 1 = Very low/minimal, 5 = Very high/maximum
 */
export type RatingScale = 1 | 2 | 3 | 4 | 5;

// Category 1: Emotional Regulation & Coping (5 activities)

/**
 * Worry Box Activity Response
 *
 * Helps children categorize their worries as controllable vs. uncontrollable,
 * reducing anxiety by identifying what they can and cannot control.
 *
 * Age Range: 5-13 years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['worry-box']
 */
export interface WorryBoxResponse {
  /** List of worries with categorization */
  worries: Array<{
    /** What the child is worried about */
    description: string;
    /** Whether the child can control this worry */
    controllable: boolean;
  }>;
  /** The worry causing the most concern (optional) */
  biggestWorry?: string;
  /** Coping strategy chosen for the biggest worry (optional) */
  copingStrategyChosen?: string;
}

/**
 * Emotion Wheel Activity Response
 *
 * Helps children identify secondary emotions beneath primary emotions,
 * developing emotional vocabulary and self-awareness.
 *
 * Age Range: 6+ years
 * Estimated Time: 5 minutes
 *
 * @example
 * {
 *   primaryEmotion: "angry",
 *   secondaryEmotion: "disappointed",
 *   intensity: 4,
 *   trigger: "homework"
 * }
 *
 * @see ACTIVITY_TEMPLATES['emotion-wheel']
 */
export interface EmotionWheelResponse {
  /** The surface-level emotion (e.g., "angry", "sad") */
  primaryEmotion: string;
  /** The deeper emotion beneath the primary one (e.g., "disappointed", "hurt") */
  secondaryEmotion?: string;
  /** How intense the emotion feels (1 = mild, 5 = very intense) */
  intensity: RatingScale;
  /** What caused this emotion (optional) */
  trigger?: string;
}

/**
 * Calm-Down Toolbox Activity Response
 *
 * Helps children build a personalized toolkit of calming strategies
 * and track their effectiveness over time.
 *
 * Age Range: 4+ years
 * Estimated Time: 4 minutes
 *
 * @see ACTIVITY_TEMPLATES['calm-down-toolbox']
 */
export interface CalmDownToolboxResponse {
  /** Calming strategies tried with effectiveness ratings */
  selectedTools: Array<{
    /** Name of the calming strategy (e.g., "deep breathing", "counting") */
    tool: string;
    /** How well this tool worked (1 = not helpful, 5 = very helpful) */
    effectiveness: RatingScale;
  }>;
  /** Top 2-3 most effective tools identified */
  favoriteTools: string[];
  /** Situation where these tools were used (optional) */
  situationContext?: string;
}

/**
 * Body Signals Activity Response
 *
 * Helps children develop body awareness by mapping physical sensations
 * (butterflies, tight chest, etc.) to their emotions.
 *
 * Age Range: 5+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['body-signals']
 */
export interface BodySignalsResponse {
  /** Physical sensations noticed in the body */
  bodySignals: Array<{
    /** Where in the body (e.g., "chest", "stomach", "shoulders") */
    location: string;
    /** What it feels like (e.g., "tight", "butterflies", "tense") */
    sensation: string;
    /** Associated emotion (optional) */
    linkedEmotion?: string;
  }>;
  /** Child's overall body awareness level */
  awareness: 'high' | 'medium' | 'low';
}

/**
 * Safe Person Map Activity Response
 *
 * Helps children identify their support network and understand
 * which trusted adults/friends can help in different situations.
 *
 * Age Range: 5+ years
 * Estimated Time: 6 minutes
 *
 * @see ACTIVITY_TEMPLATES['safe-person-map']
 */
export interface SafePersonMapResponse {
  /** Trusted people in the child's support network */
  safePeople: Array<{
    /** Person's name */
    name: string;
    /** How they're related (e.g., "mom", "teacher", "friend") */
    relationship: string;
    /** Situations this person can help with (e.g., "homework help", "when upset") */
    goodFor: string[];
  }>;
  /** Person the child feels most comfortable with overall (optional) */
  preferredPerson?: string;
}

// Category 2: Executive Function & Routines (4 activities)

/**
 * Time Captain Activity Response
 *
 * Helps children develop time awareness by estimating task duration
 * and comparing to actual time taken, building realistic time sense.
 *
 * Age Range: 6+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['time-captain']
 */
export interface TimeCaptainResponse {
  /** Tasks with time estimates and actual duration */
  tasks: Array<{
    /** What the task is */
    task: string;
    /** How long the child thinks it will take */
    estimatedMinutes: number;
    /** How long it actually took (measured) */
    actualMinutes?: number;
  }>;
  /** Overall time estimation pattern */
  timeAccuracy: 'accurate' | 'underestimated' | 'overestimated';
}

/**
 * Priority Picker Activity Response
 *
 * Teaches children to prioritize tasks using a simple important/urgent matrix,
 * developing executive function and decision-making skills.
 *
 * Age Range: 7+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['priority-picker']
 */
export interface PriorityPickerResponse {
  /** Tasks categorized by importance and urgency */
  tasks: Array<{
    /** What needs to be done */
    task: string;
    /** How important this task is */
    importance: 'high' | 'low';
    /** How soon this needs to be done */
    urgency: 'high' | 'low';
  }>;
  /** The task chosen to do first (optional) */
  chosenPriority?: string;
  /** How confident the child feels about their prioritization */
  confidence: RatingScale;
}

/**
 * Energy Tracker Activity Response
 *
 * Helps children identify their daily energy patterns to optimize
 * when they schedule challenging tasks vs. rest time.
 *
 * Age Range: 5+ years
 * Estimated Time: 3 minutes
 *
 * @see ACTIVITY_TEMPLATES['energy-tracker']
 */
export interface EnergyTrackerResponse {
  /** When this energy check was done */
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  /** Current energy level (1 = exhausted, 5 = full energy) */
  energyLevel: RatingScale;
  /** How the child is feeling emotionally */
  mood: string;
  /** Activity that helps recharge (optional) */
  rechargeActivity?: string;
}

/**
 * Transition Timer Activity Response
 *
 * Helps children manage difficult transitions using visual countdowns
 * and tracks which transition strategies work best.
 *
 * Age Range: 4+ years
 * Estimated Time: 3 minutes
 *
 * @see ACTIVITY_TEMPLATES['transition-timer']
 */
export interface TransitionTimerResponse {
  /** What the child was doing before */
  fromActivity: string;
  /** What the child needs to do next */
  toActivity: string;
  /** Whether a countdown warning was used (5 min, 2 min, etc.) */
  warningUsed: boolean;
  /** How the transition went */
  transitionSuccess: 'smooth' | 'bumpy' | 'meltdown';
  /** Strategy that helped with the transition (optional) */
  strategyUsed?: string;
}

// Category 3: Relationship & Social Skills (4 activities)

/**
 * Friendship Builder Activity Response
 *
 * Helps children reflect on friendship qualities, assess their own
 * friendship skills, and identify areas for growth.
 *
 * Age Range: 5+ years
 * Estimated Time: 6 minutes
 *
 * @see ACTIVITY_TEMPLATES['friendship-builder']
 */
export interface FriendshipBuilderResponse {
  /** Qualities the child values in a friend */
  friendshipQualities: string[];
  /** The child's own friendship strengths */
  myStrengths: string[];
  /** Friendship skills the child wants to develop */
  wantToImprove: string[];
  /** Recent example of being a good friend (optional) */
  recentFriendlyAction?: string;
}

/**
 * Conflict Detective Activity Response
 *
 * Helps children process disagreements using the "I felt ___ when ___ because ___"
 * framework, building conflict resolution and empathy skills.
 *
 * Age Range: 6+ years
 * Estimated Time: 6 minutes
 *
 * @see ACTIVITY_TEMPLATES['conflict-detective']
 */
export interface ConflictDetectiveResponse {
  /** What happened in the disagreement */
  situation: string;
  /** The child's view of what happened */
  myPerspective: string;
  /** The other person's perspective (if considered) */
  theirPerspective?: string;
  /** How the child felt during the conflict */
  myFeelings: string[];
  /** How the conflict was resolved (if applicable) */
  resolution?: string;
  /** What the child learned from this experience */
  lessonLearned?: string;
}

/**
 * Kindness Catcher Activity Response
 *
 * Helps children develop gratitude and kindness awareness by noticing
 * and recording acts of kindness (given, received, or observed).
 *
 * Age Range: 4+ years
 * Estimated Time: 4 minutes
 *
 * @see ACTIVITY_TEMPLATES['kindness-catcher']
 */
export interface KindnessCatcherResponse {
  /** Type of kindness observed */
  kindnessType: 'gave' | 'received' | 'observed';
  /** What the kind act was */
  description: string;
  /** How it made the child feel */
  feeling: string;
  /** People involved in the kind act */
  whoWasInvolved: string[];
}

/**
 * Share or Boundaries Activity Response
 *
 * Helps children practice setting boundaries and making confident yes/no
 * decisions about sharing possessions, time, or personal space.
 *
 * Age Range: 5+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['share-or-boundaries']
 */
export interface ShareOrBoundariesResponse {
  /** Practice scenarios for boundary-setting */
  scenarios: Array<{
    /** The request or situation presented */
    situation: string;
    /** The child's decision */
    response: 'yes' | 'no' | 'maybe';
    /** Why the child chose this response */
    reasoning: string;
  }>;
  /** How confident the child feels about saying no (1 = not confident, 5 = very confident) */
  confidenceLevel: RatingScale;
}

// Category 4: Self-Awareness & Identity (4 activities)

/**
 * Value Compass Activity Response
 *
 * Helps children identify and rank their personal values, developing
 * self-awareness and a moral compass to guide decision-making.
 *
 * Age Range: 7+ years
 * Estimated Time: 7 minutes
 *
 * @see ACTIVITY_TEMPLATES['value-compass']
 */
export interface ValueCompassResponse {
  /** The child's top 3-5 personal values (e.g., "kindness", "honesty", "courage") */
  topValues: string[];
  /** Examples of how the child lives their values */
  exampleActions: Array<{
    /** Which value this demonstrates */
    value: string;
    /** Specific action that shows this value */
    action: string;
  }>;
  /** How aligned the child feels with their values */
  valuesAlignment: 'strong' | 'developing' | 'exploring';
}

/**
 * Inner Voice Check Activity Response
 *
 * Helps children recognize self-talk patterns, identify critical vs. supportive
 * inner voice, and practice reframing negative thoughts.
 *
 * Age Range: 7+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['inner-voice-check']
 */
export interface InnerVoiceCheckResponse {
  /** Examples of the child's self-talk */
  selfTalkExamples: Array<{
    /** When this self-talk occurred */
    situation: string;
    /** What the inner voice said */
    innerVoice: string;
    /** Whether this self-talk was helpful or harmful */
    helpful: boolean;
  }>;
  /** Reframed versions of negative self-talk (optional) */
  reframes?: Array<{
    /** Original negative thought */
    original: string;
    /** More helpful reframe */
    reframed: string;
  }>;
  /** Overall tone of the child's inner voice */
  tone: 'supportive' | 'critical' | 'mixed';
}

/**
 * Compare and Care Activity Response
 *
 * Addresses social comparison by helping children shift from
 * comparison-focused thinking to personal growth focus.
 *
 * Age Range: 8+ years
 * Estimated Time: 6 minutes
 *
 * @see ACTIVITY_TEMPLATES['compare-and-care']
 */
export interface CompareAndCareResponse {
  /** What triggered the comparison (e.g., "saw friend's art project") */
  comparisonTrigger: string;
  /** How the comparison made the child feel */
  feeling: string;
  /** Personal growth goal identified instead of comparison (optional) */
  personalGrowthFocus?: string;
  /** Current perspective on comparison */
  perspective: 'comparison-focused' | 'growth-focused' | 'balanced';
}

/**
 * Mood Journal Activity Response
 *
 * Helps children track their emotional journey throughout the day
 * using colors or emojis, identifying mood patterns and triggers.
 *
 * Age Range: 6+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['mood-journal']
 */
export interface MoodJournalResponse {
  /** Mood at different times throughout the day */
  timeBlocks: Array<{
    /** When this mood check occurred */
    time: string;
    /** The emotion felt */
    mood: string;
    /** Color chosen to represent this mood */
    color: string;
    /** What was happening (optional) */
    event?: string;
  }>;
  /** Overall assessment of the day */
  overallDay: 'great' | 'good' | 'okay' | 'hard';
  /** The biggest factor affecting mood today (optional) */
  biggestInfluence?: string;
}

// Category 5: Growth Mindset & Resilience (3 activities)

/**
 * Mistake Magic Activity Response
 *
 * Helps children reframe mistakes as learning opportunities,
 * building resilience and growth mindset.
 *
 * Age Range: 5+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['mistake-magic']
 */
export interface MistakeMagicResponse {
  /** What the mistake was */
  mistake: string;
  /** How the child felt immediately after the mistake */
  initialFeeling: string;
  /** What the child learned from this mistake */
  whatLearned: string;
  /** What the child will do differently next time */
  nextTime: string;
  /** Evidence of growth mindset in response */
  growthMindset: 'strong' | 'emerging' | 'fixed';
}

/**
 * Hard Thing Hero Activity Response
 *
 * Celebrates children for attempting difficult tasks, building courage
 * and resilience regardless of outcome.
 *
 * Age Range: 5+ years
 * Estimated Time: 5 minutes
 *
 * @see ACTIVITY_TEMPLATES['hard-thing-hero']
 */
export interface HardThingHeroResponse {
  /** The difficult thing attempted */
  hardThing: string;
  /** Whether the child actually tried it */
  attempted: boolean;
  /** What happened (optional) */
  outcome?: 'succeeded' | 'learned' | 'need-more-practice';
  /** How the child feels about attempting this */
  feeling: string;
  /** What strength or strategy helped the child try */
  superpowerUsed: string;
}

/**
 * Yet Power Activity Response
 *
 * Teaches growth mindset language by transforming "I can't" statements
 * into "I can't... yet" statements, emphasizing potential for growth.
 *
 * Age Range: 6+ years
 * Estimated Time: 4 minutes
 *
 * @see ACTIVITY_TEMPLATES['yet-power']
 */
export interface YetPowerResponse {
  /** Things the child says "I can't" about */
  cantStatements: string[];
  /** The same statements reframed with "yet" added */
  yetStatements: string[];
  /** How much the child believes they can grow (1 = not at all, 5 = completely) */
  beliefInGrowth: RatingScale;
  /** One small step toward achieving a "yet" goal (optional) */
  nextStep?: string;
}

// ==================== Weekly Reflection ====================

export interface WeeklyReflection {
  whatWorkedWell: string;
  whatWasChallenging: string;
  insightsLearned: string;
  adjustmentsForNextWeek: string;

  // AI-suggested improvements (optional)
  aiSuggestions?: string[];

  // Metadata
  completedDate: Timestamp;
  completedBy: string; // User ID
}

// ==================== Activity Templates ====================

export interface ActivityTemplate {
  type: ActivityType;
  title: string;
  description: string;
  emoji: string;
  parentInstructions: string;
  estimatedMinutes: number;
  ageAppropriate: {
    minAge: number;
    maxAge?: number;
  };
}

export const ACTIVITY_TEMPLATES: Record<ActivityType, ActivityTemplate> = {
  'emotion-checkin': {
    type: 'emotion-checkin',
    title: 'Emotion Check-In',
    description: 'How are you feeling right now?',
    emoji: '😊',
    parentInstructions: 'Ask your child to tap the emoji that matches how they feel. Then talk about it briefly.',
    estimatedMinutes: 3,
    ageAppropriate: { minAge: 3, maxAge: 12 }
  },
  'choice-board': {
    type: 'choice-board',
    title: 'Calming Choices',
    description: 'What helps you feel better?',
    emoji: '🌈',
    parentInstructions: 'When your child is upset, let them choose a calming strategy from the board.',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 3 }
  },
  'daily-win': {
    type: 'daily-win',
    title: 'Daily Win',
    description: 'What was good about today?',
    emoji: '⭐',
    parentInstructions: 'Before bed, help your child pick one good thing from their day.',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 4 }
  },
  'visual-schedule': {
    type: 'visual-schedule',
    title: 'Today\'s Schedule',
    description: 'Check off completed activities',
    emoji: '📋',
    parentInstructions: 'Set up the day\'s routine and let your child check off tasks as they complete them.',
    estimatedMinutes: 2,
    ageAppropriate: { minAge: 3, maxAge: 10 }
  },
  'gratitude': {
    type: 'gratitude',
    title: 'Gratitude Practice',
    description: 'What are you thankful for?',
    emoji: '🙏',
    parentInstructions: 'Help your child think of 3 things they\'re grateful for today.',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'feeling-thermometer': {
    type: 'feeling-thermometer',
    title: 'Feeling Thermometer',
    description: 'How big is this feeling?',
    emoji: '🌡️',
    parentInstructions: 'Help your child rate the intensity of their current emotion.',
    estimatedMinutes: 3,
    ageAppropriate: { minAge: 5 }
  },
  'strength-reflection': {
    type: 'strength-reflection',
    title: 'My Strengths',
    description: 'What are you good at?',
    emoji: '💪',
    parentInstructions: 'Help your child list 3 things they do well - can be anything!',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'courage-moment': {
    type: 'courage-moment',
    title: 'Brave Thing I Did',
    description: 'Tell me about something brave you did',
    emoji: '🦁',
    parentInstructions: 'Ask about a time they tried something new or hard',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 4 }
  },
  'affirmation-practice': {
    type: 'affirmation-practice',
    title: 'I Am...',
    description: 'Practice positive self-talk',
    emoji: '⭐',
    parentInstructions: 'Help your child create 3 positive "I am..." statements (e.g., "I am kind", "I am creative")',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'growth-mindset-reflection': {
    type: 'growth-mindset-reflection',
    title: 'What I Learned',
    description: 'Turn challenges into learning',
    emoji: '🌱',
    parentInstructions: 'Ask about something hard they did and what they learned from it',
    estimatedMinutes: 7,
    ageAppropriate: { minAge: 6 }
  },
  'accomplishment-tracker': {
    type: 'accomplishment-tracker',
    title: 'My Weekly Wins',
    description: 'Track your accomplishments',
    emoji: '🏆',
    parentInstructions: 'Each day, add one thing your child accomplished or is proud of',
    estimatedMinutes: 3,
    ageAppropriate: { minAge: 5 }
  },
  'story-reflection': {
    type: 'story-reflection',
    title: 'Story Reflection',
    description: 'Think about the weekly story character',
    emoji: '📚',
    parentInstructions: 'Discuss the weekly story character and what your child learned from them',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 4 }
  },
  // ==================== TDD Phase 1: New Activity Templates ====================
  // Category 1: Emotional Regulation & Coping (5 activities)
  'worry-box': {
    type: 'worry-box',
    title: 'Worry Box',
    description: 'Put your worries in the box',
    emoji: '🎁',
    parentInstructions: 'Help your child write or draw their worries, then categorize them as things they can control vs. things they can\'t control',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5, maxAge: 13 }
  },
  'emotion-wheel': {
    type: 'emotion-wheel',
    title: 'Emotion Wheel',
    description: 'Name the feeling beneath the feeling',
    emoji: '🎨',
    parentInstructions: 'Help your child identify not just their surface emotion (like "angry") but what\'s underneath it (like "disappointed" or "hurt")',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 6 }
  },
  'calm-down-toolbox': {
    type: 'calm-down-toolbox',
    title: 'Calm-Down Toolbox',
    description: 'Build your calm-down plan',
    emoji: '🧰',
    parentInstructions: 'Help your child select 3-5 calming strategies and rate how well each one works for them',
    estimatedMinutes: 4,
    ageAppropriate: { minAge: 4 }
  },
  'body-signals': {
    type: 'body-signals',
    title: 'Body Signals',
    description: 'What is your body telling you?',
    emoji: '👂',
    parentInstructions: 'Help your child notice physical sensations (tight chest, butterflies, etc.) and connect them to emotions',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'safe-person-map': {
    type: 'safe-person-map',
    title: 'Safe Person Map',
    description: 'Who can you talk to when you need help?',
    emoji: '🗺️',
    parentInstructions: 'Help your child identify safe people for different situations (homework help, when upset, when excited, etc.)',
    estimatedMinutes: 6,
    ageAppropriate: { minAge: 5 }
  },
  // Category 2: Executive Function & Routines (4 activities)
  'time-captain': {
    type: 'time-captain',
    title: 'Time Captain',
    description: 'How long do things REALLY take?',
    emoji: '⏰',
    parentInstructions: 'Have your child estimate how long tasks take, then time them. Builds time awareness.',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 6 }
  },
  'priority-picker': {
    type: 'priority-picker',
    title: 'Priority Picker',
    description: 'What matters most right now?',
    emoji: '🎯',
    parentInstructions: 'Help your child prioritize tasks using a simple important/urgent matrix',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 7 }
  },
  'energy-tracker': {
    type: 'energy-tracker',
    title: 'Energy Tracker',
    description: 'What\'s your battery level?',
    emoji: '🔋',
    parentInstructions: 'Track energy throughout the day to identify optimal times for challenging tasks',
    estimatedMinutes: 3,
    ageAppropriate: { minAge: 5 }
  },
  'transition-timer': {
    type: 'transition-timer',
    title: 'Transition Timer',
    description: 'Count down to the next thing',
    emoji: '⏱️',
    parentInstructions: 'Use visual countdown for transitions (5 min warning, 2 min warning). Track what helps.',
    estimatedMinutes: 3,
    ageAppropriate: { minAge: 4 }
  },
  // Category 3: Relationship & Social Skills (4 activities)
  'friendship-builder': {
    type: 'friendship-builder',
    title: 'Friendship Builder',
    description: 'What makes a good friend?',
    emoji: '🤝',
    parentInstructions: 'Reflect with your child on friendship qualities and their own friendship skills',
    estimatedMinutes: 6,
    ageAppropriate: { minAge: 5 }
  },
  'conflict-detective': {
    type: 'conflict-detective',
    title: 'Conflict Detective',
    description: 'What happened in this disagreement?',
    emoji: '🔍',
    parentInstructions: 'Walk through a conflict using "I felt ___ when ___ because ___" framework',
    estimatedMinutes: 6,
    ageAppropriate: { minAge: 6 }
  },
  'kindness-catcher': {
    type: 'kindness-catcher',
    title: 'Kindness Catcher',
    description: 'Catch someone being kind!',
    emoji: '💝',
    parentInstructions: 'Notice and record acts of kindness - given, received, or observed',
    estimatedMinutes: 4,
    ageAppropriate: { minAge: 4 }
  },
  'share-or-boundaries': {
    type: 'share-or-boundaries',
    title: 'Share or Boundaries?',
    description: 'Is this mine to share?',
    emoji: '🛡️',
    parentInstructions: 'Practice scenarios where your child decides yes/no to requests. Build boundary confidence.',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  // Category 4: Self-Awareness & Identity (4 activities)
  'value-compass': {
    type: 'value-compass',
    title: 'Value Compass',
    description: 'What matters most to you?',
    emoji: '🧭',
    parentInstructions: 'Help your child identify and rank their top 3 personal values',
    estimatedMinutes: 7,
    ageAppropriate: { minAge: 7 }
  },
  'inner-voice-check': {
    type: 'inner-voice-check',
    title: 'Inner Voice Check',
    description: 'What does your inner voice say?',
    emoji: '💭',
    parentInstructions: 'Identify self-talk patterns and practice reframing negative thoughts',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 7 }
  },
  'compare-and-care': {
    type: 'compare-and-care',
    title: 'Compare and Care',
    description: 'Comparing yourself to others?',
    emoji: '🪞',
    parentInstructions: 'Address social comparison and shift focus to personal growth',
    estimatedMinutes: 6,
    ageAppropriate: { minAge: 8 }
  },
  'mood-journal': {
    type: 'mood-journal',
    title: 'Mood Journal',
    description: 'Color your day',
    emoji: '📓',
    parentInstructions: 'Use colors or emojis to represent your child\'s emotional journey through the day',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 6 }
  },
  // Category 5: Growth Mindset & Resilience (3 activities)
  'mistake-magic': {
    type: 'mistake-magic',
    title: 'Mistake Magic',
    description: 'Turn mistakes into learning',
    emoji: '✨',
    parentInstructions: 'Help your child reframe a mistake as a learning opportunity',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'hard-thing-hero': {
    type: 'hard-thing-hero',
    title: 'Hard Thing Hero',
    description: 'Doing hard things makes you stronger!',
    emoji: '🦸',
    parentInstructions: 'Celebrate your child for attempting something difficult, regardless of outcome',
    estimatedMinutes: 5,
    ageAppropriate: { minAge: 5 }
  },
  'yet-power': {
    type: 'yet-power',
    title: 'Yet Power',
    description: 'I can\'t do it... YET!',
    emoji: '🌱',
    parentInstructions: 'Practice adding "yet" to "I can\'t" statements. Build growth mindset language.',
    estimatedMinutes: 4,
    ageAppropriate: { minAge: 6 }
  }
};

// ==================== AI Generation Input ====================

export interface WorkbookGenerationInput {
  personId: string;
  personName: string;
  manualId: string;
  relationshipType: string;

  // Manual content to analyze
  triggers: Array<{
    id: string;
    description: string;
    severity: string;
  }>;

  whatWorks: Array<{
    id: string;
    description: string;
    effectiveness: number;
  }>;

  boundaries: Array<{
    description: string;
    category: string;
  }>;

  // Optional: Previous week's data for adjustment
  previousWeekReflection?: WeeklyReflection;
}

// ==================== Firestore Collections ====================

export const WORKBOOK_COLLECTIONS = {
  WEEKLY_WORKBOOKS: 'weekly_workbooks',
  WORKBOOK_OBSERVATIONS: 'workbook_observations',
  BEHAVIOR_TRACKING: 'behavior_tracking'
} as const;

// ==================== Helper Functions ====================

/**
 * Get the start of the current week (Monday 00:00:00)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the current week (Sunday 23:59:59)
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get ISO week number
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
