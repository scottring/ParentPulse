import type { Timestamp } from 'firebase/firestore';

/** One participant's hidden answer to the mirror prompt. */
export interface MirrorAnswer {
  /** personId for family people, or the steward's auth uid for the adult. */
  participantId: string;
  /** Display label used in the rendered prompt + reveal, e.g. "Dad", "Kaleb". */
  label: string;
  text: string;
}

/** The per-relationship record. Doc id === dyadKey. participantIds extensible to 3+. */
export interface Dyad {
  dyadKey: string;
  familyId: string;
  participantIds: string[];
  createdAt: Timestamp;
  lastEntryAt: Timestamp;
  entryCount: number;
}

/** One mirror exchange. Deposited silently; nothing reads it in v1. */
export interface MirrorEntry {
  entryId: string;
  dyadKey: string;
  familyId: string;
  stewardUserId: string;
  prompt: string;
  answers: MirrorAnswer[];
  /** The single synthesized reflection line. */
  mirrorLine: string;
  createdAt: Timestamp;
}

/** Cloud Function request/response. */
export interface SynthesizeMirrorRequest {
  prompt: string;
  answers: { label: string; text: string }[];
}
export interface SynthesizeMirrorResponse {
  mirrorLine: string;
}

export const MIRROR_COLLECTIONS = {
  DYADS: 'dyads',
  MIRROR_ENTRIES: 'mirror_entries',
} as const;
