import { Timestamp } from 'firebase/firestore';

export type JournalCategory =
  | 'moment'        // Something that just happened
  | 'reflection'    // Thinking about a pattern or feeling
  | 'win'           // Something that went well
  | 'challenge'     // Something difficult
  | 'question'      // Something you're wondering about
  | 'gratitude';    // Something you're thankful for

export interface JournalEntry {
  entryId: string;
  familyId: string;
  authorId: string;

  // Content
  text: string;
  // Optional title above the body on the detail page. Editable in
  // Phase B; AI-filled on save when blank in a later phase.
  title?: string;
  category: JournalCategory;
  tags: string[];

  // Privacy — per-person sharing model.
  //
  // `visibleToUserIds` is the denormalized read list. It always
  // contains the author plus every userId in `sharedWithUserIds`.
  // Firestore security rules and queries use this field via
  // `array-contains` — the rules cannot do OR-of-fields, and queries
  // cannot post-filter, so this denormalization is load-bearing.
  //
  // `sharedWithUserIds` is the source of truth for who the author
  // explicitly shared the entry with (author excluded). Used by UI
  // to render "Shared with Iris" vs "Private".
  visibleToUserIds: string[];
  sharedWithUserIds: string[];

  // Legacy binary flag — still present on entries written before
  // per-person sharing existed. Not written by new entries. Used only
  // as a fallback during migration.
  isPrivate?: boolean;

  // Person tagging (which family members this relates to — note these
  // are Person IDs, not userIds; Persons may or may not have linked
  // user accounts).
  personMentions: string[]; // personIds
  childId?: string;         // Legacy field used by daily analysis

  // Optional context
  context?: {
    stressLevel?: number;   // 1-5, used by daily analysis
    timeOfDay?: string;     // auto-set from client
  };

  // AI enrichment — written by Cloud Function `enrichJournalEntry`,
  // never by the client. Contains structured metadata extracted from
  // the entry text: summary, referenced people, touched dimensions,
  // and emergent themes. Absent until the Cloud Function fires (which
  // happens on entry creation; edits don't re-enrich in Phase C.1).
  enrichment?: {
    summary: string;
    aiPeople: string[];       // personIds extracted by AI
    aiDimensions: string[];   // dimensionIds from the 20-dimension framework
    themes: string[];         // free-text theme tags (2-5 words each)
    enrichedAt: Timestamp;
    model: string;
  };

  // Timestamps
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Shape accepted by updateEntry. Every field is optional — callers
// patch only what changed. Sharing updates recompute visibleToUserIds
// internally so writers never touch the denormalized field directly.
export interface UpdateEntryInput {
  text?: string;
  title?: string;
  category?: JournalCategory;
  personMentions?: string[];
  sharedWithUserIds?: string[];
}

export const JOURNAL_CATEGORIES: { value: JournalCategory; label: string; emoji: string }[] = [
  { value: 'moment', label: 'A moment', emoji: '✦' },
  { value: 'reflection', label: 'Reflection', emoji: '◎' },
  { value: 'win', label: 'A win', emoji: '◆' },
  { value: 'challenge', label: 'Challenge', emoji: '▲' },
  { value: 'question', label: 'Question', emoji: '?' },
  { value: 'gratitude', label: 'Gratitude', emoji: '♡' },
];
