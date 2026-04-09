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
  category: JournalCategory;
  tags: string[];

  // Privacy
  isPrivate: boolean;

  // Person tagging (which family members this relates to)
  personMentions: string[]; // personIds
  childId?: string;         // Legacy field used by daily analysis

  // Optional context
  context?: {
    stressLevel?: number;   // 1-5, used by daily analysis
    timeOfDay?: string;     // auto-set from client
  };

  // Timestamps
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export const JOURNAL_CATEGORIES: { value: JournalCategory; label: string; emoji: string }[] = [
  { value: 'moment', label: 'A moment', emoji: '✦' },
  { value: 'reflection', label: 'Reflection', emoji: '◎' },
  { value: 'win', label: 'A win', emoji: '◆' },
  { value: 'challenge', label: 'Challenge', emoji: '▲' },
  { value: 'question', label: 'Question', emoji: '?' },
  { value: 'gratitude', label: 'Gratitude', emoji: '♡' },
];
