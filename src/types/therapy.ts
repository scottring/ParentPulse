import type { Timestamp } from 'firebase/firestore';

export type TherapistKind = 'individual' | 'couples' | 'family';

export interface Therapist {
  id: string;
  ownerUserId: string;
  displayName: string;
  kind: TherapistKind;
  createdAt: Timestamp;
}

export type TherapyWindowStatus = 'open' | 'closed';

export interface TherapyWindow {
  id: string;
  therapistId: string;
  ownerUserId: string;
  status: TherapyWindowStatus;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  themeIds: string[];
  noteIds: string[];
  carriedForwardFromWindowId?: string;
  lastRegeneratedAt?: Timestamp;
}

export type TherapySourceKind =
  | 'entry'
  | 'marginalia'
  | 'synthesis'
  | 'growth_item'
  | 'therapy_note';

export interface TherapySourceRef {
  kind: TherapySourceKind;
  id: string;
  snippet: string;
}

export interface TherapyThemeUserState {
  starred: boolean;
  dismissed: boolean;
  note?: string;
}

export interface TherapyThemeLifecycle {
  firstSeenWindowId: string;
  carriedForwardCount: number;
  discussedAt?: Timestamp;
}

export interface TherapyTheme {
  id: string;
  windowId: string;
  therapistId: string;
  ownerUserId: string;
  title: string;
  summary: string;
  sourceRefs: TherapySourceRef[];
  userState: TherapyThemeUserState;
  lifecycle: TherapyThemeLifecycle;
  generatedAt: Timestamp;
  model: string;
}

export interface TherapyNote {
  id: string;
  windowId: string;
  therapistId: string;
  ownerUserId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Upper bound on a single note/transcript. Firestore doc limit is 1MB;
// UTF-8 worst case is 4 bytes/char. 200_000 leaves headroom for other fields.
export const THERAPY_NOTE_MAX_LENGTH = 200_000;

// Paste box visibly warns user once they cross this threshold.
export const THERAPY_NOTE_WARN_LENGTH = 180_000;
