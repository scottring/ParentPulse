/**
 * Household Workbook Types
 *
 * Hub-and-spokes architecture where household goals delegate tasks to individuals.
 * Uses the 6-layer framework with friendly names.
 */

import { Timestamp } from 'firebase/firestore';
import { LayerId } from './assessment';

// Re-export LayerId so consumers can import from this file if they prefer
export type { LayerId };

// ============ LAYER DEFINITIONS ============

export const HOUSEHOLD_LAYERS = {
  1: { id: 1, friendly: 'What Sets Us Off', technical: 'Inputs/Triggers' },
  2: { id: 2, friendly: 'How We Talk', technical: 'Processing' },
  3: { id: 3, friendly: 'Our Rhythms', technical: 'Memory/Structure' },
  4: { id: 4, friendly: 'How We Get Things Done', technical: 'Execution' },
  5: { id: 5, friendly: 'What We\'re Building', technical: 'Outputs' },
  6: { id: 6, friendly: 'What We Stand For', technical: 'Supervisory' },
} as const;

export function getLayerFriendlyName(layerId: LayerId): string {
  return HOUSEHOLD_LAYERS[layerId].friendly;
}

// ============ PAIN POINTS ============

export interface PainPoint {
  id: string;
  label: string;
  description: string;
  relatedLayers: LayerId[];
}

export const HOUSEHOLD_PAIN_POINTS: PainPoint[] = [
  {
    id: 'disorganized',
    label: 'Disorganized / Chaotic',
    description: 'Things feel scattered, routines don\'t stick',
    relatedLayers: [3, 4],
  },
  {
    id: 'arguing',
    label: 'We Argue A Lot',
    description: 'Conflicts escalate, hard to communicate',
    relatedLayers: [1, 2],
  },
  {
    id: 'no-quality-time',
    label: 'No Quality Time Together',
    description: 'We\'re ships passing in the night',
    relatedLayers: [5, 6],
  },
  {
    id: 'transitions-hard',
    label: 'Transitions Are Hard',
    description: 'Mornings, bedtimes, leaving the house',
    relatedLayers: [1, 3, 4],
  },
  {
    id: 'chores-battles',
    label: 'Constant Battles Over Chores',
    description: 'Nobody does their part without nagging',
    relatedLayers: [3, 4],
  },
  {
    id: 'screen-time',
    label: 'Screen Time Conflicts',
    description: 'Technology is a constant source of tension',
    relatedLayers: [1, 6],
  },
  {
    id: 'sibling-rivalry',
    label: 'Sibling Rivalry',
    description: 'Kids constantly fighting or competing',
    relatedLayers: [1, 2],
  },
  {
    id: 'overwhelmed',
    label: 'Everyone\'s Overwhelmed',
    description: 'Too much to do, not enough time',
    relatedLayers: [4, 5],
  },
];

// ============ MILESTONE ============

export interface HouseholdMilestone {
  target: 'day30' | 'day60' | 'day90';
  description: string;
  status: 'upcoming' | 'active' | 'completed';
  achievedAt?: Timestamp;
}

// ============ HOUSEHOLD TASK ============

export interface HouseholdTask {
  taskId: string;
  title: string;
  description?: string;
  layerId: LayerId;
  isCompleted: boolean;
  completedAt?: Timestamp;
  completedBy?: string; // userId who marked complete
}

// ============ DELEGATED TASK ============

export interface DelegatedTask {
  taskId: string;
  title: string;
  description?: string;
  layerId: LayerId;
  personId: string;
  personName: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
  dueDate?: string; // "monday", "daily", or ISO date
}

// ============ WEEKLY FOCUS ============

export interface HouseholdWeeklyFocus {
  title: string;
  description: string;
  whyItMatters: string;
  layersFocused: LayerId[];
  // Actionable instructions for this focus
  instructions?: FocusInstruction[];
  // Suggested items to add to manual after completion
  suggestedManualAdditions?: {
    triggers?: string[];
    strategies?: string[];
    boundaries?: string[];
  };
}

/**
 * A step-by-step instruction for completing a weekly focus
 */
export interface FocusInstruction {
  id: string;
  step: number;
  title: string;
  description: string;
  tips?: string[];
  // Temporal guidance - when to do this step
  dayRange?: {
    start: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    end: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  };
  phase?: 'setup' | 'implement' | 'practice' | 'refine';
  isCompleted?: boolean;
  completedAt?: Timestamp;
  // Allow user edits
  isUserEdited?: boolean;
  // Deliverable - what this step produces
  deliverableType?: 'checklist' | 'location' | 'schedule' | 'assignment' | 'note';
  deliverable?: StepDeliverable;
}

/**
 * Content created within a step - the actual output/artifact
 */
export type StepDeliverable =
  | ChecklistDeliverable
  | LocationDeliverable
  | AssignmentDeliverable
  | NoteDeliverable;

export interface ChecklistDeliverable {
  type: 'checklist';
  checklists: PersonChecklist[];
}

export interface PersonChecklist {
  personId: string;
  personName: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  isDefault?: boolean; // AI-suggested vs user-added
}

export interface LocationDeliverable {
  type: 'location';
  name: string;
  description: string;
  location: string; // e.g., "By the front door", "In the mudroom"
}

export interface AssignmentDeliverable {
  type: 'assignment';
  assignments: {
    personId: string;
    personName: string;
    responsibility: string;
  }[];
}

export interface NoteDeliverable {
  type: 'note';
  content: string;
}

// ============ MILESTONE PERIOD PLAN ============

/**
 * Overview of a milestone period (30, 60, or 90 days)
 * Provides the "30,000 foot view" of what to expect
 */
export interface MilestonePeriodPlan {
  periodId: string;
  familyId: string;
  milestoneTarget: 'day30' | 'day60' | 'day90';
  milestoneDescription: string;

  // Overview
  periodGoal: string; // What we're working toward
  whyThisMatters: string;

  // Weekly breakdown
  weeklyPlan: WeekPlanSummary[];

  // Expected outcomes
  expectedOutcomes: string[];

  // Adjustability
  isUserEdited: boolean;
  lastEditedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Summary of a single week within a milestone period
 */
export interface WeekPlanSummary {
  weekNumber: number; // 1-4 for day30, 1-8 for day60, etc.
  title: string;
  focus: string;
  buildingOn?: string; // How this builds on previous weeks
  keyActivities: string[];
  expectedProgress: string;
  isCurrentWeek?: boolean;
}

/**
 * Day-by-day schedule for a week
 */
export interface WeeklySchedule {
  weekId: string;
  days: DayPlan[];
}

export interface DayPlan {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday
  dayLabel: string; // "Monday", "Day 1", etc.
  phase: 'setup' | 'implement' | 'practice' | 'refine' | 'rest';
  activities: DayActivity[];
  isFlexDay?: boolean; // Can be adjusted
}

export interface DayActivity {
  id: string;
  instructionId?: string; // Links to FocusInstruction
  title: string;
  timeEstimate?: string; // "15 min", "30 min", etc.
  priority: 'must-do' | 'should-do' | 'nice-to-have';
  isCompleted?: boolean;
}

// ============ HOUSEHOLD REFLECTION ============

export interface HouseholdReflection {
  weekHighlight: string;
  weekChallenge: string;
  nextWeekFocus: string;
  familyMoodRating: 1 | 2 | 3 | 4 | 5;
  completedAt: Timestamp;
  completedBy: string;
}

// ============ HOUSEHOLD WORKBOOK ============

export interface HouseholdWorkbook {
  workbookId: string;
  familyId: string;
  weekId: string; // "2026-W04"
  weekNumber: number;
  startDate: string; // ISO date
  endDate: string; // ISO date

  // Journey context
  currentMilestone: {
    target: 'day30' | 'day60' | 'day90';
    description: string;
    daysRemaining: number;
  };
  journeyDayNumber: number; // Day X of 90

  // This week's focus
  weeklyFocus: HouseholdWeeklyFocus;

  // Hub tasks (household-level)
  householdTasks: HouseholdTask[];

  // Spoke tasks (delegated to individuals)
  delegatedTasks: {
    personId: string;
    personName: string;
    tasks: DelegatedTask[];
  }[];

  // Reflection
  weeklyReflection?: HouseholdReflection;

  // Metadata
  status: 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ HOUSEHOLD JOURNEY ============

export interface HouseholdJourney {
  journeyId: string;
  familyId: string;
  startDate: Timestamp;
  endDate?: Timestamp; // Day 90 or when completed

  // Selected pain points from onboarding
  selectedPainPoints: string[];
  layersFocused: LayerId[];

  // Milestones
  milestones: {
    day30: HouseholdMilestone;
    day60: HouseholdMilestone;
    day90: HouseholdMilestone;
  };

  // Progress
  currentDay: number;
  status: 'active' | 'completed' | 'paused';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ HOUSEHOLD MANUAL CONTENT ============

export interface HouseholdTrigger {
  triggerId: string;
  description: string;
  context?: string;
  layerId: LayerId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectsPersons?: string[]; // personIds most affected
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'intervention' | 'workbook';
}

export interface HouseholdStrategy {
  strategyId: string;
  description: string;
  howToUse?: string;
  layerId: LayerId;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  relatedTriggers?: string[]; // triggerIds this addresses
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'intervention' | 'workbook';
}

export interface HouseholdBoundary {
  boundaryId: string;
  description: string;
  rationale?: string;
  layerId: LayerId;
  category: 'immovable' | 'negotiable' | 'preference';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: 'onboarding' | 'ai' | 'user' | 'workbook';
}

export interface HouseholdRoutine {
  routineId: string;
  name: string;
  description: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly';
  steps?: string[];
  layerId: LayerId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ HOUSEHOLD MEMBER ============

export interface HouseholdMember {
  personId: string;
  name: string;
  role: 'parent' | 'child' | 'other';
  dateOfBirth?: Timestamp; // For age-appropriate content
  avatarUrl?: string;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Timestamp | Date): number {
  const birthDate = dateOfBirth instanceof Date ? dateOfBirth : dateOfBirth.toDate();
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get age group for content targeting
 */
export function getAgeGroup(age: number): 'infant' | 'toddler' | 'preschool' | 'elementary' | 'tween' | 'teen' | 'adult' {
  if (age < 1) return 'infant';
  if (age < 3) return 'toddler';
  if (age < 6) return 'preschool';
  if (age < 10) return 'elementary';
  if (age < 13) return 'tween';
  if (age < 18) return 'teen';
  return 'adult';
}

// ============ HOUSEHOLD MANUAL ============

export interface HouseholdManual {
  manualId: string;
  familyId: string;
  householdName: string;

  // Members
  members: HouseholdMember[];

  // 6-layer content
  triggers: HouseholdTrigger[];
  strategies: HouseholdStrategy[];
  boundaries: HouseholdBoundary[];
  routines: HouseholdRoutine[];

  // Family values (Layer 6)
  familyValues: string[];
  familyMotto?: string;

  // Journey reference
  activeJourneyId?: string;

  // Completeness tracking
  completeness: {
    layer1: number; // 0-100
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
    layer6: number;
    overall: number;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastGeneratedAt?: Timestamp;
}

// ============ MOCK DATA HELPERS ============

export function createMockHouseholdWorkbook(
  familyId: string,
  weekId: string,
  weekNumber: number
): Omit<HouseholdWorkbook, 'createdAt' | 'updatedAt'> {
  return {
    workbookId: `hw_${familyId}_${weekId}`,
    familyId,
    weekId,
    weekNumber,
    startDate: '2026-01-20',
    endDate: '2026-01-26',
    currentMilestone: {
      target: 'day30',
      description: 'Daily transitions are smooth and predictable',
      daysRemaining: 23,
    },
    journeyDayNumber: 7, // Week 1
    weeklyFocus: {
      title: 'Morning Routine: Creating a Launch Pad',
      description: 'Set up a dedicated spot for everything you need in the morning and establish night-before prep habits',
      whyItMatters: 'Mornings set the tone for the whole day. A smooth morning means less stress and better connections.',
      layersFocused: [3, 4],
    },
    householdTasks: [
      {
        taskId: 'ht_1',
        title: 'Designate a spot for keys, bags, and shoes',
        layerId: 3,
        isCompleted: false,
      },
      {
        taskId: 'ht_2',
        title: 'Create visual checklist for morning routine',
        layerId: 4,
        isCompleted: false,
      },
    ],
    delegatedTasks: [
      {
        personId: 'person_1',
        personName: 'Sarah',
        tasks: [
          {
            taskId: 'dt_1',
            title: 'Lead the launch pad setup',
            personId: 'person_1',
            personName: 'Sarah',
            layerId: 3,
            isCompleted: false,
          },
          {
            taskId: 'dt_2',
            title: 'Model using it for 3 days',
            personId: 'person_1',
            personName: 'Sarah',
            layerId: 4,
            isCompleted: false,
          },
        ],
      },
      {
        personId: 'person_2',
        personName: 'David',
        tasks: [
          {
            taskId: 'dt_3',
            title: 'Help kids put things in the right spot',
            personId: 'person_2',
            personName: 'David',
            layerId: 3,
            isCompleted: false,
          },
        ],
      },
    ],
    status: 'active',
  };
}
