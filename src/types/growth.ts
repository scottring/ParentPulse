import { Timestamp } from 'firebase/firestore';
import type { ArcPhase } from './growth-arc';
import type { DimensionId } from '@/config/relationship-dimensions';

// ==================== Growth Item Types ====================

export type GrowthItemType =
  | 'micro_activity'       // 1-3 min action (parent or couple)
  | 'conversation_guide'   // 15-30 min structured convo
  | 'reflection_prompt'    // 1-tap emoji check-in
  | 'assessment_prompt'    // Dimension assessment question (1-tap)
  | 'journaling'           // 5-10 min written reflection with prompts
  | 'mindfulness'          // 2-10 min breathing/body scan/grounding
  | 'partner_exercise'     // 10-20 min structured 2-person activity
  | 'solo_deep_dive'       // 15-45 min deep self-work (reading + reflection)
  | 'repair_ritual'        // 10-20 min guided reconnection after conflict
  | 'gratitude_practice'   // 1-3 min daily appreciation micro-habit
  | 'illustrated_story'    // Kid story for parent to read (future)
  | 'weekly_arc'           // Theme card tying the week together (future)
  | 'progress_snapshot';   // "here's what shifted" on stage advancement

export type GrowthItemStatus =
  | 'queued'       // Generated, waiting to be surfaced
  | 'active'       // Currently visible in feed
  | 'seen'         // User opened/viewed it
  | 'completed'    // User gave feedback
  | 'skipped'      // User dismissed
  | 'expired';     // Time window passed without interaction

export type GrowthItemSpeed = 'ambient' | 'intentional';

export type RelationalLevel = 'individual' | 'couple' | 'family';

// Depth control
export type DepthTier = 'light' | 'moderate' | 'deep';
export type EngagementMode = 'light' | 'moderate' | 'deep';

// Depth alternatives: AI generates lighter/deeper versions of the same insight
export interface DepthAlternatives {
  light?: { body: string; estimatedMinutes: number; type: GrowthItemType };
  moderate?: { body: string; estimatedMinutes: number; type: GrowthItemType };
  deep?: { body: string; estimatedMinutes: number; type: GrowthItemType };
}

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

  // Depth
  depthTier?: DepthTier;
  alternatives?: DepthAlternatives;

  // Feedback (the 1-3 tap loop)
  feedback?: GrowthFeedback;                              // Legacy single-user feedback
  feedbackByUser?: Record<string, GrowthFeedback>;        // Per-user feedback (keyed by userId)

  // In-progress drafts — written during the practice's "doing" phase,
  // before the user has committed via submitFeedback. Keyed by userId
  // so multi-person items can track drafts separately. Cleared when
  // the user completes the practice.
  drafts?: Record<string, { note: string; updatedAt: Timestamp }>;

  // Arc linkage (present when item belongs to a Growth Arc)
  arcId?: string;
  arcPhase?: ArcPhase;
  arcSequence?: number;            // Position within the arc (1-indexed)

  // Dimension linkage (present when item assesses/targets a dimension)
  dimensionId?: DimensionId;
  isAssessmentItem?: boolean;      // True for pre/post assessment questions

  // Story content — present when type === 'illustrated_story'
  // A short, age-appropriate narrative for a parent to read aloud with a kid.
  storyContent?: StoryContent;

  // Kid reaction — captured after a parent reads a story with a child.
  // Present when a story has been completed.
  kidReaction?: KidReaction;

  // Lineage: if this item was drawn from a manual-chat conversation
  sourceChatSessionId?: string;

  // Metadata
  createdAt: Timestamp;
  generatedBy: 'ai' | 'system';
  batchId?: string;                 // Links items generated together
}

// ==================== Story Content ====================

/**
 * The body of an illustrated story. Plain text paragraphs, with a drop-cap
 * opening line rendered as the first paragraph's initial letter. No images —
 * the illustration in Relish is typographic (drop caps, ornaments, fleurons).
 */
export interface StoryContent {
  title: string;
  paragraphs: string[];        // 5-10 short paragraphs
  openingLine?: string;         // first line, used for drop cap emphasis
  lessonSummary?: string;       // internal one-liner: what lesson is embedded
  ageTarget?: number;            // e.g. 8 — used to tune tone on re-generation
  characterNotes?: string;       // optional: who's in it, for re-generation
}

// ==================== Kid Reaction ====================

/**
 * Captured after a parent reads a story with a child. The emoji rating is the
 * primary signal; the comment is optional. Both are saved back to the kid's
 * manual as a progress note.
 */
export interface KidReaction {
  rating: 1 | 2 | 3 | 4 | 5;   // 1 = confused/disliked, 5 = loved it
  emoji: string;                 // which emoji was tapped, for display later
  comment?: string;              // what the kid said (captured by the parent)
  reactedAt: Timestamp;
  capturedBy: string;            // userId of the parent who captured it
}

// ==================== Firestore Collection ====================

export const GROWTH_COLLECTIONS = {
  GROWTH_ITEMS: 'growth_items',
} as const;
