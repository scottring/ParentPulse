import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { DayOfWeek, RitualKind } from '@/types/ritual';

// Compute the next occurrence of a given day-of-week at a given
// local time, starting from `now`. If today matches and the time
// is still ahead, picks today; otherwise the next week.
function nextOccurrenceOf(
  dayOfWeek: DayOfWeek,
  timeLocal: string,
  now = new Date(),
): Date {
  const [hh, mm] = timeLocal.split(':').map((n) => parseInt(n, 10));
  const result = new Date(now);
  result.setHours(hh ?? 19, mm ?? 0, 0, 0);
  const delta = (dayOfWeek - now.getDay() + 7) % 7;
  if (delta === 0 && result.getTime() <= now.getTime()) {
    result.setDate(result.getDate() + 7);
  } else {
    result.setDate(result.getDate() + delta);
  }
  return result;
}

interface SeedArgs {
  familyId: string;
  userId: string;
  spouseUserId?: string;
  timezone?: string;
}

// Ensure the user has a solo_weekly ritual. Idempotent — if one
// already exists, no write. Returns the ritualId of the existing
// or newly-created ritual.
//
// New writes use a deterministic doc id (`solo_weekly_{userId}`) so
// concurrent calls converge to a single document instead of racing
// to create duplicates. We still query first to honor any pre-existing
// auto-id docs from before the deterministic-id switch.
export async function ensureSoloWeekly(args: SeedArgs): Promise<string> {
  const existing = await getDocs(
    query(
      collection(firestore, 'rituals'),
      where('familyId', '==', args.familyId),
      where('participantUserIds', 'array-contains', args.userId),
      where('kind', '==', 'solo_weekly'),
    ),
  );
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const fridayEvening = 5; // JS Date.getDay(): 0=Sun .. 5=Fri
  const startTime = '19:00';
  const timezone = args.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    'UTC';
  const nextRun = nextOccurrenceOf(fridayEvening, startTime);

  const ritualId = `solo_weekly_${args.userId}`;
  const ref = doc(firestore, 'rituals', ritualId);
  await setDoc(ref, {
    familyId: args.familyId,
    kind: 'solo_weekly' as RitualKind,
    cadence: 'weekly',
    participantUserIds: [args.userId],
    createdByUserId: args.userId,
    dayOfWeek: fridayEvening,
    startTimeLocal: startTime,
    durationMinutes: 20,
    timezone,
    startsOn: Timestamp.fromDate(nextRun),
    status: 'active',
    nextRunAt: Timestamp.fromDate(nextRun),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ritualId;
}

// Ensure the partner_biweekly ritual exists. Only called when the
// user has a detected spouse. Sunday evenings by default.
export async function ensurePartnerBiweekly(args: Required<Pick<SeedArgs, 'familyId' | 'userId' | 'spouseUserId'>> & { timezone?: string }): Promise<string> {
  const existing = await getDocs(
    query(
      collection(firestore, 'rituals'),
      where('familyId', '==', args.familyId),
      where('kind', '==', 'partner_biweekly'),
      where('participantUserIds', 'array-contains', args.userId),
    ),
  );
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const sundayEvening = 0;
  const startTime = '20:00';
  const timezone = args.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    'UTC';
  const nextRun = nextOccurrenceOf(sundayEvening, startTime);

  // Deterministic id keyed on the sorted participant pair so two
  // concurrent calls (one from each partner) converge on one doc.
  const pair = [args.userId, args.spouseUserId].sort().join('_');
  const ritualId = `partner_biweekly_${pair}`;
  const ref = doc(firestore, 'rituals', ritualId);
  await setDoc(ref, {
    familyId: args.familyId,
    kind: 'partner_biweekly' as RitualKind,
    cadence: 'biweekly',
    participantUserIds: [args.userId, args.spouseUserId].sort(),
    createdByUserId: args.userId,
    dayOfWeek: sundayEvening,
    startTimeLocal: startTime,
    durationMinutes: 30,
    timezone,
    startsOn: Timestamp.fromDate(nextRun),
    status: 'active',
    nextRunAt: Timestamp.fromDate(nextRun),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ritualId;
}

// Seeds the default rituals on first Workbook visit. Idempotent —
// safe to call on every mount. Does not touch family_monthly; that
// one is opt-in per the design spec.
export async function seedDefaultRituals(args: SeedArgs): Promise<void> {
  await ensureSoloWeekly(args);
  if (args.spouseUserId) {
    await ensurePartnerBiweekly({
      familyId: args.familyId,
      userId: args.userId,
      spouseUserId: args.spouseUserId,
      timezone: args.timezone,
    });
  }
}
