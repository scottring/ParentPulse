import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { listOpenThreads } from '@/lib/open-threads';
import type { Moment } from '@/types/moment';
import type { Ritual } from '@/types/ritual';
import type { JournalEntry } from '@/types/journal';

const NOW = new Date('2026-04-20T12:00:00Z');

function ts(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

function makeRitual(overrides: Partial<Ritual> = {}): Ritual {
  return {
    ritualId: 'r1',
    familyId: 'fam-a',
    kind: 'solo_weekly',
    cadence: 'weekly',
    participantUserIds: ['iris'],
    createdByUserId: 'iris',
    dayOfWeek: 5,
    startTimeLocal: '19:00',
    durationMinutes: 20,
    timezone: 'America/New_York',
    startsOn: ts('2026-04-18T00:00:00Z'),
    status: 'active',
    nextRunAt: ts('2026-04-18T19:00:00Z'),
    createdAt: ts('2026-04-10T00:00:00Z'),
    updatedAt: ts('2026-04-10T00:00:00Z'),
    ...overrides,
  };
}

function makeMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    momentId: 'm1',
    familyId: 'fam-a',
    createdByUserId: 'iris',
    participantUserIds: ['iris', 'scott'],
    viewCount: 2,
    createdAt: ts('2026-04-19T08:00:00Z'),
    ...overrides,
  };
}

describe('listOpenThreads — overdue_ritual', () => {
  it('flags an active ritual with nextRunAt in the past', () => {
    const ritual = makeRitual({ nextRunAt: ts('2026-04-18T19:00:00Z') });
    const threads = listOpenThreads({
      moments: [], rituals: [ritual], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(1);
    expect(threads[0].reason).toBe('overdue_ritual');
    expect(threads[0].closingAction.href).toBe(`/rituals/${ritual.ritualId}/run`);
  });

  it('ignores rituals scheduled in the future', () => {
    const ritual = makeRitual({ nextRunAt: ts('2026-04-25T19:00:00Z') });
    const threads = listOpenThreads({
      moments: [], rituals: [ritual], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(0);
  });

  it('ignores paused rituals even if overdue', () => {
    const ritual = makeRitual({
      status: 'paused',
      nextRunAt: ts('2026-04-10T19:00:00Z'),
    });
    const threads = listOpenThreads({
      moments: [], rituals: [ritual], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(0);
  });
});

describe('listOpenThreads — unclosed_divergence', () => {
  it('flags a moment with a divergence line and no ritual closure', () => {
    const moment = makeMoment({
      synthesis: {
        agreementLine: 'They both felt it at bedtime.',
        divergenceLine: 'Iris names exhaustion, Scott names distraction.',
        emergentLine: null,
        model: 'test',
        generatedAt: ts('2026-04-19T09:00:00Z'),
      },
      synthesisUpdatedAt: ts('2026-04-19T09:00:00Z'),
    });
    const threads = listOpenThreads({
      moments: [moment], rituals: [], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(1);
    expect(threads[0].reason).toBe('unclosed_divergence');
    expect(threads[0].closingAction.href).toBe(`/moments/${moment.momentId}`);
    expect(threads[0].subtitle).toContain('exhaustion');
  });

  it('clears a divergence once a ritual has closed on that moment', () => {
    const moment = makeMoment({
      synthesis: {
        agreementLine: 'x',
        divergenceLine: 'y',
        emergentLine: null,
        model: 'test',
        generatedAt: ts('2026-04-19T09:00:00Z'),
      },
    });
    const ritual = makeRitual({
      lastRunMomentId: moment.momentId,
      nextRunAt: ts('2026-04-25T19:00:00Z'),
    });
    const threads = listOpenThreads({
      moments: [moment], rituals: [ritual], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(0);
  });

  it('ignores moments without divergence (agreement-only synth)', () => {
    const moment = makeMoment({
      synthesis: {
        agreementLine: 'They agreed.',
        divergenceLine: null,
        emergentLine: null,
        model: 'test',
        generatedAt: ts('2026-04-19T09:00:00Z'),
      },
    });
    const threads = listOpenThreads({
      moments: [moment], rituals: [], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(0);
  });
});

describe('listOpenThreads — sorting + dedupe', () => {
  it('overdue_ritual beats unclosed_divergence in ordering', () => {
    const moment = makeMoment({
      synthesis: {
        agreementLine: 'a', divergenceLine: 'b', emergentLine: null,
        model: 't', generatedAt: ts('2026-04-19T09:00:00Z'),
      },
    });
    const ritual = makeRitual({ nextRunAt: ts('2026-04-18T19:00:00Z') });
    const threads = listOpenThreads({
      moments: [moment], rituals: [ritual], entries: [], now: NOW,
    });
    expect(threads).toHaveLength(2);
    expect(threads[0].reason).toBe('overdue_ritual');
    expect(threads[1].reason).toBe('unclosed_divergence');
  });
});

describe('listOpenThreads — entries without open-thread reasons', () => {
  it('does not list plain journal entries as open threads', () => {
    const entry: JournalEntry = {
      entryId: 'e1',
      familyId: 'fam-a',
      authorId: 'iris',
      text: 'A note',
      category: 'moment',
      tags: [],
      visibleToUserIds: ['iris'],
      sharedWithUserIds: [],
      personMentions: [],
      createdAt: ts('2026-04-19T09:00:00Z'),
    };
    const threads = listOpenThreads({
      moments: [], rituals: [], entries: [entry], now: NOW,
    });
    expect(threads).toHaveLength(0);
  });
});
