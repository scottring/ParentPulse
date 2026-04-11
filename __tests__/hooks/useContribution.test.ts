/**
 * Unit tests for the pure helpers that back useContribution.
 *
 * These cover the client-side logic that the React hook layers on top
 * of Firestore queries:
 *   - pickLatestDraft:   "when multiple drafts match, pick the freshest"
 *   - filterPrivateAnswers: "strip answers another user marked private"
 *
 * The *query-shape* regressions (which Firestore rules accept which
 * list queries) are covered end-to-end against the rules emulator in
 * firestore-rules/rules.test.ts. Together these two test files cover
 * the full surface of the contribution-draft bug class that bit us
 * repeatedly during the recent redesign.
 */
import { describe, it, expect, vi } from 'vitest';

// `@/hooks/useContribution` transitively imports `@/lib/firebase`,
// which validates NEXT_PUBLIC_FIREBASE_* env vars at module load and
// throws if they're missing. We're unit-testing pure helpers here —
// no Firestore access — so short-circuit the firebase module.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  auth: {},
  functions: {},
  storage: {},
}));

// eslint-disable-next-line import/first
import {
  pickLatestDraft,
  filterPrivateAnswers,
} from '@/hooks/useContribution';
// eslint-disable-next-line import/first
import type { Contribution } from '@/types/person-manual';

// ================================================================
// Helpers
// ================================================================

// Stub a Firestore-like Timestamp that supports `.toMillis()`. The
// production Contribution type uses the real Firestore Timestamp, but
// for unit tests we only need the shape our code actually reads.
const ts = (millis: number) =>
  ({
    toMillis: () => millis,
    toDate: () => new Date(millis),
    seconds: Math.floor(millis / 1000),
    nanoseconds: 0,
  }) as unknown as Contribution['updatedAt'];

function makeDraft(
  overrides: Partial<Contribution> & { contributionId: string },
): Contribution {
  return {
    manualId: 'manual-1',
    personId: 'person-1',
    familyId: 'family-1',
    contributorId: 'user-a',
    contributorName: 'User A',
    perspectiveType: 'self',
    relationshipToSubject: 'self',
    topicCategory: 'overview',
    answers: {},
    createdAt: ts(1000),
    updatedAt: ts(1000),
    status: 'draft',
    ...overrides,
  } as Contribution;
}

// ================================================================
// pickLatestDraft
// ================================================================

describe('pickLatestDraft', () => {
  it('returns null for an empty list', () => {
    expect(pickLatestDraft([])).toBeNull();
  });

  it('returns the single draft unchanged when there is only one', () => {
    const only = makeDraft({ contributionId: 'only', updatedAt: ts(100) });
    expect(pickLatestDraft([only])?.contributionId).toBe('only');
  });

  it('picks the draft with the highest updatedAt (already-sorted input)', () => {
    const newer = makeDraft({
      contributionId: 'newer',
      updatedAt: ts(2000),
    });
    const older = makeDraft({
      contributionId: 'older',
      updatedAt: ts(1000),
    });
    expect(pickLatestDraft([newer, older])?.contributionId).toBe('newer');
  });

  it('picks the draft with the highest updatedAt (reverse-sorted input)', () => {
    // This is the regression case: buggy code that takes docs[0]
    // would pick 'older' here because that's the order Firestore
    // happened to return it. The sort must be stable against input
    // ordering.
    const newer = makeDraft({
      contributionId: 'newer',
      updatedAt: ts(2000),
    });
    const older = makeDraft({
      contributionId: 'older',
      updatedAt: ts(1000),
    });
    expect(pickLatestDraft([older, newer])?.contributionId).toBe('newer');
  });

  it('picks correctly across three drafts with varied timestamps', () => {
    const a = makeDraft({ contributionId: 'a', updatedAt: ts(500) });
    const b = makeDraft({ contributionId: 'b', updatedAt: ts(3000) });
    const c = makeDraft({ contributionId: 'c', updatedAt: ts(1500) });
    expect(pickLatestDraft([a, b, c])?.contributionId).toBe('b');
    expect(pickLatestDraft([c, a, b])?.contributionId).toBe('b');
  });

  it('treats a missing updatedAt as epoch zero so it never beats a real draft', () => {
    const missing = makeDraft({
      contributionId: 'missing',
      updatedAt: undefined as unknown as Contribution['updatedAt'],
    });
    const present = makeDraft({
      contributionId: 'present',
      updatedAt: ts(1),
    });
    expect(pickLatestDraft([missing, present])?.contributionId).toBe(
      'present',
    );
    expect(pickLatestDraft([present, missing])?.contributionId).toBe(
      'present',
    );
  });

  it('does not mutate the input array', () => {
    const older = makeDraft({
      contributionId: 'older',
      updatedAt: ts(1000),
    });
    const newer = makeDraft({
      contributionId: 'newer',
      updatedAt: ts(2000),
    });
    const input = [older, newer];
    const snapshot = [...input];
    pickLatestDraft(input);
    expect(input).toEqual(snapshot);
  });
});

// ================================================================
// filterPrivateAnswers
// ================================================================

describe('filterPrivateAnswers', () => {
  const VIEWER = 'viewer-user-id';
  const AUTHOR = 'author-user-id';

  const base: Contribution = makeDraft({
    contributionId: 'contrib-1',
    contributorId: AUTHOR,
    contributorName: 'Author',
    answers: {
      feelings: {
        q1: 'happy',
        q2: 'sad secret',
      },
      strengths: {
        q3: 'curious',
      },
    },
  });

  it('returns the contribution as-is when viewer IS the contributor', () => {
    // The author always sees their own answers regardless of visibility.
    const result = filterPrivateAnswers(
      { ...base, answerVisibility: { feelings: { q2: 'private' } } },
      AUTHOR,
    );
    expect(result).toBe(base.contributorId === AUTHOR ? result : base);
    expect((result.answers as Record<string, Record<string, string>>).feelings.q2).toBe(
      'sad secret',
    );
  });

  it('returns the contribution as-is when no answerVisibility is set', () => {
    const result = filterPrivateAnswers(base, VIEWER);
    // No visibility map → nothing to filter → same reference is fine.
    expect(result).toBe(base);
  });

  it('returns the contribution as-is when answerVisibility is empty', () => {
    const result = filterPrivateAnswers(
      { ...base, answerVisibility: {} },
      VIEWER,
    );
    // Empty map → nothing to filter.
    expect(
      (result.answers as Record<string, Record<string, string>>).feelings.q2,
    ).toBe('sad secret');
  });

  it('strips answers marked private from non-contributor viewers', () => {
    const result = filterPrivateAnswers(
      {
        ...base,
        answerVisibility: {
          feelings: { q2: 'private' },
        },
      },
      VIEWER,
    );
    const feelings = (result.answers as Record<string, Record<string, string>>)
      .feelings;
    expect(feelings.q1).toBe('happy'); // non-private preserved
    expect(feelings.q2).toBeUndefined(); // private stripped
  });

  it('preserves answers explicitly marked visible', () => {
    const result = filterPrivateAnswers(
      {
        ...base,
        answerVisibility: {
          feelings: { q1: 'visible', q2: 'private' },
        },
      },
      VIEWER,
    );
    const feelings = (result.answers as Record<string, Record<string, string>>)
      .feelings;
    expect(feelings.q1).toBe('happy');
    expect(feelings.q2).toBeUndefined();
  });

  it('does not mutate the original contribution', () => {
    const original: Contribution = {
      ...base,
      answers: JSON.parse(JSON.stringify(base.answers)),
      answerVisibility: {
        feelings: { q2: 'private' },
      },
    };
    const snapshotAnswers = JSON.parse(JSON.stringify(original.answers));
    filterPrivateAnswers(original, VIEWER);
    expect(original.answers).toEqual(snapshotAnswers);
  });

  it('only touches sections that have visibility entries', () => {
    // The `strengths` section has no visibility entry at all, so it
    // should pass through untouched.
    const result = filterPrivateAnswers(
      {
        ...base,
        answerVisibility: {
          feelings: { q2: 'private' },
        },
      },
      VIEWER,
    );
    const strengths = (result.answers as Record<string, Record<string, string>>)
      .strengths;
    expect(strengths.q3).toBe('curious');
  });

  it('handles a section flagged private where the section does not exist in answers', () => {
    // Visibility references a section that isn't in answers — should
    // not throw, should not invent the section.
    const result = filterPrivateAnswers(
      {
        ...base,
        answerVisibility: {
          phantom: { whatever: 'private' },
        },
      },
      VIEWER,
    );
    expect(
      (result.answers as Record<string, unknown>).phantom,
    ).toBeUndefined();
  });
});
