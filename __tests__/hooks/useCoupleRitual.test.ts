import { describe, it, expect, vi } from 'vitest';

const addDocMock = vi.fn();
const serverTimestampMock = vi.fn(() => '__server_ts__');

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn((_, name: string) => ({ __collection: name })),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: {
    fromDate: (d: Date) => ({ __ts: d.toISOString() }),
  },
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { buildCreatePayload } from '@/hooks/useCoupleRitual';

describe('buildCreatePayload', () => {
  it('assembles a valid Firestore write payload', () => {
    const payload = buildCreatePayload({
      familyId: 'fam1',
      creatorUserId: 'scott',
      spouseUserId: 'iris',
      cadence: 'weekly',
      dayOfWeek: 0,
      startTimeLocal: '20:00',
      durationMinutes: 15,
      timezone: 'America/New_York',
      startsOn: new Date('2026-04-26T00:00:00-04:00'),
      intention: 'Our Sunday check-in',
    });
    expect(payload.familyId).toBe('fam1');
    expect(payload.participantUserIds).toEqual(['scott', 'iris']);
    expect(payload.cadence).toBe('weekly');
    expect(payload.status).toBe('active');
    expect(payload.createdByUserId).toBe('scott');
    expect(payload.updatedByUserId).toBe('scott');
    expect(payload.intention).toBe('Our Sunday check-in');
    expect(payload.createdAt).toBe('__server_ts__');
    expect(payload.updatedAt).toBe('__server_ts__');
  });

  it('omits intention when empty', () => {
    const payload = buildCreatePayload({
      familyId: 'fam1', creatorUserId: 'scott', spouseUserId: 'iris',
      cadence: 'weekly', dayOfWeek: 0, startTimeLocal: '20:00',
      durationMinutes: 15, timezone: 'America/New_York',
      startsOn: new Date('2026-04-26T00:00:00-04:00'),
      intention: '',
    });
    expect('intention' in payload).toBe(false);
  });
});
