# Couple Ritual Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let two partners in a family schedule a recurring couple check-in together on one device, with an `.ics` calendar invite and an in-app banner that cues them when the ritual window opens. Missed rituals roll over silently.

**Architecture:** New top-level Firestore collection `couple_rituals`. Pure-function schedule math on the client (no cloud functions in v1). Client-side ICS generation with a stable per-ritual UID so rescheduling updates (doesn't duplicate) the calendar event. Minimal data model (schedule only, no occurrence history). A shared-device stepper flow at `/rituals/couple/setup`, management at `/rituals/couple/manage`, a placeholder `/rituals/couple/session` for the ritual moment itself (the actual Surface render during a ritual is covered by the existing Plan 4: The Surface spec). An in-app `RitualBanner` mounted globally cues users on ritual day and during the window.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase (Firestore client SDK), Tailwind CSS 4, Vitest + happy-dom + @testing-library/react, @firebase/rules-unit-testing for rules tests.

**Spec:** [docs/superpowers/specs/2026-04-17-couple-ritual-setup-design.md](../specs/2026-04-17-couple-ritual-setup-design.md)

---

## File structure

```
src/
  types/
    couple-ritual.ts                          NEW — type definitions
  lib/
    rituals/
      nextOccurrence.ts                       NEW — pure fn: schedule → next fire
      isInWindow.ts                           NEW — pure fn: is-now-in-window?
      icsExport.ts                            NEW — pure fn: schedule → ICS string
      spouseDetection.ts                      NEW — async: find other parent user
      downloadIcs.ts                          NEW — browser ICS download helper
  hooks/
    useSpouse.ts                              NEW — wraps spouseDetection
    useCoupleRitual.ts                        NEW — Firestore subscription + CRUD
  app/
    rituals/
      page.tsx                                NEW — /rituals overview
      ClientPage.tsx                          NEW
      couple/
        setup/
          page.tsx                            NEW — stepper flow
          ClientPage.tsx                      NEW
        manage/
          page.tsx                            NEW
          ClientPage.tsx                      NEW
        session/
          page.tsx                            NEW — placeholder
  components/
    rituals/
      RitualBanner.tsx                        NEW
      RitualSetupStepper.tsx                  NEW
      CadencePicker.tsx                       NEW
      DayOfWeekPicker.tsx                     NEW
      TimePicker.tsx                          NEW
      DurationPicker.tsx                      NEW
      RitualSummaryCard.tsx                   NEW
    layout/
      Navigation.tsx                          MODIFY — add Rituals link
  app/
    layout.tsx                                MODIFY — mount <RitualBanner/> globally

__tests__/
  lib/rituals/
    nextOccurrence.test.ts                    NEW
    isInWindow.test.ts                        NEW
    icsExport.test.ts                         NEW
    spouseDetection.test.ts                   NEW
  hooks/
    useCoupleRitual.test.ts                   NEW
  components/rituals/
    RitualBanner.test.tsx                     NEW

firestore-rules/
  rules.test.ts                               MODIFY — add couple_rituals tests

firestore.rules                               MODIFY — add couple_rituals match block
firestore.indexes.json                        MODIFY — composite index
```

**Design principle:** files that change together live together (`src/lib/rituals/*` all deal with schedule math). Each file has one responsibility. No file exceeds ~150 lines.

---

## Task 1: Data types

**Files:**
- Create: `src/types/couple-ritual.ts`

No tests for pure type declarations — TypeScript compile is the verification.

- [ ] **Step 1: Create the type file**

```ts
// src/types/couple-ritual.ts
import { Timestamp } from 'firebase/firestore';

export type RitualCadence = 'weekly' | 'biweekly' | 'monthly';
export type RitualStatus = 'active' | 'paused' | 'ended';

/** JS Date.getDay(): 0 = Sunday .. 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CoupleRitual {
  id: string;
  familyId: string;

  /** Both partners' Firebase Auth UIDs. Order-insensitive. */
  participantUserIds: [string, string];

  cadence: RitualCadence;
  dayOfWeek: DayOfWeek;
  /** 'HH:mm' in 24h, local to the ritual's timezone. */
  startTimeLocal: string;
  durationMinutes: number;
  /** IANA timezone, e.g. 'America/New_York'. */
  timezone: string;

  status: RitualStatus;
  /** First-occurrence date anchor (used to compute monthly nth-weekday). */
  startsOn: Timestamp;

  createdAt: Timestamp;
  createdByUserId: string;
  updatedAt: Timestamp;
  updatedByUserId: string;

  /** Optional human-friendly note. <=140 chars. */
  intention?: string;
}

export const MAX_INTENTION_LENGTH = 140;

/** Firestore write shape — drops server-managed fields. */
export type CoupleRitualDraft = Omit<
  CoupleRitual,
  'id' | 'createdAt' | 'updatedAt'
>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/couple-ritual.ts
git commit -m "feat(rituals): add CoupleRitual type definitions"
```

---

## Task 2: Pure function — nextOccurrence

**Files:**
- Create: `src/lib/rituals/nextOccurrence.ts`
- Test: `__tests__/lib/rituals/nextOccurrence.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/rituals/nextOccurrence.test.ts
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
    // Friday -> next is Sunday evening
    const now = new Date('2026-04-24T10:00:00-04:00'); // Friday
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    // Sunday 2026-04-26 20:00 America/New_York == 00:00 UTC Monday
    expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('returns next week when asked after this week’s window closed', () => {
    // Sunday 10pm, past the 8pm start
    const now = new Date('2026-04-26T22:00:00-04:00');
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    // Next Sunday 2026-05-03 20:00 America/New_York
    expect(next.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });

  it('returns today’s time when asked before today’s window', () => {
    // Sunday 3pm, before 8pm
    const now = new Date('2026-04-26T15:00:00-04:00');
    const ritual = makeRitual();
    const next = nextOccurrence(ritual, now);
    expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('honours biweekly cadence from the anchor date', () => {
    const ritual = makeRitual({
      cadence: 'biweekly',
      startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')), // Sun
    });
    const now = new Date('2026-04-27T00:00:00-04:00'); // Monday after week 1
    const next = nextOccurrence(ritual, now);
    // Skip 2026-05-03, land on 2026-05-10
    expect(next.toISOString()).toBe('2026-05-11T00:00:00.000Z');
  });

  it('honours monthly cadence as nth-weekday-of-month from anchor', () => {
    const ritual = makeRitual({
      cadence: 'monthly',
      // Anchor: 4th Sunday of April 2026 = 2026-04-26
      startsOn: Timestamp.fromDate(new Date('2026-04-26T00:00:00-04:00')),
    });
    const now = new Date('2026-04-27T00:00:00-04:00');
    const next = nextOccurrence(ritual, now);
    // 4th Sunday of May 2026 = 2026-05-24
    expect(next.toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/rituals/nextOccurrence.test.ts`
Expected: all fail with "Cannot find module '@/lib/rituals/nextOccurrence'".

- [ ] **Step 3: Implement**

```ts
// src/lib/rituals/nextOccurrence.ts
import type { CoupleRitual, DayOfWeek } from '@/types/couple-ritual';

/**
 * Compute the next-occurrence Date for a ritual given a reference "now".
 * All math happens in the ritual's timezone; the return value is a UTC Date.
 *
 * Strategy: build the candidate occurrence for the week containing `now`
 * (or for monthly cadence, the month containing `now`), then advance
 * until it's after `now`.
 */
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
  // Find the candidate in the current week (local to tz).
  const candidate = atLocalTime(now, dayOfWeek, hh, mm, tz);
  // If candidate is in the past relative to now, advance by interval weeks.
  // Also enforce alignment with the anchor for biweekly.
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  let result = candidate;
  while (result.getTime() <= now.getTime()) {
    result = new Date(result.getTime() + intervalWeeks * msPerWeek);
  }
  if (intervalWeeks > 1) {
    // Align to the anchor: (result - anchor) / weekMs must be a multiple of intervalWeeks.
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
  // Nth weekday of the month, where N is determined by the anchor date.
  const nth = nthWeekdayOfMonth(anchor, tz);
  // Try this month, then next, then next again (covers 5th-weekday fallback).
  for (let monthsAhead = 0; monthsAhead < 3; monthsAhead++) {
    const target = nthWeekdayInMonth(now, dayOfWeek, nth, hh, mm, tz, monthsAhead);
    if (target && target.getTime() > now.getTime()) return target;
  }
  // Should never hit — but fall back to adding 30 days.
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

/** Build a Date at the given local weekday + HH:mm in the given tz, in the same week as `ref`. */
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
  // Day 1 of target month.
  const firstIso = `${year}-${pad(month)}-01T00:00:00`;
  const firstUtc = zonedIsoToUtc(firstIso, tz);
  const firstWeekday = localParts(firstUtc, tz).weekday;
  const offset = (dayOfWeek - firstWeekday + 7) % 7;
  const dayOfMonth = 1 + offset + (nth - 1) * 7;
  // Guard: dayOfMonth must be in this month.
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

/** Convert a "wall clock" ISO string (no Z) in the given tz to a UTC Date. */
function zonedIsoToUtc(iso: string, tz: string): Date {
  // Probe: what does UTC midnight of the same wall-clock moment look like when rendered in tz?
  // Use the offset at that instant to correct.
  const asUtc = new Date(`${iso}Z`);
  const parts = localParts(asUtc, tz);
  const localIso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00Z`;
  const diffMs = new Date(localIso).getTime() - asUtc.getTime();
  return new Date(asUtc.getTime() - diffMs);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/rituals/nextOccurrence.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rituals/nextOccurrence.ts __tests__/lib/rituals/nextOccurrence.test.ts
git commit -m "feat(rituals): nextOccurrence — weekly/biweekly/monthly schedule math"
```

---

## Task 3: Pure function — isInWindow

**Files:**
- Create: `src/lib/rituals/isInWindow.ts`
- Test: `__tests__/lib/rituals/isInWindow.test.ts`

Window policy: a ritual is "in window" from 10 minutes *before* its start to 30 minutes *after* its scheduled end (start + duration). Before the window = "day-of, pre-window"; after = hidden.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/rituals/isInWindow.test.ts
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
    // Sunday 6pm; window opens 7:50pm
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
    const now = new Date('2026-04-26T20:30:00-04:00'); // 15 min after start + 15 min duration = end of window
    expect(ritualBannerState(makeRitual(), now)).toBe('inWindow');
  });

  it('returns "hidden" after the post-window grace closes', () => {
    const now = new Date('2026-04-26T22:00:00-04:00');
    expect(ritualBannerState(makeRitual(), now)).toBe('hidden');
  });

  it('returns "hidden" on a non-ritual day', () => {
    const now = new Date('2026-04-28T19:00:00-04:00'); // Tuesday
    expect(ritualBannerState(makeRitual(), now)).toBe('hidden');
  });

  it('returns "hidden" for paused rituals regardless of time', () => {
    const now = new Date('2026-04-26T20:00:00-04:00');
    expect(ritualBannerState(makeRitual({ status: 'paused' }), now)).toBe('hidden');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/rituals/isInWindow.test.ts`
Expected: 7 fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/rituals/isInWindow.ts
import type { CoupleRitual } from '@/types/couple-ritual';
import { nextOccurrence } from './nextOccurrence';

export type RitualBannerState = 'hidden' | 'preWindow' | 'inWindow';

const PRE_WINDOW_MS = 10 * 60 * 1000;
const POST_WINDOW_MS = 30 * 60 * 1000;

/**
 * Decide what the in-app banner should show for this ritual at `now`.
 *
 * - 'inWindow'   → from (start - 10min) to (start + duration + 30min)
 * - 'preWindow'  → ritual day, before 'inWindow' opens
 * - 'hidden'     → otherwise (or if status !== 'active')
 */
export function ritualBannerState(ritual: CoupleRitual, now: Date): RitualBannerState {
  if (ritual.status !== 'active') return 'hidden';

  // The "next" occurrence might be today (if start is in the future) or next week.
  // We also need to handle "we're currently IN the window of the just-passed occurrence."
  const next = nextOccurrence(ritual, now);
  const startMs = next.getTime();
  const endMs = startMs + ritual.durationMinutes * 60 * 1000;
  const nowMs = now.getTime();

  // In-window check against "next": covers today pre-start and the 10-min pre.
  if (nowMs >= startMs - PRE_WINDOW_MS && nowMs <= endMs + POST_WINDOW_MS) {
    return 'inWindow';
  }

  // Today pre-window: next occurrence is today (same local date in timezone) but
  // outside the 10-min pre-open buffer.
  if (isSameLocalDate(now, next, ritual.timezone) && nowMs < startMs - PRE_WINDOW_MS) {
    return 'preWindow';
  }

  // Post-window check: if next is far in the future but the just-passed occurrence
  // is still inside its grace period, show inWindow. We approximate by checking
  // if (next - interval) covers now.
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
  return 30 * 24 * 60 * 60 * 1000; // monthly — approximate
}

function isSameLocalDate(a: Date, b: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(a) === fmt.format(b);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/rituals/isInWindow.test.ts`
Expected: 7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rituals/isInWindow.ts __tests__/lib/rituals/isInWindow.test.ts
git commit -m "feat(rituals): ritualBannerState — hidden/preWindow/inWindow decider"
```

---

## Task 4: Pure function — ICS export

**Files:**
- Create: `src/lib/rituals/icsExport.ts`
- Test: `__tests__/lib/rituals/icsExport.test.ts`

Uses a **stable UID** per ritual so calendar apps update the existing event on reschedule rather than duplicating.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/rituals/icsExport.test.ts
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
        // 2026-04-26 is the 4th Sunday of April
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/rituals/icsExport.test.ts`
Expected: 5 fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/rituals/icsExport.ts
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
  // monthly — nth weekday from anchor
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/rituals/icsExport.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rituals/icsExport.ts __tests__/lib/rituals/icsExport.test.ts
git commit -m "feat(rituals): ICS export with stable UID and cadence-aware RRULE"
```

---

## Task 5: Browser ICS download helper

**Files:**
- Create: `src/lib/rituals/downloadIcs.ts`

Pure DOM-side helper. No tests (it touches `document.createElement('a').click()`); will be exercised via UI tests downstream.

- [ ] **Step 1: Implement**

```ts
// src/lib/rituals/downloadIcs.ts
/**
 * Trigger an ICS file download in the browser. Returns a Blob URL that
 * should be revoked by the caller after a brief delay (we do it here
 * on a timer to keep the API simple).
 */
export function downloadIcs(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rituals/downloadIcs.ts
git commit -m "feat(rituals): browser ICS download helper"
```

---

## Task 6: Spouse detection

**Files:**
- Create: `src/lib/rituals/spouseDetection.ts`
- Test: `__tests__/lib/rituals/spouseDetection.test.ts`

Rule: the spouse is the *only other* user in the family whose role is `'parent'`. Returns null if there are 0 or >1 such users (ambiguous).

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/rituals/spouseDetection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore call surface.
const getDocsMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => ({ __collection: name })),
  query: vi.fn((...args) => ({ __query: args })),
  where: vi.fn((...args) => ({ __where: args })),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));

import { findSpouseUserId } from '@/lib/rituals/spouseDetection';

function mockUsers(users: Array<{ id: string; role: string }>) {
  getDocsMock.mockResolvedValueOnce({
    docs: users.map((u) => ({ id: u.id, data: () => ({ role: u.role }) })),
  });
}

describe('findSpouseUserId', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it('returns the other parent when exactly 2 parent users exist', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'iris', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBe('iris');
  });

  it('returns null when no other parent exists', async () => {
    mockUsers([{ id: 'scott', role: 'parent' }]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBeNull();
  });

  it('returns null when more than one other parent exists', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'iris', role: 'parent' },
      { id: 'sam', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBeNull();
  });

  it('ignores non-parent role users', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'liam', role: 'child' },
      { id: 'iris', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBe('iris');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/rituals/spouseDetection.test.ts`
Expected: 4 fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/rituals/spouseDetection.ts
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Find the other parent-role user in the family. Returns null if 0 or
 * >1 other parents exist (we do not silently pick one).
 */
export async function findSpouseUserId(
  familyId: string,
  currentUserId: string,
): Promise<string | null> {
  const q = query(
    collection(db, 'users'),
    where('familyId', '==', familyId),
    where('role', '==', 'parent'),
  );
  const snap = await getDocs(q);
  const otherIds = snap.docs
    .map((d) => d.id)
    .filter((id) => id !== currentUserId);
  return otherIds.length === 1 ? otherIds[0] : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/rituals/spouseDetection.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rituals/spouseDetection.ts __tests__/lib/rituals/spouseDetection.test.ts
git commit -m "feat(rituals): findSpouseUserId helper — returns single other parent"
```

---

## Task 7: useSpouse hook

**Files:**
- Create: `src/hooks/useSpouse.ts`

Read-only wrapper that calls `findSpouseUserId` plus fetches the user doc for a display name. No tests in this task — exercised via hook consumers.

- [ ] **Step 1: Implement**

```ts
// src/hooks/useSpouse.ts
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { findSpouseUserId } from '@/lib/rituals/spouseDetection';

interface SpouseState {
  spouseUserId: string | null;
  spouseName: string | null;
  loading: boolean;
}

export function useSpouse(): SpouseState {
  const { user } = useAuth();
  const [state, setState] = useState<SpouseState>({
    spouseUserId: null, spouseName: null, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user?.userId || !user.familyId) {
      setState({ spouseUserId: null, spouseName: null, loading: false });
      return;
    }
    (async () => {
      const id = await findSpouseUserId(user.familyId!, user.userId);
      if (cancelled) return;
      if (!id) {
        setState({ spouseUserId: null, spouseName: null, loading: false });
        return;
      }
      const snap = await getDoc(doc(db, 'users', id));
      if (cancelled) return;
      const name = (snap.data()?.name as string | undefined)
        ?? (snap.data()?.email as string | undefined)
        ?? 'your partner';
      setState({ spouseUserId: id, spouseName: name, loading: false });
    })();
    return () => { cancelled = true; };
  }, [user?.userId, user?.familyId]);

  return state;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSpouse.ts
git commit -m "feat(rituals): useSpouse hook — resolves current user's partner"
```

---

## Task 8: useCoupleRitual hook

**Files:**
- Create: `src/hooks/useCoupleRitual.ts`
- Test: `__tests__/hooks/useCoupleRitual.test.ts`

Subscribes to the family's active/paused ritual (at most one). Exposes `create`, `update`, `pause`, `resume`, `end`.

- [ ] **Step 1: Write the failing tests (minimal — focused on create payload shape)**

```ts
// __tests__/hooks/useCoupleRitual.test.ts
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
vi.mock('@/lib/firebase', () => ({ db: {} }));

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/hooks/useCoupleRitual.test.ts`
Expected: 2 fail with module not found.

- [ ] **Step 3: Implement**

```ts
// src/hooks/useCoupleRitual.ts
'use client';

import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, onSnapshot,
  query, serverTimestamp, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  CoupleRitual, RitualCadence, DayOfWeek,
} from '@/types/couple-ritual';

interface CreateArgs {
  familyId: string;
  creatorUserId: string;
  spouseUserId: string;
  cadence: RitualCadence;
  dayOfWeek: DayOfWeek;
  startTimeLocal: string;
  durationMinutes: number;
  timezone: string;
  startsOn: Date;
  intention: string;
}

/** Exported for unit testing. */
export function buildCreatePayload(args: CreateArgs): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    familyId: args.familyId,
    participantUserIds: [args.creatorUserId, args.spouseUserId],
    cadence: args.cadence,
    dayOfWeek: args.dayOfWeek,
    startTimeLocal: args.startTimeLocal,
    durationMinutes: args.durationMinutes,
    timezone: args.timezone,
    status: 'active',
    startsOn: Timestamp.fromDate(args.startsOn),
    createdAt: serverTimestamp(),
    createdByUserId: args.creatorUserId,
    updatedAt: serverTimestamp(),
    updatedByUserId: args.creatorUserId,
  };
  if (args.intention && args.intention.trim().length > 0) {
    payload.intention = args.intention.trim();
  }
  return payload;
}

interface UseCoupleRitualResult {
  ritual: CoupleRitual | null;
  loading: boolean;
  createRitual: (
    args: Omit<CreateArgs, 'familyId' | 'creatorUserId'>,
  ) => Promise<string>;
  updateRitual: (patch: Partial<CoupleRitual>) => Promise<void>;
  pauseRitual: () => Promise<void>;
  resumeRitual: () => Promise<void>;
  endRitual: () => Promise<void>;
}

export function useCoupleRitual(): UseCoupleRitualResult {
  const { user } = useAuth();
  const [ritual, setRitual] = useState<CoupleRitual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) { setLoading(false); return; }
    const q = query(
      collection(db, 'couple_rituals'),
      where('familyId', '==', user.familyId),
      where('status', 'in', ['active', 'paused']),
    );
    const unsub = onSnapshot(q, (snap) => {
      const first = snap.docs[0];
      setRitual(first ? ({ id: first.id, ...(first.data() as Omit<CoupleRitual, 'id'>) }) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.familyId]);

  async function createRitual(args: Omit<CreateArgs, 'familyId' | 'creatorUserId'>) {
    if (!user?.userId || !user.familyId) throw new Error('not signed in');
    const payload = buildCreatePayload({
      ...args, familyId: user.familyId, creatorUserId: user.userId,
    });
    const docRef = await addDoc(collection(db, 'couple_rituals'), payload);
    return docRef.id;
  }

  async function updateRitual(patch: Partial<CoupleRitual>) {
    if (!ritual || !user?.userId) return;
    await updateDoc(doc(db, 'couple_rituals', ritual.id), {
      ...patch, updatedAt: serverTimestamp(), updatedByUserId: user.userId,
    });
  }

  return {
    ritual, loading,
    createRitual,
    updateRitual,
    pauseRitual: () => updateRitual({ status: 'paused' }),
    resumeRitual: () => updateRitual({ status: 'active' }),
    endRitual: () => updateRitual({ status: 'ended' }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/hooks/useCoupleRitual.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCoupleRitual.ts __tests__/hooks/useCoupleRitual.test.ts
git commit -m "feat(rituals): useCoupleRitual hook + buildCreatePayload"
```

---

## Task 9: Firestore security rules + tests

**Files:**
- Modify: `firestore.rules` (append a `couple_rituals` match block; use existing `isSignedIn()` and `belongsToFamily()` helpers)
- Modify: `firestore-rules/rules.test.ts` (append a test suite)

- [ ] **Step 1: Add the rule block**

Open `firestore.rules` and add the following match block inside the top-level `match /databases/{database}/documents` block, before the closing brace:

```
    // Couple rituals — scheduled recurring check-ins between two partners.
    match /couple_rituals/{ritualId} {
      allow read: if isSignedIn() && belongsToFamily(resource.data.familyId);
      allow create: if isSignedIn()
        && belongsToFamily(request.resource.data.familyId)
        && request.auth.uid in request.resource.data.participantUserIds
        && request.resource.data.participantUserIds.size() == 2
        && request.resource.data.status == 'active';
      allow update: if isSignedIn()
        && belongsToFamily(resource.data.familyId)
        && request.auth.uid in resource.data.participantUserIds;
      allow delete: if isSignedIn()
        && belongsToFamily(resource.data.familyId)
        && request.auth.uid in resource.data.participantUserIds;
    }
```

- [ ] **Step 2: Add rules tests**

Append to `firestore-rules/rules.test.ts`:

```ts
describe.skipIf(!emulatorAvailable)('couple_rituals', () => {
  const SCOTT = 'scott-uid';
  const IRIS = 'iris-uid';
  const STRANGER = 'stranger-uid';

  beforeEach(async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', SCOTT), { familyId: FAMILY_ID, role: 'parent' });
      await setDoc(doc(db, 'users', IRIS), { familyId: FAMILY_ID, role: 'parent' });
      await setDoc(doc(db, 'users', STRANGER), { familyId: OTHER_FAMILY_ID, role: 'parent' });
    });
  });

  it('lets a participant create a ritual in their family', async () => {
    const scottDb = getAuthContext(SCOTT).firestore();
    await assertSucceeds(addDoc(collection(scottDb, 'couple_rituals'), {
      familyId: FAMILY_ID,
      participantUserIds: [SCOTT, IRIS],
      cadence: 'weekly', dayOfWeek: 0,
      startTimeLocal: '20:00', durationMinutes: 15,
      timezone: 'America/New_York',
      status: 'active',
      startsOn: new Date(),
      createdAt: new Date(), createdByUserId: SCOTT,
      updatedAt: new Date(), updatedByUserId: SCOTT,
    }));
  });

  it('blocks creation by a user outside the family', async () => {
    const strangerDb = getAuthContext(STRANGER).firestore();
    await assertFails(addDoc(collection(strangerDb, 'couple_rituals'), {
      familyId: FAMILY_ID,
      participantUserIds: [STRANGER, IRIS],
      cadence: 'weekly', dayOfWeek: 0,
      startTimeLocal: '20:00', durationMinutes: 15,
      timezone: 'America/New_York',
      status: 'active',
      startsOn: new Date(),
      createdAt: new Date(), createdByUserId: STRANGER,
      updatedAt: new Date(), updatedByUserId: STRANGER,
    }));
  });

  it('blocks creation when creator is not in participantUserIds', async () => {
    const scottDb = getAuthContext(SCOTT).firestore();
    await assertFails(addDoc(collection(scottDb, 'couple_rituals'), {
      familyId: FAMILY_ID,
      participantUserIds: [IRIS, STRANGER],  // Scott not listed
      cadence: 'weekly', dayOfWeek: 0,
      startTimeLocal: '20:00', durationMinutes: 15,
      timezone: 'America/New_York',
      status: 'active',
      startsOn: new Date(),
      createdAt: new Date(), createdByUserId: SCOTT,
      updatedAt: new Date(), updatedByUserId: SCOTT,
    }));
  });

  it('lets either participant update the ritual', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'couple_rituals', 'r1'), {
        familyId: FAMILY_ID,
        participantUserIds: [SCOTT, IRIS],
        status: 'active', cadence: 'weekly', dayOfWeek: 0,
        startTimeLocal: '20:00', durationMinutes: 15,
        timezone: 'America/New_York',
        startsOn: new Date(),
        createdAt: new Date(), createdByUserId: SCOTT,
        updatedAt: new Date(), updatedByUserId: SCOTT,
      });
    });
    const irisDb = getAuthContext(IRIS).firestore();
    await assertSucceeds(updateDoc(doc(irisDb, 'couple_rituals', 'r1'), {
      status: 'paused', updatedAt: new Date(), updatedByUserId: IRIS,
    }));
  });

  it('blocks read by a user in a different family', async () => {
    await testEnv!.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'couple_rituals', 'r2'), {
        familyId: FAMILY_ID,
        participantUserIds: [SCOTT, IRIS],
        status: 'active', cadence: 'weekly', dayOfWeek: 0,
        startTimeLocal: '20:00', durationMinutes: 15,
        timezone: 'America/New_York',
        startsOn: new Date(),
        createdAt: new Date(), createdByUserId: SCOTT,
        updatedAt: new Date(), updatedByUserId: SCOTT,
      });
    });
    const strangerDb = getAuthContext(STRANGER).firestore();
    await assertFails(getDoc(doc(strangerDb, 'couple_rituals', 'r2')));
  });
});
```

- [ ] **Step 3: Run rules tests**

Run: `npm run test:rules`
Expected: 5 new tests pass (if the emulator is running). If no emulator, tests are skipped — run the emulator per the existing `rules.test.ts` setup instructions.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore-rules/rules.test.ts
git commit -m "feat(rituals): firestore security rules for couple_rituals"
```

---

## Task 10: Firestore composite index

**Files:**
- Modify: `firestore.indexes.json`

The `useCoupleRitual` query filters on `familyId == X && status in ['active','paused']`. This needs a composite index.

- [ ] **Step 1: Read the current indexes file**

Run: `cat firestore.indexes.json` to see the shape. Add a new entry in the `indexes` array:

```json
{
  "collectionGroup": "couple_rituals",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 2: Deploy indexes**

Run: `firebase deploy --only firestore:indexes`
Expected: deployment completes. Index may take a few minutes to build.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(rituals): composite index on couple_rituals (familyId, status)"
```

---

## Task 11: Picker components

**Files:**
- Create: `src/components/rituals/CadencePicker.tsx`
- Create: `src/components/rituals/DayOfWeekPicker.tsx`
- Create: `src/components/rituals/TimePicker.tsx`
- Create: `src/components/rituals/DurationPicker.tsx`

Stateless controlled inputs. Styled with existing Relish conventions (Cormorant for display, DM Sans for body; warm neutral palette).

- [ ] **Step 1: Implement CadencePicker**

```tsx
// src/components/rituals/CadencePicker.tsx
'use client';

import type { RitualCadence } from '@/types/couple-ritual';

const OPTIONS: { value: RitualCadence; label: string; sub: string }[] = [
  { value: 'weekly', label: 'Weekly', sub: 'Most couples land here.' },
  { value: 'biweekly', label: 'Every two weeks', sub: 'A lighter cadence.' },
  { value: 'monthly', label: 'Monthly', sub: 'A deeper quarterly check-in pace.' },
];

export default function CadencePicker({
  value, onChange,
}: { value: RitualCadence; onChange: (v: RitualCadence) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`text-left px-5 py-4 rounded-xl border transition-colors ${
            value === o.value
              ? 'border-[#7C9082] bg-[#F3F1EC]'
              : 'border-[rgba(120,100,70,0.18)] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>{o.label}</div>
          <div style={{ fontSize: 13, color: '#6B6254', marginTop: 2 }}>{o.sub}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement DayOfWeekPicker**

```tsx
// src/components/rituals/DayOfWeekPicker.tsx
'use client';

import type { DayOfWeek } from '@/types/couple-ritual';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function DayOfWeekPicker({
  value, onChange,
}: { value: DayOfWeek; onChange: (v: DayOfWeek) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {DAYS.map((d) => (
        <button
          key={d.value}
          onClick={() => onChange(d.value)}
          className={`px-4 py-3 rounded-full border transition-colors ${
            value === d.value
              ? 'border-[#7C9082] bg-[#7C9082] text-white'
              : 'border-[rgba(120,100,70,0.18)] text-[#3A3530] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: 14, minWidth: 60 }}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement TimePicker**

```tsx
// src/components/rituals/TimePicker.tsx
'use client';

const TIMES = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

export default function TimePicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 rounded-xl border border-[rgba(120,100,70,0.18)] bg-white"
      style={{ fontFamily: 'var(--font-parent-body)', fontSize: 16, color: '#3A3530', minWidth: 160 }}
    >
      {TIMES.map((t) => (
        <option key={t} value={t}>{formatTimeLabel(t)}</option>
      ))}
    </select>
  );
}

function formatTimeLabel(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
```

- [ ] **Step 4: Implement DurationPicker**

```tsx
// src/components/rituals/DurationPicker.tsx
'use client';

const OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
];

export default function DurationPicker({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-5 py-3 rounded-xl border transition-colors ${
            value === o.value
              ? 'border-[#7C9082] bg-[#F3F1EC]'
              : 'border-[rgba(120,100,70,0.18)] hover:bg-black/[0.02]'
          }`}
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/rituals/
git commit -m "feat(rituals): picker primitives — cadence, day, time, duration"
```

---

## Task 12: Setup stepper flow

**Files:**
- Create: `src/app/rituals/couple/setup/page.tsx`
- Create: `src/app/rituals/couple/setup/ClientPage.tsx`

6-step stepper, one device, both-present framing. On confirm: writes to Firestore, triggers ICS download, navigates to `/rituals`.

- [ ] **Step 1: Server page**

```tsx
// src/app/rituals/couple/setup/page.tsx
import ClientPage from './ClientPage';

export default function Page() {
  return <ClientPage />;
}
```

- [ ] **Step 2: Client page**

```tsx
// src/app/rituals/couple/setup/ClientPage.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSpouse } from '@/hooks/useSpouse';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import CadencePicker from '@/components/rituals/CadencePicker';
import DayOfWeekPicker from '@/components/rituals/DayOfWeekPicker';
import TimePicker from '@/components/rituals/TimePicker';
import DurationPicker from '@/components/rituals/DurationPicker';
import { coupleRitualToIcs } from '@/lib/rituals/icsExport';
import { downloadIcs } from '@/lib/rituals/downloadIcs';
import type {
  RitualCadence, DayOfWeek,
} from '@/types/couple-ritual';

type Step = 'together' | 'cadence' | 'day' | 'time' | 'duration' | 'confirm';

export default function ClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { spouseUserId, spouseName, loading: spouseLoading } = useSpouse();
  const { createRitual } = useCoupleRitual();

  const [step, setStep] = useState<Step>('together');
  const [cadence, setCadence] = useState<RitualCadence>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(0);
  const [startTimeLocal, setStartTimeLocal] = useState('20:00');
  const [duration, setDuration] = useState(15);
  const [intention, setIntention] = useState('Our weekly check-in');
  const [submitting, setSubmitting] = useState(false);

  if (spouseLoading) return <div style={pageStyle}>Loading…</div>;

  if (!spouseUserId || !spouseName) {
    return (
      <div style={pageStyle}>
        <h1 style={h1Style}>We couldn’t find your partner.</h1>
        <p style={pStyle}>
          Couple rituals need both of you in the family. Invite your partner first,
          then come back here.
        </p>
        <button onClick={() => router.push('/settings')} style={primaryBtn}>
          Go to Settings
        </button>
      </div>
    );
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function handleConfirm() {
    if (!user?.userId) return;
    setSubmitting(true);
    const startsOn = nextDateOnDay(dayOfWeek);
    try {
      const ritualId = await createRitual({
        spouseUserId: spouseUserId!,
        cadence, dayOfWeek, startTimeLocal, durationMinutes: duration,
        timezone: tz, startsOn, intention,
      });
      // Build an ICS from the freshly-created schedule.
      const { Timestamp } = await import('firebase/firestore');
      const icsRitual = {
        id: ritualId, familyId: user.familyId!,
        participantUserIds: [user.userId, spouseUserId!] as [string, string],
        cadence, dayOfWeek, startTimeLocal, durationMinutes: duration,
        timezone: tz, status: 'active' as const,
        startsOn: Timestamp.fromDate(startsOn),
        createdAt: Timestamp.now(), createdByUserId: user.userId,
        updatedAt: Timestamp.now(), updatedByUserId: user.userId,
        intention,
      };
      const ics = coupleRitualToIcs(
        icsRitual,
        user.name ?? 'Me',
        spouseName!,
      );
      downloadIcs(ics, `relish-check-in-with-${spouseName!.toLowerCase()}.ics`);
      router.push('/rituals');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageStyle}>
      {step === 'together' && (
        <>
          <h1 style={h1Style}>Is {spouseName} here with you?</h1>
          <p style={pStyle}>
            This works best when you set it up together, in the same room.
          </p>
          <button onClick={() => setStep('cadence')} style={primaryBtn}>
            Yes, we’re together
          </button>
        </>
      )}
      {step === 'cadence' && (
        <>
          <h1 style={h1Style}>How often?</h1>
          <p style={pStyle}>Weekly is the default most couples land on.</p>
          <CadencePicker value={cadence} onChange={setCadence} />
          <StepNav onBack={() => setStep('together')} onNext={() => setStep('day')} />
        </>
      )}
      {step === 'day' && (
        <>
          <h1 style={h1Style}>What day?</h1>
          <DayOfWeekPicker value={dayOfWeek} onChange={setDayOfWeek} />
          <StepNav onBack={() => setStep('cadence')} onNext={() => setStep('time')} />
        </>
      )}
      {step === 'time' && (
        <>
          <h1 style={h1Style}>What time?</h1>
          <TimePicker value={startTimeLocal} onChange={setStartTimeLocal} />
          <StepNav onBack={() => setStep('day')} onNext={() => setStep('duration')} />
        </>
      )}
      {step === 'duration' && (
        <>
          <h1 style={h1Style}>How long?</h1>
          <DurationPicker value={duration} onChange={setDuration} />
          <StepNav onBack={() => setStep('time')} onNext={() => setStep('confirm')} />
        </>
      )}
      {step === 'confirm' && (
        <>
          <h1 style={h1Style}>Your check-in</h1>
          <p style={pStyle}>
            {summaryText(cadence, dayOfWeek, startTimeLocal, duration)}
          </p>
          <label style={{ display: 'block', marginTop: 24, fontSize: 13, color: '#6B6254' }}>
            Intention (optional)
            <input
              type="text"
              value={intention}
              maxLength={140}
              onChange={(e) => setIntention(e.target.value)}
              style={{
                display: 'block', marginTop: 8, width: '100%', maxWidth: 480,
                padding: '10px 12px', borderRadius: 8,
                border: '1px solid rgba(120,100,70,0.18)',
                fontFamily: 'var(--font-parent-body)', fontSize: 15,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button onClick={() => setStep('duration')} style={secondaryBtn} disabled={submitting}>
              Back
            </button>
            <button onClick={handleConfirm} style={primaryBtn} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
      <button onClick={onBack} style={secondaryBtn}>Back</button>
      <button onClick={onNext} style={primaryBtn}>Next</button>
    </div>
  );
}

function nextDateOnDay(dayOfWeek: number): Date {
  const now = new Date();
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(0, 0, 0, 0);
  return d;
}

function summaryText(c: string, day: number, time: string, dur: number): string {
  const dayLabels = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const cadenceLabel = c === 'weekly' ? 'Every' : c === 'biweekly' ? 'Every other' : 'Monthly on the nth';
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${cadenceLabel} ${dayLabels[day]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${dur} minutes.`;
}

const pageStyle: React.CSSProperties = {
  padding: '80px 32px 64px', maxWidth: 640, margin: '0 auto',
  fontFamily: 'var(--font-parent-body)', color: '#3A3530',
};
const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 12px', color: '#3A3530', lineHeight: 1.2,
};
const pStyle: React.CSSProperties = {
  fontSize: 16, color: '#6B6254', margin: '0 0 24px', lineHeight: 1.55,
};
const primaryBtn: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 10, background: '#7C9082', color: 'white',
  border: 'none', fontFamily: 'var(--font-parent-body)', fontSize: 15, fontWeight: 500,
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 10, background: 'transparent', color: '#3A3530',
  border: '1px solid rgba(120,100,70,0.18)', fontFamily: 'var(--font-parent-body)',
  fontSize: 15, cursor: 'pointer',
};
```

- [ ] **Step 3: Manual verify**

Run `npm run dev` and navigate to `http://localhost:3000/rituals/couple/setup`. Walk through the 6 steps. On Confirm, verify:
- Firestore now has a doc in `couple_rituals` with `status: 'active'`.
- An `.ics` file downloads.
- You land on `/rituals` (placeholder until Task 13).

- [ ] **Step 4: Commit**

```bash
git add src/app/rituals/couple/setup/
git commit -m "feat(rituals): 6-step couple ritual setup flow"
```

---

## Task 13: /rituals overview page

**Files:**
- Create: `src/app/rituals/page.tsx`
- Create: `src/app/rituals/ClientPage.tsx`

Shows the existing ritual (if any) with a "Manage" link, else shows a "Set up your couple check-in" CTA. Handles the no-spouse empty state.

- [ ] **Step 1: Server page**

```tsx
// src/app/rituals/page.tsx
import ClientPage from './ClientPage';
export default function Page() { return <ClientPage />; }
```

- [ ] **Step 2: Client page**

```tsx
// src/app/rituals/ClientPage.tsx
'use client';

import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';

export default function ClientPage() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName, loading: spouseLoading } = useSpouse();

  if (loading || spouseLoading) return <PageChrome><p>Loading…</p></PageChrome>;

  return (
    <PageChrome>
      <h1 style={h1Style}>Rituals</h1>
      {!ritual && (
        <div style={card}>
          <h2 style={h2Style}>Your couple check-in</h2>
          <p style={pStyle}>
            {spouseName
              ? `A recurring time you and ${spouseName} set aside for each other. Pick it together.`
              : `Invite your partner first, then come back here.`}
          </p>
          {spouseName && (
            <Link href="/rituals/couple/setup" style={primaryLink}>
              Set up your check-in →
            </Link>
          )}
        </div>
      )}
      {ritual && (
        <div style={card}>
          <h2 style={h2Style}>Your couple check-in</h2>
          <p style={pStyle}>{summarize(ritual)}</p>
          {ritual.intention && (
            <p style={{ ...pStyle, fontStyle: 'italic' }}>{ritual.intention}</p>
          )}
          <Link href="/rituals/couple/manage" style={primaryLink}>
            Manage →
          </Link>
        </div>
      )}
    </PageChrome>
  );
}

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main style={{ padding: '96px 32px 64px', maxWidth: 720, margin: '0 auto' }}>
        {children}
      </main>
    </>
  );
}

function summarize(r: { cadence: string; dayOfWeek: number; startTimeLocal: string; durationMinutes: number; status: string }): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = r.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  const prefix = r.cadence === 'weekly' ? 'Every' : r.cadence === 'biweekly' ? 'Every other' : 'Monthly on';
  const pauseSuffix = r.status === 'paused' ? ' (paused)' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 32px', color: '#3A3530', lineHeight: 1.1,
};
const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 22, fontWeight: 400,
  margin: '0 0 8px', color: '#3A3530',
};
const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#6B6254',
  margin: '0 0 16px', lineHeight: 1.55,
};
const card: React.CSSProperties = {
  padding: 28, borderRadius: 14, background: '#F7F5F0',
  border: '1px solid rgba(120,100,70,0.12)',
};
const primaryLink: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
  textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #7C9082',
  paddingBottom: 2,
};
```

- [ ] **Step 3: Manual verify**

Navigate to `/rituals`. Without a ritual, verify you see the CTA (or the no-spouse empty state). After Task 12, verify the "Manage" view replaces the CTA.

- [ ] **Step 4: Commit**

```bash
git add src/app/rituals/page.tsx src/app/rituals/ClientPage.tsx
git commit -m "feat(rituals): /rituals overview with set-up CTA and manage link"
```

---

## Task 14: /rituals/couple/manage page

**Files:**
- Create: `src/app/rituals/couple/manage/page.tsx`
- Create: `src/app/rituals/couple/manage/ClientPage.tsx`

Read-only summary, Edit (links to `/setup`), Pause/Resume, End, Re-download ICS.

- [ ] **Step 1: Server page**

```tsx
// src/app/rituals/couple/manage/page.tsx
import ClientPage from './ClientPage';
export default function Page() { return <ClientPage />; }
```

- [ ] **Step 2: Client page**

```tsx
// src/app/rituals/couple/manage/ClientPage.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/context/AuthContext';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';
import { coupleRitualToIcs } from '@/lib/rituals/icsExport';
import { downloadIcs } from '@/lib/rituals/downloadIcs';

export default function ClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { ritual, loading, pauseRitual, resumeRitual, endRitual } = useCoupleRitual();
  const { spouseName } = useSpouse();

  if (loading) return <Chrome><p>Loading…</p></Chrome>;
  if (!ritual) {
    router.replace('/rituals');
    return null;
  }

  function handleRedownload() {
    if (!ritual || !user) return;
    const ics = coupleRitualToIcs(
      ritual,
      user.name ?? 'Me',
      spouseName ?? 'your partner',
    );
    downloadIcs(ics, `relish-check-in-with-${(spouseName ?? 'partner').toLowerCase()}.ics`);
  }

  async function handleEnd() {
    if (!confirm('End this ritual? You and your partner can always set up a new one.')) return;
    await endRitual();
    router.push('/rituals');
  }

  return (
    <Chrome>
      <h1 style={h1Style}>Your check-in</h1>
      <p style={pStyle}>{summarize(ritual)}</p>
      {ritual.intention && <p style={{ ...pStyle, fontStyle: 'italic' }}>{ritual.intention}</p>}

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/rituals/couple/setup" style={linkBtn}>Change time, day, or cadence</Link>
        <button onClick={handleRedownload} style={linkBtn}>Download calendar invite</button>
        {ritual.status === 'active' ? (
          <button onClick={pauseRitual} style={linkBtn}>Pause</button>
        ) : (
          <button onClick={resumeRitual} style={linkBtn}>Resume</button>
        )}
        <button onClick={handleEnd} style={{ ...linkBtn, color: '#B06757' }}>End ritual</button>
      </div>
    </Chrome>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main style={{ padding: '96px 32px 64px', maxWidth: 560, margin: '0 auto' }}>
        {children}
      </main>
    </>
  );
}

function summarize(r: { cadence: string; dayOfWeek: number; startTimeLocal: string; durationMinutes: number; status: string }): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = r.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  const prefix = r.cadence === 'weekly' ? 'Every' : r.cadence === 'biweekly' ? 'Every other' : 'Monthly on';
  const pauseSuffix = r.status === 'paused' ? ' — paused' : '';
  return `${prefix} ${days[r.dayOfWeek]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${r.durationMinutes} minutes${pauseSuffix}.`;
}

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 36, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 16px', color: '#3A3530',
};
const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 16, color: '#3A3530',
  margin: '0 0 12px', lineHeight: 1.5,
};
const linkBtn: React.CSSProperties = {
  fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
  textDecoration: 'none', fontWeight: 500, background: 'transparent', border: 'none',
  textAlign: 'left', cursor: 'pointer', padding: '10px 0',
  borderBottom: '1px solid rgba(120,100,70,0.12)',
};
```

- [ ] **Step 3: Manual verify**

Navigate to `/rituals/couple/manage`. Verify summary, pause → resume → re-download → confirm prompt on End.

- [ ] **Step 4: Commit**

```bash
git add src/app/rituals/couple/manage/
git commit -m "feat(rituals): manage page — edit/pause/resume/end/re-download"
```

---

## Task 15: /rituals/couple/session placeholder

**Files:**
- Create: `src/app/rituals/couple/session/page.tsx`

V1 placeholder. Will be replaced by the real Surface-during-ritual render (separate plan).

- [ ] **Step 1: Implement**

```tsx
// src/app/rituals/couple/session/page.tsx
'use client';

import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';

export default function Page() {
  return (
    <>
      <Navigation />
      <main style={{
        padding: '120px 32px 64px', maxWidth: 560, margin: '0 auto',
        textAlign: 'center', fontFamily: 'var(--font-parent-body)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
          fontStyle: 'italic', margin: '0 0 16px', color: '#3A3530',
        }}>
          Your check-in has begun.
        </h1>
        <p style={{ fontSize: 16, color: '#6B6254', margin: '0 0 32px', lineHeight: 1.6 }}>
          Sit together. Talk about what’s on your minds.
          <br />
          (The shared Surface is coming soon — for now this is the signal to start.)
        </p>
        <Link href="/rituals" style={{
          fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
          textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #7C9082',
          paddingBottom: 2,
        }}>
          Back to rituals
        </Link>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/rituals/couple/session/page.tsx
git commit -m "feat(rituals): session placeholder page"
```

---

## Task 16: RitualBanner component

**Files:**
- Create: `src/components/rituals/RitualBanner.tsx`
- Test: `__tests__/components/rituals/RitualBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/rituals/RitualBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const useCoupleRitualMock = vi.fn();
const useSpouseMock = vi.fn();
const stateMock = vi.fn();

vi.mock('@/hooks/useCoupleRitual', () => ({
  useCoupleRitual: () => useCoupleRitualMock(),
}));
vi.mock('@/hooks/useSpouse', () => ({
  useSpouse: () => useSpouseMock(),
}));
vi.mock('@/lib/rituals/isInWindow', () => ({
  ritualBannerState: (...args: unknown[]) => stateMock(...args),
}));

import RitualBanner from '@/components/rituals/RitualBanner';

describe('RitualBanner', () => {
  it('renders nothing when state is hidden', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('hidden');
    const { container } = render(<RitualBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pre-window message with spouse name', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('preWindow');
    render(<RitualBanner />);
    expect(screen.getByText(/Iris/)).toBeInTheDocument();
    expect(screen.getByText(/tonight/i)).toBeInTheDocument();
  });

  it('renders in-window start CTA', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('inWindow');
    render(<RitualBanner />);
    expect(screen.getByText(/start together/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/components/rituals/RitualBanner.test.tsx`
Expected: 3 fail with module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/rituals/RitualBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';
import { ritualBannerState } from '@/lib/rituals/isInWindow';

export default function RitualBanner() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName } = useSpouse();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading || !ritual) return null;
  const state = ritualBannerState(ritual, now);
  if (state === 'hidden') return null;

  const partner = spouseName ?? 'your partner';
  const timeLabel = formatTime(ritual.startTimeLocal);

  if (state === 'preWindow') {
    return (
      <div style={preStyle}>
        Your check-in with {partner} is tonight at {timeLabel}.
      </div>
    );
  }
  return (
    <Link href="/rituals/couple/session" style={inStyle}>
      Your check-in with {partner} is starting. Start together →
    </Link>
  );
}

function formatTime(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const preStyle: React.CSSProperties = {
  position: 'fixed', top: 64, left: 0, right: 0, zIndex: 40,
  background: '#F3F1EC', borderBottom: '1px solid rgba(120,100,70,0.12)',
  padding: '10px 20px', textAlign: 'center',
  fontFamily: 'var(--font-parent-body)', fontSize: 14, color: '#5C5347',
};
const inStyle: React.CSSProperties = {
  ...preStyle,
  background: '#7C9082',
  color: 'white',
  textDecoration: 'none',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'block',
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/rituals/RitualBanner.test.tsx`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/rituals/RitualBanner.tsx __tests__/components/rituals/RitualBanner.test.tsx
git commit -m "feat(rituals): in-app RitualBanner with pre-window and in-window states"
```

---

## Task 17: Mount banner globally + add nav entry

**Files:**
- Modify: `src/app/layout.tsx` (add `<RitualBanner />` inside `AuthProvider`)
- Modify: `src/components/layout/Navigation.tsx` (add a "Rituals" link)

- [ ] **Step 1: Update the root layout**

Open `src/app/layout.tsx`. Add an import:

```tsx
import RitualBanner from '@/components/rituals/RitualBanner';
```

Replace the `AuthProvider` children block so the body reads:

```tsx
<AuthProvider>
  <WalkthroughProvider>
    <RitualBanner />
    {children}
    <PageFooter />
    <WalkthroughOverlay />
    <WalkthroughTrigger />
  </WalkthroughProvider>
</AuthProvider>
```

- [ ] **Step 2: Add nav link**

Open `src/components/layout/Navigation.tsx`. The existing nav shows a single contextual cross-link. Add a "Rituals" link next to it so both are visible when not on a Manual or Rituals page. Replace the IIFE contextual block (lines 76-103) with:

```tsx
{(() => {
  const onManual =
    pathname.startsWith('/manual') ||
    pathname.startsWith('/family-manual') ||
    /^\/people\/[^/]+\/manual/.test(pathname);
  const onRituals = pathname.startsWith('/rituals');
  const primary = onManual
    ? { href: '/journal', label: 'The Journal', arrow: '←' }
    : { href: '/manual', label: 'The Family Manual', arrow: '→' };
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Link
        href={primary.href}
        className="hover:opacity-70 transition-opacity"
        style={{
          fontFamily: 'var(--font-parent-display)', fontStyle: 'italic',
          fontWeight: 400, fontSize: 16, color: '#3A3530',
          textDecoration: 'none', letterSpacing: '0.005em',
        }}
      >
        {onManual && <span style={{ marginRight: 8 }}>{primary.arrow}</span>}
        {primary.label}
        {!onManual && <span style={{ marginLeft: 8 }}>{primary.arrow}</span>}
      </Link>
      {!onRituals && (
        <Link
          href="/rituals"
          className="hover:opacity-70 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-body)', fontSize: 13, fontWeight: 500,
            color: '#5C5347', letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Rituals
        </Link>
      )}
    </div>
  );
})()}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Open `/journal` as a signed-in user. Confirm:
- Nav shows "The Family Manual" and "Rituals".
- If you have an active ritual and it's within the window (or near it), the banner appears at the top.
- Navigating to `/rituals` works; the nav hides the duplicated "Rituals" link.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/layout/Navigation.tsx
git commit -m "feat(rituals): mount RitualBanner globally + add Rituals nav link"
```

---

## Task 18: Deploy rules

**Files:**
- No file changes — this is an operational step.

- [ ] **Step 1: Deploy rules**

Run: `firebase deploy --only firestore:rules`
Expected: rules deploy succeeds.

- [ ] **Step 2: Smoke test end-to-end**

With the dev server running and signed in as Scott:
1. Navigate `/rituals` → click "Set up your check-in".
2. Step through cadence/day/time/duration, confirm.
3. Verify Firestore has the new `couple_rituals` doc.
4. Verify an ICS downloaded.
5. Open `/rituals/couple/manage` → pause → confirm the banner no longer shows even during window.
6. Resume → end → confirm doc moves to `status: 'ended'` and you're redirected to `/rituals`.

- [ ] **Step 3: Commit (no code changes, but record the cutover)**

If no file changes, skip the commit. Otherwise:

```bash
git status
# If there are unstaged changes from smoke testing, review and commit/discard as appropriate.
```

---

## Self-review

**Spec coverage:**
- Shared-device setup flow → Task 12 ✓
- `CoupleRitual` data model → Task 1 ✓
- Spouse detection helper → Task 6 + Task 7 ✓
- `/rituals`, `/rituals/couple/{setup,manage,session}` routes → Tasks 12–15 ✓
- ICS calendar-invite delivery → Task 4 + Task 12/14 ✓
- In-app cue (RitualBanner) → Task 16 + Task 17 ✓
- Re-scheduling / pause / end → Task 14 ✓
- Security rules → Task 9 ✓
- Composite index → Task 10 ✓
- Navigation entry → Task 17 ✓
- No-spouse empty state → Task 12 (inline) + Task 13 ✓
- Missed-ritual rollover → inherent in banner state logic (Task 3) ✓ no explicit code needed

**Out-of-scope items confirmed excluded:** push notifications, occurrence history, surface-during-ritual composition, kid rituals, household rituals, intensity slider, cross-device setup. ✓

**Placeholder scan:** no "TBD", "implement later", "similar to Task N" references. Every step contains complete code.

**Type consistency spot-check:**
- `buildCreatePayload` in Task 8 uses field names matching `CoupleRitual` in Task 1 (`familyId`, `participantUserIds`, `cadence`, `dayOfWeek`, `startTimeLocal`, `durationMinutes`, `timezone`, `status`, `startsOn`, `createdAt`, `createdByUserId`, `updatedAt`, `updatedByUserId`, `intention`). ✓
- `ritualBannerState` in Task 3 returns union `'hidden' | 'preWindow' | 'inWindow'` matching what `RitualBanner` tests assert in Task 16. ✓
- `coupleRitualToIcs` signature `(ritual, selfName, spouseName)` matches call sites in Task 12 and Task 14. ✓

**Test scaffolding note:** This plan creates the first `__tests__/lib/rituals/` directory and the first `__tests__/components/rituals/` directory. Vitest and `@testing-library/react` are already installed. No config changes required.
