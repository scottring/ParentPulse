import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { listOpenThreads } from '@/lib/open-threads';
import type { Moment } from '@/types/moment';
import type { Ritual } from '@/types/ritual';
import type { JournalEntry } from '@/types/journal';
import type { MomentInvite } from '@/types/moment-invite';

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

describe('listOpenThreads — pending_invite', () => {
  function makeInvite(overrides: Partial<MomentInvite> = {}): MomentInvite {
    return {
      inviteId: 'inv1',
      familyId: 'fam-a',
      momentId: 'm1',
      fromUserId: 'scott',
      toUserId: 'iris',
      mode: 'blind',
      status: 'pending',
      createdAt: ts('2026-04-19T10:00:00Z'),
      ...overrides,
    };
  }

  it('flags a pending invite for the current user with a blind answer label', () => {
    const invite = makeInvite({ mode: 'blind', prompt: 'What did you see?' });
    const threads = listOpenThreads({
      moments: [], rituals: [], entries: [],
      pendingInvitesForMe: [invite], now: NOW,
    });
    expect(threads).toHaveLength(1);
    expect(threads[0].reason).toBe('pending_invite');
    expect(threads[0].id).toBe(invite.momentId);
    expect(threads[0].closingAction.label).toBe('Answer blind');
    expect(threads[0].closingAction.href).toBe(`/moments/${invite.momentId}`);
    expect(threads[0].subtitle).toBe('What did you see?');
  });

  it('uses "Answer with context" for anchored invites', () => {
    const invite = makeInvite({ mode: 'anchored' });
    const threads = listOpenThreads({
      moments: [], rituals: [], entries: [],
      pendingInvitesForMe: [invite], now: NOW,
    });
    expect(threads[0].closingAction.label).toBe('Answer with context');
  });

  it('ignores answered or declined invites', () => {
    const threads = listOpenThreads({
      moments: [], rituals: [], entries: [],
      pendingInvitesForMe: [
        makeInvite({ status: 'answered' }),
        makeInvite({ inviteId: 'inv2', status: 'declined' }),
      ],
      now: NOW,
    });
    expect(threads).toHaveLength(0);
  });

  it('outranks unclosed_divergence when both fire on the same moment', () => {
    const moment = makeMoment({
      synthesis: {
        agreementLine: 'a', divergenceLine: 'b', emergentLine: null,
        model: 't', generatedAt: ts('2026-04-19T09:00:00Z'),
      },
    });
    const invite = makeInvite({ momentId: moment.momentId });
    const threads = listOpenThreads({
      moments: [moment], rituals: [], entries: [],
      pendingInvitesForMe: [invite], now: NOW,
    });
    expect(threads).toHaveLength(1);
    expect(threads[0].reason).toBe('pending_invite');
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

describe('flagged_for_me', () => {
  it('emits a flag thread for each open/seen flag addressed to me', () => {
    const flags = [
      {
        flagId: 'f1',
        fromUserId: 'scott',
        toUserId: 'me',
        chatKind: 'coach',
        chatId: 'c1',
        messageId: 'm1',
        senderRole: 'assistant',
        quoteText: 'an important line',
        needsRealReply: false,
        status: 'open',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      },
    ] as const;
    const out = listOpenThreads({
      moments: [], rituals: [], entries: [],
      flagsForMe: flags as unknown as never,
      me: { userId: 'me', personIds: [] },
    } as never);
    const flagged = out.filter((t) => t.reason === 'flagged_for_me');
    expect(flagged).toHaveLength(1);
    expect(flagged[0].kind).toBe('flag');
    expect(flagged[0].subtitle).toContain('an important line');
  });

  it('orders flagged_for_me before mention_for_me but after pending_invite', () => {
    const now = new Date();
    const makeTs = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
    const out = listOpenThreads({
      moments: [],
      rituals: [],
      entries: [
        {
          entryId: 'e1', authorId: 'scott',
          text: 'something about iris',
          personMentions: ['p-iris'],
          createdAt: makeTs(now),
        } as never,
      ],
      pendingInvitesForMe: [
        { momentId: 'mo1', status: 'pending', createdAt: makeTs(now), prompt: 'p' } as never,
      ],
      flagsForMe: [
        {
          flagId: 'f1', fromUserId: 'scott', toUserId: 'me',
          chatKind: 'coach', chatId: 'c1', messageId: 'm1',
          senderRole: 'assistant', quoteText: 'q',
          needsRealReply: false, status: 'open',
          createdAt: makeTs(now),
        } as never,
      ],
      me: { userId: 'me', personIds: ['p-iris'] },
    } as never);
    const reasons = out.map((t) => t.reason);
    const flagIdx = reasons.indexOf('flagged_for_me');
    const invIdx = reasons.indexOf('pending_invite');
    const mentionIdx = reasons.indexOf('mention_for_me');
    expect(invIdx).toBeGreaterThanOrEqual(0);
    expect(flagIdx).toBeGreaterThanOrEqual(0);
    expect(mentionIdx).toBeGreaterThanOrEqual(0);
    expect(invIdx).toBeLessThan(flagIdx);
    expect(flagIdx).toBeLessThan(mentionIdx);
  });
});
