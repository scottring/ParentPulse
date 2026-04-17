import { Timestamp } from 'firebase/firestore';

export type RitualCadence = 'weekly' | 'biweekly' | 'monthly';
export type RitualStatus = 'active' | 'paused' | 'ended';

/** JS Date.getDay(): 0 = Sunday .. 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CoupleRitual {
  id: string;
  familyId: string;

  /** Both partners' Firebase Auth UIDs. Order-insensitive. */
  participantUserIds: [string, string];

  cadence: RitualCadence;
  dayOfWeek: DayOfWeek;
  /** 'HH:mm' in 24h, local to the ritual's timezone. */
  startTimeLocal: string;
  durationMinutes: number;
  /** IANA timezone, e.g. 'America/New_York'. */
  timezone: string;

  status: RitualStatus;
  /** First-occurrence date anchor (used to compute monthly nth-weekday). */
  startsOn: Timestamp;

  createdAt: Timestamp;
  createdByUserId: string;
  updatedAt: Timestamp;
  updatedByUserId: string;

  /** Optional human-friendly note. <=140 chars. */
  intention?: string;
}

export const MAX_INTENTION_LENGTH = 140;

/** Firestore write shape — drops server-managed fields. */
export type CoupleRitualDraft = Omit<
  CoupleRitual,
  'id' | 'createdAt' | 'updatedAt'
>;
