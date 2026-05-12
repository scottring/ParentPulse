# Relish UI Room Redesigns — Plan 2 Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the four room surfaces that exist today (Journal home, Family Manual person view, Therapy brief detail, Rituals page) to match the Stitch screens — preserving all underlying functionality and adding new affordances (idle-lock on Therapy, two-column Rituals with pinned Current Focus, grouped Recent Echoes on Journal, Perspective Layers on Manual).

**Architecture:** Each room is independent — no shared new components across rooms. Plan 1's foundation (LayoutChrome, route renames, vocabulary swap, wiring fixes) is in place; this plan layers visual+structural redesigns on top. Where the existing surface has functionality the Stitch mock doesn't show (e.g., the person-page threads/timeline below the Manual sections), we keep it — Plan 2 is additive on those rooms, not a wholesale replacement.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript. Inline `CSSProperties` styles (no styled-jsx — documented Turbopack scoping bug). Vitest for unit tests, especially the new `useIdleLock` hook. Stitch design system as visual reference; this plan describes structure functionally without prescribing exact palette/typography (those are decided externally in the Stitch design doc).

---

## File Map

**New files:**
- `src/components/manual/PerspectiveLayers.tsx` — stacked tinted cards, one per perspective
- `src/components/manual/IntersectionOfTruths.tsx` — synthesis panel with Alignments + Divergences columns
- `src/components/manual/AskCoachCTA.tsx` — dark CTA card linking to `/coach?personId=...`
- `src/hooks/useIdleLock.ts` — 10-min idle timer with reset-on-interaction
- `src/components/therapy/BriefIdleLock.tsx` — warning + re-PIN overlay for Therapy brief
- `src/components/rituals/CurrentFocusCard.tsx` — pinned micro-action card at top of Rituals
- `src/components/rituals/InspiredByJournalCard.tsx` — AI-derived suggestion card tying journal back to ritual
- `src/components/rituals/ExperimentsColumn.tsx` — preview of active experiment + recent discovery for the right column

**Modified files:**
- `src/components/journal-first/Home.tsx` — remove Coach chips, swap timeline → grouped Recent Echoes, drop salutation, rename Save → Keep
- `src/app/people/[personId]/page.tsx` — insert new Manual sections at the top (above existing threads/timeline)
- `src/app/therapy/[briefId]/page.tsx` — restructure to narrative sections, wire `BriefIdleLock`
- `src/app/rituals/ClientPage.tsx` — restructure to two-column layout with the new components

**Test files:**
- `src/hooks/__tests__/useIdleLock.test.ts` — TDD the idle timer behavior
- `src/components/therapy/__tests__/BriefIdleLock.test.tsx` — verify warning at 60s + PIN keypad re-entry
- `src/components/manual/__tests__/PerspectiveLayers.test.tsx` — verify card per perspective
- `src/components/manual/__tests__/IntersectionOfTruths.test.tsx` — verify alignment + divergence columns
- `src/components/rituals/__tests__/CurrentFocusCard.test.tsx` — verify renders with active item, suppressed without

**Out of plan-scope:** The Unspoken Queue (new room — Plan 3), the child check-in 12-tile redesign (Plan 3), family check-ins scheduling (Plan 3), and the global quick-capture modal (deferred).

---

## Phase A — Journal Home Refresh

The journal home is the highest-trafficked surface. Four focused changes — none restructure the page layout, all change content within existing sections.

### Task A1: Remove the Coach chips section

**Files:**
- Modify: `src/components/journal-first/Home.tsx`

- [ ] **Step 1: Find and read the "Ask the book" section**

```bash
grep -n "Ask the book\|family-pills\|coach\?personId" src/components/journal-first/Home.tsx | head -10
```

Expected: locates a `<section>` block around lines 1363-1407 with chips that link to `/coach?personId=...`.

- [ ] **Step 2: Remove the entire section**

Delete the `<section>` block that renders "Ask the book" — from the opening `<section style={{ marginTop: 40 }}>` with the eyebrow "Ask the book" through its closing `</section>`. Per the spec, the Journal home no longer surfaces Coach chips; Coach is reached per-person from the Manual.

- [ ] **Step 3: Lint and confirm no broken imports**

```bash
npm run lint -- --quiet src/components/journal-first/Home.tsx 2>&1 | tail -10
```

If `Link` becomes unused, remove the import. If any helper is now unused, remove.

- [ ] **Step 4: Smoke check**

Refresh `/` in your dev server (or trust Task E1's smoke test). Confirm no "Ask the book" row appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-first/Home.tsx
git commit -m "feat(journal): remove Ask the book coach chips from home"
```

---

### Task A2: Drop "Good morning/evening" salutation

**Files:**
- Modify: `src/components/journal-first/Home.tsx`

- [ ] **Step 1: Find the greeting block**

```bash
grep -n "greetingFor\|Good morning\|Good evening\|Still up" src/components/journal-first/Home.tsx | head -10
```

Locates `greetingFor(t, firstName)` function (around line 111) and the `<h1 style={sx.greeting}>` block that uses it (around line 1229).

- [ ] **Step 2: Replace the greeting with a name-only italic masthead**

The Stitch design treats the user's name as a personal masthead — italic serif display type. Replace the time-of-day greeting + first-name pattern with just the user's name italicized. The date line below stays as-is.

Edit the `<section style={sx.greetingBlock}>` block. Change:

```tsx
<h1 style={sx.greeting}>
  {greeting.split(', ')[0]}, <em style={sx.greetingEm}>{firstName}.</em>
</h1>
<p style={sx.dateline}>{dateLine(today, tod)}</p>
```

To:

```tsx
<h1 style={sx.greeting}>
  <em style={sx.greetingEm}>{user?.name ?? firstName}</em>
</h1>
<p style={sx.dateline}>{dateLine(today, tod)}</p>
```

The full user name (not just first name) renders italic; falls back to first name if `user.name` is empty.

- [ ] **Step 3: Remove the `greetingFor` function and `greeting` variable**

Both are now unused. Delete `greetingFor` (around lines 111-118) and the `const greeting = greetingFor(...)` line.

- [ ] **Step 4: Lint**

```bash
npm run lint -- --quiet src/components/journal-first/Home.tsx 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-first/Home.tsx
git commit -m "feat(journal): replace time-of-day greeting with personal-masthead name"
```

---

### Task A3: Rename "Save" → "Keep →"

**Files:**
- Modify: `src/components/journal-first/Home.tsx`

- [ ] **Step 1: Find the Save button**

```bash
grep -n "'Saved'\|'Saving…'\|'Save'\|sx\.save" src/components/journal-first/Home.tsx | head -10
```

Locates the button (around line 1680) and the style block.

- [ ] **Step 2: Replace button label states**

Change the button content (currently `{showSaved ? 'Saved' : saving ? 'Saving…' : 'Save'}`) to render an arrow alongside the label, and rename to "Keep":

```tsx
{showSaved ? 'Kept' : saving ? 'Keeping…' : 'Keep →'}
```

Keep `Saved`/`Saving…` state semantics intact in code (the `showSaved` and `saving` state variables don't need renaming — they're internal).

- [ ] **Step 3: Smoke check the writing flow**

Refresh `/`, type something, click Keep. Confirm the button label progression: "Keep →" → "Keeping…" → "Kept" → back to "Keep →".

- [ ] **Step 4: Commit**

```bash
git add src/components/journal-first/Home.tsx
git commit -m "feat(journal): rename Save button to Keep with arrow"
```

---

### Task A4: Replace flat timeline with grouped Recent Echoes

**Files:**
- Modify: `src/components/journal-first/Home.tsx`

Per the Stitch design, the recent-entries timeline becomes "Recent Echoes" — entries grouped by subject (About [Kid Name] / Self / Relationships) rather than a flat chronological list.

- [ ] **Step 1: Find the timeline section**

```bash
grep -n "What happened today\|What came in\|recent\.map\|tlMeta\|tlQuote" src/components/journal-first/Home.tsx | head -15
```

Locates the timeline `<section>` (around line 1324-1358) that maps `recent` entries flat.

- [ ] **Step 2: Add a grouping helper above the JSX**

Inside the `Home()` function, after the existing `const recent = useMemo(...)` line, add:

```tsx
type EchoGroup = { label: string; entries: typeof recent };
const echoGroups = useMemo<EchoGroup[]>(() => {
  const groups: Record<string, typeof recent> = {};
  for (const entry of recent) {
    // Group key priority:
    // 1. If the entry mentions a child by personId, label "About [name]"
    // 2. Else if subjectType === 'self' (or no personMentions), label "Self"
    // 3. Else (mentions a non-child adult), label "Relationships"
    let key: string | null = null;
    const mentions = entry.personMentions ?? [];
    const firstChildMention = mentions.find((id) =>
      kids.some((k) => k.personId === id),
    );
    if (firstChildMention) {
      const kid = kids.find((k) => k.personId === firstChildMention);
      key = `About ${kid?.name ?? 'a child'}`;
    } else if ((entry.subjectType ?? 'self') === 'self' && mentions.length === 0) {
      key = 'Self';
    } else if (mentions.length > 0) {
      key = 'Relationships';
    }
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return Object.entries(groups).map(([label, entries]) => ({ label, entries }));
}, [recent, kids]);
```

- [ ] **Step 3: Replace the timeline JSX**

Replace the entire `{recent.length > 0 && (<section style={{ marginTop: 40 }}>...)` block with a grouped version. Each group renders its label as an eyebrow, then its entries. Suggested structure:

```tsx
{echoGroups.length > 0 && (
  <section style={{ marginTop: 40 }}>
    <p style={sx.eyebrow}>Recent Echoes</p>
    {echoGroups.map((group) => (
      <div key={group.label} style={{ marginBottom: 28 }}>
        <p style={{
          fontFamily: T.sans,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.text5,
          marginBottom: 10,
        }}>
          {group.label}
        </p>
        <ul style={sx.timeline}>
          {group.entries.map((entry) => {
            const when = entry.createdAt?.toDate?.() ?? null;
            const author = entry.authorId === user?.userId
              ? 'You'
              : people.find((p) => p.linkedUserId === entry.authorId)?.name ?? 'Someone';
            return (
              <li key={entry.entryId} style={{ marginBottom: 10 }}>
                <Link
                  href={`/journal/${entry.entryId}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <span style={sx.tlMeta}>
                    <span style={sx.tlBullet} />
                    {author} · {relativeWhen(when)}
                  </span>
                  <p style={sx.tlQuote}>
                    &ldquo;{(entry.text || '').slice(0, 180)}
                    {(entry.text || '').length > 180 ? '…' : ''}&rdquo;
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
    <p style={{ ...sx.tail, marginTop: 24 }}>
      <Link href="/archive" style={sx.tailLink}>View all ↗</Link>
    </p>
  </section>
)}
```

This replaces the existing flat timeline section. The existing `<p style={sx.tail}>` "Everything written ↗" link at the bottom of the page can be removed (now subsumed by "View all ↗" inside Recent Echoes).

- [ ] **Step 4: Smoke check the page**

Refresh `/`. If your account has entries that mention kids vs. self vs. adults, confirm they group correctly. If only one group is present, only that group's eyebrow should render.

- [ ] **Step 5: Commit**

```bash
git add src/components/journal-first/Home.tsx
git commit -m "feat(journal): group recent timeline into Recent Echoes by subject"
```

---

### Task A5: Phase-A smoke test

**Files:** (none modified)

- [ ] **Step 1: Run unit tests**

```bash
npm run test:run 2>&1 | tail -20
```

Pre-existing failures should be unchanged. No NEW failures.

- [ ] **Step 2: Lint the touched file**

```bash
npm run lint -- --quiet src/components/journal-first/Home.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Manual browser check**

In the dev server, open `/`. Confirm:
- Masthead shows your full name italicized (no "Good morning/evening,")
- No "Ask the book" coach-chip row
- Save button says "Keep →"
- Recent entries group under "About [Kid] / Self / Relationships" eyebrows
- The bottom "Everything written ↗" tail link is gone (now "View all ↗" inside Recent Echoes)

No commit needed if nothing changed.

---

## Phase B — Family Manual Person View (additive)

The existing `/people/[personId]` page (2040 lines) is the "person dossier" — hero, threads, timeline, quiet-notes, colophon. The Stitch Manual design shows: Portrait → Name → Role line → Perspective Layers → Intersection of Truths → Ask the Coach CTA. **Decision:** add the Stitch sections at the *top* of the page (after the existing hero, before threads/timeline), keeping everything else intact. Additive, low risk, reversible.

### Task B1: Build `PerspectiveLayers` component

**Files:**
- Create: `src/components/manual/PerspectiveLayers.tsx`
- Create: `src/components/manual/__tests__/PerspectiveLayers.test.tsx`

The component renders a stack of tinted cards, one per perspective (Self View, Author's View, The Children's Lens, etc.). It reads from `Contribution[]` and `synthesizedContent.perspectives` (per the `PersonManual` data model).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/manual/__tests__/PerspectiveLayers.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('PerspectiveLayers', () => {
  const perspectives = [
    { id: 'self', label: 'Self View', pullQuote: '"I am the silent glue..."', tint: 'rose' as const },
    { id: 'author', label: 'Author Observation', pullQuote: '"Evelyn maintains a rigorous schedule..."', tint: 'sage' as const },
    { id: 'children', label: "The Children's Lens", pullQuote: '"Mom is always fine."', tint: 'azure' as const },
  ];

  it('renders one card per perspective with its label and pull quote', async () => {
    const { PerspectiveLayers } = await import('@/components/manual/PerspectiveLayers');
    render(<PerspectiveLayers perspectives={perspectives} />);
    expect(screen.getByText(/Self View/i)).toBeInTheDocument();
    expect(screen.getByText(/silent glue/i)).toBeInTheDocument();
    expect(screen.getByText(/Author Observation/i)).toBeInTheDocument();
    expect(screen.getByText(/Children's Lens/i)).toBeInTheDocument();
  });

  it('renders nothing when perspectives is empty', async () => {
    const { PerspectiveLayers } = await import('@/components/manual/PerspectiveLayers');
    const { container } = render(<PerspectiveLayers perspectives={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run src/components/manual/__tests__/PerspectiveLayers.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Write the component**

```tsx
// src/components/manual/PerspectiveLayers.tsx
'use client';

import type { CSSProperties } from 'react';

export type PerspectiveTint = 'rose' | 'sage' | 'azure' | 'neutral';

export interface Perspective {
  id: string;
  label: string;
  pullQuote: string;
  tint: PerspectiveTint;
}

const TINT_BG: Record<PerspectiveTint, string> = {
  rose:    'rgba(212, 168, 168, 0.18)',
  sage:    'rgba(124, 144, 130, 0.18)',
  azure:   'rgba(146, 168, 192, 0.18)',
  neutral: 'rgba(120, 100, 70, 0.08)',
};

const TINT_BORDER: Record<PerspectiveTint, string> = {
  rose:    'rgba(212, 168, 168, 0.34)',
  sage:    'rgba(124, 144, 130, 0.34)',
  azure:   'rgba(146, 168, 192, 0.34)',
  neutral: 'rgba(120, 100, 70, 0.18)',
};

export function PerspectiveLayers({ perspectives }: { perspectives: Perspective[] }) {
  if (!perspectives.length) return null;
  return (
    <section style={sectionStyle} aria-label="Perspective layers">
      <p style={eyebrowStyle}>Perspective Layers</p>
      <div style={stackStyle}>
        {perspectives.map((p) => (
          <article key={p.id} style={cardStyle(p.tint)}>
            <p style={labelStyle}>{p.label}</p>
            <blockquote style={quoteStyle}>{p.pullQuote}</blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 18px',
};
const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };
function cardStyle(tint: PerspectiveTint): CSSProperties {
  return {
    background: TINT_BG[tint],
    border: `1px solid ${TINT_BORDER[tint]}`,
    borderRadius: 8,
    padding: '20px 22px',
  };
}
const labelStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 8px',
};
const quoteStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 17,
  lineHeight: 1.55,
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
  maxWidth: '54ch',
};
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run src/components/manual/__tests__/PerspectiveLayers.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/manual/PerspectiveLayers.tsx src/components/manual/__tests__/PerspectiveLayers.test.tsx
git commit -m "feat(manual): add PerspectiveLayers component"
```

---

### Task B2: Build `IntersectionOfTruths` component

**Files:**
- Create: `src/components/manual/IntersectionOfTruths.tsx`
- Create: `src/components/manual/__tests__/IntersectionOfTruths.test.tsx`

Synthesis panel — a named insight headline, a 1-2 sentence narrative, then two columns: Alignments + Divergences. Drives off the AI-synthesized content on the PersonManual.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/manual/__tests__/IntersectionOfTruths.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('IntersectionOfTruths', () => {
  const insight = {
    headline: 'The Silence Gap',
    narrative: 'There is a 40% divergence between Evelyn\'s perceived stoicism and the emotional labor recorded in her private journals.',
    alignments: ['Both Evelyn and her children value Legacy as the primary motivation.'],
    divergences: ['Evelyn views her privacy as Protection; her children view it as Exclusion.'],
  };

  it('renders headline, narrative, and both columns', async () => {
    const { IntersectionOfTruths } = await import('@/components/manual/IntersectionOfTruths');
    render(<IntersectionOfTruths insight={insight} />);
    expect(screen.getByText(/The Silence Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/40% divergence/i)).toBeInTheDocument();
    expect(screen.getByText(/Legacy as the primary motivation/i)).toBeInTheDocument();
    expect(screen.getByText(/Protection.*Exclusion/i)).toBeInTheDocument();
  });

  it('renders nothing when no insight is provided', async () => {
    const { IntersectionOfTruths } = await import('@/components/manual/IntersectionOfTruths');
    const { container } = render(<IntersectionOfTruths insight={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run src/components/manual/__tests__/IntersectionOfTruths.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/manual/IntersectionOfTruths.tsx
'use client';

import type { CSSProperties } from 'react';

export interface SynthesisInsight {
  headline: string;
  narrative: string;
  alignments: string[];
  divergences: string[];
}

export function IntersectionOfTruths({ insight }: { insight: SynthesisInsight | null }) {
  if (!insight) return null;
  return (
    <section style={sectionStyle} aria-label="Intersection of truths">
      <p style={eyebrowStyle}>Intersection of Truths</p>
      <h3 style={headlineStyle}>{insight.headline}</h3>
      <p style={narrativeStyle}>{insight.narrative}</p>
      <div style={columnsStyle}>
        <Column heading="Alignments" items={insight.alignments} />
        <Column heading="Divergences" items={insight.divergences} />
      </div>
    </section>
  );
}

function Column({ heading, items }: { heading: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={columnStyle}>
      <p style={colHeadingStyle}>{heading}</p>
      <ul style={listStyle}>
        {items.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
      </ul>
    </div>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 18px',
};
const headlineStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 26,
  letterSpacing: '-0.01em',
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 10px',
};
const narrativeStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--r-text-3, #5C5347)',
  margin: '0 0 24px',
  maxWidth: '60ch',
};
const columnsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 28,
};
const columnStyle: CSSProperties = {};
const colHeadingStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const listStyle: CSSProperties = { margin: 0, padding: 0, listStyle: 'none' };
const liStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-2, #3A3530)',
  marginBottom: 10,
};
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npx vitest run src/components/manual/__tests__/IntersectionOfTruths.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/manual/IntersectionOfTruths.tsx src/components/manual/__tests__/IntersectionOfTruths.test.tsx
git commit -m "feat(manual): add IntersectionOfTruths synthesis panel"
```

---

### Task B3: Build `AskCoachCTA` component

**Files:**
- Create: `src/components/manual/AskCoachCTA.tsx`

A dark CTA card linking to `/coach?personId=...&name=...`. Shows a stat line (synthesized N entries / M contributions) and two example questions.

- [ ] **Step 1: Write the component**

```tsx
// src/components/manual/AskCoachCTA.tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface AskCoachCTAProps {
  personId: string;
  firstName: string;
  entryCount: number;
  contributionCount: number;
  sampleQuestions?: [string, string];
}

export function AskCoachCTA({
  personId,
  firstName,
  entryCount,
  contributionCount,
  sampleQuestions = [
    `What might ${firstName} be holding back?`,
    `What's the next conversation worth having?`,
  ],
}: AskCoachCTAProps) {
  return (
    <section style={sectionStyle} aria-label={`Ask the Coach about ${firstName}`}>
      <article style={cardStyle}>
        <p style={eyebrowStyle}>Ask the Coach about {firstName}</p>
        <p style={statStyle}>
          The Coach has synthesized {entryCount} {entryCount === 1 ? 'entry' : 'entries'} and {contributionCount} {contributionCount === 1 ? 'contribution' : 'contributions'} to help you navigate your relationship with {firstName}.
        </p>
        <ul style={qListStyle}>
          {sampleQuestions.map((q, i) => (
            <li key={i} style={qLiStyle}>&ldquo;{q}&rdquo;</li>
          ))}
        </ul>
        <Link
          href={`/coach?personId=${personId}&name=${encodeURIComponent(firstName)}`}
          style={ctaStyle}
        >
          Start Reflection <span aria-hidden style={{ marginLeft: 6 }}>⟶</span>
        </Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', maxWidth: 720, margin: '0 auto' };
const cardStyle: CSSProperties = {
  background: 'var(--r-leather, #14100C)',
  color: 'var(--r-cream, #FAF8F3)',
  borderRadius: 8,
  padding: '28px 30px',
};
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 22,
  color: 'var(--r-cream, #FAF8F3)',
  margin: '0 0 14px',
};
const statStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'rgba(250, 248, 243, 0.78)',
  margin: '0 0 18px',
  maxWidth: '52ch',
};
const qListStyle: CSSProperties = { margin: '0 0 22px', padding: 0, listStyle: 'none' };
const qLiStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 16,
  color: 'rgba(250, 248, 243, 0.88)',
  marginBottom: 6,
};
const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 6,
  padding: '12px 22px',
  background: 'var(--r-cream, #FAF8F3)',
  color: 'var(--r-ink, #14100C)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manual/AskCoachCTA.tsx
git commit -m "feat(manual): add AskCoachCTA dark callout component"
```

(No standalone unit test — visual component, exercised by integration in Task B4.)

---

### Task B4: Insert new Manual sections into person page

**Files:**
- Modify: `src/app/people/[personId]/page.tsx`

The existing person page is 2040 lines. **Add the new sections at the top, between the existing hero and the threads/timeline below.** Do not remove anything from the existing page in this task.

- [ ] **Step 1: Read enough of the file to find the insertion point**

```bash
grep -n "// === \|/\\* === \|<section\\|<main\\|<header" src/app/people/[personId]/page.tsx | head -30
```

Find a clean insertion point after the existing hero block but before the threads section. Look for a comment like `// === Threads ===` or `<section ... threads ...>`.

- [ ] **Step 2: Add imports**

At the top of the file (with other component imports):

```tsx
import { PerspectiveLayers } from '@/components/manual/PerspectiveLayers';
import { IntersectionOfTruths } from '@/components/manual/IntersectionOfTruths';
import { AskCoachCTA } from '@/components/manual/AskCoachCTA';
```

- [ ] **Step 3: Build the perspectives + insight data**

Inside `PersonPage`, after the `contributions` / `manual` hooks, derive what the new components need:

```tsx
// Build perspectives from contributions + synthesizedContent
const perspectives = useMemo(() => {
  if (!contributions || contributions.length === 0) return [];
  const tints = ['rose', 'sage', 'azure', 'neutral'] as const;
  return contributions
    .filter((c) => c.status === 'complete')
    .map((c, i) => {
      const tint = tints[i % tints.length];
      const label =
        c.perspectiveType === 'self'
          ? 'Self View'
          : people.find((p) => p.linkedUserId === c.contributorUserId)?.name
            ? `${people.find((p) => p.linkedUserId === c.contributorUserId)!.name}'s Observation`
            : 'An Observer';
      // Pull a single pull-quote — the first answer text > 40 chars, or an empty string.
      const answers = Object.values(c.answers ?? {}).flatMap((section) => Object.values(section ?? {}));
      const pullQuote = (answers.find((a) => typeof a === 'string' && a.length > 40) as string) ?? '';
      return { id: c.contributionId, label, pullQuote: pullQuote.slice(0, 240), tint };
    });
}, [contributions, people]);

// The synthesis insight is on manual.synthesizedContent. Shape-check before passing.
const insight = useMemo(() => {
  const sc = manual?.synthesizedContent;
  if (!sc?.intersectionHeadline) return null;
  return {
    headline: sc.intersectionHeadline,
    narrative: sc.intersectionNarrative ?? '',
    alignments: sc.alignments ?? [],
    divergences: sc.divergences ?? [],
  };
}, [manual?.synthesizedContent]);

// Counts for the Ask the Coach CTA.
const entryCount = useMemo(
  () => allEntries.filter((e) => entryMentionsPerson(e, person)).length,
  [allEntries, person],
);
const contributionCount = contributions?.length ?? 0;
```

(Adjust field names to match the actual `synthesizedContent` shape on PersonManual — if the data model uses different field names, mirror those.)

- [ ] **Step 4: Render the new sections at the insertion point**

After the existing hero `<section>` block, before threads, insert:

```tsx
<PerspectiveLayers perspectives={perspectives} />
<IntersectionOfTruths insight={insight} />
{person && (
  <AskCoachCTA
    personId={person.personId}
    firstName={person.name.split(' ')[0]}
    entryCount={entryCount}
    contributionCount={contributionCount}
  />
)}
```

- [ ] **Step 5: Smoke check**

Open `/people/[someId]` for a person who has at least one contribution. Confirm:
- The new sections render between the hero and the threads
- If no contributions exist, the components render nothing (PerspectiveLayers is empty; IntersectionOfTruths is null; AskCoachCTA still renders with 0 counts — which is fine)
- The existing threads/timeline/notes below remain intact

- [ ] **Step 6: Commit**

```bash
git add src/app/people/[personId]/page.tsx
git commit -m "feat(manual): insert PerspectiveLayers + IntersectionOfTruths + AskCoachCTA on person page"
```

---

### Task B5: Phase-B smoke test

**Files:** (none modified)

- [ ] **Step 1: Run unit tests for new components**

```bash
npx vitest run src/components/manual/__tests__/
```

Expected: 2 test files, all PASS.

- [ ] **Step 2: Manual browser check**

Visit `/people/[someId]`. Confirm new sections render. If `synthesizedContent` is empty/null on the manual, the IntersectionOfTruths section is absent (correct). If there are zero completed contributions, PerspectiveLayers is empty (correct).

No commit needed.

---

## Phase C — Therapy Brief + Idle Auto-lock

The Therapy brief currently renders themed clusters with verbatim quotes (per `src/app/therapy/[briefId]/page.tsx`, 434 lines). The Stitch design replaces this with a "Narrative Summary" — sectioned narrative paragraphs (Current Emotional Landscape, Core Conflict Perspectives, Interpersonal Dynamics, Somatic Observations) plus a 10-min idle auto-lock.

### Task C1: TDD the `useIdleLock` hook

**Files:**
- Create: `src/hooks/useIdleLock.ts`
- Create: `src/hooks/__tests__/useIdleLock.test.ts`

The hook tracks user activity. After N ms of idle, it fires `onLock`. Silent until the last `warnAtMs` ms, when it surfaces a `warningActive` flag.

- [ ] **Step 1: Write the failing tests**

```ts
// src/hooks/__tests__/useIdleLock.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useIdleLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not call onLock before idleMs elapses', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(onLock).not.toHaveBeenCalled();
  });

  it('calls onLock after idleMs of inactivity', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(1001); });
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('warningActive is true within warnAtMs of the deadline', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    const { result } = renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current.warningActive).toBe(false);
    act(() => { vi.advanceTimersByTime(150); }); // total 850, within 200 of 1000
    expect(result.current.warningActive).toBe(true);
  });

  it('resetting the timer cancels the lock', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    const { result } = renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.reset(); });
    act(() => { vi.advanceTimersByTime(900); });
    expect(onLock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onLock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npx vitest run src/hooks/__tests__/useIdleLock.test.ts
```

- [ ] **Step 3: Write the hook**

```ts
// src/hooks/useIdleLock.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseIdleLockOptions {
  idleMs: number;
  /** Surface a warning when this many ms remain. */
  warnAtMs: number;
  /** Called when idleMs elapses without a reset. */
  onLock: () => void;
}

export interface UseIdleLockReturn {
  /** True when warnAtMs remain until lock. */
  warningActive: boolean;
  /** Reset the timer (e.g., on user interaction). */
  reset: () => void;
}

export function useIdleLock({ idleMs, warnAtMs, onLock }: UseIdleLockOptions): UseIdleLockReturn {
  const [warningActive, setWarningActive] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const clearTimers = useCallback(() => {
    if (lockTimer.current) { clearTimeout(lockTimer.current); lockTimer.current = null; }
    if (warnTimer.current) { clearTimeout(warnTimer.current); warnTimer.current = null; }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setWarningActive(false);
    warnTimer.current = setTimeout(() => setWarningActive(true), idleMs - warnAtMs);
    lockTimer.current = setTimeout(() => { onLockRef.current?.(); }, idleMs);
  }, [idleMs, warnAtMs, clearTimers]);

  useEffect(() => {
    reset();
    return clearTimers;
  }, [reset, clearTimers]);

  return { warningActive, reset };
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npx vitest run src/hooks/__tests__/useIdleLock.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useIdleLock.ts src/hooks/__tests__/useIdleLock.test.ts
git commit -m "feat(therapy): add useIdleLock hook with warning + reset"
```

---

### Task C2: Build `BriefIdleLock` overlay component

**Files:**
- Create: `src/components/therapy/BriefIdleLock.tsx`
- Create: `src/components/therapy/__tests__/BriefIdleLock.test.tsx`

Renders:
- A small warning chip in the corner when `warningActive` is true (last 60s)
- A full-screen overlay with `PinKeypad` when `locked` is true, blocking the brief

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/therapy/__tests__/BriefIdleLock.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/privacy/PinKeypad', () => ({
  PinKeypad: ({ title }: { title: string }) => <div data-testid="pin-keypad">{title}</div>,
}));

describe('BriefIdleLock', () => {
  it('renders nothing when not locked and no warning', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    const { container } = render(
      <BriefIdleLock locked={false} warningActive={false} onUnlock={async () => true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a warning chip when warningActive is true', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    render(<BriefIdleLock locked={false} warningActive={true} onUnlock={async () => true} />);
    expect(screen.getByText(/locking soon/i)).toBeInTheDocument();
  });

  it('renders the PIN keypad overlay when locked', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    render(<BriefIdleLock locked={true} warningActive={false} onUnlock={async () => true} />);
    expect(screen.getByTestId('pin-keypad')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npx vitest run src/components/therapy/__tests__/BriefIdleLock.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/therapy/BriefIdleLock.tsx
'use client';

import type { CSSProperties } from 'react';
import { PinKeypad } from '@/components/privacy/PinKeypad';

export interface BriefIdleLockProps {
  locked: boolean;
  warningActive: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
}

export function BriefIdleLock({ locked, warningActive, onUnlock }: BriefIdleLockProps) {
  if (!locked && !warningActive) return null;
  return (
    <>
      {warningActive && !locked && (
        <div role="status" aria-live="polite" style={warningStyle}>
          Locking soon — tap to stay
        </div>
      )}
      {locked && (
        <div role="dialog" aria-modal="true" style={overlayStyle}>
          <div style={panelStyle}>
            <p style={overlayEyebrowStyle}>Brief locked</p>
            <h2 style={overlayTitleStyle}>Re-enter your PIN to resume.</h2>
            <PinKeypad
              title="Enter your PIN"
              onSubmit={onUnlock}
            />
          </div>
        </div>
      )}
    </>
  );
}

const warningStyle: CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 80,
  padding: '10px 14px',
  background: 'var(--r-leather, #14100C)',
  color: 'var(--r-cream, #FAF8F3)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.18)',
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(20, 16, 12, 0.92)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const panelStyle: CSSProperties = {
  background: 'var(--r-cream, #FAF8F3)',
  borderRadius: 8,
  padding: '36px 40px',
  maxWidth: 360,
  width: '92%',
  textAlign: 'center',
};

const overlayEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 12px',
};

const overlayTitleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 24,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 22px',
};
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npx vitest run src/components/therapy/__tests__/BriefIdleLock.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/therapy/BriefIdleLock.tsx src/components/therapy/__tests__/BriefIdleLock.test.tsx
git commit -m "feat(therapy): add BriefIdleLock overlay with warning chip + PIN re-entry"
```

---

### Task C3: Restructure `/therapy/[briefId]` to narrative sections + idle lock

**Files:**
- Modify: `src/app/therapy/[briefId]/page.tsx`

- [ ] **Step 1: Read the current file to map existing data fields**

```bash
head -120 "src/app/therapy/[briefId]/page.tsx"
```

Note the brief shape — `themes`, `verbatimQuotes`, `sessionNotes`, etc. Map these to the new narrative sections:
- "Current Emotional Landscape" — synthesis paragraph from the brief
- "Core Conflict Perspectives" — pulled quotes with attribution labels
- "Interpersonal Dynamics" — synthesis paragraph
- "Somatic Observations" — synthesis paragraph

The exact field names on the brief document may not match the section names. The Cloud Function `generateTherapyBrief` may already produce these fields, or it may produce a single narrative blob that needs sectioning. **Read the brief document type at `src/types/therapy-brief.ts` (or similar) before mapping.**

If the brief document doesn't have separate fields for the four sections, **note this as a follow-up: the Cloud Function would need to be updated to produce them.** For Plan 2, fall back to whatever fields exist — render available content under best-fit headings, and leave a TODO comment in the code for the Cloud Function update.

- [ ] **Step 2: Add idle-lock state**

In the `TherapyBriefDetailPage` component, add the `useIdleLock` hook + a `briefLocked` state. The hook fires `onLock` after 10 minutes of idle (600000 ms), with a 60s warning (60000 ms).

```tsx
import { useIdleLock } from '@/hooks/useIdleLock';
import { BriefIdleLock } from '@/components/therapy/BriefIdleLock';

// Inside TherapyBriefDetailPage:
const [briefLocked, setBriefLocked] = useState(false);
const { warningActive, reset: resetIdleTimer } = useIdleLock({
  idleMs: 10 * 60 * 1000,
  warnAtMs: 60 * 1000,
  onLock: () => setBriefLocked(true),
});

// Reset on any interaction:
useEffect(() => {
  const events = ['mousemove', 'keydown', 'scroll', 'click'] as const;
  const handler = () => resetIdleTimer();
  events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
  return () => events.forEach((e) => document.removeEventListener(e, handler));
}, [resetIdleTimer]);

// Unlock handler: verify PIN via the existing privacyLock.verify, restore scroll position.
const scrollPos = useRef(0);
useEffect(() => {
  if (briefLocked) scrollPos.current = window.scrollY;
}, [briefLocked]);

const handleUnlock = async (pin: string) => {
  const ok = await lock.verify(pin);
  if (ok) {
    setBriefLocked(false);
    setTimeout(() => window.scrollTo(0, scrollPos.current), 0);
  }
  return ok;
};
```

- [ ] **Step 3: Replace the page body with narrative sections**

Read the existing return JSX and identify where themed clusters are rendered. Replace with sectioned narrative:

```tsx
return (
  <main style={mainStyle}>
    <div style={pageStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Secure Session Brief</p>
        <h1 style={titleStyle}>Narrative Summary</h1>
        <p style={periodStyle}>{formatPeriod(brief.windowStart, brief.windowEnd)}</p>
      </header>

      <Section heading="Current Emotional Landscape" body={brief.emotionalLandscape ?? brief.summary ?? ''} />
      <Section
        heading="Core Conflict Perspectives"
        quotes={brief.coreQuotes ?? []}
      />
      <Section heading="Interpersonal Dynamics" body={brief.interpersonal ?? ''} image={brief.image} />
      <Section heading="Somatic Observations" body={brief.somatic ?? ''} />

      <footer style={footerStyle}>
        <button style={ctaPrimaryStyle} onClick={onDownloadPdf}>Download PDF</button>
        <button style={ctaSecondaryStyle} onClick={onArchive}>Archive Brief</button>
      </footer>
    </div>

    <BriefIdleLock
      locked={briefLocked}
      warningActive={warningActive}
      onUnlock={handleUnlock}
    />
  </main>
);
```

Define `Section`, `formatPeriod`, and the style objects in the same file. If `brief.coreQuotes` doesn't exist on the document, render an empty array and leave a TODO comment.

- [ ] **Step 4: Preserve `sessionNotes` functionality**

The existing page has a session-notes textarea (carried into the next brief's prompt). Preserve this — add it as a final section labeled "Notes for next time" below the four narrative sections.

- [ ] **Step 5: Smoke check in browser**

Open `/therapy`, unlock with PIN, click an existing brief. Confirm the four sections render (some may be empty if the Cloud Function doesn't produce those fields yet — that's expected). Confirm idle-lock fires after 10 minutes (or temporarily shorten `idleMs` to 30 seconds during testing, then revert).

- [ ] **Step 6: Commit**

```bash
git add src/app/therapy/[briefId]/page.tsx
git commit -m "feat(therapy): narrative-summary layout + 10-min idle auto-lock"
```

---

### Task C4: Phase-C smoke test

**Files:** (none modified)

- [ ] **Step 1: Run all therapy + hook tests**

```bash
npx vitest run src/hooks/__tests__/useIdleLock.test.ts src/components/therapy/__tests__/
```

Expected: all PASS.

- [ ] **Step 2: Manual browser flow**

1. Open `/therapy` (PIN-gated).
2. Set/unlock PIN, prepare a brief.
3. Open the brief.
4. Wait 10 min idle (or temporarily reduce timer for testing).
5. Confirm: warning chip appears at 9 min, full overlay appears at 10 min.
6. Enter PIN — overlay clears, scroll position restored.

No commit.

---

## Phase D — Rituals Two-Column Layout

The Rituals page currently shows one column: couple ritual setup or "Begin today's session". The Stitch design adds:
- **Current Focus card** pinned at the top, surfacing a micro-action from the active experiment
- **Two-column body** — couple ritual (and future Family Check-ins section in Plan 3) on the left, Experiments preview on the right
- **Inspired by your Journal** card below — AI-derived suggestion tying a recent journal entry back to ritual refinement

### Task D1: Build `CurrentFocusCard`

**Files:**
- Create: `src/components/rituals/CurrentFocusCard.tsx`
- Create: `src/components/rituals/__tests__/CurrentFocusCard.test.tsx`

Renders a pinned card with one micro-action drawn from an active experiment. Suppressed when no active experiment exists or no item is queued.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/rituals/__tests__/CurrentFocusCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('CurrentFocusCard', () => {
  it('renders the focus title + experiment label when an item is active', async () => {
    const { CurrentFocusCard } = await import('@/components/rituals/CurrentFocusCard');
    render(
      <CurrentFocusCard
        focus={{
          title: 'Morning Reflection',
          body: 'Take 3 minutes to write one thing you appreciate.',
          experimentLabel: 'Gratitude experiment',
          actionHref: '/experiments/exp-1',
        }}
      />,
    );
    expect(screen.getByText(/Current Focus/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Reflection/i)).toBeInTheDocument();
    expect(screen.getByText(/Gratitude experiment/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Complete Action/i })).toHaveAttribute('href', '/experiments/exp-1');
  });

  it('renders nothing when focus is null', async () => {
    const { CurrentFocusCard } = await import('@/components/rituals/CurrentFocusCard');
    const { container } = render(<CurrentFocusCard focus={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
npx vitest run src/components/rituals/__tests__/CurrentFocusCard.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/rituals/CurrentFocusCard.tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface CurrentFocus {
  title: string;
  body: string;
  experimentLabel: string;
  actionHref: string;
}

export function CurrentFocusCard({ focus }: { focus: CurrentFocus | null }) {
  if (!focus) return null;
  return (
    <section aria-label="Current focus" style={sectionStyle}>
      <p style={eyebrowStyle}>Current Focus</p>
      <article style={cardStyle}>
        <h3 style={titleStyle}>{focus.title}</h3>
        <p style={bodyStyle}>{focus.body}</p>
        <p style={metaStyle}>
          This micro-action stems from your <em style={{ fontStyle: 'italic' }}>{focus.experimentLabel}</em>.
        </p>
        <Link href={focus.actionHref} style={ctaStyle}>Complete Action</Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { maxWidth: 1080, margin: '0 auto 24px' };
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const cardStyle: CSSProperties = {
  background: 'rgba(124, 144, 130, 0.10)',
  border: '1px solid rgba(124, 144, 130, 0.24)',
  borderRadius: 8,
  padding: '22px 26px',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 22,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 8px',
};
const bodyStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--r-text-2, #3A3530)',
  margin: '0 0 8px',
};
const metaStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 14,
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 16px',
};
const ctaStyle: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  background: 'transparent',
  border: '1px solid var(--r-ink, #2B2620)',
  borderRadius: 4,
  color: 'var(--r-ink, #2B2620)',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
npx vitest run src/components/rituals/__tests__/CurrentFocusCard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/rituals/CurrentFocusCard.tsx src/components/rituals/__tests__/CurrentFocusCard.test.tsx
git commit -m "feat(rituals): add CurrentFocusCard component"
```

---

### Task D2: Build `ExperimentsColumn`

**Files:**
- Create: `src/components/rituals/ExperimentsColumn.tsx`

A preview column showing one active experiment (hypothesis statement, progress bar, "Record Observation" CTA) and a "Recent Discovery" tile. Reads from `useGrowthFeed` (the existing experiments data source — name not renamed in vocabulary swap).

- [ ] **Step 1: Write the component**

```tsx
// src/components/rituals/ExperimentsColumn.tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';

export function ExperimentsColumn() {
  const { arcGroups, loading } = useGrowthFeed();
  if (loading) return <aside style={colStyle}><p style={mutedStyle}>Loading…</p></aside>;

  // Pick the most-active arc as the "Active Hypothesis"
  const active = arcGroups[0];
  if (!active) {
    return (
      <aside style={colStyle}>
        <p style={eyebrowStyle}>Experiments</p>
        <p style={emptyStyle}>No active experiments yet.</p>
      </aside>
    );
  }

  const arc = active.arc;
  const next = active.activeItems[0];

  return (
    <aside style={colStyle}>
      <p style={eyebrowStyle}>Experiments</p>
      <p style={subEyebrowStyle}>Iterative living</p>
      <article style={hypothesisCardStyle}>
        <p style={hypothesisEyebrowStyle}>Active Hypothesis</p>
        <p style={hypothesisStatementStyle}>{arc.outcomeStatement ?? arc.title}</p>
        <div style={progressBarStyle} aria-hidden>
          <div style={{ ...progressFillStyle, width: `${Math.min(100, Math.max(0, active.progress))}%` }} />
        </div>
        <p style={progressTextStyle}>
          Day {arc.currentWeek ?? '?'} of {arc.durationWeeks ?? '?'}
        </p>
        {next && (
          <Link href={`/experiments/${arc.arcId}`} style={recordCtaStyle}>
            Record Observation
          </Link>
        )}
      </article>

      <p style={discoveryEyebrowStyle}>Recent Discovery</p>
      <Link href={`/experiments/${arc.arcId}`} style={discoveryRowStyle}>
        {next?.title ?? arc.title}
        <span aria-hidden style={{ marginLeft: 8 }}>›</span>
      </Link>
    </aside>
  );
}

const colStyle: CSSProperties = {};
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 4px',
};
const subEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 14,
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 16px',
};
const hypothesisCardStyle: CSSProperties = {
  background: 'rgba(120, 100, 70, 0.06)',
  border: '1px solid rgba(120, 100, 70, 0.18)',
  borderRadius: 8,
  padding: '22px 24px',
  marginBottom: 28,
};
const hypothesisEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const hypothesisStatementStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 17,
  lineHeight: 1.5,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 18px',
};
const progressBarStyle: CSSProperties = {
  height: 4,
  background: 'rgba(60, 48, 28, 0.08)',
  borderRadius: 2,
  overflow: 'hidden',
  marginBottom: 6,
};
const progressFillStyle: CSSProperties = {
  height: '100%',
  background: 'var(--r-sage, #7C9082)',
  transition: 'width 420ms ease',
};
const progressTextStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  letterSpacing: '0.12em',
  color: 'var(--r-text-5, #8A7B5F)',
  margin: '0 0 16px',
};
const recordCtaStyle: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  background: 'var(--r-ink, #2B2620)',
  color: 'var(--r-cream, #FAF8F3)',
  borderRadius: 4,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
const discoveryEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 10px',
};
const discoveryRowStyle: CSSProperties = {
  display: 'block',
  padding: '14px 16px',
  background: 'var(--r-paper, #FDFBF6)',
  border: '1px solid rgba(120, 100, 70, 0.18)',
  borderRadius: 6,
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 15,
  color: 'var(--r-ink, #2B2620)',
  textDecoration: 'none',
};
const mutedStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  color: 'var(--r-text-4, #6B6254)',
};
const emptyStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  color: 'var(--r-text-4, #6B6254)',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rituals/ExperimentsColumn.tsx
git commit -m "feat(rituals): add ExperimentsColumn preview component"
```

(No standalone test — exercised via the rituals page integration in Task D4.)

---

### Task D3: Build `InspiredByJournalCard`

**Files:**
- Create: `src/components/rituals/InspiredByJournalCard.tsx`

A card below the two-column body suggesting a ritual refinement based on a recent journal entry. For v1, this is a placeholder that takes a `suggestion` prop and renders it. The AI suggestion-generation logic is out of scope for Plan 2 (a future task can wire it to a Cloud Function).

- [ ] **Step 1: Write the component**

```tsx
// src/components/rituals/InspiredByJournalCard.tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export interface JournalSuggestion {
  /** Excerpt from a recent journal entry that triggered the suggestion. */
  excerpt: string;
  /** Date label for the entry (e.g., "Tuesday"). */
  excerptDate: string;
  /** AI-derived suggestion text. */
  suggestion: string;
  /** Action label, e.g., "Refine Ritual". */
  ctaLabel: string;
  /** Action target. */
  ctaHref: string;
}

export function InspiredByJournalCard({ suggestion }: { suggestion: JournalSuggestion | null }) {
  if (!suggestion) return null;
  return (
    <section aria-label="Inspired by your journal" style={sectionStyle}>
      <article style={cardStyle}>
        <p style={eyebrowStyle}>Inspired by your Journal</p>
        <p style={bodyStyle}>
          Your entry from <em style={{ fontStyle: 'italic' }}>{suggestion.excerptDate}</em> mentioned <em style={{ fontStyle: 'italic' }}>&ldquo;{suggestion.excerpt}&rdquo;</em>. {suggestion.suggestion}
        </p>
        <Link href={suggestion.ctaHref} style={ctaStyle}>{suggestion.ctaLabel}</Link>
      </article>
    </section>
  );
}

const sectionStyle: CSSProperties = { maxWidth: 1080, margin: '32px auto 0' };
const cardStyle: CSSProperties = {
  background: 'var(--r-paper, #FDFBF6)',
  border: '1px solid rgba(120, 100, 70, 0.18)',
  borderRadius: 8,
  padding: '22px 26px',
};
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 12px',
};
const bodyStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--r-text-2, #3A3530)',
  margin: '0 0 16px',
};
const ctaStyle: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  background: 'transparent',
  border: '1px solid var(--r-ink, #2B2620)',
  borderRadius: 4,
  color: 'var(--r-ink, #2B2620)',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rituals/InspiredByJournalCard.tsx
git commit -m "feat(rituals): add InspiredByJournalCard component"
```

---

### Task D4: Refactor Rituals page to two-column layout

**Files:**
- Modify: `src/app/rituals/ClientPage.tsx`

Restructure the page: Current Focus card at top → two-column grid (couple ritual on left, ExperimentsColumn on right) → Inspired-by-Journal card at bottom.

- [ ] **Step 1: Add imports**

```tsx
import { CurrentFocusCard, type CurrentFocus } from '@/components/rituals/CurrentFocusCard';
import { ExperimentsColumn } from '@/components/rituals/ExperimentsColumn';
import { InspiredByJournalCard, type JournalSuggestion } from '@/components/rituals/InspiredByJournalCard';
```

- [ ] **Step 2: Wire up the Current Focus data source**

Pull from `useGrowthFeed`. The first active item across all arcs becomes the Current Focus:

```tsx
import { useGrowthFeed } from '@/hooks/useGrowthFeed';

// Inside ClientPage:
const { arcGroups } = useGrowthFeed();
const currentFocus: CurrentFocus | null = useMemo(() => {
  const firstWithItem = arcGroups.find((g) => g.activeItems.length > 0);
  if (!firstWithItem) return null;
  const item = firstWithItem.activeItems[0];
  return {
    title: item.title ?? firstWithItem.arc.title,
    body: item.description ?? 'A small step from your current experiment.',
    experimentLabel: firstWithItem.arc.title,
    actionHref: `/experiments/${firstWithItem.arc.arcId}`,
  };
}, [arcGroups]);
```

(If the `useGrowthFeed` hook hasn't been imported into the file already, add the import. Same for `useMemo`.)

- [ ] **Step 3: Stub the InspiredByJournal suggestion**

For v1, this is a static placeholder that surfaces only when there's an entry from the user. Real AI-derived suggestions are a follow-on task. Use the most recent journal entry's first line as the excerpt:

```tsx
import { useJournalEntries } from '@/hooks/useJournalEntries';

// Inside ClientPage:
const { entries } = useJournalEntries();
const inspiredSuggestion: JournalSuggestion | null = useMemo(() => {
  const recent = entries[0];
  if (!recent) return null;
  const when = recent.createdAt?.toDate?.();
  return {
    excerpt: (recent.text ?? '').slice(0, 80),
    excerptDate: when ? when.toLocaleDateString('en-US', { weekday: 'long' }) : 'recently',
    suggestion: 'Want to bring this into your next ritual?',
    ctaLabel: 'Refine Ritual',
    ctaHref: '/rituals/couple/manage',
  };
}, [entries]);
```

- [ ] **Step 4: Restructure the JSX**

Replace the existing single-column body with:

```tsx
<Chrome>
  <p className="eyebrow">Rituals</p>
  <h1 className="title">
    Quiet rhythms <span className="italic">for two</span>.
  </h1>
  <p className="lede">
    A ritual is a recurring moment you set aside on purpose. Between rituals,
    Relish stays out of your way.
  </p>

  <CurrentFocusCard focus={currentFocus} />

  <section style={twoColStyle}>
    <div style={leftColStyle}>
      <p className="section-eyebrow">Your couple check-in</p>
      {/* Preserve the existing empty-card and active-card rendering — paste them here unchanged */}
      {!ritual && (/* existing empty-card JSX */)}
      {ritual && pastSessions.length > 0 && (/* existing past-sessions block */)}
      {ritual && (/* existing active-card JSX */)}
    </div>

    <ExperimentsColumn />
  </section>

  <InspiredByJournalCard suggestion={inspiredSuggestion} />
</Chrome>
```

Add the layout styles inline (or in the existing `<style jsx>` block — but prefer inline `style={...}` to match the rest of Plan 2's convention):

```tsx
const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
  gap: 40,
  margin: '0 auto',
  maxWidth: 1080,
};
const leftColStyle: CSSProperties = {};

// Mobile: stack to one column. The Chrome wrapper already handles the responsive container.
// Add a media query inline:
```

Mobile collapse:

```tsx
<style>{`
  @media (max-width: 859px) {
    .rituals-two-col { grid-template-columns: 1fr !important; }
  }
`}</style>
```

(Use a `className="rituals-two-col"` on the grid div if you go the className route, or duplicate the style with a useEffect-based width check.)

- [ ] **Step 5: Smoke check**

Open `/rituals`. Confirm:
- Current Focus card appears at top if any experiment has an active item
- Two-column layout on desktop, single column on mobile
- Existing couple-ritual empty-state / active-state still renders correctly in the left column
- Experiments preview renders in the right column
- Inspired-by-Journal card renders at the bottom if you have at least one journal entry

- [ ] **Step 6: Commit**

```bash
git add src/app/rituals/ClientPage.tsx
git commit -m "feat(rituals): two-column layout with Current Focus + Experiments + Inspired-by-Journal"
```

---

### Task D5: Phase-D smoke test

**Files:** (none modified)

- [ ] **Step 1: Run rituals tests**

```bash
npx vitest run src/components/rituals/__tests__/
```

Expected: PASS.

- [ ] **Step 2: Manual browser check**

Walk through `/rituals` in three states:
- No active experiments, no ritual → CurrentFocusCard absent, left column shows empty-state messaging from Plan 1
- Active experiments, no ritual → CurrentFocusCard renders, left column still shows empty-state
- Active experiments + ritual exists → CurrentFocusCard, left column shows ritual card, right column shows Experiments preview

---

## Phase E — Plan 2 Wrap

### Task E1: End-to-end smoke test

**Files:** (none modified)

- [ ] **Step 1: Run full unit test suite**

```bash
npm run test:run 2>&1 | tail -25
```

Pre-existing failures unchanged. All Plan 2 tests passing (≥10 new tests across PerspectiveLayers, IntersectionOfTruths, BriefIdleLock, CurrentFocusCard, useIdleLock).

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -E "src/(components|hooks|app)/(manual|therapy|rituals|journal-first|app)" | head -20
```

Expected: no NEW errors in Plan 2-touched files.

- [ ] **Step 3: Lint**

```bash
npm run lint 2>&1 | tail -10
```

Pre-existing lint count unchanged.

- [ ] **Step 4: Manual browser walk**

1. `/` — masthead is your italic name, no salutation, no coach chips, Save button reads Keep, Recent Echoes group by subject
2. `/people/[someId]` — new Manual sections render above the existing threads/timeline
3. `/therapy/[someBriefId]` — narrative sections, idle warning at 9 min, full lock at 10 min, PIN re-entry restores scroll
4. `/rituals` — Current Focus pinned, two columns on desktop, Experiments preview on right, Inspired card at bottom

### Task E2: Update memory with Plan 2 outcome

**Files:**
- Create: `~/.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/project_plan_2_room_redesigns_shipped.md`
- Modify: `~/.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/MEMORY.md`

- [ ] **Step 1: Write the memory file**

```markdown
---
name: Plan 2 (Room Redesigns) shipped
description: Journal home masthead/echoes, Manual person view perspective layers, Therapy narrative + idle-lock, Rituals two-column — what landed and what's next
type: project
---

Shipped 2026-05-1X on branch `relish/ui-foundation` (or follow-on branch). Continues from Plan 1.

## What landed

- **Journal home** — masthead is the user's full name italic (no salutation), Coach chips removed, Save renamed to Keep, recent entries grouped into Recent Echoes by subject (About <kid> / Self / Relationships).
- **Family Manual person view (`/people/[personId]`)** — additive: new `PerspectiveLayers`, `IntersectionOfTruths`, and `AskCoachCTA` components inserted above the existing threads/timeline/notes sections. Underlying dossier preserved.
- **Therapy brief detail (`/therapy/[briefId]`)** — restructured to narrative sections (Current Emotional Landscape / Core Conflict Perspectives / Interpersonal Dynamics / Somatic Observations) with a new `useIdleLock` hook + `BriefIdleLock` overlay (10-min idle timer, warning at 9 min, full PIN re-entry overlay at 10 min, scroll position restored on unlock).
- **Rituals page (`/rituals/`)** — two-column layout: couple ritual on left, new `ExperimentsColumn` preview on right. `CurrentFocusCard` pinned at top surfaces a micro-action from the most-active experiment. `InspiredByJournalCard` at the bottom surfaces a recent entry + suggestion (stubbed for v1; AI source comes later).

## How to apply

- **Plan 3 (New Features) builds on this.** Unspoken Queue, Family check-ins setup in Rituals, child check-in 12-tile redesign are the remaining pieces.
- **Therapy Cloud Function may need updating** to produce the four narrative sections explicitly. Currently the renderer falls back to whatever fields exist on the brief document; sections will be empty until the function is updated.
- **InspiredByJournalCard is stubbed** with the most-recent journal entry's first line as the excerpt. Real AI-derived ritual-refinement suggestions are a future task.
```

- [ ] **Step 2: Add pointer to MEMORY.md**

Insert near the top (right after the Plan 1 pointer):

```
## ★ PLAN 2 (ROOM REDESIGNS) SHIPPED (2026-05-1X)
- [Plan 2 shipped](project_plan_2_room_redesigns_shipped.md) — Journal masthead/echoes, Manual perspective layers, Therapy narrative + idle-lock, Rituals two-column. Plan 3 pending.
```

- [ ] **Step 3: Commit the spec/plan changes (in-repo only — memory files are outside the repo)**

```bash
git add docs/superpowers/plans/2026-05-11-relish-ui-room-redesigns.md 2>/dev/null || true
# The plan file is already committed if we committed it earlier; otherwise commit now.
git status --short
```

If anything's uncommitted, commit it. Otherwise no-op.

---

## Out of Scope (Plan 2)

- **Unspoken Queue room** — Plan 3
- **Family check-ins (scheduled kid check-ins in Rituals)** — Plan 3
- **Child check-in 12-tile multi-select redesign** — Plan 3
- **AI-derived InspiredByJournal logic** — stubbed in Plan 2; the suggestion content is a placeholder. A future task wires a Cloud Function (or local inference) to produce real ritual-refinement suggestions.
- **Cloud Function updates to `generateTherapyBrief`** — Plan 2 renders sectioned narrative if the brief document has those fields; if it doesn't, sections fall back to existing field data. Updating the Cloud Function to produce the four sections is a follow-on.
- **Visual polish to match Stitch exactly** — Plan 2 implements the structure and approximate visual language. Pixel-level matching to Linen palette / Libre Caslon / Inter typography is incremental — each component uses CSS variables that the Stitch design system will populate.
- **Removing the existing person-page threads/timeline below the new Manual sections** — if you want to retire those, that's a separate decision in Plan 3 or later.
