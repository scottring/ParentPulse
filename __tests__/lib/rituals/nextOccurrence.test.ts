import { describe, it, expect } from 'vitest';
import { nextOccurrence } from '@/lib/rituals/nextOccurrence';
import { Timestamp } from 'firebase/firestore';
import type { CoupleRitual } from '@/types/couple-ritual';

function makeRitual(overrides: Partial<CoupleRitual> = {}): CoupleRitual {
  return {
    id: 'r1',
    familyId: 'f1',
    participantUserIds: ['u1', 'u2'],
    cadence: 'weekly',
    dayOfWeek: 0, // Sunday
    startTimeLocal: '20:00',
    durationMinutes: 15,
    timezone: 'America/New_York',
    status: 'active',
    startsOn: Timestamp.fromDate(new Date('2026-04-19T00:00:00-04:00')),
    createdAt: Timestamp.now(),
    createdByUserId: 'u1',
    updatedAt: Timestamp.now(),
    updatedByUserId: 'u1',
    ...overrides,
  };
}

describe('nextOccurrence', () => {
  it('returns the current Sunday at 20:00 when asked on Sunday morning', () => {
    const now = new Date('2026-04-24T10:00:00-04:00'); // Friday
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it("returns next week when asked after this week's window closed", () => {
    const now = new Date('2026-04-26T22:00:00-04:00');
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });

  it('returns today\'s time when asked before today\'s window', () => {
    const now = new Date('2026-04-26T15:00:00-04:00');
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('honours biweekly cadence from the anchor date', () => {
    const ritual = makeRitual({
      cadence: 'biweekly',
      startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')),
    });
    const now = new Date('2026-04-27T00:00:00-04:00');
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-05-11T00:00:00.000Z');
  });

  it('honours monthly cadence as nth-weekday-of-month from anchor', () => {
    const ritual = makeRitual({
      cadence: 'monthly',
      startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')),
    });
    const now = new Date('2026-04-27T00:00:00-04:00');
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });
});
