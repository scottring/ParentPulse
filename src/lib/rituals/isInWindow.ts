import type { CoupleRitual } from '@/types/couple-ritual';
import { nextOccurrence } from './nextOccurrence';

export type RitualBannerState = 'hidden' | 'preWindow' | 'inWindow';

const PRE_WINDOW_MS = 10 * 60 * 1000;
const POST_WINDOW_MS = 30 * 60 * 1000;

export function ritualBannerState(ritual: CoupleRitual, now: Date): RitualBannerState {
  if (ritual.status !== 'active') return 'hidden';

  const next = nextOccurrence(ritual, now);
  const startMs = next.getTime();
  const endMs = startMs + ritual.durationMinutes * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs >= startMs - PRE_WINDOW_MS && nowMs <= endMs + POST_WINDOW_MS) {
    return 'inWindow';
  }

  if (isSameLocalDate(now, next, ritual.timezone) && nowMs < startMs - PRE_WINDOW_MS) {
    return 'preWindow';
  }

  const intervalMs = intervalForCadence(ritual);
  const prevStartMs = startMs - intervalMs;
  const prevEndMs = prevStartMs + ritual.durationMinutes * 60 * 1000;
  if (nowMs >= prevStartMs - PRE_WINDOW_MS && nowMs <= prevEndMs + POST_WINDOW_MS) {
    return 'inWindow';
  }

  return 'hidden';
}

function intervalForCadence(ritual: CoupleRitual): number {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (ritual.cadence === 'weekly') return weekMs;
  if (ritual.cadence === 'biweekly') return 2 * weekMs;
  return 30 * 24 * 60 * 60 * 1000;
}

function isSameLocalDate(a: Date, b: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(a) === fmt.format(b);
}
