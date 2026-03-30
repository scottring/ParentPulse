import { Timestamp } from 'firebase/firestore';
import type { ArcPhase } from './growth-arc';
import type { DimensionId } from '@/config/relationship-dimensions';

// ==================== Growth Item Types ====================

export type GrowthItemType =
  | 'micro_activity'       // 1-3 min action (parent or couple)
  | 'conversation_guide'   // 15-min structured convo (future)
  | 'reflection_prompt'    // 1-tap emoji check-in
  | 'assessment_prompt'    // Dimension assessment question (1-tap)
  | 'illustrated_story'    // Kid story for parent to read (future)
  | 'weekly_arc'           // Theme card tying the week together (future)
  | 'progress_snapshot';   // Monthly "here's what shifted" (future)

export type GrowthItemStatus =
  | 'queued'       // Generated, waiting to be surfaced
  | 'active'       // Currently visible in feed
  | 'seen'         // User opened/viewed it
  | 'completed'    // User gave feedback
  | 'skipped'      // User dismissed
  | 'expired';     // Time window passed without interaction

export type GrowthItemSpeed = 'ambient' | 'intentional';

export type RelationalLevel = 'individual' | 'couple' | 'family';

export type FeedbackReaction = 'loved_it' | 'tried_it' | 'not_now' | 'doesnt_fit';

export type ImpactRating = 1 | 2 | 3; // 1=slight, 2=noticeable, 3=breakthrough

// ==================== Growth Feedback ====================

export interface GrowthFeedback {
  reaction: FeedbackReaction;
  impactRating?: ImpactRating;
  note?: string;
  respondedAt: Timestamp;
  timeToRespond?: number; // seconds from active to response
}

// ==================== Growth Item ====================

export interface GrowthItem {
  growthItemId: string;
  familyId: string;

  // What
  type: GrowthItemType;
  title: string;                    // Short, scannable (< 60 chars)
  body: string;                     // 1-3 sentences of instruction/content
  emoji: string;                    // Visual anchor for the feed card

  // Who
  targetPersonIds: string[];        // Who this is about
  targetPersonNames: string[];      // Denormalized
  assignedToUserId: string;         // Who should see/do this
  assignedToUserName: string;       // Denormalized

  // Why (lineage back to manual)
  sourceInsightId?: string;         // SynthesizedInsight.id that spawned this
  sourceInsightType?: 'alignment' | 'gap' | 'blind_spot';
  sourceManualId?: string;
  sourceGapSeverity?: 'minor_gap' | 'significant_gap';
  relationalLevel?: RelationalLevel;   // individual, couple, or family

  // When
  speed: GrowthItemSpeed;
  scheduledDate: Timestamp;
  expiresAt: Timestamp;             // ambient: 24h, intentional: 7d
  estimatedMinutes: number;         // 1-15

  // Status
  status: GrowthItemStatus;
  statusUpdatedAt?: Timestamp;

  // Feedback (the 1-3 tap loop)
  feedback?: GrowthFeedback;

  // Arc linkage (present when item belongs to a Growth Arc)
  arcId?: string;
  arcPhase?: ArcPhase;
  arcSequence?: number;            // Position within the arc (1-indexed)

  // Dimension linkage (present when item assesses/targets a dimension)
  dimensionId?: DimensionId;
  isAssessmentItem?: boolean;      // True for pre/post assessment questions

  // Metadata
  createdAt: Timestamp;
  generatedBy: 'ai' | 'system';
  batchId?: string;                 // Links items generated together
}

// ==================== Firestore Collection ====================

export const GROWTH_COLLECTIONS = {
  GROWTH_ITEMS: 'growth_items',
} as const;
