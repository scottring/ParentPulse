# Relish UI Foundation — Plan 1 Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the persistent left rail + simplified top chrome on every authed page, rename `/growth` → `/experiments` and `/kid` → `/check-in` with redirects, and unbreak the three currently-broken rooms (Therapy brief generation, Rituals spouse messaging, Experiments card clickability).

**Architecture:** Replace the existing `GlobalNav` (wordmark + user menu only) with a two-piece chrome — a thin `TopChrome` (wordmark left, settings + user pip right) and a fixed-position `LeftRail` (destination links: Journal, People, Therapy, Rituals, Experiments, Unspoken, Archive). Both render from `src/app/layout.tsx`. Mobile collapses the rail to an icon strip below 860px. Route renames preserve old paths via Next.js `redirects` config in `next.config.ts`. Wiring fixes are scoped to the minimal changes needed to make the rooms function — no redesigns yet.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase (Firestore, Cloud Functions). Tests via Vitest (unit) + Playwright (e2e). Styling via inline `CSSProperties` objects (matches existing `journal-first/Home.tsx` pattern; avoids the documented styled-jsx scoping bug).

---

## File Map

**New files:**
- `src/components/layout/TopChrome.tsx` — wordmark + settings + user menu strip
- `src/components/layout/LeftRail.tsx` — fixed left rail with destination links
- `src/components/layout/leftRailItems.ts` — the canonical list of rail items
- `src/app/experiments/page.tsx` — copy of `/growth/page.tsx` with renamed identifiers
- `src/app/experiments/[experimentId]/page.tsx` — copy of `/growth/[itemId]/page.tsx`
- `src/app/check-in/[personId]/page.tsx` — copy of `/kid/[personId]/page.tsx`
- `src/components/layout/__tests__/LeftRail.test.tsx`
- `src/components/layout/__tests__/TopChrome.test.tsx`

**Modified files:**
- `src/app/layout.tsx` — mount `TopChrome` + `LeftRail` instead of `GlobalNav`
- `src/components/layout/GlobalNav.tsx` — slimmed (or deleted; see Task 11)
- `src/components/journal-first/Home.tsx` — remove the page-internal banner (TopChrome takes over)
- `src/app/growth/page.tsx` — convert to a redirect file
- `src/app/growth/[itemId]/page.tsx` — convert to a redirect file
- `src/app/kid/[personId]/page.tsx` — convert to a redirect file
- `next.config.ts` (or `next.config.js`) — add `redirects()` for old paths
- All copy referring to "Growth" or "Growth arc" → "Experiments" / "Experiment" (Task 18)

**Files NOT touched in Plan 1:** Family Manual page, Unspoken (doesn't exist yet), Rituals room body (only the empty-state copy), Therapy room body (only the function call), per-room redesigns — those land in Plan 2/3.

---

## Phase A — Diagnose & Wire the Three Broken Rooms

### Task 1: Diagnose `generateTherapyBrief` failure

**Files:**
- Read: `functions/index.js:12140-12340` (the function)
- Read: `src/app/therapy/page.tsx:42-56` (the caller)

- [ ] **Step 1: Read the function source** to confirm signature and any required inputs

Run: `awk 'NR>=12140 && NR<=12340' functions/index.js | head -80`

Expected: see the `onCall` registration, what fields it reads from `request.data`, and any early throws.

- [ ] **Step 2: Check deployment status**

Run: `firebase functions:list 2>/dev/null | grep -i therapy`
Expected: a row containing `generateTherapyBrief` and its region. If missing, the function is undeployed.

- [ ] **Step 3: Tail recent function logs** to see what errors fire on call

Run: `firebase functions:log --only generateTherapyBrief --lines 50 2>&1 | tail -50`
Expected: either no logs (never called / never deployed) or stack traces revealing the runtime failure.

- [ ] **Step 4: Record the diagnosis**

Write the root cause to scratch: one of (a) function never deployed, (b) function deployed but errors at runtime (auth / missing data / API key), (c) function works but the client passes wrong shape.

---

### Task 2: Fix the diagnosed Therapy failure

**Files:**
- Modify: depends on Task 1 diagnosis

**Branch on diagnosis:**

- [ ] **Step 1: If undeployed → deploy**

Run: `firebase deploy --only functions:generateTherapyBrief`
Expected: successful deploy. Then retry from the UI to confirm.

- [ ] **Step 2: If deployed-but-erroring → fix in place**

Read the relevant section of `functions/index.js`, identify the failing call (Claude API? Firestore query?), correct it, redeploy:
```
firebase deploy --only functions:generateTherapyBrief
```

- [ ] **Step 3: If empty-window → surface a specific error**

If the function fails because there are zero journal entries in the look-back window, the client should display a specific message ("No entries in the last 14 days to compile from"), not the generic "try again."

Modify `src/app/therapy/page.tsx:51-55`:
```tsx
} catch (err) {
  console.error('generateTherapyBrief failed:', err);
  const msg = err instanceof Error ? err.message : '';
  if (/no entries|empty/i.test(msg)) {
    alert('No journal entries in the last 14 days to compile from.');
  } else {
    alert('Could not prepare a brief. Please try again in a minute.');
  }
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev` (in another terminal), open `/therapy`, set/unlock PIN, click "Prepare a brief".
Expected: either a brief generates and you land on `/therapy/[briefId]`, or a *specific* error message appears.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(therapy): wire generateTherapyBrief end-to-end with specific error surfacing"
```

---

### Task 3: Make Experiments cards clickable end-to-end

**Files:**
- Modify: `src/app/growth/page.tsx:124-191` (will be moved to `src/app/experiments/page.tsx` in Task 7; do this fix on the original file first, then carry it over)
- Test: `src/app/growth/__tests__/ArcCard.test.tsx` (new)

- [ ] **Step 1: Write a failing test**

Create `src/app/growth/__tests__/ArcCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GrowthArc } from '@/types/growth-arc';
import type { GrowthItem } from '@/types/growth';

// We import ArcCard once it's exported from the page module.
// For now, write the test in terms of the component contract.

describe('ArcCard', () => {
  const arc: GrowthArc = {
    arcId: 'arc-1',
    title: 'Test arc',
    domain: 'connection',
    currentPhase: 'awareness',
    completedItemCount: 0,
    totalItemCount: 4,
    phases: [],
  } as GrowthArc;

  it('renders the whole card as a link to /experiments/[arcId] when there are no active items', () => {
    const { ArcCard } = require('@/app/growth/page');
    render(<ArcCard arc={arc} progress={0} activeItems={[] as GrowthItem[]} />);
    const link = screen.getByRole('link', { name: /Test arc/i });
    expect(link).toHaveAttribute('href', '/experiments/arc-1');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/app/growth/__tests__/ArcCard.test.tsx`
Expected: FAIL — `ArcCard` is not exported from the page module, or there is no link element.

- [ ] **Step 3: Export `ArcCard` and make the whole card a link**

Modify `src/app/growth/page.tsx`. Change `function ArcCard({...})` → `export function ArcCard({...})`. Wrap the `<li>` body in a `<Link href={`/experiments/${arc.arcId}`}>` and remove the inner "Next" link if it would duplicate (keep the Next label as visual text inside the card link). Use `display: 'block'`, `textDecoration: 'none'`, `color: 'inherit'` to preserve current visuals.

Concrete edit, replace `src/app/growth/page.tsx:137-191` body of the return:
```tsx
return (
  <li className="arc-card">
    <Link
      href={`/experiments/${arc.arcId}`}
      style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
      aria-label={`Open the ${arc.title} experiment`}
    >
      <div className="arc-card-head">
        <div className="arc-card-head-left">
          {arc.emoji && <span className="arc-emoji" aria-hidden>{arc.emoji}</span>}
          <div>
            <h3 className="arc-title">{arc.title}</h3>
            {arc.subtitle && <p className="arc-subtitle">{arc.subtitle}</p>}
          </div>
        </div>
        <span className="arc-phase-chip">
          {phaseLabel}
          {typeof arc.currentWeek === 'number' && arc.durationWeeks
            ? ` · week ${arc.currentWeek} of ${arc.durationWeeks}`
            : ''}
        </span>
      </div>

      <div className="arc-progress" aria-hidden="true">
        <div className="arc-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <p className="arc-progress-text">
        {progress}% — {arc.completedItemCount || 0} of {arc.totalItemCount || 0} moments completed
      </p>

      {phaseDef?.description && (
        <p className="arc-phase-desc"><em>{phaseDef.description}</em></p>
      )}

      {next && (
        <div className="arc-next">
          <span className="arc-next-eyebrow">Next</span>
          <span className="arc-next-link">{next.title || 'Continue the arc'} <span aria-hidden>⟶</span></span>
        </div>
      )}

      {arc.outcomeStatement && (
        <p className="arc-outcome">When this arc graduates: <em>{arc.outcomeStatement}</em></p>
      )}
    </Link>
  </li>
);
```

Also remove the `import Link from 'next/link'` already present and confirm `Link` is still imported at top of file.

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx vitest run src/app/growth/__tests__/ArcCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Manually verify**

Run: `npm run dev`, open `/growth`, click anywhere on a card (not just the "Next" text).
Expected: navigates to `/experiments/[arcId]`. (That route doesn't exist yet — expect a 404. We create it in Task 7. That's fine; the click handler is correct.)

- [ ] **Step 6: Commit**

```bash
git add src/app/growth/page.tsx src/app/growth/__tests__/ArcCard.test.tsx
git commit -m "fix(experiments): make full arc card clickable, not just the Next sublink"
```

---

### Task 4: Tighten Rituals empty-state messaging

**Files:**
- Modify: `src/app/rituals/ClientPage.tsx:61-83`

Current behavior: when `spouseName` is empty (no spouse linked), the empty card shows "Add your partner first" with a "Go to Settings" CTA. Confirm this branch is actually correct (the user's spouse isn't linked) before changing anything.

- [ ] **Step 1: Diagnose**

Run: `npm run dev`, open `/rituals`. Observe which empty state shows. Open browser console and check whether `useSpouse()` returns a `spouseName`.

If `spouseName` is correctly empty (no spouse linked), the room is doing the right thing — the fix is messaging only. If `spouseName` is populated but the room still shows the no-spouse empty state, there's a hook bug — diagnose `src/hooks/useSpouse.ts` instead.

- [ ] **Step 2: If messaging fix only**

Modify `src/app/rituals/ClientPage.tsx:61-70`:
```tsx
<h2 className="card-heading">
  {spouseName
    ? `A weekly moment with ${spouseName}.`
    : `Couple rituals need a partner first.`}
</h2>
<p className="card-copy">
  {spouseName
    ? `Pick a day and time together, on one device. A small ceremony that keeps the big conversations current.`
    : `Add your partner in Settings → People — once they're in the family, you can set up a recurring check-in together.`}
</p>
```

- [ ] **Step 3: Manually verify**

Reload `/rituals`. Confirm the empty card now clearly explains why no setup is possible.

- [ ] **Step 4: Commit**

```bash
git add src/app/rituals/ClientPage.tsx
git commit -m "fix(rituals): clarify empty-state messaging when no partner is linked"
```

---

## Phase B — Route Renames

### Task 5: Add Next.js redirects for old routes

**Files:**
- Modify: `next.config.ts` (or `next.config.js` — confirm filename with `ls next.config.*`)

- [ ] **Step 1: Read the existing config**

Run: `cat next.config.ts 2>/dev/null || cat next.config.js`
Note what's there so the additions don't clobber existing options.

- [ ] **Step 2: Add `redirects()` function**

Edit the config to add (or extend) a `redirects` async function:
```ts
async redirects() {
  return [
    {
      source: '/growth',
      destination: '/experiments',
      permanent: true,
    },
    {
      source: '/growth/:itemId',
      destination: '/experiments/:itemId',
      permanent: true,
    },
    {
      source: '/kid/:personId',
      destination: '/check-in/:personId',
      permanent: true,
    },
  ];
}
```

- [ ] **Step 3: Verify redirects work**

Run: `npm run dev`, open `http://localhost:3000/growth` → should redirect to `/experiments` (which will 404 until Task 7). Same for `/kid/[anyId]` → `/check-in/[anyId]`.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat(routes): redirect /growth and /kid to new paths"
```

---

### Task 6: Move kid check-in page to new route

**Files:**
- Create: `src/app/check-in/[personId]/page.tsx` — same content as `src/app/kid/[personId]/page.tsx`
- Modify: `src/app/kid/[personId]/page.tsx` — minimal redirect-only file (will be removed once the framework redirect from Task 5 takes effect; keeping it as a safety net for in-tree references)
- Update: any `/kid/${personId}` reference in source code

- [ ] **Step 1: Copy the file**

```bash
mkdir -p src/app/check-in
cp -R src/app/kid/[personId] src/app/check-in/[personId]
```

- [ ] **Step 2: Find and update in-tree references to `/kid/`**

Run: `grep -rn "/kid/" src/ --include="*.tsx" --include="*.ts"`
For each match, replace `/kid/` with `/check-in/`. Likely files (based on earlier grep): `src/components/journal-first/Home.tsx`.

Specifically in `src/components/journal-first/Home.tsx`, update the `href` on the kid `MomentRow` (search for `kid-mode:done` and `/kid/${k.personId}`) and replace with `/check-in/${k.personId}`.

- [ ] **Step 3: Make the old `/kid/[personId]` page a 1-line redirect (safety net)**

Replace `src/app/kid/[personId]/page.tsx` contents with:
```tsx
import { redirect } from 'next/navigation';

export default function KidLegacyRedirect({ params }: { params: Promise<{ personId: string }> }) {
  return params.then(({ personId }) => redirect(`/check-in/${personId}`));
}
```

(Next 16 makes params a Promise; if your project uses sync params, drop the `.then`.)

- [ ] **Step 4: Smoke test**

Run: `npm run dev`. From the journal home, tap a Focusing-on card. URL should be `/check-in/[personId]`. The page should render the kid mode (visually identical for now).

- [ ] **Step 5: Commit**

```bash
git add src/app/check-in src/app/kid src/components/journal-first/Home.tsx
git commit -m "feat(routes): rename /kid/[personId] to /check-in/[personId]"
```

---

### Task 7: Move /growth to /experiments

**Files:**
- Create: `src/app/experiments/page.tsx` — copy of `src/app/growth/page.tsx`
- Create: `src/app/experiments/[experimentId]/page.tsx` — copy of `src/app/growth/[itemId]/page.tsx` (rename `itemId` segment to `experimentId`)
- Modify: `src/app/growth/page.tsx` — convert to redirect file
- Modify: `src/app/growth/[itemId]/page.tsx` — convert to redirect file
- Update: in-tree references to `/growth`

- [ ] **Step 1: Copy the experiments index page**

```bash
mkdir -p src/app/experiments
cp src/app/growth/page.tsx src/app/experiments/page.tsx
```

In the new file, update the internal `href` (the empty-state CTA + the ArcCard's link from Task 3) to point to `/experiments/${arc.arcId}` (already done in Task 3).

- [ ] **Step 2: Copy the experiment detail page**

```bash
mkdir -p "src/app/experiments/[experimentId]"
cp "src/app/growth/[itemId]/page.tsx" "src/app/experiments/[experimentId]/page.tsx"
cp "src/app/growth/[itemId]/ClientPage.tsx" "src/app/experiments/[experimentId]/ClientPage.tsx" 2>/dev/null || true
```

Inside the new files, rename the param from `itemId` to `experimentId`. Run:
```bash
grep -n "itemId" "src/app/experiments/[experimentId]/page.tsx" "src/app/experiments/[experimentId]/ClientPage.tsx" 2>/dev/null
```
Replace each `itemId` with `experimentId`.

- [ ] **Step 3: Find and update in-tree references to `/growth/`**

Run: `grep -rn "'/growth\|\"/growth\|\`/growth" src/ --include="*.tsx" --include="*.ts"`
For each match, replace `/growth` with `/experiments`. Likely files: `src/components/walkthrough/walkthrough-steps.ts`, `src/components/surface/tiles/*`, `src/components/journal-spread/AskAboutEntrySheet.tsx`.

- [ ] **Step 4: Convert old growth files to redirect-only**

Replace `src/app/growth/page.tsx` contents with:
```tsx
import { redirect } from 'next/navigation';

export default function GrowthLegacyRedirect() {
  redirect('/experiments');
}
```

Replace `src/app/growth/[itemId]/page.tsx` contents with:
```tsx
import { redirect } from 'next/navigation';

export default function GrowthDetailLegacyRedirect({ params }: { params: Promise<{ itemId: string }> }) {
  return params.then(({ itemId }) => redirect(`/experiments/${itemId}`));
}
```

(If `ClientPage.tsx` exists alongside `page.tsx` in the old path, leave it as dead code — it's no longer imported.)

- [ ] **Step 5: Smoke test**

Run: `npm run dev`. Open `/experiments` — should show the list of arcs (just relabeled UI). Click an arc card — should navigate to `/experiments/[arcId]`. Open `/growth` — should redirect to `/experiments`.

- [ ] **Step 6: Commit**

```bash
git add src/app/experiments src/app/growth src/components
git commit -m "feat(routes): rename /growth/* to /experiments/*"
```

---

## Phase C — Chrome (TopChrome + LeftRail)

### Task 8: Create the canonical rail-items list

**Files:**
- Create: `src/components/layout/leftRailItems.ts`

- [ ] **Step 1: Write the items module**

```ts
// src/components/layout/leftRailItems.ts

export type LeftRailItem = {
  key: string;
  label: string;
  href: string;
  /** If true, an extra glyph indicates the room is privacy-gated. */
  pinGated?: boolean;
};

export const LEFT_RAIL_ITEMS: readonly LeftRailItem[] = [
  { key: 'journal',     label: 'Journal',     href: '/' },
  { key: 'people',      label: 'People',      href: '/manual' },
  { key: 'therapy',     label: 'Therapy',     href: '/therapy', pinGated: true },
  { key: 'rituals',     label: 'Rituals',     href: '/rituals' },
  { key: 'experiments', label: 'Experiments', href: '/experiments' },
  { key: 'unspoken',    label: 'Unspoken',    href: '/unspoken' },
  // Visual separator handled by the consumer.
  { key: 'archive',     label: 'Archive',     href: '/archive' },
];

/** Routes where neither the TopChrome nor the LeftRail should render. */
export const HIDE_CHROME_ROUTES: readonly RegExp[] = [
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/check-in(\/|$)/,
];

export function shouldHideChrome(pathname: string): boolean {
  return HIDE_CHROME_ROUTES.some((re) => re.test(pathname));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/leftRailItems.ts
git commit -m "feat(layout): define canonical rail items + hide-chrome routes"
```

---

### Task 9: Build LeftRail component (desktop + mobile icon strip)

**Files:**
- Create: `src/components/layout/LeftRail.tsx`
- Create: `src/components/layout/__tests__/LeftRail.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/layout/__tests__/LeftRail.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/manual',
}));

describe('LeftRail', () => {
  it('renders every canonical rail item as a link', async () => {
    const { LeftRail } = await import('@/components/layout/LeftRail');
    render(<LeftRail />);
    ['Journal', 'People', 'Therapy', 'Rituals', 'Experiments', 'Unspoken', 'Archive'].forEach((label) => {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('marks the active route with aria-current=page', async () => {
    const { LeftRail } = await import('@/components/layout/LeftRail');
    render(<LeftRail />);
    const peopleLink = screen.getByRole('link', { name: /People/i });
    expect(peopleLink).toHaveAttribute('aria-current', 'page');
  });

  it('returns null on hidden routes', async () => {
    vi.doMock('next/navigation', () => ({ usePathname: () => '/login' }));
    vi.resetModules();
    const { LeftRail } = await import('@/components/layout/LeftRail');
    const { container } = render(<LeftRail />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npx vitest run src/components/layout/__tests__/LeftRail.test.tsx`
Expected: FAIL — `LeftRail` module does not exist.

- [ ] **Step 3: Write the component**

```tsx
// src/components/layout/LeftRail.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { LEFT_RAIL_ITEMS, shouldHideChrome } from './leftRailItems';

const RAIL_WIDTH_DESKTOP = 200;
const RAIL_WIDTH_MOBILE = 56;
const MOBILE_BREAKPOINT = 860;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LeftRail() {
  const pathname = usePathname() ?? '';
  if (shouldHideChrome(pathname)) return null;

  return (
    <>
      <nav style={railStyle} aria-label="Primary destinations">
        <ul style={listStyle}>
          {LEFT_RAIL_ITEMS.map((item, idx) => {
            const active = isActive(pathname, item.href);
            const showSeparatorBefore = item.key === 'archive';
            return (
              <li key={item.key}>
                {showSeparatorBefore && <hr style={sepStyle} aria-hidden />}
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  style={linkStyle(active)}
                  data-rail-item={item.key}
                >
                  <span className="rail-label">{item.label}</span>
                  {item.pinGated && (
                    <span aria-hidden style={{ marginLeft: 6, opacity: 0.6 }}>🔒</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <style>{`
        @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
          nav[aria-label="Primary destinations"] {
            width: ${RAIL_WIDTH_MOBILE}px !important;
          }
          nav[aria-label="Primary destinations"] .rail-label {
            font-size: 9px !important;
            letter-spacing: 0.06em !important;
          }
        }
      `}</style>
    </>
  );
}

const railStyle: CSSProperties = {
  position: 'fixed',
  top: 'var(--relish-top-offset, 60px)',
  left: 0,
  bottom: 0,
  width: RAIL_WIDTH_DESKTOP,
  borderRight: '1px solid rgba(120, 100, 70, 0.12)',
  background: 'var(--r-cream-deep, #F1EDEB)',
  padding: '24px 0',
  zIndex: 40,
  overflowY: 'auto',
};

const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };

const sepStyle: CSSProperties = {
  border: 0,
  borderTop: '1px solid rgba(120, 100, 70, 0.12)',
  margin: '12px 16px',
};

function linkStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: active ? 'var(--r-ink, #2B2620)' : 'var(--r-text-3, #5C5347)',
    textDecoration: 'none',
    borderLeft: active ? '2px solid var(--r-leather, #14100C)' : '2px solid transparent',
  };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `npx vitest run src/components/layout/__tests__/LeftRail.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LeftRail.tsx src/components/layout/__tests__/LeftRail.test.tsx
git commit -m "feat(layout): add LeftRail component with hide rules + active state"
```

---

### Task 10: Build TopChrome component

**Files:**
- Create: `src/components/layout/TopChrome.tsx`
- Create: `src/components/layout/__tests__/TopChrome.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/layout/__tests__/TopChrome.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'u1', name: 'Scott Kaufman' },
    logout: vi.fn(),
  }),
}));

describe('TopChrome', () => {
  it('renders the Relish wordmark routing to home', async () => {
    const { TopChrome } = await import('@/components/layout/TopChrome');
    render(<TopChrome />);
    const wordmark = screen.getByRole('link', { name: /relish/i });
    expect(wordmark).toHaveAttribute('href', '/');
  });

  it('shows user pip and opens menu on click', async () => {
    const { TopChrome } = await import('@/components/layout/TopChrome');
    render(<TopChrome />);
    const pip = screen.getByRole('button', { name: /Scott/i });
    fireEvent.click(pip);
    expect(screen.getByRole('menuitem', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Log out/i })).toBeInTheDocument();
  });

  it('returns null on hidden routes', async () => {
    vi.doMock('next/navigation', () => ({
      usePathname: () => '/login',
      useRouter: () => ({ push: vi.fn() }),
    }));
    vi.resetModules();
    const { TopChrome } = await import('@/components/layout/TopChrome');
    const { container } = render(<TopChrome />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run src/components/layout/__tests__/TopChrome.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the component**

```tsx
// src/components/layout/TopChrome.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { shouldHideChrome } from './leftRailItems';

export function TopChrome() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (shouldHideChrome(pathname)) return null;
  if (!user) return null;

  const first = user.name?.split(' ')[0] ?? '';

  const handleSignOut = async () => {
    setMenuOpen(false);
    try { await logout(); } catch (e) { console.warn('logout failed', e); }
    router.push('/login');
  };

  return (
    <header style={chromeStyle} aria-label="Top chrome">
      <Link href="/" style={wordmarkStyle} aria-label="Relish — home">Relish</Link>
      <span style={{ flex: 1 }} aria-hidden />
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={pipButtonStyle}
        >
          <span aria-hidden style={pipDotStyle} />
          {first}
        </button>
        {menuOpen && (
          <div role="menu" style={menuStyle}>
            <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); router.push('/settings'); }} style={menuItemStyle}>
              Settings
            </button>
            <hr style={{ border: 0, borderTop: '1px solid rgba(120,100,70,0.12)', margin: '4px 8px' }} aria-hidden />
            <button role="menuitem" type="button" onClick={handleSignOut} style={{ ...menuItemStyle, color: '#8C4A3E', fontWeight: 600 }}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const chromeStyle: CSSProperties = {
  position: 'fixed',
  top: 'var(--relish-top-offset, 0px)',
  left: 0,
  right: 0,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  padding: '0 28px',
  background: 'var(--r-cream-deep, #F1EDEB)',
  borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
  zIndex: 50,
};

const wordmarkStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 300,
  fontSize: 26,
  letterSpacing: '-0.012em',
  color: 'var(--r-ink, #2B2620)',
  textDecoration: 'none',
};

const pipButtonStyle: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-3, #5C5347)',
};

const pipDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--r-sage, #7C9082)',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 8px)',
  minWidth: 160,
  background: 'var(--r-paper, #FDFBF6)',
  border: '1px solid rgba(120,100,70,0.18)',
  borderRadius: 6,
  boxShadow: '0 4px 18px rgba(60,50,40,0.12)',
  padding: 4,
  zIndex: 60,
};

const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  border: 'none',
  background: 'transparent',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 13,
  color: 'var(--r-text-2, #3A3530)',
};
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npx vitest run src/components/layout/__tests__/TopChrome.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopChrome.tsx src/components/layout/__tests__/TopChrome.test.tsx
git commit -m "feat(layout): add TopChrome with wordmark + settings/logout user menu"
```

---

### Task 11: Mount TopChrome + LeftRail in root layout

**Files:**
- Create: `src/components/layout/LayoutChrome.tsx` — single client wrapper that mounts both chrome pieces and applies pathname-aware offsets to children
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (CSS vars only)
- Modify: `src/components/journal-first/Home.tsx` — remove the page-internal banner since `TopChrome` now provides it

- [ ] **Step 1: Create the LayoutChrome client wrapper**

`layout.tsx` is a server component; pathname-aware offsets need a client boundary. Single source of truth for chrome behavior:

```tsx
// src/components/layout/LayoutChrome.tsx
'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { TopChrome } from './TopChrome';
import { LeftRail } from './LeftRail';
import { shouldHideChrome } from './leftRailItems';

export function LayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const hidden = shouldHideChrome(pathname);

  const offsetStyle: CSSProperties = hidden
    ? { paddingLeft: 0, paddingTop: 0 }
    : {
        paddingLeft: 'var(--relish-rail-offset, 200px)',
        paddingTop: 'var(--relish-chrome-offset, 60px)',
      };

  return (
    <>
      <TopChrome />
      <LeftRail />
      <div style={offsetStyle}>{children}</div>
    </>
  );
}
```

- [ ] **Step 2: Replace `GlobalNav` mount in `src/app/layout.tsx`**

Change line 10 from `import GlobalNav from "@/components/layout/GlobalNav";` to:
```tsx
import { LayoutChrome } from "@/components/layout/LayoutChrome";
```

Change the body block (lines 49-65) from rendering `<GlobalNav />` + raw `{children}` to:
```tsx
<body className={`${dmSans.variable} ${cormorant.variable} antialiased`}>
  <AuthProvider>
    <WalkthroughProvider>
      <RitualBanner />
      <LayoutChrome>{children}</LayoutChrome>
      <PageFooter />
      <WalkthroughOverlay />
      <WalkthroughTrigger />
    </WalkthroughProvider>
  </AuthProvider>
</body>
```

- [ ] **Step 3: Add CSS offset variables in `src/app/globals.css`**

Append (or merge into the existing `:root` block if one exists):
```css
:root {
  --relish-rail-offset: 200px;
  --relish-chrome-offset: 60px;
}

@media (max-width: 859px) {
  :root {
    --relish-rail-offset: 56px;
  }
}
```

(No `body.no-chrome` selector needed — `LayoutChrome` zeroes the offsets in JS for hidden routes.)

- [ ] **Step 4: Remove the in-page banner from `src/components/journal-first/Home.tsx`**

The Journal home currently renders its own banner (`sx.banner`, `sx.bannerImage`, `sx.bannerStrip`) at `Home.tsx:1085-1223`. Now that `TopChrome` is mounted globally, this in-page banner duplicates the wordmark + user pip.

Decision: **keep the seasonal botanical image band** (visual anchor) but **drop the wordmark + user-menu pip** from inside the banner — they live in `TopChrome` now.

Edit `src/components/journal-first/Home.tsx`:
- Remove the `<Link href="/" style={sx.wordmark}>Relish</Link>` element inside `sx.bannerInner`
- Remove the entire user-menu `<div ref={userMenuRef}>…</div>` block (lines ~1100-1220)
- Adjust the `sx.bannerStrip` so it doesn't render an empty strip — collapse the strip if the inner content is empty, or remove the strip and leave only the image band
- Reduce the top padding on `sx.page` from `padding: '212px 28px 80px'` (which accommodated the 140 + ~60 in-page banner) to `padding: '28px 28px 80px'` — the global TopChrome already provides 60px of top offset via `LayoutChrome`

Also remove the `useState`s and `useRef`s that were only used by the in-page user menu (`userMenuOpen`, `userMenuRef`).

- [ ] **Step 5: Smoke test in browser**

Run: `npm run dev`. Open `/` — the home should now show TopChrome at the top + LeftRail on the left + the journal home content offset to the right of the rail. Open `/manual`, `/therapy`, `/rituals`, `/experiments` — same chrome on each. Open `/login` — no chrome. Open `/check-in/[someId]` — no chrome, no left padding gap, no top padding gap (`LayoutChrome` zeroes both for hidden routes).

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/layout/LayoutChrome.tsx src/components/journal-first/Home.tsx
git commit -m "feat(layout): mount TopChrome + LeftRail globally; collapse journal in-page banner"
```

---

### Task 12: Remove the old GlobalNav file (or slim it)

**Files:**
- Delete: `src/components/layout/GlobalNav.tsx` (only if nothing else imports it)
- Or modify: leave it as a stub that re-exports `TopChrome` for back-compat (only if external imports exist)

- [ ] **Step 1: Find any remaining imports**

Run: `grep -rn "from.*GlobalNav\|@/components/layout/GlobalNav" src/ --include="*.tsx" --include="*.ts"`

- [ ] **Step 2: If no imports remain, delete the file**

```bash
git rm src/components/layout/GlobalNav.tsx
```

If imports do remain, leave the file but replace its body with a thin re-export of `TopChrome` and add a deprecation comment. Defer cleanup of the dependents to a later pass.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(layout): remove obsolete GlobalNav after chrome migration"
```

---

## Phase D — Vocabulary Swap + Final Verification

### Task 13: Replace "Growth" copy with "Experiments"

**Files:**
- Modify: all `*.tsx` / `*.ts` files where user-visible "Growth" or "Growth arc" strings appear

- [ ] **Step 1: Find user-visible mentions**

Run: `grep -rn "Growth\b\|growth arc\|Growth Arc\|growth-arc" src/ --include="*.tsx" --include="*.ts"`

For each match, decide:
- **Display text** ("Growth", "Growth Arcs", "growth arc") → replace with "Experiments" / "experiment" / "Experiments"
- **Type names / identifiers** (`GrowthArc`, `growthItem`, `useGrowthFeed`) → **leave as-is** to avoid a wider refactor. The vocabulary swap is user-facing only.
- **Route literals** (`/growth/...`) → already redirected (Task 5); update any remaining in-app string usages to `/experiments/...`

Likely files (from earlier grep):
- `src/app/experiments/page.tsx` — change `<h1>Growth</h1>` to `<h1>Experiments</h1>` and the "growth arc" lede to "experiment"
- `src/components/walkthrough/walkthrough-steps.ts`
- `src/components/surface/SomethingToTry.tsx`
- `src/components/surface/tiles/ReflectionPromptTile.tsx`
- `src/components/surface/tiles/MicroActivityTile.tsx`

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. Walk through `/experiments`, the walkthrough overlay, and any surface tiles. Confirm no "Growth" copy is visible anywhere.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "feat(copy): swap user-facing 'Growth' to 'Experiments'"
```

---

### Task 14: End-to-end smoke test of the foundation

**Files:** (none modified; this is a verification step)

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk every room from the rail**

In the browser:
1. Land on `/` — confirm TopChrome + LeftRail render; journal home shows below
2. Click "People" in rail → `/manual` loads; chrome persists
3. Click "Therapy" → either PIN keypad (if set) or PIN setup. Try to prepare a brief — confirm Task 2's fix works.
4. Click "Rituals" → empty-state copy matches Task 4
5. Click "Experiments" → list of arcs (or empty state); click an arc card; confirm full card is clickable (Task 3)
6. Click "Unspoken" → expect 404 (Plan 3 builds it). That's fine; confirm the rail link is correct.
7. Click "Archive" → existing page loads
8. Click the user pip → menu shows Settings + Log out only
9. From `/`, tap a Focusing-on card → `/check-in/[personId]` loads with no chrome (Task 6)
10. Hit `/growth/abc` directly → redirects to `/experiments/abc`
11. Hit `/kid/abc` directly → redirects to `/check-in/abc`

- [ ] **Step 3: Resize to < 860px** and confirm the rail collapses to the narrower icon-strip width.

- [ ] **Step 4: Run all unit tests**

```bash
npm run test:run
```
Expected: PASS for all tests added in this plan (LeftRail, TopChrome, ArcCard), plus any pre-existing tests still pass.

- [ ] **Step 5: Lint + build**

```bash
npm run lint
npm run build
```
Expected: no new errors. If build fails for unrelated reasons (e.g., type errors elsewhere in the codebase), record them but don't fix in this plan unless they block the rail/chrome.

- [ ] **Step 6: Commit any incidental fixes**

```bash
git add -A
git commit -m "chore: incidental fixes from foundation smoke test"
```
(Skip this step if nothing changed.)

---

### Task 15: Update memory with Plan 1 outcome

**Files:**
- Modify: `~/.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/MEMORY.md` and create a new memory file documenting the shipped state

- [ ] **Step 1: Write a memory file**

Create `~/.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/project_plan_1_foundation_shipped.md`:
```markdown
---
name: Plan 1 (Foundation) shipped
description: Chrome restructure + route renames + three wiring fixes — what landed and what's next
type: project
---

Shipped 2026-05-11 on Plan 1 of the UI restructure:
- Persistent `TopChrome` (wordmark + Settings/Logout) and `LeftRail` (Journal/People/Therapy/Rituals/Experiments/Unspoken/Archive) mounted in root layout
- `/growth/*` → `/experiments/*` and `/kid/*` → `/check-in/*` with redirects + in-tree reference updates
- Three wiring fixes: Therapy `generateTherapyBrief` (Task 2 — actual fix depends on diagnosis), Rituals empty-state copy, Experiments full-card clickable
- "Growth" → "Experiments" vocabulary swap in user-facing copy only; type identifiers (`GrowthArc`, etc.) unchanged

**Why:** Get every room reachable + working before redesigning their bodies. Fast feedback loop for the user.

**How to apply:** Plan 2 (Room Redesigns) starts from this foundation. The Journal home's in-page banner was collapsed during Task 11 — the home now relies on `TopChrome` for the wordmark and user menu. Don't re-add an in-page banner in Plan 2.
```

Add to `MEMORY.md`:
```
## PLAN 1 FOUNDATION SHIPPED (2026-05-11)
- [Plan 1 shipped](project_plan_1_foundation_shipped.md) — chrome + routes + wiring fixes; foundation for Plans 2 (redesigns) and 3 (new features)
```

- [ ] **Step 2: Commit the spec/plan/memory together**

```bash
git add docs/superpowers/specs/2026-05-11-relish-ui-restructure-design.md \
        docs/superpowers/plans/2026-05-11-relish-ui-foundation.md
git commit -m "docs: relish UI restructure spec + Plan 1 (Foundation)"
```

(Memory files live outside the repo; commit those separately if your memory dir is itself a git repo, otherwise the file write in Step 1 is sufficient.)

---

## Out of Scope (Plan 1)

- Journal home masthead change (Plan 2)
- Removing the "Ask the book" coach chips from home (Plan 2)
- Family Manual person-view redesign (Plan 2)
- Therapy brief narrative layout + idle auto-lock (Plan 2)
- Rituals two-column layout + Current Focus card + Inspired-by-Journal (Plan 2)
- Unspoken Queue room (Plan 3)
- Family check-in setup in Rituals (Plan 3)
- Child check-in 12-tile multi-select + Mama Stacy / Papa labels + ritual chip (Plan 3)
- Removing `subjectType` proxy semantics rework
- Visual design polish per Stitch (Linen palette, Libre Caslon Text, Inter) — applied incrementally as each room redesigns
