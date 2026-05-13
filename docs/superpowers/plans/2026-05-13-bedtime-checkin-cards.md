# Bedtime Check-in Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the kid check-in's 12-emoji opener at `/check-in/[personId]` with a card-led, parent-first bedtime ritual that captures both perspectives in one journal entry.

**Architecture:** Two cards alternate per kid (Parent Reflection + High/Low/Buffalo). Pure rotation/composer logic lives in `src/lib/check-in/` and is unit-tested. Types extend the existing `JournalCheckIn`. Persistence wires through the existing `useJournal.createEntry`. The page UI is rewritten to put the card first and demote the emoji/body/about-someone chips to optional sprinkles. Bedtime tone uses the existing `T` design tokens.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Firestore (collection: `journal_entries`), Vitest for unit tests. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-13-bedtime-checkin-cards-design.md`](../specs/2026-05-13-bedtime-checkin-cards-design.md)

---

## Task 0: Set up feature branch

**Files:** none (git only)

- [ ] **Step 1: Create the feature branch from main**

```bash
git checkout -b feature/bedtime-checkin-cards
```

- [ ] **Step 2: Verify branch + clean working tree**

```bash
git status
git rev-parse --abbrev-ref HEAD
```

Expected: clean working tree (or only the pre-existing `M firestore-debug.log` and untracked `functions/find-conflict-entries.js`), HEAD on `feature/bedtime-checkin-cards`.

---

## Task 1: Extend `CheckInKind` and `JournalCheckIn` types

Add the new `'child-bedtime'` kind plus structured `card`, `parentTurn`, `kidTurn` fields. The existing kid check-in (`kind === 'child'`) continues to work unchanged — no migration.

**Files:**
- Modify: `src/types/journal.ts` (lines 15, 28-42)

- [ ] **Step 1: Extend `CheckInKind` to include `'child-bedtime'`**

In `src/types/journal.ts`, change line 15:

```ts
export type CheckInKind = 'self' | 'self+rel' | 'child' | 'child-bedtime';
```

- [ ] **Step 2: Add card kind and turn types above `JournalCheckIn`**

Insert before `export interface JournalCheckIn` (around line 28):

```ts
/** Which prompt card the bedtime check-in is running. */
export type BedtimeCardKind = 'parent-reflection' | 'high-low-buffalo';

/** The leading parent's structured input for a bedtime check-in.
 *  `observation` is set for `parent-reflection`; `high`/`low`/`buffalo`
 *  are set for `high-low-buffalo`. `voiceText` is the raw mic
 *  transcript when the parent used the mic. */
export interface BedtimeParentTurn {
  userId: string;
  observation?: string;
  high?: string;
  low?: string;
  buffalo?: string;
  voiceText?: string;
}

/** The kid's structured response for a bedtime check-in. Mirrors the
 *  parent's shape across the two cards. May be entirely empty when the
 *  kid didn't respond — parent's observation alone is still a valid
 *  save. */
export interface BedtimeKidTurn {
  response?: string;
  high?: string;
  low?: string;
  buffalo?: string;
  voiceText?: string;
}
```

- [ ] **Step 3: Extend `JournalCheckIn` with the new optional fields**

Replace the `JournalCheckIn` interface (currently lines 28-42) with:

```ts
export interface JournalCheckIn {
  kind: CheckInKind;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  selfFeelings: string[];
  /** Per-target relationship feelings — preferred over the legacy
   *  flat fields below when a session has multiple targets. */
  relTargets?: JournalCheckInRelTarget[];
  /** Legacy flat fields. Set for single-target sessions to keep older
   *  consumers working; null when relTargets is the canonical source. */
  relFeelings?: string[];
  withPersonIds?: string[];
  withGroupKey?: 'kids' | 'family' | null;
  /** Body-map spots the author tapped (kid mode only). */
  bodySpots?: string[];
  /** Bedtime-card fields. Set only when `kind === 'child-bedtime'`. */
  card?: BedtimeCardKind;
  parentTurn?: BedtimeParentTurn;
  kidTurn?: BedtimeKidTurn;
}
```

- [ ] **Step 4: Type-check the project compiles**

Run: `npx tsc --noEmit`
Expected: exits with code 0 (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/types/journal.ts
git commit -m "types(journal): add bedtime-card check-in shape

Extends CheckInKind with 'child-bedtime' and adds optional card,
parentTurn, kidTurn fields on JournalCheckIn. Existing 'child' check-ins
continue to work unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Card rotation library + tests (TDD)

Pure function `pickCard(lastCard, override?)` decides which card runs tonight. Tested in isolation; no Firestore dependency.

**Files:**
- Create: `src/lib/check-in/pickCard.ts`
- Test: `__tests__/lib/check-in/pickCard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/check-in/pickCard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickCard } from '@/lib/check-in/pickCard';

describe('pickCard', () => {
  it('defaults to parent-reflection when no previous card', () => {
    expect(pickCard(null)).toBe('parent-reflection');
  });

  it('returns high-low-buffalo when last card was parent-reflection', () => {
    expect(pickCard('parent-reflection')).toBe('high-low-buffalo');
  });

  it('returns parent-reflection when last card was high-low-buffalo', () => {
    expect(pickCard('high-low-buffalo')).toBe('parent-reflection');
  });

  it('honors an explicit override even when last card exists', () => {
    expect(pickCard('parent-reflection', 'parent-reflection')).toBe(
      'parent-reflection',
    );
    expect(pickCard('high-low-buffalo', 'parent-reflection')).toBe(
      'parent-reflection',
    );
  });

  it('honors an override on first-ever check-in', () => {
    expect(pickCard(null, 'high-low-buffalo')).toBe('high-low-buffalo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/check-in/pickCard.test.ts`
Expected: FAIL with "Cannot find module '@/lib/check-in/pickCard'"

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/check-in/pickCard.ts`:

```ts
import type { BedtimeCardKind } from '@/types/journal';

/** Pick the card for tonight's bedtime check-in. Strictly alternates
 *  based on the last card this kid ran. First-ever check-in defaults
 *  to Parent Reflection. An explicit override always wins. */
export function pickCard(
  lastCard: BedtimeCardKind | null,
  override?: BedtimeCardKind,
): BedtimeCardKind {
  if (override) return override;
  if (!lastCard) return 'parent-reflection';
  return lastCard === 'parent-reflection'
    ? 'high-low-buffalo'
    : 'parent-reflection';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/check-in/pickCard.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/check-in/pickCard.ts __tests__/lib/check-in/pickCard.test.ts
git commit -m "feat(check-in): pickCard rotation helper

Pure function that alternates parent-reflection / high-low-buffalo per
kid, defaults to parent-reflection on first run, honors override.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Card definitions (copy + placeholders)

Centralize the card titles, subtitles, and placeholder strings so the page renders from data, not hardcoded JSX.

**Files:**
- Create: `src/lib/check-in/cards.ts`

- [ ] **Step 1: Write the card definitions module**

Create `src/lib/check-in/cards.ts`:

```ts
import type { BedtimeCardKind } from '@/types/journal';

export interface CardDefinition {
  kind: BedtimeCardKind;
  label: string;
  title: string;
  subtitle: string;
  parent: {
    /** For parent-reflection: one input slot. For h/l/b: three slots. */
    slots: Array<{ key: 'observation' | 'high' | 'low' | 'buffalo'; placeholder: string }>;
  };
  kid: {
    slots: Array<{ key: 'response' | 'high' | 'low' | 'buffalo'; placeholder: string; modeledFromParentKey?: 'observation' | 'high' | 'low' | 'buffalo' }>;
  };
}

export const PARENT_REFLECTION_CARD: CardDefinition = {
  kind: 'parent-reflection',
  label: "Tonight's card",
  title: 'Something I noticed about you today.',
  subtitle:
    'Parent goes first. Pick one specific moment — quiet at dinner, the laugh on the swing, the way they hugged the dog.',
  parent: {
    slots: [
      {
        key: 'observation',
        placeholder: 'One thing I noticed about {kid} today…',
      },
    ],
  },
  kid: {
    slots: [
      {
        key: 'response',
        placeholder: 'What about it?',
        modeledFromParentKey: 'observation',
      },
    ],
  },
};

export const HIGH_LOW_BUFFALO_CARD: CardDefinition = {
  kind: 'high-low-buffalo',
  label: "Tonight's card",
  title: 'High, Low, and Buffalo.',
  subtitle:
    'Best part, hardest part, weirdest random part. Parent goes first.',
  parent: {
    slots: [
      { key: 'high', placeholder: 'The best part of today was…' },
      { key: 'low', placeholder: 'The hardest part was…' },
      { key: 'buffalo', placeholder: 'Something weird or random…' },
    ],
  },
  kid: {
    slots: [
      { key: 'high', placeholder: 'Your best part…', modeledFromParentKey: 'high' },
      { key: 'low', placeholder: 'Your hardest part…', modeledFromParentKey: 'low' },
      { key: 'buffalo', placeholder: 'Your weird/random thing…', modeledFromParentKey: 'buffalo' },
    ],
  },
};

export const CARD_BY_KIND: Record<BedtimeCardKind, CardDefinition> = {
  'parent-reflection': PARENT_REFLECTION_CARD,
  'high-low-buffalo': HIGH_LOW_BUFFALO_CARD,
};

/** Replace `{kid}` token in placeholder strings with the kid's first name. */
export function renderPlaceholder(template: string, kidFirstName: string): string {
  return template.replace(/\{kid\}/g, kidFirstName);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/check-in/cards.ts
git commit -m "feat(check-in): card definitions for parent-reflection + h/l/b

Centralizes labels, titles, subtitles, and placeholders so the page
renders from data. Includes a {kid} token for placeholder
personalization.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Entry-body composer + tests (TDD)

Pure function `composeBedtimeBody({ kidName, parentName, card, parentTurn, kidTurn })` → readable string for the journal feed. One body string per card. Handles empty kidTurn.

**Files:**
- Create: `src/lib/check-in/composeBedtimeBody.ts`
- Test: `__tests__/lib/check-in/composeBedtimeBody.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/check-in/composeBedtimeBody.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { composeBedtimeBody } from '@/lib/check-in/composeBedtimeBody';

describe('composeBedtimeBody', () => {
  describe('parent-reflection card', () => {
    it('composes both turns with quoted observation', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: {
          userId: 'u1',
          observation: 'You got really quiet after soccer today.',
        },
        kidTurn: {
          response:
            "I was sad because Coach yelled at Mateo and I didn't say anything.",
        },
      });
      expect(body).toContain('[Parent Reflection]');
      expect(body).toContain(
        'Mama: "You got really quiet after soccer today."',
      );
      expect(body).toContain(
        'Liam: "I was sad because Coach yelled at Mateo and I didn\'t say anything."',
      );
    });

    it('omits the kid line when kidTurn is empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: { userId: 'u1', observation: 'You hugged the dog twice.' },
        kidTurn: {},
      });
      expect(body).toContain('Mama: "You hugged the dog twice."');
      expect(body).not.toContain('Liam:');
    });

    it('omits the parent line when parentTurn has no observation', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: { userId: 'u1' },
        kidTurn: { response: 'I had a good day.' },
      });
      expect(body).not.toContain('Mama:');
      expect(body).toContain('Liam: "I had a good day."');
    });
  });

  describe('high-low-buffalo card', () => {
    it('composes all six lines when both parent and kid have full answers', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: {
          userId: 'u1',
          high: 'walking the dog at sunset',
          low: 'the email from work',
          buffalo: 'a hawk landed on our deck',
        },
        kidTurn: {
          high: 'gym class',
          low: 'spelling test',
          buffalo: 'my pencil broke in half by itself',
        },
      });
      expect(body).toContain('[High / Low / Buffalo]');
      expect(body).toContain('Papa — High: walking the dog at sunset.');
      expect(body).toContain('Low: the email from work.');
      expect(body).toContain('Buffalo: a hawk landed on our deck.');
      expect(body).toContain('Liam — High: gym class.');
      expect(body).toContain('Low: spelling test.');
      expect(body).toContain('Buffalo: my pencil broke in half by itself.');
    });

    it('omits empty slots gracefully', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: { userId: 'u1', high: 'walking the dog' },
        kidTurn: { buffalo: 'a weird thing' },
      });
      expect(body).toContain('Papa — High: walking the dog.');
      expect(body).not.toContain('Papa — Low');
      expect(body).not.toContain('Papa — Buffalo');
      expect(body).toContain('Liam — Buffalo: a weird thing.');
      expect(body).not.toContain('Liam — High');
    });

    it('returns a sensible fallback when both turns are completely empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: { userId: 'u1' },
        kidTurn: {},
      });
      expect(body).toContain('[High / Low / Buffalo]');
      expect(body).toContain('Liam did a bedtime check-in.');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/check-in/composeBedtimeBody.test.ts`
Expected: FAIL with "Cannot find module '@/lib/check-in/composeBedtimeBody'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/check-in/composeBedtimeBody.ts`:

```ts
import type {
  BedtimeCardKind,
  BedtimeParentTurn,
  BedtimeKidTurn,
} from '@/types/journal';

interface ComposeInput {
  kidName: string;
  parentName: string;
  card: BedtimeCardKind;
  parentTurn: BedtimeParentTurn;
  kidTurn: BedtimeKidTurn;
}

/** Compose the human-readable body for a bedtime check-in entry. The
 *  body lives on the entry's `text` field and shows up in the journal
 *  feed. Empty turns are skipped; a fallback line is used when neither
 *  side said anything. */
export function composeBedtimeBody(input: ComposeInput): string {
  if (input.card === 'parent-reflection') {
    return composeParentReflection(input);
  }
  return composeHighLowBuffalo(input);
}

function composeParentReflection(input: ComposeInput): string {
  const { kidName, parentName, parentTurn, kidTurn } = input;
  const lines: string[] = ['[Parent Reflection]'];
  if (parentTurn.observation && parentTurn.observation.trim()) {
    lines.push(`${parentName}: "${parentTurn.observation.trim()}"`);
  }
  if (kidTurn.response && kidTurn.response.trim()) {
    lines.push(`${kidName}: "${kidTurn.response.trim()}"`);
  }
  if (lines.length === 1) {
    lines.push(`${kidName} did a bedtime check-in.`);
  }
  return lines.join('\n');
}

function composeHighLowBuffalo(input: ComposeInput): string {
  const { kidName, parentName, parentTurn, kidTurn } = input;
  const lines: string[] = ['[High / Low / Buffalo]'];

  const parentLine = composeHlbLine(parentName, parentTurn);
  if (parentLine) lines.push(parentLine);

  const kidLine = composeHlbLine(kidName, kidTurn);
  if (kidLine) lines.push(kidLine);

  if (lines.length === 1) {
    lines.push(`${kidName} did a bedtime check-in.`);
  }
  return lines.join('\n');
}

function composeHlbLine(
  name: string,
  turn: BedtimeParentTurn | BedtimeKidTurn,
): string | null {
  const parts: string[] = [];
  if (turn.high && turn.high.trim()) parts.push(`High: ${turn.high.trim()}.`);
  if (turn.low && turn.low.trim()) parts.push(`Low: ${turn.low.trim()}.`);
  if (turn.buffalo && turn.buffalo.trim())
    parts.push(`Buffalo: ${turn.buffalo.trim()}.`);
  if (parts.length === 0) return null;
  return `${name} — ${parts.join(' ')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/check-in/composeBedtimeBody.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/check-in/composeBedtimeBody.ts __tests__/lib/check-in/composeBedtimeBody.test.ts
git commit -m "feat(check-in): composeBedtimeBody for both card kinds

Builds the human-readable text body for a bedtime check-in entry from
the structured parent + kid turns. Handles empty turns and provides a
fallback line when neither side said anything.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Firestore query helper for most-recent card

Fetch the last `child-bedtime` entry for a kid so the page can compute the next card. Returns `null` when there is no history.

**Files:**
- Create: `src/lib/check-in/getLastBedtimeCard.ts`

- [ ] **Step 1: Write the implementation**

Create `src/lib/check-in/getLastBedtimeCard.ts`:

```ts
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { BedtimeCardKind, JournalCheckIn } from '@/types/journal';

/** Fetch the most recent bedtime check-in card for this kid, or null
 *  if there are none. Queries by `subjectPersonId` and `familyId`,
 *  pulls the last 25 entries for this kid, and filters client-side
 *  for `checkIn.kind === 'child-bedtime'`. This avoids a new
 *  composite index. */
export async function getLastBedtimeCard(
  familyId: string,
  kidPersonId: string,
): Promise<BedtimeCardKind | null> {
  const q = query(
    collection(firestore, 'journal_entries'),
    where('familyId', '==', familyId),
    where('subjectPersonId', '==', kidPersonId),
    orderBy('createdAt', 'desc'),
    limit(25),
  );
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as { checkIn?: JournalCheckIn };
    const ci = data.checkIn;
    if (ci && ci.kind === 'child-bedtime' && ci.card) {
      return ci.card;
    }
  }
  return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/check-in/getLastBedtimeCard.ts
git commit -m "feat(check-in): getLastBedtimeCard query helper

Fetches the most recent bedtime check-in card for a kid, used by the
page to compute the next card via pickCard. Filters client-side to
avoid a new composite index.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire the new check-in fields into `useJournal.createEntry`

Extend the existing serializer so `card`, `parentTurn`, and `kidTurn` are written to Firestore when set, with undefined-stripping per the existing pattern.

**Files:**
- Modify: `src/hooks/useJournal.ts` (lines 136-168 — the `if (input.checkIn)` block)

- [ ] **Step 1: Replace the `if (input.checkIn)` block**

In `src/hooks/useJournal.ts`, replace the existing block (currently lines 136-168) with:

```ts
      // Structured check-in — only written when present. Strip any
      // undefined values so Firestore doesn't reject the doc.
      if (input.checkIn) {
        const ci: Record<string, unknown> = {
          kind: input.checkIn.kind,
          timeOfDay: input.checkIn.timeOfDay,
          selfFeelings: input.checkIn.selfFeelings ?? [],
        };
        if (input.checkIn.relTargets && input.checkIn.relTargets.length > 0) {
          // Strip empty per-target voice fields so Firestore is clean.
          ci.relTargets = input.checkIn.relTargets.map((t) => {
            const out: Record<string, unknown> = {
              personId: t.personId,
              feelings: t.feelings,
            };
            if (t.voice && t.voice.trim().length > 0) {
              out.voice = t.voice.trim();
            }
            return out;
          });
        }
        if (input.checkIn.relFeelings && input.checkIn.relFeelings.length > 0) {
          ci.relFeelings = input.checkIn.relFeelings;
        }
        if (input.checkIn.withPersonIds && input.checkIn.withPersonIds.length > 0) {
          ci.withPersonIds = input.checkIn.withPersonIds;
        }
        if (input.checkIn.withGroupKey) {
          ci.withGroupKey = input.checkIn.withGroupKey;
        }
        if (input.checkIn.bodySpots && input.checkIn.bodySpots.length > 0) {
          ci.bodySpots = input.checkIn.bodySpots;
        }
        if (input.checkIn.card) {
          ci.card = input.checkIn.card;
        }
        if (input.checkIn.parentTurn) {
          const pt: Record<string, unknown> = { userId: input.checkIn.parentTurn.userId };
          if (input.checkIn.parentTurn.observation?.trim()) pt.observation = input.checkIn.parentTurn.observation.trim();
          if (input.checkIn.parentTurn.high?.trim()) pt.high = input.checkIn.parentTurn.high.trim();
          if (input.checkIn.parentTurn.low?.trim()) pt.low = input.checkIn.parentTurn.low.trim();
          if (input.checkIn.parentTurn.buffalo?.trim()) pt.buffalo = input.checkIn.parentTurn.buffalo.trim();
          if (input.checkIn.parentTurn.voiceText?.trim()) pt.voiceText = input.checkIn.parentTurn.voiceText.trim();
          ci.parentTurn = pt;
        }
        if (input.checkIn.kidTurn) {
          const kt: Record<string, unknown> = {};
          if (input.checkIn.kidTurn.response?.trim()) kt.response = input.checkIn.kidTurn.response.trim();
          if (input.checkIn.kidTurn.high?.trim()) kt.high = input.checkIn.kidTurn.high.trim();
          if (input.checkIn.kidTurn.low?.trim()) kt.low = input.checkIn.kidTurn.low.trim();
          if (input.checkIn.kidTurn.buffalo?.trim()) kt.buffalo = input.checkIn.kidTurn.buffalo.trim();
          if (input.checkIn.kidTurn.voiceText?.trim()) kt.voiceText = input.checkIn.kidTurn.voiceText.trim();
          ci.kidTurn = kt;
        }
        docData.checkIn = ci;
      }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0.

- [ ] **Step 3: Run the existing test suite to confirm nothing regressed**

Run: `npx vitest run __tests__/`
Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useJournal.ts
git commit -m "feat(check-in): serialize bedtime card + parentTurn + kidTurn

Extends useJournal.createEntry so card, parentTurn, and kidTurn fields
on JournalCheckIn are written to Firestore. Empty/whitespace values
are stripped to keep documents clean.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Rewrite the check-in page — masthead + card + Parent Reflection turns

Replace the top half of `src/app/check-in/[personId]/page.tsx`. Keep the existing share picker, sibling-next-up picker, optional emoji/body/about-someone chips, and `kid-mode:done` sessionStorage logic. This task gets Parent Reflection working end-to-end; Task 8 adds H/L/B; Task 9 adds the optional sprinkles back as chips.

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx` (substantial rewrite — see steps)

- [ ] **Step 1: Add new imports + remove unused at top of file**

In `src/app/check-in/[personId]/page.tsx`, replace the imports block (lines 14-26) with:

```ts
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { MicButton } from '@/components/voice/MicButton';
import { T } from '@/components/journal-first/tokens';
import { firestore } from '@/lib/firebase';
import type { CoupleRitual } from '@/types/couple-ritual';
import type { Person } from '@/types/person-manual';
import type {
  BedtimeCardKind,
  BedtimeParentTurn,
  BedtimeKidTurn,
} from '@/types/journal';
import { pickCard } from '@/lib/check-in/pickCard';
import { getLastBedtimeCard } from '@/lib/check-in/getLastBedtimeCard';
import { composeBedtimeBody } from '@/lib/check-in/composeBedtimeBody';
import { CARD_BY_KIND, renderPlaceholder } from '@/lib/check-in/cards';
```

- [ ] **Step 2: Replace the `sx` style object with the bedtime-tone version**

Replace the entire `const sx = { ... };` block (currently lines 98-389) with the focused bedtime style set:

```ts
const sx = {
  app: {
    minHeight: '100vh',
    background: T.creamWarm,
    color: T.ink,
    fontFamily: T.serif,
    paddingBottom: 80,
  } as CSSProperties,
  exitBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    borderBottom: '1px solid rgba(120, 100, 70, 0.10)',
    background: T.cream,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  } as CSSProperties,
  exitButton: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: T.text5,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  } as CSSProperties,
  masthead: {
    textAlign: 'center' as const,
    padding: '26px 28px 14px',
    maxWidth: 720,
    margin: '0 auto',
  } as CSSProperties,
  mastheadLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  mastheadKid: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 30,
    color: T.ink,
    marginTop: 6,
    lineHeight: 1.05,
  } as CSSProperties,
  fleuron: {
    fontSize: 16,
    color: T.ruleStrong,
    marginTop: 6,
  } as CSSProperties,
  card: {
    maxWidth: 720,
    margin: '8px auto 18px',
    padding: '28px 26px 24px',
    background: T.paper,
    border: `1px solid ${T.rule}`,
    borderRadius: 14,
  } as CSSProperties,
  cardLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as CSSProperties,
  cardLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  changeCardLink: {
    background: 'transparent',
    border: 'none',
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.18em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '2px 0',
  } as CSSProperties,
  cardTitle: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 28,
    lineHeight: 1.15,
    color: T.ink,
    margin: '10px 0 8px',
  } as CSSProperties,
  cardSubtitle: {
    fontFamily: T.serif,
    fontSize: 14,
    color: T.text4,
    lineHeight: 1.5,
    margin: 0,
  } as CSSProperties,
  turnSection: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '0 24px',
  } as CSSProperties,
  turnLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  } as CSSProperties,
  voiceRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  } as CSSProperties,
  textarea: {
    flex: 1,
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 1.4,
    color: T.ink,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    borderRadius: 8,
    padding: '12px 14px',
    resize: 'none',
    outline: 'none',
    minHeight: 76,
  } as CSSProperties,
  passRow: {
    textAlign: 'center' as const,
    marginTop: 12,
  } as CSSProperties,
  passButton: {
    display: 'inline-block',
    padding: '11px 22px',
    borderRadius: 999,
    background: 'transparent',
    border: `1.5px solid ${T.ruleStrong}`,
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: T.text3,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as CSSProperties,
  divider: {
    height: 1,
    background: T.ruleSoft,
    margin: '20px 24px',
    maxWidth: 720,
    marginLeft: 'auto',
    marginRight: 'auto',
  } as CSSProperties,
  parentQuote: {
    padding: '14px 16px',
    background: 'rgba(120, 100, 70, 0.06)',
    borderLeft: `2px solid ${T.ruleStrong}`,
    borderRadius: 4,
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontSize: 16,
    color: T.text3,
    marginBottom: 12,
  } as CSSProperties,
  doneRow: {
    textAlign: 'center' as const,
    padding: '8px 24px 32px',
  } as CSSProperties,
  done: {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: 999,
    background: T.ink,
    color: T.paper,
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    border: `1px solid ${T.ink}`,
    cursor: 'pointer',
  } as CSSProperties,
  ritualChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(120, 100, 70, 0.08)',
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: T.text3,
    marginTop: 8,
  } as CSSProperties,
};
```

- [ ] **Step 3: Replace the component's body — state + handleDone + render**

Replace everything from `export default function KidModePage() {` to the closing `}` at the end of the file with the new card-led implementation. The full replacement is below — paste it verbatim:

```tsx
export default function KidModePage() {
  const params = useParams<{ personId: string }>();
  const personId = params?.personId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const ritualId = searchParams?.get('ritualId') ?? null;
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry, saving } = useJournal();

  const kid = useMemo(
    () => people.find((p) => p.personId === personId),
    [people, personId],
  );

  // Ritual chip (when launched from a scheduled couple_ritual).
  const [ritualDoc, setRitualDoc] = useState<CoupleRitual | null>(null);
  useEffect(() => {
    if (!ritualId) {
      setRitualDoc(null);
      return;
    }
    const unsub = onSnapshot(doc(firestore, 'couple_rituals', ritualId), (snap) => {
      if (snap.exists()) setRitualDoc({ ...(snap.data() as CoupleRitual), id: snap.id });
    });
    return () => unsub();
  }, [ritualId]);

  // Card rotation. Fetch the kid's most recent bedtime card once and
  // compute today's card. Override is applied on top.
  const [cardOverride, setCardOverride] = useState<BedtimeCardKind | null>(null);
  const [lastCard, setLastCard] = useState<BedtimeCardKind | null>(null);
  const [lastCardLoaded, setLastCardLoaded] = useState(false);
  useEffect(() => {
    if (!user?.familyId || !kid) return;
    let cancelled = false;
    getLastBedtimeCard(user.familyId, kid.personId)
      .then((c) => {
        if (cancelled) return;
        setLastCard(c);
        setLastCardLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLastCardLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.familyId, kid]);
  const card: BedtimeCardKind = useMemo(
    () => pickCard(lastCard, cardOverride ?? undefined),
    [lastCard, cardOverride],
  );
  const cardDef = CARD_BY_KIND[card];

  // Parent + kid turn state.
  const [parentTurn, setParentTurn] = useState<BedtimeParentTurn>({
    userId: user?.userId ?? '',
  });
  useEffect(() => {
    if (user?.userId && !parentTurn.userId) {
      setParentTurn((prev) => ({ ...prev, userId: user.userId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);
  const [kidTurn, setKidTurn] = useState<BedtimeKidTurn>({});
  const [phase, setPhase] = useState<'parent' | 'kid' | 'saved'>('parent');

  // Dynamic parent name from the auth user, falling back to "Parent".
  const parentFirstName = useMemo(() => {
    const dn = user?.displayName?.trim();
    if (dn) return dn.split(' ')[0];
    return 'Parent';
  }, [user?.displayName]);

  // Sibling next-up picker uses the existing sessionStorage marker.
  const [doneIds, setDoneIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('kid-mode:done');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setDoneIds(Array.isArray(ids) ? ids : []);
    } catch {
      setDoneIds([]);
    }
  }, [phase]);
  const otherKids = useMemo(() => {
    if (!kid) return [] as Array<{ personId: string; name: string; done: boolean }>;
    return people
      .filter((p) => p.relationshipType === 'child' && p.personId !== kid.personId)
      .map((p) => ({
        personId: p.personId,
        name: p.name,
        done: doneIds.includes(p.personId),
      }));
  }, [people, kid, doneIds]);
  const remainingKids = useMemo(
    () => otherKids.filter((k) => !k.done),
    [otherKids],
  );

  // Share picker — adults in the household who'll see this entry.
  const adults = useMemo(() => {
    return people
      .filter(
        (p) =>
          p.linkedUserId &&
          p.relationshipType !== 'child' &&
          p.personId !== kid?.personId,
      )
      .map((p) => ({
        personId: p.personId,
        userId: p.linkedUserId!,
        name: p.name,
        avatarUrl: (p as Person & { avatarUrl?: string }).avatarUrl,
      }));
  }, [people, kid?.personId]);
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  useEffect(() => {
    if (sharedWithUserIds.length === 0 && adults.length > 0) {
      setSharedWithUserIds(adults.map((a) => a.userId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults]);

  if (!kid || !lastCardLoaded) {
    return (
      <main style={sx.app}>
        <p
          style={{
            fontFamily: T.serif,
            fontStyle: 'italic',
            fontSize: 19,
            color: T.text4,
            textAlign: 'center',
            paddingTop: 120,
          }}
        >
          Opening…
        </p>
      </main>
    );
  }

  const kidFirstName = kid.name.split(' ')[0];

  // Change-card handler with confirmation.
  const handleChangeCard = () => {
    const other: BedtimeCardKind =
      card === 'parent-reflection' ? 'high-low-buffalo' : 'parent-reflection';
    const hasContent =
      Object.values(parentTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      ) ||
      Object.values(kidTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      );
    if (hasContent) {
      const ok = window.confirm(
        `Switch to ${
          other === 'parent-reflection'
            ? 'Parent Reflection'
            : 'High / Low / Buffalo'
        }? You'll start over.`,
      );
      if (!ok) return;
      setParentTurn({ userId: user?.userId ?? '' });
      setKidTurn({});
    }
    setCardOverride(other);
    setPhase('parent');
  };

  // Pass-to-kid with soft confirm when parent turn is empty.
  const handlePass = () => {
    const parentHasAny = Object.values(parentTurn).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    if (!parentHasAny) {
      const ok = window.confirm(
        `${parentFirstName} hasn't said anything yet — pass to ${kidFirstName}?`,
      );
      if (!ok) return;
    }
    setPhase('kid');
  };

  const handleDone = async () => {
    if (saving || !user?.familyId || !user?.userId) return;
    try {
      const body = composeBedtimeBody({
        kidName: kidFirstName,
        parentName: parentFirstName,
        card,
        parentTurn,
        kidTurn,
      });
      const tags = ['kid-mode', 'check-in', 'bedtime', `card:${card}`];
      await createEntry({
        text: body,
        category: 'moment',
        personMentions: [kid.personId],
        sharedWithUserIds,
        subjectType: 'child_proxy',
        subjectPersonId: kid.personId,
        tags,
        checkIn: {
          kind: 'child-bedtime',
          timeOfDay: 'night',
          selfFeelings: [],
          card,
          parentTurn,
          kidTurn,
        },
      });
      try {
        const raw = sessionStorage.getItem('kid-mode:done');
        const existing = raw ? (JSON.parse(raw) as string[]) : [];
        const next = Array.from(new Set([...existing, kid.personId]));
        sessionStorage.setItem('kid-mode:done', JSON.stringify(next));
      } catch {
        // sessionStorage disabled; not fatal.
      }
      setPhase('saved');
    } catch (e) {
      console.error('Bedtime check-in save failed:', e);
    }
  };

  // ─── Render ───

  if (phase === 'saved') {
    return (
      <main style={sx.app}>
        <div style={sx.exitBar}>
          <Link href="/" style={sx.exitButton}>
            <span aria-hidden style={{ marginRight: 8 }}>✕</span>
            Exit to parent journal
          </Link>
        </div>
        <div style={sx.masthead}>
          <div style={sx.mastheadLabel}>Saved</div>
          <div style={sx.mastheadKid}>{kidFirstName}.</div>
          <div style={sx.fleuron}>❦</div>
        </div>
        <div style={sx.card}>
          <p style={{ ...sx.cardSubtitle, fontSize: 18, color: T.ink }}>
            {remainingKids.length > 0 ? 'Anyone else right now?' : 'That’s everyone.'}
          </p>
          {otherKids.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              {otherKids.map((k) => (
                <button
                  key={k.personId}
                  type="button"
                  onClick={() => router.push(`/check-in/${k.personId}`)}
                  disabled={k.done}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 999,
                    border: `1.5px solid ${k.done ? T.ruleSoft : T.rule}`,
                    background: k.done ? T.cream : T.paper,
                    fontFamily: T.sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: k.done ? T.text5 : T.ink,
                    cursor: k.done ? 'default' : 'pointer',
                    opacity: k.done ? 0.7 : 1,
                  }}
                >
                  {k.done ? '✓ ' : ''}{k.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={sx.doneRow}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              ...sx.done,
              background: remainingKids.length === 0 ? T.sageDeep : T.ink,
              borderColor: remainingKids.length === 0 ? T.sageDeep : T.ink,
            }}
          >
            {remainingKids.length === 0 ? 'All done' : 'Done for now'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={sx.app}>
      <div style={sx.exitBar}>
        <Link href="/" style={sx.exitButton}>
          <span aria-hidden style={{ marginRight: 8 }}>✕</span>
          Exit to parent journal
        </Link>
      </div>

      <div style={sx.masthead}>
        <div style={sx.mastheadLabel}>Bedtime check-in</div>
        <div style={sx.mastheadKid}>
          {kidFirstName} <span style={{ opacity: 0.5 }}>·</span>{' '}
          <span style={{ opacity: 0.6 }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
          </span>
        </div>
        <div style={sx.fleuron}>❦</div>
        {ritualDoc && (
          <div style={sx.ritualChip}>
            <span aria-hidden style={{ marginRight: 6 }}>📅</span>
            Scheduled ritual
          </div>
        )}
      </div>

      <div style={sx.card}>
        <div style={sx.cardLabelRow}>
          <div style={sx.cardLabel}>{cardDef.label}</div>
          <button type="button" onClick={handleChangeCard} style={sx.changeCardLink}>
            Change card
          </button>
        </div>
        <h2 style={sx.cardTitle}>{cardDef.title}</h2>
        <p style={sx.cardSubtitle}>{cardDef.subtitle}</p>
      </div>

      {/* Parent turn — Parent Reflection card only in this task; H/L/B added in Task 8 */}
      {card === 'parent-reflection' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.sageDeep }}>
            {parentFirstName}&rsquo;s turn
          </div>
          <div style={sx.voiceRow}>
            <MicButton
              size="md"
              onTranscript={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                setParentTurn((prev) => ({
                  ...prev,
                  observation: prev.observation?.trim()
                    ? `${prev.observation.trim()} ${trimmed}`
                    : trimmed,
                  voiceText: prev.voiceText?.trim()
                    ? `${prev.voiceText.trim()} ${trimmed}`
                    : trimmed,
                }));
              }}
            />
            <textarea
              value={parentTurn.observation ?? ''}
              onChange={(e) =>
                setParentTurn((prev) => ({ ...prev, observation: e.target.value }))
              }
              placeholder={renderPlaceholder(
                cardDef.parent.slots[0].placeholder,
                kidFirstName,
              )}
              rows={3}
              style={sx.textarea}
              disabled={phase !== 'parent'}
            />
          </div>
          {phase === 'parent' && (
            <div style={sx.passRow}>
              <button type="button" onClick={handlePass} style={sx.passButton}>
                ↓ Pass to {kidFirstName}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={sx.divider} aria-hidden="true" />

      {/* Kid turn — appears when phase is 'kid' */}
      {card === 'parent-reflection' && phase === 'kid' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.text5 }}>
            {kidFirstName}&rsquo;s turn
          </div>
          {parentTurn.observation?.trim() && (
            <div style={sx.parentQuote}>
              {parentFirstName} said: &ldquo;{parentTurn.observation.trim()}&rdquo;
            </div>
          )}
          <div style={sx.voiceRow}>
            <MicButton
              size="md"
              onTranscript={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                setKidTurn((prev) => ({
                  ...prev,
                  response: prev.response?.trim()
                    ? `${prev.response.trim()} ${trimmed}`
                    : trimmed,
                  voiceText: prev.voiceText?.trim()
                    ? `${prev.voiceText.trim()} ${trimmed}`
                    : trimmed,
                }));
              }}
            />
            <textarea
              value={kidTurn.response ?? ''}
              onChange={(e) =>
                setKidTurn((prev) => ({ ...prev, response: e.target.value }))
              }
              placeholder={renderPlaceholder(
                cardDef.kid.slots[0].placeholder,
                kidFirstName,
              )}
              rows={3}
              style={sx.textarea}
            />
          </div>
        </div>
      )}

      {/* Done — always available; soft-confirm if parentTurn empty handled by handleDone path */}
      {(phase === 'kid' || phase === 'parent') && (
        <div style={sx.doneRow}>
          <button
            type="button"
            onClick={handleDone}
            disabled={saving}
            style={{ ...sx.done, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Done — Goodnight'}
          </button>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/check-in`
Expected: both exit with code 0.

- [ ] **Step 5: Run the dev server and smoke-test Parent Reflection end-to-end**

Run: `npm run dev` (in another terminal).

Open `http://localhost:3000/check-in/<your-kid-personId>` while logged in. Verify:
- Masthead shows kid's first name + current weekday + fleuron.
- Card label shows "TONIGHT'S CARD" with a "Change card" link.
- Card title reads "Something I noticed about you today."
- The leading parent's first name appears as the section label.
- Typing in the parent textarea works; mic appends transcripts.
- "Pass to [Kid]" appears below the parent input and reveals the kid's turn (with the parent's quoted observation) on click.
- "Done — Goodnight" saves the entry; the saved-state screen appears with sibling picker.
- Soft-confirm dialog appears if you click Pass with an empty parent input.

If any of those don't work, stop and fix before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/check-in/[personId]/page.tsx
git commit -m "feat(check-in): card-led bedtime flow with Parent Reflection

Replaces the 12-emoji opener with a card-led ritual. Parent Reflection
ships first: parent enters one observation, Pass to kid reveals the
kid's response slot with the parent's text quoted back. Saves a single
journal entry with structured parentTurn + kidTurn under
checkIn.kind='child-bedtime'. High/Low/Buffalo and the optional
sprinkles arrive in follow-up commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Add High/Low/Buffalo card variant

Render H/L/B inputs alongside Parent Reflection in the same page. Three stacked textareas per turn, with the parent's matching answer quoted above each kid slot.

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx` (add H/L/B branches inside the parent + kid sections)

- [ ] **Step 1: Add an `hlbSlot` style + helpers near other styles**

In `src/app/check-in/[personId]/page.tsx`, inside the `sx` object (just before the closing brace `};`), add:

```ts
  hlbStack: { display: 'flex', flexDirection: 'column' as const, gap: 10 } as CSSProperties,
  hlbSlotLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  } as CSSProperties,
  hlbInputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  } as CSSProperties,
  hlbTextarea: {
    flex: 1,
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 1.4,
    color: T.ink,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    borderRadius: 8,
    padding: '10px 12px',
    resize: 'none',
    outline: 'none',
    minHeight: 48,
  } as CSSProperties,
  hlbQuote: {
    padding: '8px 12px',
    background: 'rgba(120, 100, 70, 0.06)',
    borderLeft: `2px solid ${T.ruleStrong}`,
    borderRadius: 4,
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontSize: 13,
    color: T.text4,
    marginBottom: 4,
  } as CSSProperties,
```

- [ ] **Step 2: Add the H/L/B parent block right after the Parent Reflection parent block**

After the `{card === 'parent-reflection' && ( ... parent turn JSX ... )}` block, insert:

```tsx
      {card === 'high-low-buffalo' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.sageDeep }}>
            {parentFirstName}&rsquo;s turn
          </div>
          <div style={sx.hlbStack}>
            {(['high', 'low', 'buffalo'] as const).map((slot) => (
              <div key={`p-${slot}`}>
                <div style={sx.hlbSlotLabel}>
                  {slot === 'high' ? 'High' : slot === 'low' ? 'Low' : 'Buffalo'}
                </div>
                <div style={sx.hlbInputRow}>
                  <MicButton
                    size="sm"
                    onTranscript={(t) => {
                      const trimmed = t.trim();
                      if (!trimmed) return;
                      setParentTurn((prev) => ({
                        ...prev,
                        [slot]: prev[slot]?.trim()
                          ? `${prev[slot]?.trim()} ${trimmed}`
                          : trimmed,
                      }));
                    }}
                  />
                  <textarea
                    value={parentTurn[slot] ?? ''}
                    onChange={(e) =>
                      setParentTurn((prev) => ({ ...prev, [slot]: e.target.value }))
                    }
                    placeholder={
                      cardDef.parent.slots.find((s) => s.key === slot)?.placeholder ?? ''
                    }
                    rows={2}
                    style={sx.hlbTextarea}
                    disabled={phase !== 'parent'}
                  />
                </div>
              </div>
            ))}
          </div>
          {phase === 'parent' && (
            <div style={sx.passRow}>
              <button type="button" onClick={handlePass} style={sx.passButton}>
                ↓ Pass to {kidFirstName}
              </button>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 3: Add the H/L/B kid block after the Parent Reflection kid block**

After the `{card === 'parent-reflection' && phase === 'kid' && ( ... )}` block, insert:

```tsx
      {card === 'high-low-buffalo' && phase === 'kid' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.text5 }}>
            {kidFirstName}&rsquo;s turn
          </div>
          <div style={sx.hlbStack}>
            {(['high', 'low', 'buffalo'] as const).map((slot) => (
              <div key={`k-${slot}`}>
                <div style={sx.hlbSlotLabel}>
                  {slot === 'high' ? 'High' : slot === 'low' ? 'Low' : 'Buffalo'}
                </div>
                {parentTurn[slot]?.trim() && (
                  <div style={sx.hlbQuote}>
                    {parentFirstName}: &ldquo;{parentTurn[slot]?.trim()}&rdquo;
                  </div>
                )}
                <div style={sx.hlbInputRow}>
                  <MicButton
                    size="sm"
                    onTranscript={(t) => {
                      const trimmed = t.trim();
                      if (!trimmed) return;
                      setKidTurn((prev) => ({
                        ...prev,
                        [slot]: prev[slot]?.trim()
                          ? `${prev[slot]?.trim()} ${trimmed}`
                          : trimmed,
                      }));
                    }}
                  />
                  <textarea
                    value={kidTurn[slot] ?? ''}
                    onChange={(e) =>
                      setKidTurn((prev) => ({ ...prev, [slot]: e.target.value }))
                    }
                    placeholder={
                      cardDef.kid.slots.find((s) => s.key === slot)?.placeholder ?? ''
                    }
                    rows={2}
                    style={sx.hlbTextarea}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Run type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/check-in`
Expected: both exit with code 0.

- [ ] **Step 5: Smoke-test H/L/B in dev server**

Switch to H/L/B via the "Change card" link. Verify:
- Three stacked input rows appear under the parent section (High, Low, Buffalo).
- Each row has its own mic + textarea.
- Pass to kid still works.
- Kid section shows three rows; each kid input has the parent's matching answer quoted above it when set.
- Done — Goodnight saves and the entry's text body uses the H/L/B composer output (see in Firestore or in the journal feed).

- [ ] **Step 6: Commit**

```bash
git add src/app/check-in/[personId]/page.tsx
git commit -m "feat(check-in): add High/Low/Buffalo card variant

Three-slot card with stacked textareas + per-slot mic capture. Kid
slots show the parent's matching answer quoted above for modeling.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Optional sprinkles — emoji + body + about-someone + share

Restore the pre-existing optional inputs as collapsed chips below the card. The user can expand any one to add an emoji feeling, mark a body spot, add a relationship target, or pick share recipients. Chips appear after the kid's turn (or on the page if phase is `parent`).

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx` (add sprinkles section)

- [ ] **Step 1: Add chip + sprinkle styles to `sx`**

Inside the `sx` object, add:

```ts
  sprinkleSection: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '14px 24px',
    background: 'rgba(120, 100, 70, 0.04)',
    borderRadius: 10,
  } as CSSProperties,
  sprinkleLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  } as CSSProperties,
  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  } as CSSProperties,
  chipBase: {
    padding: '8px 14px',
    borderRadius: 999,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    fontFamily: T.serif,
    fontSize: 14,
    color: T.text3,
    cursor: 'pointer',
  } as CSSProperties,
  chipOn: {
    background: T.warmRow2,
    borderColor: T.amber,
    color: T.ink,
  } as CSSProperties,
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 12,
  } as CSSProperties,
  emojiTile: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '12px 4px',
    borderRadius: 12,
    background: T.cream,
    border: `1px solid ${T.ruleSoft}`,
    cursor: 'pointer',
    fontFamily: T.sans,
    fontSize: 11,
    color: T.text4,
  } as CSSProperties,
  emojiTileOn: {
    background: T.warmRow2,
    borderColor: T.amber,
    color: T.ink,
  } as CSSProperties,
  emojiFace: { fontSize: 28, lineHeight: 1 } as CSSProperties,
  shareRow: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap' as const,
    marginTop: 12,
  } as CSSProperties,
  avatarChip: {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,
  avatarCircle: {
    position: 'relative' as const,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(120, 100, 70, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as CSSProperties,
  avatarFallback: {
    fontFamily: T.serif,
    fontSize: 18,
    color: T.text3,
  } as CSSProperties,
  avatarLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: T.text4,
  } as CSSProperties,
  selectedDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: T.sage,
    color: 'white',
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${T.paper}`,
  } as CSSProperties,
```

- [ ] **Step 2: Add the emoji vocabulary constant at the top of the file**

Just below the imports (around line 30), add:

```ts
const SELF_FEELINGS = [
  { face: '😀', word: 'happy' },
  { face: '😢', word: 'sad' },
  { face: '😠', word: 'mad' },
  { face: '😟', word: 'worried' },
  { face: '😴', word: 'tired' },
  { face: '😌', word: 'calm' },
  { face: '🦁', word: 'brave' },
  { face: '🤪', word: 'silly' },
  { face: '🤫', word: 'quiet' },
  { face: '🤔', word: 'thinking' },
  { face: '🎉', word: 'excited' },
  { face: '💛', word: 'loved' },
] as const;
```

- [ ] **Step 3: Add sprinkle state + handlers inside the component**

Add these state declarations next to the existing parentTurn/kidTurn state:

```ts
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [bodySpots, setBodySpots] = useState<string[]>([]);
  const [openSprinkle, setOpenSprinkle] = useState<
    'feelings' | 'body' | 'share' | null
  >(null);
  const toggleSelfFeeling = (word: string) =>
    setSelfFeelings((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  const toggleBodySpot = (id: string) =>
    setBodySpots((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  const toggleShared = (userId: string) =>
    setSharedWithUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
```

- [ ] **Step 4: Pass selfFeelings + bodySpots to createEntry in `handleDone`**

In `handleDone`, replace the existing `checkIn` block in the `createEntry` call:

```ts
        checkIn: {
          kind: 'child-bedtime',
          timeOfDay: 'night',
          selfFeelings,
          ...(bodySpots.length > 0 ? { bodySpots } : {}),
          card,
          parentTurn,
          kidTurn,
        },
```

- [ ] **Step 5: Render the sprinkles section after the kid's turn**

Right above the final `{(phase === 'kid' || phase === 'parent') && ( ... Done — Goodnight ... )}` Done button block, insert:

```tsx
      <div style={sx.sprinkleSection}>
        <div style={sx.sprinkleLabel}>
          Want to add? <span style={{ fontWeight: 500, letterSpacing: '0.06em' }}>(skip if you want)</span>
        </div>
        <div style={sx.chipRow}>
          <button
            type="button"
            onClick={() => setOpenSprinkle(openSprinkle === 'feelings' ? null : 'feelings')}
            style={{
              ...sx.chipBase,
              ...(selfFeelings.length > 0 ? sx.chipOn : null),
            }}
          >
            + a feeling{selfFeelings.length > 0 ? ` · ${selfFeelings.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setOpenSprinkle(openSprinkle === 'body' ? null : 'body')}
            style={{
              ...sx.chipBase,
              ...(bodySpots.length > 0 ? sx.chipOn : null),
            }}
          >
            + where in your body{bodySpots.length > 0 ? ` · ${bodySpots.length}` : ''}
          </button>
          {adults.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenSprinkle(openSprinkle === 'share' ? null : 'share')}
              style={sx.chipBase}
            >
              Share with…
            </button>
          )}
        </div>

        {openSprinkle === 'feelings' && (
          <div style={sx.emojiGrid}>
            {SELF_FEELINGS.map((f) => {
              const on = selfFeelings.includes(f.word);
              return (
                <button
                  key={f.word}
                  type="button"
                  onClick={() => toggleSelfFeeling(f.word)}
                  style={{ ...sx.emojiTile, ...(on ? sx.emojiTileOn : null) }}
                >
                  <span style={sx.emojiFace}>{f.face}</span>
                  <span>{f.word}</span>
                </button>
              );
            })}
          </div>
        )}

        {openSprinkle === 'body' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {['head', 'throat', 'chest', 'tummy', 'arms', 'legs'].map((id) => {
              const on = bodySpots.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleBodySpot(id)}
                  style={{ ...sx.chipBase, ...(on ? sx.chipOn : null) }}
                >
                  {id}
                </button>
              );
            })}
          </div>
        )}

        {openSprinkle === 'share' && adults.length > 0 && (
          <div style={sx.shareRow}>
            {adults.map((a) => {
              const selected = sharedWithUserIds.includes(a.userId);
              return (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => toggleShared(a.userId)}
                  style={sx.avatarChip}
                  aria-pressed={selected}
                >
                  <span style={sx.avatarCircle}>
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatarUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={sx.avatarFallback}>
                        {(a.name[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                    {selected && (
                      <span aria-hidden style={sx.selectedDot}>✓</span>
                    )}
                  </span>
                  <span style={sx.avatarLabel}>{a.name.split(' ')[0].toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
```

- [ ] **Step 6: Run type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/check-in`
Expected: both exit with code 0.

- [ ] **Step 7: Smoke-test sprinkles in dev server**

Open the check-in page. Verify:
- The "Want to add?" section appears below the kid turn (or below the card section while in parent phase).
- Clicking "+ a feeling" expands a 12-emoji grid; tapping emojis toggles them on/off; chip shows count.
- Clicking "+ where in your body" expands six body chips; tapping toggles.
- Clicking "Share with…" expands the adult avatar row; tapping toggles.
- Saving an entry with sprinkles writes `selfFeelings`, `bodySpots`, and `sharedWithUserIds` on the resulting `journal_entries` document (verify in Firestore console).

- [ ] **Step 8: Commit**

```bash
git add src/app/check-in/[personId]/page.tsx
git commit -m "feat(check-in): optional sprinkles (emoji, body, share)

Brings back the pre-existing emoji feelings, body spots, and share
picker as collapsed chips beneath the card. Each expands inline on
demand; they're never the entry point.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Final pass — full test run + manual smoke + push

- [ ] **Step 1: Run the full unit test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Run lint across the whole project**

Run: `npm run lint`
Expected: exits with code 0 (or only with warnings that pre-existed on `main`).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits with code 0.

- [ ] **Step 4: Manual smoke test against dev server**

With `npm run dev` running, walk through every flow:
- Parent Reflection: open → enter observation → Pass → kid responds → Done → verify entry in Firestore with `checkIn.kind === 'child-bedtime'`, `checkIn.card === 'parent-reflection'`, `parentTurn.observation` set, `kidTurn.response` set.
- High/Low/Buffalo via "Change card": confirmation dialog appears if parent had typed; entry saves with three slots per turn populated.
- Empty kid turn: open Parent Reflection → enter observation → Pass → leave kid blank → Done → entry saves with no `kidTurn` fields.
- Empty parent turn: open → click Pass without typing → confirm dialog appears → confirm → kid responds → Done → entry saves with kid-only data.
- Sprinkles: open any card → expand "+ a feeling", pick two emojis → expand "+ where in your body", pick one spot → expand "Share with…", deselect one adult → Done → entry's `selfFeelings`, `bodySpots`, and `sharedWithUserIds` reflect the choices.
- Sibling sequence: complete one kid's check-in → tap a sibling's name in the saved screen → second kid's page loads with its own (alternating) card.

- [ ] **Step 5: Push the branch and open a PR**

```bash
git push -u origin feature/bedtime-checkin-cards
gh pr create --title "Bedtime check-in cards" --body "$(cat <<'EOF'
## Summary
- Replace the 12-emoji opener with a card-led ritual: Parent Reflection + High/Low/Buffalo, alternating per kid
- Parent goes first, then Pass-to-kid reveals the kid's turn with the parent's words quoted back
- Saves a single journal entry with structured parentTurn + kidTurn under checkIn.kind='child-bedtime'
- Emoji feelings, body spots, and share picker demoted to optional sprinkles
- Bedtime tone (deeper cream + fleuron masthead); auth user's first name renders as the leading parent label

## Test plan
- [ ] Unit tests: pickCard rotation + composeBedtimeBody both pass
- [ ] Parent Reflection end-to-end save writes the right checkIn shape
- [ ] High/Low/Buffalo via Change card writes its own shape
- [ ] Empty kidTurn saves cleanly
- [ ] Empty parentTurn soft-confirms then saves cleanly
- [ ] Sprinkle chips (feelings, body, share) read/write correctly
- [ ] Sibling sequence keeps independent per-kid rotation
- [ ] Existing kid check-ins (kind='child') continue to render in the feed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Note the PR URL for review**

After `gh pr create` returns, paste the PR URL into the conversation so Scott can review.

---

## Self-review (run after writing the plan)

**Spec coverage — every spec requirement maps to a task:**

| Spec requirement | Task |
|---|---|
| Replace 12-emoji opener with a card | Tasks 7, 8 |
| Parent Reflection card (copy + mechanics) | Tasks 3, 7 |
| High/Low/Buffalo card (copy + mechanics) | Tasks 3, 8 |
| Parent-first + Pass-to-kid gating | Task 7 |
| Card rotation per kid with override | Tasks 2, 5, 7 |
| Single journal entry, both turns embedded | Tasks 1, 4, 6, 7 |
| Empty kidTurn is a valid save | Task 4 (composer) + Task 7 (no validation block) |
| Soft-confirm dialog on empty parentTurn | Task 7 |
| Demoted emoji/body/about-someone as sprinkles | Task 9 |
| Share picker kept | Task 9 |
| Sibling next-up picker kept | Task 7 |
| ritualId chip kept | Task 7 |
| Sun glyph removed, fleuron added | Task 7 |
| Dynamic parent-name label | Task 7 |
| Bedtime tone (deeper cream, lower contrast) | Task 7 |
| Change-card link + confirmation | Task 7 |
| No Firestore rules changes | Confirmed — no rules edits in any task |
| Existing kid check-ins (kind='child') keep working | Task 1 (kind extended, not replaced) |
| Unit tests for pickCard + composeBedtimeBody | Tasks 2, 4 |
| Playwright skipped (auth fixture gap) | Acknowledged in spec; Task 10 covers manual smoke |

Coverage gap: the "+ about someone" (relationship multi-target) sprinkle is mentioned in the spec but Task 9 only restores feelings, body, and share. Per the spec the relationship multi-target is also an optional sprinkle. **Resolution:** leaving "+ about someone" out of v1 implementation is acceptable because the multi-target logic is substantial (per-target feelings + voice + chip basket). The data model still supports `relTargets` (untouched). Adding the "+ about someone" chip is filed as a v1.1 follow-up; flag this to Scott during execution review rather than ballooning Task 9.

**Placeholder scan:** none — every step has actual code/commands.

**Type consistency:** `BedtimeCardKind`, `BedtimeParentTurn`, `BedtimeKidTurn`, and the `kind: 'child-bedtime'` literal are defined in Task 1 and used identically in Tasks 2, 4, 5, 6, 7, 8. `parentFirstName`/`kidFirstName` derived in Task 7 are passed to `composeBedtimeBody` with the same parameter names from Task 4.
