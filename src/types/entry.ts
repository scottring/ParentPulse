import { Timestamp } from 'firebase/firestore';

// ==================== Entry Type ====================

export type EntryType =
  | 'written'       // user free-text
  | 'observation'   // user, about another person
  | 'activity'      // completed practice / outing / check-in
  | 'synthesis'     // AI, about a subject
  | 'nudge'         // AI, "one thing to try"
  | 'prompt'        // AI question to user
  | 'reflection'    // user answer to a prompt
  | 'conversation'; // threaded Ask-about-this dialogue

export type EntryAuthor =
  | { kind: 'person'; personId: string }
  | { kind: 'system' };

export type EntrySubject =
  | { kind: 'person'; personId: string }
  | { kind: 'bond'; personIds: [string, string] }
  | { kind: 'family' };

export interface ConversationTurn {
  author: EntryAuthor;
  content: string;
  createdAt: Timestamp;
}

export interface Entry {
  id: string;
  familyId: string;

  type: EntryType;
  author: EntryAuthor;
  subjects: EntrySubject[];
  content: string;

  // Only populated for type === 'conversation'.
  turns?: ConversationTurn[];

  // For conversations started from "Ask about this".
  anchorEntryId?: string;

  // For syntheses/nudges: entries this was derived from.
  sourceEntryIds?: string[];

  // Dimension IDs, emotion tags — invisible to user, used for filtering + intelligence.
  tags: string[];

  // Visibility (follows existing journal-entry pattern).
  visibleToUserIds: string[];
  sharedWithUserIds: string[];

  createdAt: Timestamp;
  archivedAt?: Timestamp;
}

// ==================== Type Guards ====================

export function isWrittenEntry(e: Entry): e is Entry & { type: 'written' } {
  return e.type === 'written';
}

export function isObservationEntry(e: Entry): e is Entry & { type: 'observation' } {
  return e.type === 'observation';
}

export function isSynthesisEntry(e: Entry): e is Entry & { type: 'synthesis' } {
  return e.type === 'synthesis';
}

export function isNudgeEntry(e: Entry): e is Entry & { type: 'nudge' } {
  return e.type === 'nudge';
}

export function isPromptEntry(e: Entry): e is Entry & { type: 'prompt' } {
  return e.type === 'prompt';
}

export function isReflectionEntry(e: Entry): e is Entry & { type: 'reflection' } {
  return e.type === 'reflection';
}

export function isActivityEntry(e: Entry): e is Entry & { type: 'activity' } {
  return e.type === 'activity';
}

export function isConversationEntry(
  e: Entry
): e is Entry & { type: 'conversation'; turns: ConversationTurn[] } {
  return e.type === 'conversation' && Array.isArray(e.turns);
}

// ==================== Filter ====================

export interface EntryFilter {
  // Restrict to entries including any of these subjects (OR).
  subjectPersonIds?: string[];
  includeFamilySubject?: boolean;
  includeBonds?: boolean;

  // Restrict to entries of these types (OR).
  types?: EntryType[];

  // Time bounds (inclusive).
  fromDate?: Date;
  toDate?: Date;

  // Include entries soft-archived by the AI cadence (default false).
  includeArchived?: boolean;

  // Include reflection entries derived from onboarding contributions.
  // Default false — contribution answers are structural manual content,
  // not journal content. Person-manual deep-links opt in.
  includeContributionSources?: boolean;

  // When true, return only entries whose visibleToUserIds contains
  // exactly the current user (private entries). Requires the consumer
  // to know who the current user is.
  onlyPrivateToCurrentUser?: boolean;
}
