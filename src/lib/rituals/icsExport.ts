import type { CoupleRitual, DayOfWeek } from '@/types/couple-ritual';

const DAY_CODES: Record<DayOfWeek, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};

export function coupleRitualToIcs(
  ritual: CoupleRitual,
  selfName: string,
  spouseName: string,
): string {
  const anchor = ritual.startsOn.toDate();
  const { year, month, day } = localDateParts(anchor, ritual.timezone);

  const [hh, mm] = ritual.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const endMinutes = hh * 60 + mm + ritual.durationMinutes;
  const endHh = Math.floor(endMinutes / 60) % 24;
  const endMm = endMinutes % 60;

  const dtstart = `${year}${pad(month)}${pad(day)}T${pad(hh)}${pad(mm)}00`;
  const dtend = `${year}${pad(month)}${pad(day)}T${pad(endHh)}${pad(endMm)}00`;
  const dtstamp = toIcsUtc(new Date());
  const uid = `relish-couple-ritual-${ritual.id}@relish.app`;
  const rrule = rruleFor(ritual);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Relish//Couple Ritual//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${ritual.timezone}:${dtstart}`,
    `DTEND;TZID=${ritual.timezone}:${dtend}`,
    rrule,
    `SUMMARY:Check-in with ${spouseName}`,
    `DESCRIPTION:${ritual.intention ?? `Your regular check-in with ${spouseName}.`}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function rruleFor(r: CoupleRitual): string {
  const code = DAY_CODES[r.dayOfWeek];
  if (r.cadence === 'weekly') return `RRULE:FREQ=WEEKLY;BYDAY=${code}`;
  if (r.cadence === 'biweekly') return `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${code}`;
  const anchor = r.startsOn.toDate();
  const { day } = localDateParts(anchor, r.timezone);
  const nth = Math.ceil(day / 7);
  return `RRULE:FREQ=MONTHLY;BYDAY=${nth}${code}`;
}

function localDateParts(d: Date, tz: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [y, m, dd] = fmt.format(d).split('-').map((s) => parseInt(s, 10));
  return { year: y, month: m, day: dd };
}

function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
