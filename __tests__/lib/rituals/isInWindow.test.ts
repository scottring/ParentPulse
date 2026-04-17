import { describe, it, expect } from 'vitest';
import { ritualBannerState } from '@/lib/rituals/isInWindow';
import { Timestamp } from 'firebase/firestore';
import type { CoupleRitual } from '@/types/couple-ritual';

function makeRitual(overrides: Partial<CoupleRitual> = {}): CoupleRitual {
  return {
    id: 'r1', familyId: 'f1', participantUserIds: ['u1', 'u2'],
    cadence: 'weekly', dayOfWeek: 0, startTimeLocal: '20:00',
    durationMinutes: 15, timezone: 'America/New_York',
    status: 'active', startsOn: Timestamp.fromDate(new Date('2026-04-19')),
    createdAt: Timestamp.now(), createdByUserId: 'u1',
    updatedAt: Timestamp.now(), updatedByUserId: 'u1',
    ...overrides,
  };
}

describe('ritualBannerState', () => {
  it('returns "preWindow" on ritual day but before the window opens', () => {
    const now = new Date('2026-04-26T18:00:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('preWindow');
  });

  it('returns "inWindow" 5 minutes before start', () => {
    const now = new Date('2026-04-26T19:55:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('inWindow');
  });

  it('returns "inWindow" during the ritual itself', () => {
    const now = new Date('2026-04-26T20:10:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('inWindow');
  });

  it('returns "inWindow" during the 30-minute post-start grace', () => {
    const now = new Date('2026-04-26T20:30:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('inWindow');
  });

  it('returns "hidden" after the post-window grace closes', () => {
    const now = new Date('2026-04-26T22:00:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('hidden');
  });

  it('returns "hidden" on a non-ritual day', () => {
    const now = new Date('2026-04-28T19:00:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('hidden');
  });

  it('returns "hidden" for paused rituals regardless of time', () => {
    const now = new Date('2026-04-26T20:00:00-04:00');
    expect(ritualBannerState(makeRitual({ status: 'paused' }), now)).toBe('hidden');
  });
});
