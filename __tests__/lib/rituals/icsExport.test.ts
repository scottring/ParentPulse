import { describe, it, expect } from 'vitest';
import { coupleRitualToIcs } from '@/lib/rituals/icsExport';
import { Timestamp } from 'firebase/firestore';
import type { CoupleRitual } from '@/types/couple-ritual';

function makeRitual(overrides: Partial<CoupleRitual> = {}): CoupleRitual {
  return {
    id: 'ritual-abc', familyId: 'f1', participantUserIds: ['u1', 'u2'],
    cadence: 'weekly', dayOfWeek: 0, startTimeLocal: '20:00',
    durationMinutes: 15, timezone: 'America/New_York',
    status: 'active', startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')),
    createdAt: Timestamp.fromDate(new Date('2026-04-17T12:00:00Z')),
    createdByUserId: 'u1',
    updatedAt: Timestamp.fromDate(new Date('2026-04-17T12:00:00Z')),
    updatedByUserId: 'u1',
    ...overrides,
  };
}

describe('coupleRitualToIcs', () => {
  it('produces a valid ICS with stable UID', () => {
    const ics = coupleRitualToIcs(makeRitual(), 'Scott', 'Iris');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('UID:relish-couple-ritual-ritual-abc@relish.app');
    expect(ics).toContain('SUMMARY:Check-in with Iris');
  });

  it('includes a weekly RRULE for weekly cadence', () => {
    const ics = coupleRitualToIcs(makeRitual({ cadence: 'weekly', dayOfWeek: 0 }), 'S', 'I');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=SU');
  });

  it('includes a biweekly RRULE (INTERVAL=2) for biweekly cadence', () => {
    const ics = coupleRitualToIcs(makeRitual({ cadence: 'biweekly', dayOfWeek: 2 }), 'S', 'I');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU');
  });

  it('includes a monthly RRULE with BYDAY=nthWKDY for monthly cadence', () => {
    const ics = coupleRitualToIcs(
      makeRitual({
        cadence: 'monthly',
        dayOfWeek: 0,
        startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')),
      }),
      'S', 'I',
    );
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYDAY=4SU');
  });

  it('writes DTSTART and DTEND with correct timezone reference', () => {
    const ics = coupleRitualToIcs(makeRitual(), 'S', 'I');
    expect(ics).toContain('DTSTART;TZID=America/New_York:20260426T200000');
    expect(ics).toContain('DTEND;TZID=America/New_York:20260426T201500');
  });
});
