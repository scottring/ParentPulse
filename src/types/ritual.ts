import { Timestamp } from 'firebase/firestore';

/** JS Date.getDay(): 0 = Sunday .. 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// The four cadences the app schedules rituals on. Every ritual is
// one of these kinds, and the kind determines default participant
// shape, cadence, and runner copy.
//
//   solo_weekly       — a single voice taking stock (1 participant)
//   partner_biweekly  — two voices meeting on the same stack (2 ppl)
//   family_monthly    — 2+ voices (async or sync — TBD with user)
//   repair            — ad-hoc, unscheduled (dropped in between)
export type RitualKind =
  | 'solo_weekly'
  | 'partner_biweekly'
  | 'family_monthly'
  | 'repair';

export type RitualCadence = 'weekly' | 'biweekly' | 'monthly' | 'ad_hoc';

export type RitualStatus = 'active' | 'paused' | 'ended';

export interface Ritual {
  ritualId: string;
  familyId: string;
  kind: RitualKind;
  cadence: RitualCadence;

  // Who's in the room. 1 for solo, 2 for partner, 2+ for family.
  participantUserIds: string[];
  createdByUserId: string;

  // Schedule. Weekly/biweekly use dayOfWeek; monthly uses
  // nthWeekOfMonth (e.g. "the 2nd Sunday"). ad_hoc uses neither.
  dayOfWeek?: DayOfWeek;
  nthWeekOfMonth?: 1 | 2 | 3 | 4;
  // 'HH:mm' in 24h, local to the ritual's timezone.
  startTimeLocal: string;
  durationMinutes: number;
  // IANA timezone, e.g. 'America/New_York'.
  timezone: string;
  // First-occurrence date anchor.
  startsOn: Timestamp;

  status: RitualStatus;

  // Loop provenance — the act-arm of the Assess → Understand → Act
  // loop relies on these to stitch the runner's output back into
  // the stream as a moment.
  lastRunAt?: Timestamp;
  lastRunMomentId?: string;
  nextRunAt: Timestamp;

  // Optional human-friendly note (shown on the runner's "read"
  // screen). <=140 chars.
  intention?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const MAX_RITUAL_INTENTION_LENGTH = 140;

// Firestore write shape — drops server-managed fields the client
// never sets directly (ritualId, createdAt/updatedAt are set by
// the hook or server).
export type RitualDraft = Omit<
  Ritual,
  'ritualId' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'lastRunMomentId'
>;

// Runner session output. Feeds the "what shifted" closure into the
// stream via a reflection journal_entries doc.
export interface RitualRunResult {
  ritualId: string;
  momentId: string;
  reflectionEntryId: string;
  ranAt: Timestamp;
}
