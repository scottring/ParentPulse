import { Timestamp } from 'firebase/firestore';
import type { JournalMedia } from './journal';

// A Practice is a recurring sit-down with a set of prompts — the
// "Weekly Relish" is the first one we ship. Unlike a Ritual
// (scheduled couple/solo session), a Practice is a reusable template
// with its own detail page for reading the prompts, writing the
// session, and reviewing past sit-downs.
export interface Practice {
  practiceId: string;
  familyId: string;
  // Stable slug. 'weekly-relish' for the seeded default.
  slug: string;
  name: string;          // "Our weekly Relish."
  description: string;   // italic subtitle copy
  prompts: string[];     // 4–6 bullet prompts
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'ad_hoc';
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Last completed session's week-of Sunday (ISO date string).
  lastCompletedWeekOf?: string;
  lastCompletedAt?: Timestamp;
}

// One entry in the practices/{id}/sessions subcollection. Created
// every time someone logs a sit-down.
export interface PracticeSession {
  sessionId: string;
  practiceId: string;
  familyId: string;
  // ISO date string for the Sunday of the week this sit-down
  // belongs to (e.g. '2026-04-19'). Lets the card show "done
  // this week" without a time-zone argument.
  weekOf: string;
  body: string;
  media: JournalMedia[];
  createdByUserId: string;
  createdAt: Timestamp;
}

// Starter prompts for the seeded Weekly Relish practice. Editable
// per-family in the future (Settings > Practices).
export const WEEKLY_RELISH_PROMPTS: readonly string[] = [
  'What landed well this week?',
  'Where did we miss each other?',
  "What's one thing we want to keep doing?",
  "What's one thing we want to try next week?",
  'Anything open we should bring into the Workbook?',
];

export const WEEKLY_RELISH_SLUG = 'weekly-relish';

// Return the ISO date (YYYY-MM-DD) of the Sunday that starts the
// week containing `d`. In the app's context, the week is
// Sunday-anchored.
export function weekOfSunday(d: Date = new Date()): string {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, '0');
  const dd = String(copy.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
