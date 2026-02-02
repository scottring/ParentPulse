/**
 * Multi-Perspective Input System Types
 *
 * Enables collecting input from multiple family members about the same person,
 * with age-adapted questions and AI synthesis of different perspectives.
 */

import { Timestamp } from 'firebase/firestore';
import type { LayerId } from './assessment';

// ==================== Respondent Types ====================

/**
 * Type of respondent providing input about a person
 */
export type RespondentType =
  | 'self'        // The person the manual is about
  | 'partner'     // Spouse/co-parent
  | 'parent'      // Parent observing child
  | 'child'       // Child providing input (age-adapted)
  | 'household';  // Any adult household member

/**
 * Age-based prompt variant for questions
 */
export type PromptVariant = 'adult' | 'teen' | 'child';

/**
 * Configuration for which respondents should answer a question
 */
export interface QuestionRespondent {
  respondentType: RespondentType;
  minAge?: number;              // For child respondents
  maxAge?: number;              // For age restrictions
  required: boolean;            // Must have this input
  weight?: number;              // For synthesis weighting (default 1.0)
  promptVariant?: PromptVariant | 'auto';  // Question phrasing, 'auto' = based on age
}

/**
 * Age-adapted question variant
 */
export interface QuestionVariant {
  prompt: string;
  helpText?: string;
  placeholder?: string;
  inputType?: 'textarea' | 'multiple_choice' | 'multiple_choice_with_other' | 'rating';
  options?: Array<{ value: string; label: string }>;
}

/**
 * Question with multi-perspective support
 */
export interface MultiPerspectiveQuestion {
  questionId: string;
  category: 'trigger' | 'strategy' | 'boundary' | 'value' | 'regulation' | 'general';
  layerId?: LayerId;

  // Age-adapted variants
  variants: {
    adult: QuestionVariant;
    teen?: QuestionVariant;
    child?: QuestionVariant;
  };

  // Which respondents should answer this question
  respondents: QuestionRespondent[];
}

// ==================== Input Data Types ====================

/**
 * A single input from one respondent
 */
export interface ManualInput {
  inputId: string;
  questionId: string;
  manualId: string;

  // Respondent info
  respondentId: string;        // userId or personId
  respondentType: RespondentType;
  respondentName: string;      // "Mom", "Dad", "Emma"
  respondentAge?: number;      // For age-based variant selection

  // Response content
  response: string | string[] | number;
  selectedOptions?: string[];  // For multiple choice

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  promptVariantUsed: PromptVariant;
}

/**
 * Discrepancy identified between perspectives
 */
export interface PerspectiveDiscrepancy {
  topic: string;
  perspectives: Record<string, string>;  // respondentName -> their view
  note: string;  // AI explanation of why both could be true
}

/**
 * AI-synthesized content from multiple perspectives
 */
export interface PerspectiveSynthesis {
  summary: string;           // Combined understanding
  agreements: string[];      // Where perspectives align
  discrepancies: PerspectiveDiscrepancy[];  // Where perspectives differ
  confidence: number;        // 0-1 based on agreement level
  synthesizedAt: Timestamp;
  synthesizedBy: 'ai' | 'manual';
}

/**
 * A manual item with multi-perspective data
 */
export interface MultiPerspectiveItem {
  itemId: string;
  manualId: string;
  category: 'trigger' | 'strategy' | 'boundary' | 'value' | 'regulation' | 'general';
  layerId?: LayerId;

  // Raw inputs from different perspectives
  inputs: ManualInput[];

  // AI-synthesized content
  synthesis?: PerspectiveSynthesis;

  // Status
  status: 'collecting' | 'ready_for_synthesis' | 'synthesized' | 'reviewed';
  minimumRespondents: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== Collection Status Types ====================

/**
 * Status of input collection for a manual
 */
export interface InputCollectionStatus {
  manualId: string;
  personId: string;

  // Overall status
  totalQuestions: number;
  questionsWithInput: number;

  // Respondent status
  respondents: {
    respondentId: string;
    respondentName: string;
    respondentType: RespondentType;
    questionsAnswered: number;
    totalAssigned: number;
    completionPercentage: number;
    lastInputAt?: Timestamp;
  }[];

  // Questions awaiting input
  pendingQuestions: {
    questionId: string;
    missingRespondents: RespondentType[];
  }[];

  // Ready for synthesis
  readyForSynthesis: string[];  // questionIds
}

// ==================== Age Threshold Constants ====================

/**
 * Age thresholds for prompt variant selection
 */
export const AGE_THRESHOLDS = {
  CHILD_MAX: 7,    // 7 and under get child variant
  TEEN_MAX: 14,    // 8-14 get teen variant
  // 15+ get adult variant
} as const;

/**
 * Get the appropriate prompt variant for an age
 */
export function getPromptVariantForAge(age: number): PromptVariant {
  if (age <= AGE_THRESHOLDS.CHILD_MAX) return 'child';
  if (age <= AGE_THRESHOLDS.TEEN_MAX) return 'teen';
  return 'adult';
}

// ==================== Question Routing Matrix Types ====================

/**
 * Defines which respondents answer which categories for a manual type
 */
export interface QuestionRoutingMatrix {
  manualType: 'child' | 'adult' | 'marriage' | 'household';
  routing: {
    category: string;
    respondents: {
      type: RespondentType;
      required: boolean;
      variant: PromptVariant | 'auto';
    }[];
  }[];
}

/**
 * Default routing for child manuals
 */
export const CHILD_MANUAL_ROUTING: QuestionRoutingMatrix = {
  manualType: 'child',
  routing: [
    {
      category: 'triggers',
      respondents: [
        { type: 'self', required: false, variant: 'auto' },
        { type: 'parent', required: true, variant: 'adult' },
      ],
    },
    {
      category: 'strategies',
      respondents: [
        { type: 'self', required: false, variant: 'auto' },
        { type: 'parent', required: true, variant: 'adult' },
      ],
    },
    {
      category: 'boundaries',
      respondents: [
        { type: 'self', required: false, variant: 'auto' },  // Awareness only
        { type: 'parent', required: true, variant: 'adult' },  // Setting boundaries
      ],
    },
    {
      category: 'regulation',
      respondents: [
        { type: 'self', required: false, variant: 'auto' },
        { type: 'parent', required: true, variant: 'adult' },
      ],
    },
    {
      category: 'values',
      respondents: [
        { type: 'parent', required: true, variant: 'adult' },
      ],
    },
  ],
};

/**
 * Default routing for adult manuals
 */
export const ADULT_MANUAL_ROUTING: QuestionRoutingMatrix = {
  manualType: 'adult',
  routing: [
    {
      category: 'triggers',
      respondents: [
        { type: 'self', required: true, variant: 'adult' },
        { type: 'partner', required: false, variant: 'adult' },
        { type: 'child', required: false, variant: 'auto' },  // Simple feedback
      ],
    },
    {
      category: 'strategies',
      respondents: [
        { type: 'self', required: true, variant: 'adult' },
        { type: 'partner', required: false, variant: 'adult' },
      ],
    },
    {
      category: 'boundaries',
      respondents: [
        { type: 'self', required: true, variant: 'adult' },
        { type: 'partner', required: false, variant: 'adult' },
      ],
    },
    {
      category: 'blind_spots',
      respondents: [
        { type: 'partner', required: false, variant: 'adult' },
        { type: 'child', required: false, variant: 'auto' },
      ],
    },
  ],
};
