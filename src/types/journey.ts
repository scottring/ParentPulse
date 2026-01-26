import { Timestamp } from 'firebase/firestore';

// ==================== Journey Types ====================

/**
 * A 90-day journey with milestones
 */
export interface Journey {
  journeyId: string;
  familyId: string;
  manualId: string; // Can be family manual or person manual

  // Journey info
  title: string;
  description: string;
  focusArea: string; // e.g., "Mornings", "Communication", "Quality Time"
  relatedLayers: number[]; // Which layers this journey focuses on

  // Milestones
  milestones: JourneyMilestone[];

  // Status
  status: 'active' | 'paused' | 'completed';
  startDate: Timestamp;
  endDate?: Timestamp; // When journey ends (startDate + 90 days)

  // Progress
  currentDay: number; // 1-90
  weeklyFocuses: WeeklyFocus[];

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  lastUpdatedAt: Timestamp;
}

/**
 * A milestone within a journey (30, 60, or 90 days)
 */
export interface JourneyMilestone {
  day: 30 | 60 | 90;
  title: string;
  description: string;
  status: 'upcoming' | 'current' | 'completed' | 'missed';
  completedAt?: Timestamp;
  reflection?: string; // User reflection on milestone
  feedbackOnWhatHelped?: string; // What worked best
}

/**
 * Weekly focus within a journey
 */
export interface WeeklyFocus {
  weekNumber: number; // 1-13 (13 weeks in 90 days)
  focus: string;
  status: 'upcoming' | 'current' | 'completed';
  tasksSummary?: string;
  reflectionSummary?: string;
}

// ==================== Household Member Extension ====================

/**
 * Extended household member with manual link
 */
export interface HouseholdMemberLink {
  memberId: string;
  name: string;
  role: 'parent' | 'child';
  manualId?: string; // Link to their individual manual
  manualType?: 'child' | 'marriage';
  avatarUrl?: string;
}

// ==================== Learned Item ====================

/**
 * Something learned about the household, organized by layer
 */
export interface LearnedItem {
  itemId: string;
  layerId: number;
  title: string;
  description: string;
  source: 'onboarding' | 'reflection' | 'workbook' | 'manual';
  addedAt: Timestamp;
  addedBy: string;
}

// ==================== Firestore Collection ====================

export const JOURNEY_COLLECTION = 'journeys';
