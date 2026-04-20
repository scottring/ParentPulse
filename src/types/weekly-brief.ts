import { Timestamp } from 'firebase/firestore';

// A single topic the book thinks is worth bringing to a hard
// conversation this week. 1-3 per brief.
export interface WeeklyBriefTopic {
  title: string;               // "Bedtime with Kaleb"
  who: string[];               // display names ["Kaleb", "Iris"]
  framing: string;             // one sentence: what's the question
  talkingPoints: string[];     // 2-3 bullet items, each a short line
  sourceEntryId?: string;      // primary anchoring entry
  sourceQuote?: string;        // verbatim excerpt from that entry (≤200 chars)
  daysOpen?: number;           // days since the first related entry
}

// Weekly brief — the "brief for your next hard conversation" card.
// Different from the lead (which names a pattern): the brief is
// forward-looking, structured as 1-3 actionable topics. Same
// visibility model as the lead — participantUserIds controls read
// access; Cloud Function writes only.
export interface WeeklyBrief {
  briefId: string;                    // `${familyId}_${weekEndingYYYYMMDD}`
  familyId: string;
  participantUserIds: string[];
  weekStarting: Timestamp;
  weekEnding: Timestamp;
  topics: WeeklyBriefTopic[];         // 1-3 topics
  entryCount: number;
  generatedBy: 'ai' | 'manual';
  model: string;
  createdAt: Timestamp;
}
