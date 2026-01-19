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
 */

import { Timestamp } from 'firebase/firestore';

// ==================== Weekly Workbook ====================

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
}

// ==================== Daily Interactive Activities ====================

export type ActivityType =
  | 'emotion-checkin'
  | 'choice-board'
  | 'daily-win'
  | 'visual-schedule'
  | 'gratitude'
  | 'feeling-thermometer'
  | 'strength-reflection'        // Child identifies their strengths
  | 'courage-moment'             // Child recalls a brave action
  | 'affirmation-practice'       // Daily positive self-statements
  | 'growth-mindset-reflection'  // Reframe challenges as learning
  | 'accomplishment-tracker';    // Track weekly wins

export interface DailyActivity {
  id: string;
  type: ActivityType;
  date: Timestamp;
  completed: boolean;

  // Child's response (varies by activity type)
  childResponse?:
    | EmotionCheckinResponse
    | ChoiceBoardResponse
    | DailyWinResponse
    | VisualScheduleResponse
    | StrengthReflectionResponse
    | CourageMomentResponse
    | AffirmationPracticeResponse
    | GrowthMindsetReflectionResponse
    | AccomplishmentTrackerResponse;

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
