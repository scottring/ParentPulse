/**
 * Parent Workbook Types
 *
 * Parent-facing weekly workbook with behavior goals and tracking.
 * Maintains technical manual aesthetic.
 * Linked to child workbook via weekId.
 */

import { Timestamp } from 'firebase/firestore';

export interface ParentWorkbook {
  workbookId: string;
  weekId: string;                    // Shared with ChildWorkbook
  familyId: string;
  personId: string;                  // Child's person ID
  personName: string;                // Denormalized for display

  weekNumber: number;
  startDate: Timestamp;
  endDate: Timestamp;

  // Parent behavior goals
  parentGoals: ParentBehaviorGoal[];

  // Daily parenting strategies (aligned with child's story)
  dailyStrategies: DailyParentStrategy[];

  // Weekly reflection (end of week)
  weeklyReflection?: ParentWeeklyReflection;

  // Read-only summary of child's progress
  childProgressSummary: ChildProgressSummary;

  // Link to child workbook
  childWorkbookId: string;

  status: 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastEditedBy?: string;             // User ID

  // Archival fields
  isArchived?: boolean;              // True if workbook has been archived
  archivedAt?: Timestamp;            // When workbook was archived
  archivedReason?: string;           // Why archived (e.g., "replaced", "manual", "outdated")
  replacedByWorkbookId?: string;     // ID of workbook that replaced this one
}

export interface ParentBehaviorGoal {
  id: string;
  description: string;
  targetFrequency: string;           // "Daily", "3x per week", etc.
  linkedToTrigger?: string;          // Manual trigger ID
  linkedToStrategy?: string;         // Manual strategy ID
  completionLog: GoalCompletion[];
  addedDate: Timestamp;
}

export interface GoalCompletion {
  date: Timestamp;
  completed: boolean;
  notes?: string;
  addedBy: string;                   // User ID
}

export interface ParentWeeklyReflection {
  whatWorkedWell: string;
  whatWasChallenging: string;
  insightsLearned: string;
  adjustmentsForNextWeek: string;
  completedAt: Timestamp;
  completedBy: string;               // User ID
}

export interface DailyParentStrategy {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  dayNumber: number;                 // 1-7
  strategyTitle: string;             // "Practice Morning Transition Patience"
  strategyDescription: string;       // What parent should focus on/practice today
  connectionToStory: string;         // How this connects to child's story today
  practicalTips: string[];           // 2-3 concrete actionable tips
  linkedToTrigger?: string;          // Manual trigger ID
  linkedToWhatWorks?: string;        // Manual strategy ID
  completed: boolean;                // Parent marks when practiced
  completedAt?: Timestamp;
  notes?: string;                    // Parent's reflection on the day
}

export interface ChildProgressSummary {
  storiesRead: number;               // Days 1-7
  activitiesCompleted: number;
  lastActiveDate: Timestamp | null;
  storyCompletionPercent: number;    // 0-100
}
