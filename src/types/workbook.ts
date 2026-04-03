import { Timestamp } from 'firebase/firestore';
import { DimensionId, DimensionDomain } from '@/config/relationship-dimensions';
import { RelationshipType } from '@/types/person-manual';

// The phase within a workbook chapter's progression
export type ArcPhase = 'awareness' | 'practice' | 'integration';

export type ExerciseType = 'conversation' | 'observation' | 'reflection' | 'practice' | 'ritual';
export type ExerciseDifficulty = 'starter' | 'intermediate' | 'advanced';
export type ReflectionRating = 'didnt_try' | 'tried_hard' | 'went_okay' | 'went_well';

export interface Exercise {
  exerciseId: string;
  dimensionId: DimensionId;

  // Content
  title: string;
  description: string;
  instructions: string[];
  suggestedTiming: string;
  durationMinutes: number;

  // Categorization
  exerciseType: ExerciseType;
  difficulty: ExerciseDifficulty;
  arcPhase: ArcPhase;
  prerequisiteIds: string[];

  // Targeting
  forDomain: DimensionDomain;
  forRelationshipTypes: RelationshipType[];
  minChildAge?: number;
  maxChildAge?: number;

  // Reflection template
  reflectionPrompts: string[];
  successIndicators: string[];

  // Research basis
  researchBasis: string;
}

export interface ExerciseCompletion {
  completionId: string;
  exerciseId: string;
  chapterId: string;
  userId: string;

  // Reflection data
  rating: ReflectionRating;
  reflectionNotes: string;
  completedAt: Timestamp;

  // Manual integration
  suggestedManualEntries: SuggestedManualEntry[];
  manualEntriesAccepted: string[];
}

export interface SuggestedManualEntry {
  id: string;
  targetSection: 'triggers' | 'what_works' | 'what_doesnt_work' | 'boundaries';
  content: string;
  accepted: boolean;
}

export interface WorkbookChapter {
  chapterId: string;
  familyId: string;
  userId: string;

  // Target
  dimensionId: DimensionId;
  personId: string;
  personName: string;

  // State
  status: 'active' | 'paused' | 'completed';
  currentPhase: ArcPhase;
  currentExerciseId: string;

  // Score tracking
  startingScore: number;
  currentScore: number;
  targetScore: number;

  // History
  completions: ExerciseCompletion[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export const WORKBOOK_COLLECTIONS = {
  WORKBOOK_CHAPTERS: 'workbook_chapters',
  EXERCISES: 'exercises',
} as const;
