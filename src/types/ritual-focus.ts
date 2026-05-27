import type { Timestamp } from 'firebase/firestore';

/* ================================================================
   Weekly Focus — the one thing a couple ritual produces and carries
   into the week. Stored on the dyad (same {a,b} entity the Mirror
   writes to), surfaced quietly between rituals, and revisited at the
   start of the next ritual to close the loop.
   ================================================================ */

export type FocusSource = 'self' | 'ai';
export type FocusStatus = 'active' | 'revisited';
export type FocusWentWell = 'yes' | 'partly' | 'no';

export interface FocusOutcome {
  /** One optional line the couple writes when revisiting next ritual. */
  reflection: string;
  wentWell: FocusWentWell;
  revisitedAt: Timestamp;
}

/** Lives at dyads/{dyadKey}.currentFocus and is appended to the history. */
export interface WeeklyFocus {
  text: string;
  source: FocusSource;
  /** The ritual session that produced this focus. */
  ritualSessionId: string;
  createdAt: Timestamp;
  status: FocusStatus;
  outcome?: FocusOutcome;
}

/** Cloud Function request/response for synthesizeWeeklyFocus. */
export interface SynthesizeWeeklyFocusRequest {
  wentWell: string;
  wasHard: string;
  smallJoys: string;
  intentions: string[];
}
export interface SynthesizeWeeklyFocusResponse {
  focus: string;
}

/** Append-only history under the dyad. Written in v1, unread in v1. */
export const DYAD_FOCUSES_SUBCOLLECTION = 'focuses';
