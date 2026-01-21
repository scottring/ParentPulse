/**
 * Child Workbook Types
 *
 * Child-facing weekly storybook with serialized narrative and activities.
 * Completely different aesthetic from parent workbook - children's book style.
 * Linked to parent workbook via weekId.
 */

import { Timestamp } from 'firebase/firestore';
import { DailyActivity } from './workbook';

export interface ChildWorkbook {
  workbookId: string;
  weekId: string;                    // Shared with ParentWorkbook
  familyId: string;
  personId: string;                  // Child's person ID
  personName: string;                // Child's name
  personAge: number;                 // For age-appropriate content

  weekNumber: number;
  startDate: Timestamp;
  endDate: Timestamp;

  // The story
  weeklyStory: WeeklyStory;

  // Story-integrated activities
  dailyActivities: DailyActivity[];

  // Progress tracking
  storyProgress: StoryProgress;

  // Link to parent workbook
  parentWorkbookId: string;

  status: 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveDate?: Timestamp;
}

export interface StoryProgress {
  currentDay: number;                // 1-7
  daysRead: boolean[];               // [true, true, false, false, false, false, false]
  activitiesCompleted: string[];     // Activity IDs
  totalActivities: number;
  lastReadAt?: Timestamp;
}

export interface WeeklyStory {
  title: string;                          // "Luna and the Big Transition"
  characterName: string;                  // "Luna"
  characterDescription: string;           // "a brave young fox"
  characterAge: number;                   // Mirrors child's age
  storyTheme: StoryTheme;

  dailyFragments: DailyStoryFragment[];   // 7 entries (Mon-Sun)

  reflectionQuestions: StoryReflectionQuestion[];  // 5-7 questions

  // What this story mirrors from the manual
  mirrorsContent: MirroredContent;

  // Generation metadata
  ageAppropriateLevel: 'picture-book' | 'early-reader' | 'chapter-book';
  readingLevel: string;                   // "Ages 3-5", "Ages 6-8", "Ages 9-12"
  estimatedReadTime: number;              // Total minutes for full story

  // Optional future features
  audioNarrationUrl?: string;             // Future: text-to-speech
}

export interface DailyStoryFragment {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  dayNumber: number;                      // 1-7
  fragmentText: string;                   // The actual story text for this day

  // AI-generated illustration (Nano Banana Pro)
  illustrationPrompt: string;             // Prompt used for image generation
  illustrationUrl?: string;               // Firebase Storage URL
  illustrationThumbnail?: string;         // Small version for fast loading
  illustrationStatus: 'pending' | 'generating' | 'complete' | 'failed';

  pairedActivityId?: string;              // Links to activity for this day
  wordCount: number;
  estimatedReadTime: number;              // Minutes
}

export interface StoryReflectionQuestion {
  id: string;
  questionText: string;                   // "What was hard for Luna?"
  category: 'challenge' | 'courage' | 'strategy' | 'connection' | 'compassion';
  purposeNote?: string;                   // For parent: "Helps identify challenges"
}

export interface MirroredContent {
  primaryTrigger?: string;              // Manual trigger ID
  strategiesUsed?: string[];            // Manual strategy IDs
  strengthsHighlighted?: string[];      // From coreInfo.strengths
}

export type StoryTheme =
  | 'courage'                             // Trying despite fear
  | 'transitions'                         // Change and adjustment
  | 'friendship'                          // Belonging and connection
  | 'problem-solving'                     // Competence and mastery
  | 'emotions'                            // Feeling big feelings
  | 'boundaries'                          // Saying no, self-advocacy
  | 'growth'                              // Learning from mistakes
  | 'self-compassion';                    // Being kind to yourself

// Story Reflection Activity Response
export interface StoryReflectionResponse {
  challengeIdentified: string;
  courageObserved: string;
  strategyNamed: string;
  personalConnection: string;
  adviceToCharacter: string;
  parentNotes?: string;
  completedAt: Timestamp;
  completedBy: string;                    // User ID
}
