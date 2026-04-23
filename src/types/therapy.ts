import type { Timestamp } from 'firebase/firestore';

/**
 * Simpler "brief" therapy model.
 *
 * A brief is a one-shot, read-only compile over the user's recent
 * Relish material — journal entries, synthesis updates, open
 * threads — themed into 3–5 clusters with verbatim quotes. The user
 * takes this into session; no therapist entity, no session state
 * machine. After the session, the user can attach a short note that
 * becomes context for the next brief's prompt.
 *
 * The fuller therapist/window model lives on origin/therapy-prep
 * for reference — see project_therapy_simpler_model.md in memory.
 */

export interface TherapyBriefQuote {
  /** Journal entry id the snippet was pulled from, if any. */
  entryId?: string;
  /** The verbatim excerpt. */
  snippet: string;
  /** ISO date of the source, for reader context. */
  sourceDate?: string;
}

export interface TherapyBriefTheme {
  /** Stable id within the brief. */
  id: string;
  /** Short label — 2–5 words. */
  label: string;
  /** One-sentence summary of what this theme holds. */
  summary: string;
  /** Verbatim quotes backing the theme. Zero or more. */
  quotes: TherapyBriefQuote[];
}

export interface TherapyBrief {
  briefId: string;
  userId: string;
  /** How many days the brief covered — usually 14. */
  daysBack: number;
  themes: TherapyBriefTheme[];
  /** Short post-session note; becomes context for the next brief. */
  sessionNotes?: string;
  /** Model that generated the brief, for provenance. */
  model?: string;
  generatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Collection name constant to avoid typos. */
export const THERAPY_BRIEFS_COLLECTION = 'therapy_briefs';
