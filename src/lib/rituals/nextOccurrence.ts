import type { CoupleRitual, DayOfWeek } from '@/types/couple-ritual';

export function nextOccurrence(ritual: CoupleRitual, now: Date): Date {
  const [hh, mm] = ritual.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const anchor = ritual.startsOn.toDate();

  if (ritual.cadence === 'monthly') {
    return nextMonthlyOccurrence(now, anchor, ritual.dayOfWeek, hh, mm, ritual.timezone);
  }

  const intervalWeeks = ritual.cadence === 'biweekly' ? 2 : 1;
  return nextWeeklyOccurrence(now, anchor, ritual.dayOfWeek, hh, mm, intervalWeeks, ritual.timezone);
}

function nextWeeklyOccurrence(
  now: Date,
  anchor: Date,
  dayOfWeek: DayOfWeek,
  hh: number,
  mm: number,
  intervalWeeks: number,
  tz: string,
): Date {
  const candidate = atLocalTime(now, dayOfWeek, hh, mm, tz);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  let result = candidate;
  while (result.getTime() <= now.getTime()) {
    result = new Date(result.getTime() + intervalWeeks * msPerWeek);
  }
  if (intervalWeeks > 1) {
    const anchorCandidate = atLocalTime(anchor, dayOfWeek, hh, mm, tz);
    const weeksSinceAnchor = Math.round((result.getTime() - anchorCandidate.getTime()) / msPerWeek);
    const misalignment = ((weeksSinceAnchor % intervalWeeks) + intervalWeeks) % intervalWeeks;
    if (misalignment !== 0) {
      result = new Date(result.getTime() + (intervalWeeks - misalignment) * msPerWeek);
    }
  }
  return result;
}

function nextMonthlyOccurrence(
  now: Date,
  anchor: Date,
  dayOfWeek: DayOfWeek,
  hh: number,
  mm: number,
  tz: string,
): Date {
  const nth = nthWeekdayOfMonth(anchor, tz);
  for (let monthsAhead = 0; monthsAhead < 3; monthsAhead++) {
    const target = nthWeekdayInMonth(now, dayOfWeek, nth, hh, mm, tz, monthsAhead);
    if (target && target.getTime() > now.getTime()) return target;
  }
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

function atLocalTime(ref: Date, dayOfWeek: DayOfWeek, hh: number, mm: number, tz: string): Date {
  const parts = localParts(ref, tz);
  const refDay = parts.weekday;
  const diff = dayOfWeek - refDay;
  const iso = `${parts.year}-${pad(parts.month)}-${pad(parts.day + diff)}T${pad(hh)}:${pad(mm)}:00`;
  return zonedIsoToUtc(iso, tz);
}

function nthWeekdayInMonth(
  ref: Date,
  dayOfWeek: DayOfWeek,
  nth: number,
  hh: number,
  mm: number,
  tz: string,
  monthsAhead: number,
): Date | null {
  const parts = localParts(ref, tz);
  const year = parts.year + Math.floor((parts.month - 1 + monthsAhead) / 12);
  const month = ((parts.month - 1 + monthsAhead) % 12) + 1;
  const firstIso = `${year}-${pad(month)}-01T00:00:00`;
  const firstUtc = zonedIsoToUtc(firstIso, tz);
  const firstWeekday = localParts(firstUtc, tz).weekday;
  const offset = (dayOfWeek - firstWeekday + 7) % 7;
  const dayOfMonth = 1 + offset + (nth - 1) * 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (dayOfMonth > daysInMonth) return null;
  const iso = `${year}-${pad(month)}-${pad(dayOfMonth)}T${pad(hh)}:${pad(mm)}:00`;
  return zonedIsoToUtc(iso, tz);
}

function nthWeekdayOfMonth(d: Date, tz: string): number {
  const p = localParts(d, tz);
  return Math.ceil(p.day / 7);
}

interface LocalParts {
  year: number; month: number; day: number; weekday: number;
  hour: number; minute: number;
}

function localParts(d: Date, tz: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    weekday: weekdayMap[get('weekday')] ?? 0,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  };
}

function zonedIsoToUtc(iso: string, tz: string): Date {
  const asUtc = new Date(`${iso}Z`);
  const parts = localParts(asUtc, tz);
  const localIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00Z`;
  const diffMs = new Date(localIso).getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - diffMs);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
