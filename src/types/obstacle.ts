import type { Timestamp } from 'firebase/firestore';

export type ObstacleStatus =
  | 'fresh'
  | 'clarifying'
  | 'prescribed'
  | 'executed'
  | 'cleared'
  | 'paused';

export type ObstacleOrigin =
  | 'journal-entry'
  | 'clarity-session'
  | 'ritual-focus'
  | 'mirror'
  | 'manual'
  | 'direct';

export type VisibilityMode = 'private' | 'shared-with' | 'family';

export interface ObstacleVisibility {
  mode: VisibilityMode;
  /** Always includes the author. Used by both rules and UI. */
  sharedWith: string[];
}

export interface Obstacle {
  id: string;
  title: string;             // empty string while status='fresh' until first AI turn drafts one
  summary: string;
  authorId: string;
  familyId: string;          // denormalized for rules
  subjectPersonIds: string[];
  status: ObstacleStatus;
  visibility: ObstacleVisibility;
  visibleToUserIds: string[]; // denormalized — required for queries
  sensitive: boolean;
  allowSpecificsInOutput: boolean;
  bringToTherapy: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clearedAt: Timestamp | null;
  origin: ObstacleOrigin;
  originRefId: string | null;
}

export type MoveType =
  | 'clarity-session'
  | 'prescription'
  | 'execution-note'
  | 'reflection'
  | 'milestone'
  | 'revisit'
  | 'manual-writeback';

export type PrescriptionShape =
  | 'atomic'
  | 'sequence'
  | 'experiment'
  | 'illustrated-story';

export interface PrescriptionDraft {
  shape: PrescriptionShape;
  body: string;             // for v1: text only. Sequence/experiment/story shapes can extend body in later phases.
}

export interface ClaritySessionTurnPayload {
  role: 'user' | 'assistant';
  content: string;          // for 'user': raw text. for 'assistant': the reflection + question concatenated.
  reflection?: string;      // assistant only
  question?: string;        // assistant only
  prescriptionDraft?: PrescriptionDraft; // assistant only, present when AI proposes
}

export interface PrescriptionPayload {
  shape: PrescriptionShape;
  body: string;
  forPersonId?: string;
  dueByHint?: string;
  executed: boolean;
  executionNote?: string;
}

export interface Move {
  id: string;
  type: MoveType;
  at: Timestamp;
  byUserId: string;
  /** Concrete payload shape depends on `type`. Validate with discriminated union helpers. */
  payload: ClaritySessionTurnPayload | PrescriptionPayload | Record<string, unknown>;
}

export interface NewObstacleInput {
  authorId: string;
  familyId: string;
  subjectPersonIds?: string[];
  origin?: ObstacleOrigin;
  originRefId?: string | null;
}
