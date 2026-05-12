# Relish UI New Features — Plan 3 Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three net-new product surfaces specced in the UI restructure spec: the **Unspoken Queue** as a first-class room; **scheduled Family check-ins** in the Rituals room; and the **child check-in 12-tile redesign** with Exit-to-parent button + Mama Stacy / Papa avatars + ritual chip.

**Architecture:** All three are independent features building on Plan 1's foundation (LayoutChrome, route renames) and Plan 2's room redesigns. Unspoken extends the existing `JournalEntry` shape with an `unspoken: boolean` flag (not a new collection). Family check-ins extend the existing `couple_rituals` collection with a `targetType` discriminator (couple vs. family-checkin) — same shape, broader use. Child check-in redesign replaces the current `/check-in/[personId]` page body while preserving per-person relationship feelings + switch-between-kids logic from Plan 2 patches.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase (Firestore + Cloud Functions). Inline `CSSProperties` styles. Vitest for unit tests, Playwright for any e2e (skip for v1). Existing components reused: `MicButton`, `PinKeypad` (not for kid mode), `LayoutChrome`.

---

## File Map

**New files:**
- `src/app/unspoken/page.tsx` — the new Unspoken room
- `src/components/unspoken/QueueList.tsx` — list of held entries
- `src/components/unspoken/IntegrationPathCard.tsx` — informational "what's coming next" card
- `src/components/unspoken/VellumStack.tsx` — Sanctuary for Stillness section linking to /archive
- `src/components/unspoken/__tests__/QueueList.test.tsx`
- `src/hooks/useUnspokenEntries.ts` — query journal_entries where `unspoken=true`
- `src/app/rituals/family/setup/page.tsx` — scheduled family check-in setup flow
- `src/components/rituals/FamilyCheckInsSection.tsx` — list of scheduled kid check-ins on /rituals
- `src/components/rituals/__tests__/FamilyCheckInsSection.test.tsx`
- `src/hooks/useFamilyCheckIns.ts` — query couple_rituals where `targetType='family-checkin'`

**Modified files:**
- `src/types/journal.ts` — add optional `unspoken?: boolean` to JournalEntry
- `src/types/couple-ritual.ts` (or equivalent) — add `targetType?: 'couple' | 'family-checkin'` discriminator and `targetPersonId?: string`
- `firestore.rules` — allow reading journal_entries with unspoken filter; allow reading family-checkin rituals
- `firestore.indexes.json` — add composite indexes for unspoken queue + family check-ins
- `src/app/journal/[entryId]/page.tsx` — add "Move to Unspoken" action
- `src/app/rituals/ClientPage.tsx` — render `FamilyCheckInsSection` below the couple ritual block
- `src/app/check-in/[personId]/page.tsx` — full redesign: 12 tiles, Exit-to-parent button, ritual chip, 3-avatar share picker; keep per-person feelings flow built in earlier patches
- `src/components/layout/leftRailItems.ts` — re-add `/check-in` to `HIDE_CHROME_ROUTES` (rail goes when the Exit button takes its place)

---

## Phase A — Unspoken Queue

The Unspoken room is a *holding queue* for journal entries the user has written but not yet "released." It uses the existing JournalEntry collection with a new `unspoken: boolean` flag — no new collection. Entry happens from the journal-entry detail page via a "Move to Unspoken" action. The room renders the queue list + an Integration Path card + a Vellum Stack component linking to /archive.

### Task A1: Extend the JournalEntry type with `unspoken`

**Files:**
- Modify: `src/types/journal.ts`

- [ ] **Step 1: Read the existing type**

```bash
grep -nE "interface JournalEntry|export type" src/types/journal.ts | head -10
```

- [ ] **Step 2: Add the field**

Add this field to the `JournalEntry` interface:

```ts
/** When true, this entry is in the Unspoken queue — written but not yet released for synthesis/rituals/therapy. Default false / undefined = published. */
unspoken?: boolean;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/journal.ts
git commit -m "feat(journal): add unspoken flag to JournalEntry type"
```

### Task A2: Add Firestore index for the Unspoken query

**Files:**
- Modify: `firestore.indexes.json`

The Unspoken page queries `journal_entries` where `unspoken=true`, scoped by `visibleToUserIds array-contains <userId>`, ordered by `createdAt desc`. This needs a composite index.

- [ ] **Step 1: Append the index**

Add to `firestore.indexes.json` (after the existing entries, before `"fieldOverrides"`):

```json
{
  "collectionGroup": "journal_entries",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "unspoken", "order": "ASCENDING" },
    { "fieldPath": "visibleToUserIds", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
```

- [ ] **Step 2: Deploy the index — REQUIRES CONTROLLER APPROVAL**

Firestore index deploys are shared-state actions. Report back to the controller with status `NEEDS_CONTEXT` requesting permission to run:

```
firebase deploy --only firestore:indexes
```

Once approved, run the deploy. Index builds take 2-5 minutes server-side.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(unspoken): add composite index for journal_entries(unspoken, visibleToUserIds, createdAt)"
```

### Task A3: Update Firestore rules for the Unspoken filter

**Files:**
- Modify: `firestore.rules`

The existing `journal_entries` read rule should already allow queries that filter by `visibleToUserIds`. Verify it accepts an additional `where('unspoken', '==', true)` constraint. If the rule uses an `allow list` clause with explicit query constraint checks, the new filter must be permitted there.

- [ ] **Step 1: Inspect the existing rule**

```bash
grep -A 20 "match /journal_entries" firestore.rules | head -40
```

- [ ] **Step 2: If the rule needs updating, update it**

If the rule uses `request.query` constraints, add `unspoken` to the allowed list. If the rule just checks `resource.data.visibleToUserIds` for reads, no change needed — the filter is handled at the query level.

- [ ] **Step 3: Deploy rules if changed — REQUIRES CONTROLLER APPROVAL**

```
firebase deploy --only firestore:rules
```

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(unspoken): allow journal_entries reads filtered by unspoken flag"
```

(If no change was needed, skip this commit.)

### Task A4: Build `useUnspokenEntries` hook

**Files:**
- Create: `src/hooks/useUnspokenEntries.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

export interface UseUnspokenEntriesReturn {
  entries: JournalEntry[];
  loading: boolean;
  error: Error | null;
}

const COLLECTION = 'journal_entries';

/**
 * Subscribe to unspoken journal entries visible to the current user.
 * Returns entries marked with `unspoken=true`, newest first.
 */
export function useUnspokenEntries(max = 30): UseUnspokenEntriesReturn {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(firestore, COLLECTION);
    const q = query(
      col,
      where('unspoken', '==', true),
      where('visibleToUserIds', 'array-contains', user.userId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ ...(d.data() as JournalEntry), entryId: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('useUnspokenEntries:', err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.userId, max]);

  return { entries, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUnspokenEntries.ts
git commit -m "feat(unspoken): add useUnspokenEntries subscription hook"
```

### Task A5: Build the QueueList component with tests

**Files:**
- Create: `src/components/unspoken/QueueList.tsx`
- Create: `src/components/unspoken/__tests__/QueueList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { JournalEntry } from '@/types/journal';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

describe('QueueList', () => {
  const entry: JournalEntry = {
    entryId: 'e1',
    authorId: 'u1',
    text: 'The weight of silence in the dining room.',
    createdAt: { toDate: () => new Date('2024-10-24T00:00:00Z') } as any,
    unspoken: true,
  } as JournalEntry;

  it('renders a row per entry with title and date', async () => {
    const { QueueList } = await import('@/components/unspoken/QueueList');
    render(<QueueList entries={[entry]} />);
    expect(screen.getByText(/weight of silence/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /weight of silence/i })).toHaveAttribute('href', '/journal/e1');
  });

  it('renders an empty state when no entries', async () => {
    const { QueueList } = await import('@/components/unspoken/QueueList');
    render(<QueueList entries={[]} />);
    expect(screen.getByText(/nothing held here yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npx vitest run src/components/unspoken/__tests__/QueueList.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { JournalEntry } from '@/types/journal';

export function QueueList({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <p style={emptyStyle}>
        <em>Nothing held here yet.</em> When you write something you're not ready
        to share, tap "Move to Unspoken" on the entry to keep it in this sanctuary
        until the right moment.
      </p>
    );
  }
  return (
    <section style={sectionStyle} aria-label="The queue">
      <div style={headerRowStyle}>
        <h2 style={headingStyle}>The Queue</h2>
        <span style={countStyle}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <ul style={listStyle}>
        {entries.map((e) => {
          const when = e.createdAt?.toDate?.();
          const headline = (e.text ?? '').split(/\n/)[0].slice(0, 120) || 'Untitled entry';
          return (
            <li key={e.entryId} style={rowStyle}>
              <Link href={`/journal/${e.entryId}`} style={rowLinkStyle}>
                <p style={dateStyle}>{when ? dateLabel(when) : ''}</p>
                <p style={titleStyle}>{headline}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

const sectionStyle: CSSProperties = { padding: '32px 0' };
const headerRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 };
const headingStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--r-ink, #2B2620)', margin: 0 };
const countStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)' };
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const rowStyle: CSSProperties = { borderTop: '1px solid rgba(120, 100, 70, 0.10)' };
const rowLinkStyle: CSSProperties = { display: 'block', padding: '18px 0', textDecoration: 'none', color: 'inherit' };
const dateStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-5, #8A7B5F)', margin: '0 0 6px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 18, lineHeight: 1.45, color: 'var(--r-ink, #2B2620)', margin: 0 };
const emptyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--r-text-3, #5C5347)', margin: '32px 0', maxWidth: '56ch' };
```

- [ ] **Step 4: Run test, confirm PASS**

```bash
npx vitest run src/components/unspoken/__tests__/QueueList.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/unspoken/QueueList.tsx src/components/unspoken/__tests__/QueueList.test.tsx
git commit -m "feat(unspoken): add QueueList component"
```

### Task A6: Build IntegrationPathCard

**Files:**
- Create: `src/components/unspoken/IntegrationPathCard.tsx`

A dark informational card noting what's coming up that could consume unspoken items (next ritual, next therapy brief). For v1, props are passed in by the parent page from existing hooks.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import type { CSSProperties } from 'react';

export interface IntegrationPathSlot {
  label: string;     // e.g., "Next session" or "Upcoming ritual"
  value: string;     // e.g., "Oct 28 · 10:00 AM" or "Full Moon Reflection"
}

export function IntegrationPathCard({ slots }: { slots: IntegrationPathSlot[] }) {
  return (
    <section style={cardStyle} aria-label="Integration path">
      <p style={eyebrowStyle}>Integration Path</p>
      <p style={bodyStyle}>
        Your unspoken words are held here until you choose to bring them forward.
        They wait — without pressure — for the next ritual, session, or moment of
        readiness.
      </p>
      {slots.length > 0 && (
        <div style={slotRowStyle}>
          {slots.map((s, i) => (
            <div key={i} style={slotStyle}>
              <span style={slotLabelStyle}>{s.label}</span>
              <span style={slotValueStyle}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const cardStyle: CSSProperties = { background: 'var(--r-leather, #14100C)', color: 'var(--r-cream, #FAF8F3)', borderRadius: 8, padding: '24px 28px', margin: '32px 0' };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250, 248, 243, 0.72)', margin: '0 0 12px' };
const bodyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 15, lineHeight: 1.55, color: 'rgba(250, 248, 243, 0.88)', margin: '0 0 18px', maxWidth: '52ch' };
const slotRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 };
const slotStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const slotLabelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250, 248, 243, 0.6)' };
const slotValueStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--r-cream, #FAF8F3)' };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/unspoken/IntegrationPathCard.tsx
git commit -m "feat(unspoken): add IntegrationPathCard component"
```

### Task A7: Build VellumStack section

**Files:**
- Create: `src/components/unspoken/VellumStack.tsx`

A small "Sanctuary for Stillness" component with a link to /archive.

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export function VellumStack() {
  return (
    <section style={sectionStyle} aria-label="Sanctuary for stillness">
      <p style={eyebrowStyle}>Sanctuary for Stillness</p>
      <p style={bodyStyle}>
        The Unspoken is layered, not lost. Entries you held here become part of
        the deeper record — viewable in the Archive when you're ready to
        revisit them.
      </p>
      <Link href="/archive" style={linkStyle}>Explore the Archive ⟶</Link>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', borderTop: '1px solid rgba(120, 100, 70, 0.12)' };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 14px' };
const bodyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--r-text-3, #5C5347)', margin: '0 0 18px', maxWidth: '58ch' };
const linkStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-ink, #2B2620)', textDecoration: 'none', borderBottom: '1px solid var(--r-ink, #2B2620)', paddingBottom: 2 };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/unspoken/VellumStack.tsx
git commit -m "feat(unspoken): add VellumStack section linking to Archive"
```

### Task A8: Build the Unspoken page

**Files:**
- Create: `src/app/unspoken/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';
/* ================================================================
   /unspoken — a private holding queue for journal entries the user
   has written but not yet released. Entries arrive here via the
   "Move to Unspoken" action on /journal/[entryId]. Display only —
   no auto-routing into rituals or therapy (predict, don't route).
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUnspokenEntries } from '@/hooks/useUnspokenEntries';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { QueueList } from '@/components/unspoken/QueueList';
import { IntegrationPathCard, type IntegrationPathSlot } from '@/components/unspoken/IntegrationPathCard';
import { VellumStack } from '@/components/unspoken/VellumStack';

export default function UnspokenPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { entries, loading } = useUnspokenEntries();
  const { ritual } = useCoupleRitual();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return <main style={appStyle}><div style={pageStyle}><p style={mutedStyle}>Opening…</p></div></main>;
  }
  if (!user) return null;

  // For v1 the integration-path slots are a best-effort summary: next ritual
  // (if scheduled) + a generic "next session" placeholder. When Therapy
  // sessions become first-class data, slot in the next-therapy-session here.
  const slots: IntegrationPathSlot[] = [];
  if (ritual) {
    slots.push({
      label: 'Next ritual',
      value: summarizeRitual(ritual),
    });
  }

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Safe Holding Space</p>
          <h1 style={titleStyle}>Thoughts awaiting their time.</h1>
          <p style={ledeStyle}>
            What you write here stays here — protected, unrouted, ready when
            you are. The Unspoken is a private sanctuary for the words you
            haven't yet said out loud.
          </p>
        </header>

        <QueueList entries={entries} />
        <IntegrationPathCard slots={slots} />
        <VellumStack />
      </div>
    </main>
  );
}

function summarizeRitual(r: { cadence: string; dayOfWeek: number; startTimeLocal: string }): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [h, m] = r.startTimeLocal.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${days[r.dayOfWeek]} ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '64px 32px 96px' };
const mutedStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
const headerStyle: CSSProperties = { textAlign: 'center', marginBottom: 12 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 14px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(36px, 5vw, 48px)', color: 'var(--r-ink, #2B2620)', margin: '0 0 16px' };
const ledeStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, lineHeight: 1.55, color: 'var(--r-text-3, #5C5347)', margin: '0 auto', maxWidth: '54ch' };
```

- [ ] **Step 2: Smoke check**

Navigate to `http://localhost:3000/unspoken` while logged in. Confirm:
- Page renders with hero
- QueueList shows "Nothing held here yet" empty state initially
- IntegrationPathCard shows the next ritual if scheduled
- VellumStack section appears at the bottom

- [ ] **Step 3: Commit**

```bash
git add src/app/unspoken/page.tsx
git commit -m "feat(unspoken): build /unspoken page (hero + queue + integration + vellum)"
```

### Task A9: Add "Move to Unspoken" action on journal entry detail

**Files:**
- Modify: `src/app/journal/[entryId]/page.tsx`

The entry detail page needs a button to mark the entry as unspoken — flipping `unspoken: true` on the document and routing to `/unspoken`.

- [ ] **Step 1: Find a reasonable place in the existing JSX for the action**

```bash
grep -nE "<button|<Link|delete|menu" "src/app/journal/[entryId]/page.tsx" | head -20
```

Look for the existing action toolbar / menu — likely a row of buttons near the header or in a footer.

- [ ] **Step 2: Add the action**

Import what's needed at the top of the file:

```tsx
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
```

Add a handler inside the component:

```tsx
const moveToUnspoken = async () => {
  if (!entry?.entryId) return;
  try {
    await updateDoc(doc(firestore, 'journal_entries', entry.entryId), { unspoken: true });
    router.push('/unspoken');
  } catch (err) {
    console.error('moveToUnspoken failed:', err);
    alert('Could not move this entry to Unspoken right now.');
  }
};
```

And a button in the JSX (placement: near the existing actions — share, delete, etc.):

```tsx
<button
  type="button"
  onClick={moveToUnspoken}
  style={{
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--r-ink, #2B2620)',
    background: 'transparent',
    border: '1px solid var(--r-ink, #2B2620)',
    borderRadius: 4,
    padding: '8px 14px',
    cursor: 'pointer',
  }}
>
  Hold this for later
</button>
```

(Copy: "Hold this for later" reads warmer than "Move to Unspoken" while doing the same thing.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/journal/[entryId]/page.tsx"
git commit -m "feat(unspoken): add 'Hold this for later' action on journal entry detail"
```

### Task A10: Phase A smoke test

- [ ] **Step 1: Run all Plan 3 tests so far**

```bash
npx vitest run src/components/unspoken/ src/hooks/__tests__/ 2>&1 | tail -15
```

- [ ] **Step 2: Manual flow**

1. Visit a journal entry → click "Hold this for later" → should route to `/unspoken` and the entry should appear in the queue.
2. Click the entry in the queue → routes back to `/journal/[entryId]`.
3. Lint + tests baseline unchanged.

---

## Phase B — Family Check-ins in Rituals

Extend the existing couple-ritual collection with a `targetType` discriminator (`couple` | `family-checkin`) so a single collection holds both. Family check-ins are scheduled recurring kid check-ins (e.g., "Weekly with Liam · Sundays 5pm"). On their scheduled time, the Rituals page surfaces "Begin check-in with [Name]" which routes into `/check-in/[personId]?ritualId=[id]`.

### Task B1: Extend the couple_rituals type

**Files:**
- Modify: `src/types/couple-ritual.ts` (or whatever the type file is — find it first)

- [ ] **Step 1: Find the type**

```bash
grep -rnE "interface CoupleRitual\|export type CoupleRitual" src/types/ | head -5
```

- [ ] **Step 2: Add fields**

Add to the `CoupleRitual` interface:

```ts
/** Discriminator: 'couple' (default) or 'family-checkin'. */
targetType?: 'couple' | 'family-checkin';
/** When targetType='family-checkin', the personId of the kid being checked in with. */
targetPersonId?: string;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/couple-ritual.ts
git commit -m "feat(rituals): add targetType discriminator for couple vs family-checkin"
```

### Task B2: Build `useFamilyCheckIns` hook

**Files:**
- Create: `src/hooks/useFamilyCheckIns.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { CoupleRitual } from '@/types/couple-ritual';

export interface UseFamilyCheckInsReturn {
  checkIns: CoupleRitual[];
  loading: boolean;
}

const COLLECTION = 'couple_rituals';

/**
 * Subscribe to scheduled family check-ins (couple_rituals where
 * targetType='family-checkin') for the current user's family.
 */
export function useFamilyCheckIns(): UseFamilyCheckInsReturn {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CoupleRitual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setCheckIns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const col = collection(firestore, COLLECTION);
    const q = query(
      col,
      where('familyId', '==', user.familyId),
      where('targetType', '==', 'family-checkin'),
      where('status', 'in', ['active', 'paused']),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCheckIns(snap.docs.map((d) => ({ ...(d.data() as CoupleRitual), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('useFamilyCheckIns:', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.familyId]);

  return { checkIns, loading };
}
```

- [ ] **Step 2: Add a composite index for the query**

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "couple_rituals",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "targetType", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
```

- [ ] **Step 3: Deploy index — REQUIRES CONTROLLER APPROVAL**

```
firebase deploy --only firestore:indexes
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useFamilyCheckIns.ts firestore.indexes.json
git commit -m "feat(rituals): add useFamilyCheckIns hook + composite index"
```

### Task B3: Build FamilyCheckInsSection component

**Files:**
- Create: `src/components/rituals/FamilyCheckInsSection.tsx`
- Create: `src/components/rituals/__tests__/FamilyCheckInsSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

describe('FamilyCheckInsSection', () => {
  const checkIn: any = {
    id: 'r1',
    targetType: 'family-checkin',
    targetPersonId: 'liam',
    cadence: 'weekly',
    dayOfWeek: 0,
    startTimeLocal: '17:00',
    durationMinutes: 15,
    status: 'active',
  };

  it('renders a row per check-in with begin link', async () => {
    const { FamilyCheckInsSection } = await import('@/components/rituals/FamilyCheckInsSection');
    render(<FamilyCheckInsSection checkIns={[checkIn]} kidNames={{ liam: 'Liam' }} />);
    expect(screen.getByText(/with Liam/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /begin/i })).toHaveAttribute('href', '/check-in/liam?ritualId=r1');
  });

  it('renders an empty add-new card when no check-ins', async () => {
    const { FamilyCheckInsSection } = await import('@/components/rituals/FamilyCheckInsSection');
    render(<FamilyCheckInsSection checkIns={[]} kidNames={{}} />);
    expect(screen.getByRole('link', { name: /set up a family check-in/i })).toHaveAttribute('href', '/rituals/family/setup');
  });
});
```

- [ ] **Step 2: Run test, confirm fails**

```bash
npx vitest run src/components/rituals/__tests__/FamilyCheckInsSection.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { CoupleRitual } from '@/types/couple-ritual';

export function FamilyCheckInsSection({
  checkIns,
  kidNames,
}: {
  checkIns: CoupleRitual[];
  kidNames: Record<string, string>;
}) {
  return (
    <section style={sectionStyle} aria-label="Family check-ins">
      <p style={eyebrowStyle}>Family Check-ins</p>
      {checkIns.length === 0 ? (
        <Link href="/rituals/family/setup" style={emptyCardStyle}>
          <p style={emptyTitleStyle}><em>A scheduled moment with a child.</em></p>
          <p style={emptyBodyStyle}>Set up a recurring check-in so it doesn't slip through the week.</p>
          <span style={ctaInlineStyle}>Set up a family check-in ⟶</span>
        </Link>
      ) : (
        <ul style={listStyle}>
          {checkIns.map((c) => {
            const name = c.targetPersonId ? (kidNames[c.targetPersonId] ?? 'a child') : 'a child';
            return (
              <li key={c.id} style={rowStyle}>
                <div style={rowMetaStyle}>
                  <p style={rowTitleStyle}>Check-in with <em>{name}</em></p>
                  <p style={rowCadenceStyle}>{cadenceLabel(c)}</p>
                </div>
                <Link
                  href={`/check-in/${c.targetPersonId ?? ''}?ritualId=${c.id}`}
                  style={beginCtaStyle}
                >
                  Begin
                </Link>
              </li>
            );
          })}
          <Link href="/rituals/family/setup" style={addLinkStyle}>
            + Add another check-in
          </Link>
        </ul>
      )}
    </section>
  );
}

function cadenceLabel(c: CoupleRitual): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const [h, m] = (c.startTimeLocal ?? '17:00').split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  const cadence = c.cadence === 'weekly' ? 'Weekly' : c.cadence === 'biweekly' ? 'Every other week' : 'Monthly';
  return `${cadence}, ${days[c.dayOfWeek ?? 0]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const sectionStyle: CSSProperties = { marginTop: 40 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-3, #5C5347)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid rgba(120, 100, 70, 0.12)' };
const emptyCardStyle: CSSProperties = { display: 'block', padding: '24px 26px', background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.14)', borderRadius: 8, textDecoration: 'none', color: 'inherit' };
const emptyTitleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 20, color: 'var(--r-ink, #2B2620)', margin: '0 0 8px' };
const emptyBodyStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 14, color: 'var(--r-text-3, #5C5347)', margin: '0 0 14px' };
const ctaInlineStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-ink, #2B2620)' };
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(120, 100, 70, 0.08)' };
const rowMetaStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const rowTitleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, color: 'var(--r-ink, #2B2620)', margin: 0 };
const rowCadenceStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, color: 'var(--r-text-4, #6B6254)', letterSpacing: '0.04em', margin: 0 };
const beginCtaStyle: CSSProperties = { padding: '8px 14px', background: 'var(--r-ink, #2B2620)', color: 'var(--r-cream, #FAF8F3)', borderRadius: 4, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' };
const addLinkStyle: CSSProperties = { display: 'inline-block', marginTop: 16, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', textDecoration: 'none' };
```

- [ ] **Step 4: Run test, confirm PASS**

```bash
npx vitest run src/components/rituals/__tests__/FamilyCheckInsSection.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/rituals/FamilyCheckInsSection.tsx src/components/rituals/__tests__/FamilyCheckInsSection.test.tsx
git commit -m "feat(rituals): add FamilyCheckInsSection component"
```

### Task B4: Build the family check-in setup page

**Files:**
- Create: `src/app/rituals/family/setup/page.tsx`

A simple form: pick a kid from the family, pick a cadence (weekly / biweekly / monthly), pick a day-of-week + time. On submit, create a `couple_rituals` doc with `targetType='family-checkin'`.

- [ ] **Step 1: Write the page**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { CSSProperties } from 'react';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';

export default function FamilyCheckInSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { people } = usePerson();
  const kids = people.filter((p) => p.relationshipType === 'child');

  const [targetPersonId, setTargetPersonId] = useState<string>(kids[0]?.personId ?? '');
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTimeLocal, setStartTimeLocal] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.familyId || !user?.userId || !targetPersonId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(firestore, 'couple_rituals'), {
        familyId: user.familyId,
        createdByUserId: user.userId,
        participantUserIds: [user.userId],
        targetType: 'family-checkin',
        targetPersonId,
        cadence,
        dayOfWeek,
        startTimeLocal,
        durationMinutes: 15,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push('/rituals');
    } catch (err) {
      console.error('family check-in create failed:', err);
      alert('Could not save right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Set up a family check-in</p>
          <h1 style={titleStyle}>A recurring moment, on the calendar.</h1>
        </header>

        <label style={fieldStyle}>
          <span style={labelStyle}>With</span>
          <select value={targetPersonId} onChange={(e) => setTargetPersonId(e.target.value)} style={selectStyle}>
            {kids.map((k) => <option key={k.personId} value={k.personId}>{k.name}</option>)}
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>How often</span>
          <select value={cadence} onChange={(e) => setCadence(e.target.value as any)} style={selectStyle}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every other week</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Day</span>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))} style={selectStyle}>
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Time</span>
          <input type="time" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} style={inputStyle} />
        </label>

        <button type="button" onClick={handleSubmit} disabled={submitting || !targetPersonId} style={submitStyle}>
          {submitting ? 'Saving…' : 'Save check-in'}
        </button>
      </div>
    </main>
  );
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 520, margin: '0 auto', padding: '64px 32px 96px' };
const headerStyle: CSSProperties = { marginBottom: 32 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 12px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 32, color: 'var(--r-ink, #2B2620)', margin: 0 };
const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 };
const labelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)' };
const selectStyle: CSSProperties = { padding: '10px 12px', fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, color: 'var(--r-ink, #2B2620)', background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.24)', borderRadius: 6 };
const inputStyle: CSSProperties = selectStyle;
const submitStyle: CSSProperties = { marginTop: 14, padding: '12px 18px', background: 'var(--r-ink, #2B2620)', color: 'var(--r-cream, #FAF8F3)', border: 'none', borderRadius: 4, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' };
```

- [ ] **Step 2: Commit**

```bash
git add src/app/rituals/family/setup/page.tsx
git commit -m "feat(rituals): add /rituals/family/setup form to create family check-ins"
```

### Task B5: Wire FamilyCheckInsSection into the Rituals page

**Files:**
- Modify: `src/app/rituals/ClientPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { FamilyCheckInsSection } from '@/components/rituals/FamilyCheckInsSection';
import { useFamilyCheckIns } from '@/hooks/useFamilyCheckIns';
```

- [ ] **Step 2: Pull data**

Inside `ClientPage`, after the existing hooks:

```tsx
const { people } = usePerson();
const { checkIns: familyCheckIns } = useFamilyCheckIns();

const kidNames = useMemo<Record<string, string>>(() => {
  const m: Record<string, string> = {};
  for (const p of people) m[p.personId] = p.name;
  return m;
}, [people]);
```

Add `usePerson` to the imports if it's not already there.

- [ ] **Step 3: Render the section in the left column**

In the left column of the two-column layout, after the couple-ritual block, add:

```tsx
<FamilyCheckInsSection checkIns={familyCheckIns} kidNames={kidNames} />
```

- [ ] **Step 4: Smoke check**

Visit `/rituals`. The left column should now show:
- Couple ritual card (existing)
- Family Check-ins section below it (empty-state CTA initially)

Click "Set up a family check-in" → land at `/rituals/family/setup`. Fill in a kid + day + time, save, redirect to /rituals. The new check-in should appear in the list.

- [ ] **Step 5: Commit**

```bash
git add src/app/rituals/ClientPage.tsx
git commit -m "feat(rituals): integrate FamilyCheckInsSection into the Rituals page"
```

---

## Phase C — Child Check-in Redesign

The current `/check-in/[personId]` page has been incrementally improved (multi-select chips, placeholder copy fix). Now we apply the full Plan 3 redesign: 12-tile multi-select grid, Exit-to-parent button, ritual chip when launched from a scheduled ritual, and a 3-avatar share picker (Mama Stacy / Papa / Everyone).

### Task C1: Hide chrome on /check-in again

**Files:**
- Modify: `src/components/layout/leftRailItems.ts`
- Modify: associated tests

When the Exit-to-parent button is in place, the rail goes back into hiding on the check-in page. Reverse the earlier "chrome restored" change.

- [ ] **Step 1: Re-add /check-in to HIDE_CHROME_ROUTES**

In `src/components/layout/leftRailItems.ts`:

```ts
export const HIDE_CHROME_ROUTES: readonly RegExp[] = [
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/check-in(\/|$)/,
];
```

Remove the explanatory comment about Plan 3 — it's now relevant context, not a TODO.

- [ ] **Step 2: Update tests**

In `src/components/layout/__tests__/leftRailItems.test.ts`, change the two `/check-in` rows from `false` back to `true`:

```ts
['/check-in/abc', true],
['/check-in/', true],
```

In `src/components/layout/__tests__/LeftRail.test.tsx` and `TopChrome.test.tsx`, change the "renders on /check-in" tests back to "returns null on /check-in" assertions (mirror what was there before the recent restoration).

- [ ] **Step 3: Run layout tests, confirm green**

```bash
npx vitest run src/components/layout/__tests__/ 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/leftRailItems.ts src/components/layout/__tests__/
git commit -m "fix(layout): hide chrome on /check-in (Exit-to-parent button replaces it)"
```

### Task C2: Update the kid feeling vocabulary

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx`

- [ ] **Step 1: Replace `KID_FEELINGS_SELF`**

In `src/app/check-in/[personId]/page.tsx`, find the existing `KID_FEELINGS_SELF` array (currently 8 entries: happy / calm / tired / worried / sad / mad / unsure / good). Replace it with the 12 locked tiles:

```ts
const KID_FEELINGS_SELF = [
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
];
```

(Icons are emoji here for v1 — when we have a proper SVG icon set we can swap. The 12 tiles match the spec.)

The grid layout should already be flexible (CSS grid), but verify the styles produce a 3×4 grid. If it currently uses `grid-template-columns: repeat(4, 1fr)`, switch to `repeat(3, 1fr)` for a 4-row × 3-column shape (matches the Stitch screen).

- [ ] **Step 2: Commit**

```bash
git add "src/app/check-in/[personId]/page.tsx"
git commit -m "feat(check-in): expand kid self-feelings to 12 tiles (locked vocabulary)"
```

### Task C3: Add Exit-to-parent button

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx`

Replace the current top-of-page top bar (or add a new one) with an explicit `✕ EXIT TO PARENT JOURNAL` button on the left. The kid-mode page has no rail (Task C1 hid chrome), so this button is the only way out.

- [ ] **Step 1: Find the top of the page JSX**

Look for the existing `<header>` or top-area JSX in the kid page.

- [ ] **Step 2: Replace / add the top bar**

```tsx
<header style={topBarStyle}>
  <Link href="/" style={exitButtonStyle}>
    <span aria-hidden style={{ marginRight: 8 }}>✕</span>
    Exit to parent journal
  </Link>
  {/* Optional: right-side icons (smiley + gear) per Stitch — skip if you don't have implementations */}
</header>
```

```tsx
const topBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '20px 28px',
  borderBottom: '1px solid rgba(120, 100, 70, 0.10)',
  background: 'var(--r-cream-deep, #F1EDEB)',
};
const exitButtonStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-text-3, #5C5347)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};
```

Make sure `Link` is imported.

- [ ] **Step 3: Commit**

```bash
git add "src/app/check-in/[personId]/page.tsx"
git commit -m "feat(check-in): add ✕ Exit to parent journal button at top"
```

### Task C4: Add Sunday Ritual chip when launched from a scheduled ritual

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx`

When the kid arrives at `/check-in/[personId]?ritualId=<id>`, fetch the ritual document and show a pill chip below the kid's name with the ritual's name (e.g., "Sunday Ritual"). When no `ritualId` is in the query, the chip is absent.

- [ ] **Step 1: Read the ritualId from the query**

```tsx
import { useSearchParams } from 'next/navigation';

// Inside the component:
const searchParams = useSearchParams();
const ritualId = searchParams?.get('ritualId') ?? null;
```

- [ ] **Step 2: Fetch the ritual document conditionally**

```tsx
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { CoupleRitual } from '@/types/couple-ritual';

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
```

- [ ] **Step 3: Render the chip**

Below the headline ("How are you today, Leo?"), conditionally:

```tsx
{ritualDoc && (
  <div style={ritualChipStyle}>
    <span aria-hidden style={{ marginRight: 6 }}>📅</span>
    {ritualNameFor(ritualDoc)}
  </div>
)}
```

```tsx
function ritualNameFor(r: CoupleRitual): string {
  if (r.cadence === 'weekly' && typeof r.dayOfWeek === 'number') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[r.dayOfWeek]} Ritual`;
  }
  return 'Scheduled Ritual';
}

const ritualChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(120, 100, 70, 0.08)',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: 'var(--r-text-3, #5C5347)',
  marginTop: 12,
};
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/check-in/[personId]/page.tsx"
git commit -m "feat(check-in): show ritual chip when launched from a scheduled ritual"
```

### Task C5: Replace the share-with section with Mama Stacy / Papa / Everyone

**Files:**
- Modify: `src/app/check-in/[personId]/page.tsx`

The current share-with picker shows technical visibility presets (just-me / partner / family). The Plan 3 design uses real avatars + family roles + an Everyone option. Kid entries always share with ≥1 adult — no "just me."

- [ ] **Step 1: Build the adult list from People records**

Inside the kid component:

```tsx
const adults = useMemo(() => {
  return people
    .filter((p) => p.linkedUserId && p.relationshipType !== 'child')
    .map((p) => ({
      personId: p.personId,
      userId: p.linkedUserId!,
      name: p.name,
      avatarUrl: p.avatarUrl,
      role: roleLabelFor(p),
    }));
}, [people]);

function roleLabelFor(p: Person): string {
  // Map Person.relationshipRole or relationshipType to a kid-friendly label.
  // Examples: a parent might have a real role "Mom Stacy" or just default to "Mama".
  if ((p as any).relationshipRole) return (p as any).relationshipRole.toUpperCase();
  if (p.relationshipType === 'spouse') return 'PAPA';  // or MAMA — depends on the perspective
  return 'PARENT';
}
```

**Important caveat:** The exact label ("Mama Stacy", "Papa") depends on the user's family. For v1, fall back to a generic uppercase label derived from `relationshipType`. A future task can add an explicit `relationshipRole` field to Person and a settings flow for the parent to customize.

- [ ] **Step 2: Render the picker**

Replace the existing visibility-preset UI with:

```tsx
<section style={shareSectionStyle}>
  <p style={shareLabelStyle}>Share with…</p>
  <div style={shareRowStyle}>
    {adults.map((a) => {
      const selected = sharedWithUserIds.includes(a.userId);
      return (
        <button
          key={a.userId}
          type="button"
          onClick={() => toggleShared(a.userId)}
          style={avatarChipStyle(selected)}
          aria-pressed={selected}
        >
          <span style={avatarStyle}>
            {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={avatarImgStyle} /> : <span style={avatarFallbackStyle}>{(a.name[0] ?? '?').toUpperCase()}</span>}
            {selected && <span aria-hidden style={selectedDotStyle}>✓</span>}
          </span>
          <span style={avatarLabelStyle}>{a.role}</span>
        </button>
      );
    })}
    <button
      type="button"
      onClick={() => toggleShared('everyone')}
      style={avatarChipStyle(sharedWithUserIds.length === adults.length)}
      aria-pressed={sharedWithUserIds.length === adults.length}
    >
      <span style={{ ...avatarStyle, background: 'rgba(120, 100, 70, 0.18)' }}>
        <span aria-hidden style={{ fontSize: 18 }}>👥</span>
      </span>
      <span style={avatarLabelStyle}>EVERYONE</span>
    </button>
  </div>
</section>
```

Where `sharedWithUserIds: string[]` is local state (`useState<string[]>([])`), and `toggleShared` adds/removes a userId. The special key `'everyone'` toggles the whole adult list. **At least one adult must be selected before Keep is enabled.**

Add styles:

```tsx
const shareSectionStyle: CSSProperties = { marginTop: 36, marginBottom: 24 };
const shareLabelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 14px' };
const shareRowStyle: CSSProperties = { display: 'flex', gap: 18, justifyContent: 'center' };
const avatarChipStyle = (selected: boolean): CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  opacity: selected ? 1 : 0.6,
  transition: 'opacity 140ms ease',
});
const avatarStyle: CSSProperties = { position: 'relative', width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'rgba(120, 100, 70, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const avatarImgStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const avatarFallbackStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 22, color: 'var(--r-text-3, #5C5347)' };
const avatarLabelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--r-text-3, #5C5347)' };
const selectedDotStyle: CSSProperties = { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: 'var(--r-sage, #7C9082)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '2px solid var(--r-cream, #F7F5F0)' };
```

- [ ] **Step 3: Update the save handler**

The existing save logic should set `sharedWithUserIds` on the journal entry. Verify that the new state variable flows through correctly. If the existing save was using a visibility preset, refactor to use the new `sharedWithUserIds: string[]` directly.

- [ ] **Step 4: Commit**

```bash
git add "src/app/check-in/[personId]/page.tsx"
git commit -m "feat(check-in): 3-avatar share picker (Mama/Papa/Everyone) with real avatars"
```

### Task C6: Phase C smoke test

- [ ] **Step 1: Lint + tests**

```bash
npm run lint -- --quiet "src/app/check-in/[personId]/page.tsx" 2>&1 | tail -10
npm run test:run 2>&1 | tail -15
```

- [ ] **Step 2: Manual flow**

1. Open `/check-in/[someKidId]` directly. Confirm:
   - No chrome (no rail, no top header)
   - "✕ Exit to parent journal" button top-left
   - Headline with the kid's name
   - 12 feeling tiles in a 3×4 grid, multi-select
   - Tell us more textarea with mic
   - 3-avatar share picker with the family's adults + Everyone option
   - Keep button at the bottom
2. Open `/check-in/[someKidId]?ritualId=<somerid>`. Confirm the ritual chip shows (e.g., "📅 Sunday Ritual").
3. Click "Exit to parent journal" → routes back to `/`.

---

## Phase D — Wrap

### Task D1: End-to-end smoke test

- [ ] **Step 1: Full test suite**

```bash
npm run test:run 2>&1 | tail -20
```

Pre-existing failures unchanged. All new Plan 3 tests pass.

- [ ] **Step 2: Lint**

```bash
npm run lint 2>&1 | tail -10
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -E "src/(app|hooks|components)/(unspoken|rituals|check-in|journal)" | head -20
```

No NEW errors in Plan 3-touched files.

- [ ] **Step 4: Manual browser flow**

1. `/unspoken` — renders empty state initially
2. From `/journal/[someEntryId]` → click "Hold this for later" → entry appears in `/unspoken` queue
3. `/rituals/family/setup` → fill form → submit → new check-in appears on `/rituals`
4. Click "Begin" on a family check-in → routes to `/check-in/[kidId]?ritualId=...` with the ritual chip showing
5. Kid mode: 12-tile grid, multi-select share avatars, Exit-to-parent works

### Task D2: Update memory with Plan 3 outcome

- [ ] **Step 1: Write memory file**

Create `~/.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/project_plan_3_new_features_shipped.md`:

```markdown
---
name: Plan 3 (New Features) shipped
description: Unspoken Queue + Family check-ins + Child check-in 12-tile redesign — what landed and what's next
type: project
---

Shipped 2026-05-1X on branch `relish/ui-foundation`. Completes the UI restructure trilogy (Plans 1+2+3).

## What landed

- **Unspoken Queue** — new room at `/unspoken`. Journal entries marked `unspoken=true` (set via the "Hold this for later" action on `/journal/[entryId]`) appear in a queue here. Predict-don't-route: items sit until the user opens a ritual or therapy brief that pulls from them. New hook `useUnspokenEntries`, new composite index on `journal_entries(unspoken, visibleToUserIds, createdAt)`.

- **Family check-ins** — scheduled recurring kid check-ins, stored in `couple_rituals` with `targetType='family-checkin'` discriminator. Setup at `/rituals/family/setup`. Visible on `/rituals` page below the couple ritual. Tapping "Begin" routes to `/check-in/[personId]?ritualId=...`.

- **Child check-in redesign** — `/check-in/[personId]` now matches the Plan 3 Stitch: 12-tile multi-select feeling grid, ✕ Exit-to-parent button replacing the rail, ritual chip when launched from a scheduled ritual, 3-avatar share picker (real adult avatars + Everyone option). Chrome hidden again (LayoutChrome HIDE_CHROME_ROUTES includes /check-in/*).

## How to apply

- Plan 3 completes the UI restructure. Future work: AI inference for "InspiredByJournal" suggestions (currently stubbed in Plan 2), Cloud Function update to produce explicit narrative sections on therapy briefs, kid-page Mama Stacy / Papa label customization in settings.
```

- [ ] **Step 2: Update MEMORY.md**

Insert at the top, above the Plan 2 pointer:

```markdown
## ★ PLAN 3 (NEW FEATURES) SHIPPED (2026-05-1X)
- [Plan 3 shipped](project_plan_3_new_features_shipped.md) — Unspoken Queue + Family check-ins + Child check-in 12-tile redesign. Branch `relish/ui-foundation`. Trilogy complete.
```

---

## Out of Scope (Plan 3)

- **AI inference for "InspiredByJournal" suggestions** — Plan 2 stubbed this with the most-recent entry's first line. Real AI-derived suggestions are a future task.
- **Cloud Function update for therapy brief narrative sections** — Plan 2 renders themes as a fallback; the function needs updating to emit `emotionalLandscape`, `coreQuotes`, etc.
- **Settings UI for `relationshipRole`** — the kid check-in's "MAMA STACY / PAPA" labels are derived from `relationshipType` for v1. A future settings flow lets parents customize.
- **Auto-routing unspoken items into rituals/therapy** — explicitly excluded ("predict, don't route" is the locked design decision).
- **Body-parts diagram on kid check-in** — dropped per user decision in earlier discussion.
- **Coach pre-fill from suggestion pills** — the pill `Link` carries a `q` query param; the Coach page can read it in a separate task.
- **Therapist entity model** (the deeper original Therapy spec preserved on `origin/therapy-prep`) — out of scope.
- **Cleanup of dead/hidden dossier code** on `/people/[personId]` — left under `{false && (...)}` guard; cleanup is its own task.
