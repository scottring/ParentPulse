import { Timestamp } from 'firebase/firestore';

export type JournalCategory =
  | 'moment'        // Something that just happened
  | 'reflection'    // Thinking about a pattern or feeling
  | 'win'           // Something that went well
  | 'challenge'     // Something difficult
  | 'question'      // Something you're wondering about
  | 'gratitude';    // Something you're thankful for

export interface JournalMedia {
  url: string;
  type: 'image' | 'audio' | 'link';
  filename?: string;
  mimeType?: string;
  // For links — the original URL before any processing.
  originalUrl?: string;
  // For audio — transcription produced by Cloud Function.
  transcription?: string;
  // Storage path for Firebase Storage files (used for deletion).
  storagePath?: string;
}

export interface JournalEntry {
  entryId: string;
  familyId: string;
  authorId: string;

  // Media attachments — photos, voice notes, links.
  media?: JournalMedia[];

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

  // Companion entry — if set, this entry is a response to another
  // entry the author can read. Both entries remain independent (own
  // author, own visibility); the link is denormalized one-way on the
  // response. The UI restricts composing a response to cases where
  // the author is one of the parent's mentioned subjects; the rule
  // enforces the weaker "can read the parent" constraint. Null/absent
  // for stand-alone entries. Immutable after create.
  respondsToEntryId?: string;

  // Moment aggregation — if set, this entry is one view of a moment
  // that holds 1..N views (e.g. both partners describing the same
  // bedtime scene). The moment doc lives at `moments/{momentId}` and
  // caches cross-view synthesis. Null/absent for stand-alone entries.
  // Immutable after create; set either by creating a fresh entry with
  // a new moment, or by attaching a new entry to an existing moment.
  momentId?: string;

  // Legacy binary flag — still present on entries written before
  // per-person sharing existed. Not written by new entries. Used only
  // as a fallback during migration.
  isPrivate?: boolean;

  // Subject type — who is "speaking" in this entry.
  // 'self' = the logged-in author writing for themselves (default).
  // 'child_proxy' = a parent writing on behalf of a child in a
  // supervised session. The child's personId is in subjectPersonId.
  subjectType?: 'self' | 'child_proxy';
  subjectPersonId?: string; // personId of the child when child_proxy

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

  // AI enrichment — written by Cloud Functions `enrichJournalEntry`
  // (on create) and `reEnrichJournalEntry` (on text edit). Contains
  // structured metadata extracted from the entry text: summary,
  // referenced people, touched dimensions, and emergent themes.
  enrichment?: {
    summary: string;
    aiPeople: string[];       // personIds extracted by AI
    aiDimensions: string[];   // dimensionIds from the 20-dimension framework
    themes: string[];         // free-text theme tags (2-5 words each)
    enrichedAt: Timestamp;
    model: string;
  };

  // Activity provenance — set when the auto-synthesis spawns a
  // Workbook activity from this entry. Links journal → workbook.
  activitySpawnedAt?: Timestamp;
  activitySpawnedItemId?: string;

  // Per-entry chat thread — set by chatWithEntry Cloud Function when
  // the first message is sent. Used by the UI to show a chat indicator
  // on entry cards and auto-open the thread on the detail page.
  hasChatThread?: boolean;
  chatUpdatedAt?: Timestamp;

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
  media?: JournalMedia[];
}

export const JOURNAL_CATEGORIES: { value: JournalCategory; label: string; emoji: string }[] = [
  { value: 'moment', label: 'A moment', emoji: '✦' },
  { value: 'reflection', label: 'Reflection', emoji: '◎' },
  { value: 'win', label: 'A win', emoji: '◆' },
  { value: 'challenge', label: 'Challenge', emoji: '▲' },
  { value: 'question', label: 'Question', emoji: '?' },
  { value: 'gratitude', label: 'Gratitude', emoji: '♡' },
];
