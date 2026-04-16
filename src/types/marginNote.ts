import { Timestamp } from 'firebase/firestore';

// A user-authored note rendered in the margin of a journal entry.
// v1 attaches only to journal_entries docs (not synthetic entries).
export interface MarginNote {
  id: string;
  familyId: string;
  // Real journal_entries doc id. For written/observation entries the
  // virtual Entry.id equals this; we name it explicitly so consumers
  // know this is a Firestore foreign key.
  journalEntryId: string;
  authorUserId: string;
  content: string; // 1..80 chars, trimmed plain text
  createdAt: Timestamp;
  editedAt?: Timestamp;

  // Denormalized from the parent journal entry. Clients must NOT edit
  // these directly after create — the cascade function keeps them in
  // sync when the parent's visibility changes.
  visibleToUserIds: string[];
  sharedWithUserIds: string[];
}

// Input to createNote — the hook fills in everything else.
export interface CreateMarginNoteInput {
  journalEntryId: string;
  content: string;
}

export const MARGIN_NOTE_MAX_LENGTH = 80;
