import { Timestamp } from 'firebase/firestore';

// A weekly lead dispatch — the "What Relish is returning to you"
// card at the top of the Workbook. Generated once a week (Sunday
// 9pm cron) over family-shared entries from the preceding week.
// One dispatch per family per week; readable by anyone in the
// family's participantUserIds. Private-to-self entries are excluded
// from the source material.
export interface WeeklyDispatchEvidence {
  entryId: string;
  excerpt: string;          // verbatim from the entry (≤ 200 chars)
  authorId: string;
  authorName: string;       // display name at time of generation
  createdAt: Timestamp;     // the entry's timestamp, for the meta line
}

export interface WeeklyDispatch {
  dispatchId: string;                 // `${familyId}_${weekEndingYYYYMMDD}`
  familyId: string;
  participantUserIds: string[];        // who can read this dispatch
  weekStarting: Timestamp;             // Monday 00:00 local
  weekEnding: Timestamp;               // Sunday 23:59:59 local
  headline: string;                    // one sentence, spoken in the book's voice
  dek: string;                         // 2-3 sentences describing the pattern
  themeTag: string;                    // short free-text tag (e.g. "bedtime friction")
  evidence: WeeklyDispatchEvidence[];  // up to 3 verbatim excerpts
  emergentLine?: string;               // optional one-liner — what emerged
  entryCount: number;                  // total entries considered
  generatedBy: 'ai' | 'manual';
  model: string;
  createdAt: Timestamp;
}
