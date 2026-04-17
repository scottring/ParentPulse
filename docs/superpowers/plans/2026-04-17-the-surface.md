# The Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signed-in home page with a single-page curated dashboard that shows the right content at the right time, using hand-authored recipes per stage.

**Architecture:** Context-driven composition — each of 5 stages (`new_user` → `active`) has a recipe defining which modules fill a Hero slot (left 40%) and Grid slot (right 60%). Modules only render when eligible (data exists). Layout is responsive: landscape = side-by-side no-scroll, portrait = stacked scrollable.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Firestore (existing hooks)

**Spec:** `docs/superpowers/specs/2026-04-17-the-surface-design.md`

---

## File Structure

### New Files
| Path | Responsibility |
|------|---------------|
| `src/lib/surface-recipes.ts` | Recipe definitions + `getSurfaceRecipe()` + module eligibility |
| `src/types/surface-recipe.ts` | Types for recipes, modules, hero/grid slots |
| `src/components/surface/SurfaceLayout.tsx` | Responsive layout wrapper (landscape/portrait) |
| `src/components/surface/HeroSlot.tsx` | Renders the correct hero module from recipe |
| `src/components/surface/GridSlot.tsx` | Renders grid tile modules from recipe |
| `src/components/surface/heroes/StageCTAHero.tsx` | Hero for stages 1–3 (onboarding CTAs) |
| `src/components/surface/heroes/SynthesisHero.tsx` | Hero for fresh synthesis highlight |
| `src/components/surface/heroes/SpotlightHero.tsx` | Hero for person spotlight |
| `src/components/surface/heroes/CalmHero.tsx` | Hero for calm/nothing-to-do state |
| `src/components/surface/tiles/RitualTile.tsx` | Grid tile: next ritual info |
| `src/components/surface/tiles/MicroActivityTile.tsx` | Grid tile: today's micro-activity |
| `src/components/surface/tiles/PatternTile.tsx` | Grid tile: pattern detected from journal |
| `src/components/surface/tiles/BlindSpotTile.tsx` | Grid tile: synthesis blind spot |
| `src/components/surface/tiles/GrowthArcTile.tsx` | Grid tile: active growth arc progress |
| `src/components/surface/tiles/DinnerPromptTile.tsx` | Grid tile: tonight's dinner prompt |
| `src/components/surface/tiles/RecentJournalTile.tsx` | Grid tile: last journal entry |
| `src/components/surface/tiles/FamilyFreshnessTile.tsx` | Grid tile: family member pills with freshness |
| `src/components/surface/tiles/ReflectionPromptTile.tsx` | Grid tile: reflection/journaling prompt |
| `src/components/surface/tiles/PerspectiveGapTile.tsx` | Grid tile: person needs another perspective |
| `src/components/surface/tiles/RitualSetupTile.tsx` | Grid tile: nudge to set up couple ritual |
| `src/components/surface/tiles/InviteSpouseTile.tsx` | Grid tile: invite spouse CTA |
| `src/components/surface/tiles/ContributionNeededTile.tsx` | Grid tile: other people needing contributions |
| `src/hooks/useDinnerPrompt.ts` | Fetch today's dinner prompt from Cloud Function |
| `__tests__/lib/surface-recipes.test.ts` | Tests for recipe selection + eligibility |
| `__tests__/hooks/useDinnerPrompt.test.ts` | Tests for dinner prompt hook |
| `__tests__/components/surface/SurfaceLayout.test.tsx` | Tests for responsive layout |
| `__tests__/components/surface/HeroSlot.test.tsx` | Tests for hero rendering |
| `__tests__/components/surface/GridSlot.test.tsx` | Tests for grid rendering |

### Modified Files
| Path | Changes |
|------|---------|
| `src/app/page.tsx` | Signed-in users see TheSurface instead of redirect to `/journal` |
| `src/components/layout/Navigation.tsx` | Show nav on `/` for signed-in users |
| `src/types/surface.ts` | Add new types or re-export from `surface-recipe.ts` |

### Reused As-Is
| Path | Used For |
|------|----------|
| `src/hooks/useDashboard.ts` | Stage detection + all family data |
| `src/hooks/useSurfaceNext.ts` | Hero fallback cascade (may refine) |
| `src/hooks/useCoupleRitual.ts` | Ritual data for tile |
| `src/hooks/useGrowthFeed.ts` | Growth items + arcs |
| `src/hooks/useJournalEntries.ts` | Recent entries |
| `src/hooks/useJournalEcho.ts` | Journal echo for hero |
| `src/hooks/useFreshness.ts` | Family freshness for pills |
| `src/hooks/useActionItems.ts` | Action items for priority |
| `src/lib/surface-priority.ts` | `computeLead()` logic (referenced, not replaced) |
| `src/lib/freshness-engine.ts` | Freshness computation |
| `src/components/surface/stages/*` | Stage components (adapted into hero modules) |
| `src/components/surface/TheFamily.tsx` | Family pills (adapted into tile) |

---

## Task 1: Recipe Types

Define the type system for recipes, modules, and slots.

**Files:**
- Create: `src/types/surface-recipe.ts`
- Test: `__tests__/lib/surface-recipes.test.ts` (type compilation check)

- [ ] **Step 1: Create recipe types**

```typescript
// src/types/surface-recipe.ts
import type { DashboardState } from '@/hooks/useDashboard';
import type { Person, PersonManual } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';
import type { CoupleRitual } from '@/types/couple-ritual';
import type { JournalEntry } from '@/types/journal';
import type { EchoMatch } from '@/hooks/useJournalEcho';
import type { ArcGroup } from '@/hooks/useGrowthFeed';
import type { ActionItem } from '@/types/action-items';
import type { Contribution } from '@/types/contribution';

export type HeroModuleId =
  | 'stage-cta-self'
  | 'stage-cta-add-person'
  | 'stage-cta-contribute'
  | 'fresh-synthesis'
  | 'person-spotlight'
  | 'journal-echo'
  | 'next-action'
  | 'calm';

export type GridModuleId =
  | 'ritual-info'
  | 'micro-activity'
  | 'pattern-detected'
  | 'blind-spot'
  | 'growth-arc'
  | 'dinner-prompt'
  | 'recent-journal'
  | 'family-freshness'
  | 'reflection-prompt'
  | 'perspective-gap'
  | 'ritual-setup'
  | 'invite-spouse'
  | 'contribution-needed';

export interface SurfaceRecipe {
  /** Ordered hero candidates — first eligible wins */
  heroCandidates: HeroModuleId[];
  /** Ordered grid candidates — first N eligible fill the grid (max 6) */
  gridCandidates: GridModuleId[];
  /** Max grid tiles to show */
  maxGridTiles: number;
}

/** All data needed to evaluate module eligibility */
export interface SurfaceData {
  stage: DashboardState;
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
  selfPerson: Person | null;
  spouse: Person | null;
  peopleNeedingContributions: Person[];
  hasSelfContribution: boolean;
  activeGrowthItems: GrowthItem[];
  arcGroups: ArcGroup[];
  journalEntries: JournalEntry[];
  echo: EchoMatch | null;
  ritual: CoupleRitual | null;
  actionItems: ActionItem[];
  dinnerPrompt: string | null;
  hasAssessments: boolean;
}

/** Resolved recipe — modules that passed eligibility */
export interface ResolvedSurface {
  hero: HeroModuleId;
  gridTiles: GridModuleId[];
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/surface-recipe.ts`
Expected: No errors (may need to check import paths match existing types — adjust as needed)

- [ ] **Step 3: Commit**

```bash
git add src/types/surface-recipe.ts
git commit -m "feat(surface): add recipe type definitions"
```

---

## Task 2: Recipe Definitions + Eligibility Engine

Define the 5 stage recipes and the eligibility functions that determine which modules can render.

**Files:**
- Create: `src/lib/surface-recipes.ts`
- Create: `__tests__/lib/surface-recipes.test.ts`

- [ ] **Step 1: Write failing tests for recipe selection**

```typescript
// __tests__/lib/surface-recipes.test.ts
import { describe, it, expect } from 'vitest';
import { getRecipeForStage, resolveRecipe } from '@/lib/surface-recipes';
import type { SurfaceData } from '@/types/surface-recipe';

// Minimal empty data for testing
const emptyData: SurfaceData = {
  stage: 'loading',
  people: [],
  manuals: [],
  contributions: [],
  selfPerson: null,
  spouse: null,
  peopleNeedingContributions: [],
  hasSelfContribution: false,
  activeGrowthItems: [],
  arcGroups: [],
  journalEntries: [],
  echo: null,
  ritual: null,
  actionItems: [],
  dinnerPrompt: null,
  hasAssessments: false,
};

function dataWith(overrides: Partial<SurfaceData>): SurfaceData {
  return { ...emptyData, ...overrides };
}

describe('getRecipeForStage', () => {
  it('returns self-onboard hero for new_user', () => {
    const recipe = getRecipeForStage('new_user');
    expect(recipe.heroCandidates[0]).toBe('stage-cta-self');
    expect(recipe.gridCandidates).toHaveLength(0);
  });

  it('returns add-person hero for self_complete', () => {
    const recipe = getRecipeForStage('self_complete');
    expect(recipe.heroCandidates[0]).toBe('stage-cta-add-person');
    expect(recipe.gridCandidates).toContain('reflection-prompt');
  });

  it('returns contribute hero for has_people', () => {
    const recipe = getRecipeForStage('has_people');
    expect(recipe.heroCandidates[0]).toBe('stage-cta-contribute');
  });

  it('returns synthesis-first hero for has_contributions', () => {
    const recipe = getRecipeForStage('has_contributions');
    expect(recipe.heroCandidates[0]).toBe('fresh-synthesis');
    expect(recipe.heroCandidates[1]).toBe('stage-cta-contribute');
  });

  it('returns full cascade for active', () => {
    const recipe = getRecipeForStage('active');
    expect(recipe.heroCandidates).toEqual([
      'fresh-synthesis',
      'person-spotlight',
      'journal-echo',
      'next-action',
      'calm',
    ]);
    expect(recipe.maxGridTiles).toBe(6);
  });
});

describe('resolveRecipe', () => {
  it('resolves new_user to stage-cta-self hero, empty grid', () => {
    const result = resolveRecipe(dataWith({ stage: 'new_user' }));
    expect(result.hero).toBe('stage-cta-self');
    expect(result.gridTiles).toHaveLength(0);
  });

  it('resolves active with ritual to include ritual-info tile', () => {
    const result = resolveRecipe(dataWith({
      stage: 'active',
      hasAssessments: true,
      echo: { entryId: '1', text: 'test', title: null, category: 'moment', summary: null, themes: [], createdAt: { _seconds: 0, _nanoseconds: 0 }, authorId: 'u1' },
      ritual: {
        id: 'r1', familyId: 'f1', participantUserIds: ['u1', 'u2'],
        cadence: 'weekly', dayOfWeek: 0, startTimeLocal: '21:00',
        durationMinutes: 30, timezone: 'America/New_York', status: 'active',
        startsOn: { _seconds: 0, _nanoseconds: 0 } as any,
        createdAt: { _seconds: 0, _nanoseconds: 0 } as any,
        createdByUserId: 'u1',
        updatedAt: { _seconds: 0, _nanoseconds: 0 } as any,
        updatedByUserId: 'u1',
      },
    }));
    expect(result.gridTiles).toContain('ritual-info');
  });

  it('falls through hero chain to calm when no data', () => {
    const result = resolveRecipe(dataWith({ stage: 'active', hasAssessments: true }));
    expect(result.hero).toBe('calm');
  });

  it('caps grid tiles at maxGridTiles', () => {
    const result = resolveRecipe(dataWith({
      stage: 'active',
      hasAssessments: true,
      ritual: {
        id: 'r1', familyId: 'f1', participantUserIds: ['u1', 'u2'],
        cadence: 'weekly', dayOfWeek: 0, startTimeLocal: '21:00',
        durationMinutes: 30, timezone: 'America/New_York', status: 'active',
        startsOn: { _seconds: 0, _nanoseconds: 0 } as any,
        createdAt: { _seconds: 0, _nanoseconds: 0 } as any,
        createdByUserId: 'u1',
        updatedAt: { _seconds: 0, _nanoseconds: 0 } as any,
        updatedByUserId: 'u1',
      },
      activeGrowthItems: [{ growthItemId: 'g1', type: 'micro_activity', status: 'active' } as any],
      arcGroups: [{ arc: { id: 'a1', status: 'active' } as any, activeItems: [], completedItems: [], progress: 50 }],
      journalEntries: [{ id: 'j1', text: 'entry' } as any],
      people: [{ id: 'p1', name: 'Liam' } as any, { id: 'p2', name: 'Mia' } as any],
      manuals: [{ id: 'm1', personId: 'p1' } as any],
      dinnerPrompt: 'What superpower would you pick?',
    }));
    expect(result.gridTiles.length).toBeLessThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- __tests__/lib/surface-recipes.test.ts`
Expected: FAIL — module `@/lib/surface-recipes` not found

- [ ] **Step 3: Implement recipe definitions + eligibility engine**

```typescript
// src/lib/surface-recipes.ts
import type {
  SurfaceRecipe,
  SurfaceData,
  ResolvedSurface,
  HeroModuleId,
  GridModuleId,
} from '@/types/surface-recipe';
import type { DashboardState } from '@/hooks/useDashboard';

// ── Recipes per stage ──────────────────────────────────────────

const RECIPES: Record<Exclude<DashboardState, 'loading'>, SurfaceRecipe> = {
  new_user: {
    heroCandidates: ['stage-cta-self'],
    gridCandidates: [],
    maxGridTiles: 0,
  },
  self_complete: {
    heroCandidates: ['stage-cta-add-person'],
    gridCandidates: ['reflection-prompt'],
    maxGridTiles: 1,
  },
  has_people: {
    heroCandidates: ['stage-cta-contribute'],
    gridCandidates: ['contribution-needed', 'invite-spouse'],
    maxGridTiles: 2,
  },
  has_contributions: {
    heroCandidates: ['fresh-synthesis', 'stage-cta-contribute'],
    gridCandidates: ['ritual-setup', 'perspective-gap'],
    maxGridTiles: 2,
  },
  active: {
    heroCandidates: [
      'fresh-synthesis',
      'person-spotlight',
      'journal-echo',
      'next-action',
      'calm',
    ],
    gridCandidates: [
      'ritual-info',
      'micro-activity',
      'pattern-detected',
      'blind-spot',
      'growth-arc',
      'recent-journal',
      'family-freshness',
    ],
    maxGridTiles: 6,
  },
};

export function getRecipeForStage(stage: DashboardState): SurfaceRecipe {
  if (stage === 'loading') return RECIPES.new_user;
  return RECIPES[stage];
}

// ── Module eligibility ─────────────────────────────────────────

const heroEligible: Record<HeroModuleId, (d: SurfaceData) => boolean> = {
  'stage-cta-self': (d) => !d.hasSelfContribution,
  'stage-cta-add-person': (d) => d.hasSelfContribution && d.people.length <= 1,
  'stage-cta-contribute': (d) => d.peopleNeedingContributions.length > 0,
  'fresh-synthesis': (d) => {
    return d.manuals.some(
      (m) => m.synthesizedContent?.lastSynthesizedAt != null
    );
  },
  'person-spotlight': (d) => {
    // Eligible when any manual has synthesis with alignments, gaps, or blindSpots
    return d.manuals.some(
      (m) =>
        m.synthesizedContent != null &&
        ((m.synthesizedContent.alignments?.length ?? 0) > 0 ||
          (m.synthesizedContent.gaps?.length ?? 0) > 0 ||
          (m.synthesizedContent.blindSpots?.length ?? 0) > 0)
    );
  },
  'journal-echo': (d) => d.echo != null,
  'next-action': (d) => d.actionItems.length > 0 || d.ritual != null,
  calm: () => true, // Always eligible — terminal fallback
};

const gridEligible: Record<GridModuleId, (d: SurfaceData) => boolean> = {
  'ritual-info': (d) => d.ritual != null && d.ritual.status === 'active',
  'micro-activity': (d) =>
    d.activeGrowthItems.some((i) => i.type === 'micro_activity'),
  'pattern-detected': (d) =>
    d.journalEntries.some(
      (e) => e.enrichment?.themes && e.enrichment.themes.length > 0
    ),
  'blind-spot': (d) =>
    d.manuals.some(
      (m) => (m.synthesizedContent?.blindSpots?.length ?? 0) > 0
    ),
  'growth-arc': (d) =>
    d.arcGroups.some((g) => g.arc.status === 'active'),
  'dinner-prompt': (d) => d.dinnerPrompt != null,
  'recent-journal': (d) => d.journalEntries.length > 0,
  'family-freshness': (d) => d.people.length > 1,
  'reflection-prompt': (d) =>
    d.activeGrowthItems.some((i) => i.type === 'reflection_prompt'),
  'perspective-gap': (d) =>
    d.manuals.some(
      (m) =>
        m.perspectives != null &&
        (m.perspectives.observers?.length ?? 0) === 0
    ),
  'ritual-setup': (d) => d.ritual == null && d.spouse != null,
  'invite-spouse': (d) =>
    d.spouse != null && d.spouse.linkedUserId == null,
  'contribution-needed': (d) => d.peopleNeedingContributions.length > 0,
};

// ── Resolver ───────────────────────────────────────────────────

export function resolveRecipe(data: SurfaceData): ResolvedSurface {
  const recipe = getRecipeForStage(data.stage);

  // Resolve hero: first eligible candidate wins
  let hero: HeroModuleId = 'calm';
  for (const candidate of recipe.heroCandidates) {
    if (heroEligible[candidate](data)) {
      hero = candidate;
      break;
    }
  }

  // Resolve grid: collect eligible candidates up to max
  const gridTiles: GridModuleId[] = [];
  for (const candidate of recipe.gridCandidates) {
    if (gridTiles.length >= recipe.maxGridTiles) break;
    if (gridEligible[candidate](data)) {
      gridTiles.push(candidate);
    }
  }

  return { hero, gridTiles };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- __tests__/lib/surface-recipes.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/surface-recipes.ts __tests__/lib/surface-recipes.test.ts
git commit -m "feat(surface): recipe definitions + eligibility engine with tests"
```

---

## Task 3: useDinnerPrompt Hook

Fetch today's dinner prompt from the existing `getDinnerPrompt` Cloud Function.

**Files:**
- Create: `src/hooks/useDinnerPrompt.ts`
- Create: `__tests__/hooks/useDinnerPrompt.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/hooks/useDinnerPrompt.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDinnerPrompt } from '@/hooks/useDinnerPrompt';

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'u1', familyId: 'f1' } }),
}));

import { httpsCallable } from 'firebase/functions';

describe('useDinnerPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null while loading', () => {
    (httpsCallable as any).mockReturnValue(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useDinnerPrompt());
    expect(result.current.prompt).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('returns prompt text on success', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: { prompt: 'What superpower would you pick?' },
    });
    (httpsCallable as any).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useDinnerPrompt());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prompt).toBe('What superpower would you pick?');
  });

  it('returns null on error', async () => {
    const mockCallable = vi.fn().mockRejectedValue(new Error('fail'));
    (httpsCallable as any).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useDinnerPrompt());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prompt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- __tests__/hooks/useDinnerPrompt.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement hook**

```typescript
// src/hooks/useDinnerPrompt.ts
'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';

interface UseDinnerPromptReturn {
  prompt: string | null;
  loading: boolean;
}

export function useDinnerPrompt(): UseDinnerPromptReturn {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const functions = getFunctions();
    const getDinnerPrompt = httpsCallable(functions, 'getDinnerPrompt');

    getDinnerPrompt({ familyId: user.familyId })
      .then((result) => {
        if (!cancelled) {
          const data = result.data as { prompt?: string };
          setPrompt(data.prompt ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setPrompt(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.familyId]);

  return { prompt, loading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- __tests__/hooks/useDinnerPrompt.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDinnerPrompt.ts __tests__/hooks/useDinnerPrompt.test.ts
git commit -m "feat(surface): useDinnerPrompt hook"
```

---

## Task 4: SurfaceLayout Responsive Wrapper

The responsive layout: landscape = left hero + right grid (no scroll), portrait = stacked scrollable.

**Files:**
- Create: `src/components/surface/SurfaceLayout.tsx`
- Create: `__tests__/components/surface/SurfaceLayout.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/components/surface/SurfaceLayout.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurfaceLayout } from '@/components/surface/SurfaceLayout';

describe('SurfaceLayout', () => {
  it('renders hero and grid slots', () => {
    render(
      <SurfaceLayout
        hero={<div data-testid="hero">Hero content</div>}
        grid={<div data-testid="grid">Grid content</div>}
        gridTileCount={4}
      />
    );
    expect(screen.getByTestId('hero')).toBeDefined();
    expect(screen.getByTestId('grid')).toBeDefined();
  });

  it('renders full-width hero when gridTileCount is 0', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div data-testid="hero">Hero</div>}
        grid={null}
        gridTileCount={0}
      />
    );
    const layout = container.firstElementChild;
    expect(layout?.className).toContain('full-width');
  });

  it('renders wide hero when gridTileCount is 1-2', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={2}
      />
    );
    const layout = container.firstElementChild;
    expect(layout?.className).toContain('wide-hero');
  });

  it('renders standard layout when gridTileCount >= 3', () => {
    const { container } = render(
      <SurfaceLayout
        hero={<div>Hero</div>}
        grid={<div>Grid</div>}
        gridTileCount={4}
      />
    );
    const layout = container.firstElementChild;
    expect(layout?.className).toContain('standard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- __tests__/components/surface/SurfaceLayout.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SurfaceLayout**

```tsx
// src/components/surface/SurfaceLayout.tsx
'use client';

import type { ReactNode } from 'react';

interface SurfaceLayoutProps {
  hero: ReactNode;
  grid: ReactNode;
  gridTileCount: number;
}

export function SurfaceLayout({ hero, grid, gridTileCount }: SurfaceLayoutProps) {
  const layoutMode =
    gridTileCount === 0
      ? 'full-width'
      : gridTileCount <= 2
        ? 'wide-hero'
        : 'standard';

  return (
    <div
      className={`surface-layout ${layoutMode}`}
      style={{
        display: 'grid',
        minHeight: 'calc(100vh - var(--relish-top-offset, 0px) - 88px)',
        ...(layoutMode === 'full-width'
          ? { gridTemplateColumns: '1fr' }
          : layoutMode === 'wide-hero'
            ? { gridTemplateColumns: '60% 1fr' }
            : { gridTemplateColumns: '40% 1fr' }),
      }}
    >
      <div className="surface-hero">{hero}</div>
      {grid && <div className="surface-grid overflow-y-auto">{grid}</div>}

      <style jsx>{`
        @media (max-width: 768px) {
          .surface-layout {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .surface-grid {
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- __tests__/components/surface/SurfaceLayout.test.tsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/surface/SurfaceLayout.tsx __tests__/components/surface/SurfaceLayout.test.tsx
git commit -m "feat(surface): responsive SurfaceLayout wrapper"
```

---

## Task 5: Hero Module Components

Build the hero components that render in the left column. Each hero fills the full height of the left panel.

**Files:**
- Create: `src/components/surface/heroes/StageCTAHero.tsx`
- Create: `src/components/surface/heroes/SynthesisHero.tsx`
- Create: `src/components/surface/heroes/SpotlightHero.tsx`
- Create: `src/components/surface/heroes/CalmHero.tsx`

- [ ] **Step 1: Create StageCTAHero**

This hero covers stages 1–3 (self-onboard, add person, contribute). Content varies by which stage CTA it is.

```tsx
// src/components/surface/heroes/StageCTAHero.tsx
'use client';

import Link from 'next/link';
import type { Person } from '@/types/person-manual';

type CTAVariant = 'self' | 'add-person' | 'contribute';

interface StageCTAHeroProps {
  variant: CTAVariant;
  /** For 'contribute' variant — the person to contribute about */
  targetPerson?: Person | null;
  /** Route for the self-onboard, add-person, or contribute action */
  selfPersonId?: string | null;
}

const COPY: Record<CTAVariant, { eyebrow: string; title: string; body: string; ctaLabel: string }> = {
  self: {
    eyebrow: 'Welcome to Relish',
    title: 'Start by telling us about yourself',
    body: 'Your self-assessment is the foundation. Everything else — insights, growth, your family\'s manuals — builds from here.',
    ctaLabel: 'Begin your self-assessment →',
  },
  'add-person': {
    eyebrow: 'Nice work ✓',
    title: 'Now add someone you care about',
    body: 'The magic happens when multiple perspectives meet. Add your spouse, a child, or anyone whose manual you want to build together.',
    ctaLabel: 'Add a person →',
  },
  contribute: {
    eyebrow: 'Building the picture',
    title: 'Share your perspective on {name}',
    body: 'You know them in a way no one else does. Your observations become part of their manual.',
    ctaLabel: 'Start contributing →',
  },
};

export function StageCTAHero({ variant, targetPerson, selfPersonId }: StageCTAHeroProps) {
  const copy = COPY[variant];
  const title = copy.title.replace('{name}', targetPerson?.name ?? 'them');

  const href =
    variant === 'self' && selfPersonId
      ? `/people/${selfPersonId}/manual/self-onboard`
      : variant === 'add-person'
        ? '/people'
        : targetPerson
          ? `/people/${targetPerson.id}/manual/onboard`
          : '/people';

  return (
    <div className="flex flex-col justify-center h-full px-8 py-10"
      style={{ background: 'linear-gradient(180deg, #3A3530 0%, #4A4540 100%)' }}>
      <p className="text-xs uppercase tracking-[0.15em] mb-3"
        style={{ color: '#B5AA98' }}>{copy.eyebrow}</p>
      <h1 className="text-2xl md:text-3xl leading-tight mb-4"
        style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
        {title}
      </h1>
      <p className="text-base leading-relaxed mb-6 max-w-lg"
        style={{ color: '#D4C8B8' }}>{copy.body}</p>
      <Link href={href}
        className="inline-block self-start px-6 py-3 rounded-full text-sm font-medium text-white"
        style={{ background: '#6B8F71' }}>
        {copy.ctaLabel}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create SynthesisHero**

```tsx
// src/components/surface/heroes/SynthesisHero.tsx
'use client';

import Link from 'next/link';
import type { PersonManual } from '@/types/person-manual';

interface SynthesisHeroProps {
  manual: PersonManual;
}

function pickHighlight(manual: PersonManual): {
  text: string;
  type: string;
  personName: string;
} | null {
  const sc = manual.synthesizedContent;
  if (!sc) return null;

  // Priority: blindSpots > gaps > alignments > overview
  if (sc.blindSpots?.length) {
    return { text: sc.blindSpots[0].description ?? sc.blindSpots[0].detail ?? '', type: 'Blind spot', personName: manual.personName };
  }
  if (sc.gaps?.length) {
    return { text: sc.gaps[0].description ?? sc.gaps[0].detail ?? '', type: 'Gap', personName: manual.personName };
  }
  if (sc.alignments?.length) {
    return { text: sc.alignments[0].description ?? sc.alignments[0].detail ?? '', type: 'Alignment', personName: manual.personName };
  }
  if (sc.overview) {
    return { text: sc.overview, type: 'Synthesis', personName: manual.personName };
  }
  return null;
}

export function SynthesisHero({ manual }: SynthesisHeroProps) {
  const highlight = pickHighlight(manual);
  if (!highlight) return null;

  return (
    <div className="flex flex-col justify-center h-full px-8 py-10"
      style={{ background: 'linear-gradient(180deg, #3A3530 0%, #4A4540 100%)' }}>
      <p className="text-xs uppercase tracking-[0.15em] mb-3"
        style={{ color: '#8BAF8E' }}>
        ✦ Something new about {highlight.personName}
      </p>
      <blockquote className="text-xl md:text-2xl leading-snug mb-3"
        style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
        &ldquo;{highlight.text}&rdquo;
      </blockquote>
      <p className="text-sm mb-6" style={{ color: '#B5AA98' }}>
        {highlight.type} · {manual.personName}&apos;s manual
      </p>
      <Link href={`/people/${manual.personId}/manual`}
        className="inline-block self-start px-5 py-2 rounded-full text-sm"
        style={{ background: 'rgba(107,143,113,0.3)', border: '1px solid rgba(107,143,113,0.5)', color: '#B5D4B8' }}>
        Read full synthesis →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create SpotlightHero**

```tsx
// src/components/surface/heroes/SpotlightHero.tsx
'use client';

import Link from 'next/link';
import type { PersonManual } from '@/types/person-manual';

interface SpotlightHeroProps {
  manual: PersonManual;
}

export function SpotlightHero({ manual }: SpotlightHeroProps) {
  const sc = manual.synthesizedContent;
  const summary = sc?.overview ?? 'New insights are available.';

  return (
    <div className="flex flex-col justify-center h-full px-8 py-10"
      style={{ background: 'linear-gradient(180deg, #3A3530 0%, #4A4540 100%)' }}>
      <p className="text-xs uppercase tracking-[0.15em] mb-3"
        style={{ color: '#8BAF8E' }}>
        ✦ {manual.personName}
      </p>
      <p className="text-xl md:text-2xl leading-snug mb-4"
        style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
        {summary}
      </p>
      <Link href={`/people/${manual.personId}/manual`}
        className="inline-block self-start px-5 py-2 rounded-full text-sm"
        style={{ background: 'rgba(107,143,113,0.3)', border: '1px solid rgba(107,143,113,0.5)', color: '#B5D4B8' }}>
        See {manual.personName}&apos;s manual →
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Create CalmHero**

```tsx
// src/components/surface/heroes/CalmHero.tsx
'use client';

const CALM_MESSAGES = [
  { title: 'All clear', body: 'Nothing needs your attention right now. That\'s a good thing.' },
  { title: 'Quiet moment', body: 'Your family\'s manuals are up to date. Enjoy the stillness.' },
  { title: 'Everything in balance', body: 'No new insights, no pending actions. Just presence.' },
];

export function CalmHero() {
  // Deterministic based on day of year so it doesn't flicker
  const dayIndex = Math.floor(Date.now() / 86400000) % CALM_MESSAGES.length;
  const msg = CALM_MESSAGES[dayIndex];

  return (
    <div className="flex flex-col justify-center h-full px-8 py-10"
      style={{ background: 'linear-gradient(180deg, #3A3530 0%, #4A4540 100%)' }}>
      <h1 className="text-2xl md:text-3xl leading-tight mb-4"
        style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
        {msg.title}
      </h1>
      <p className="text-base leading-relaxed max-w-md" style={{ color: '#D4C8B8' }}>
        {msg.body}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/surface/heroes/
git commit -m "feat(surface): hero module components (StageCTA, Synthesis, Spotlight, Calm)"
```

---

## Task 6: Grid Tile Components

Build compact tile components for the right-side grid. Each tile is a self-contained card.

**Files:**
- Create all files in `src/components/surface/tiles/`

- [ ] **Step 1: Create RitualTile**

```tsx
// src/components/surface/tiles/RitualTile.tsx
'use client';

import Link from 'next/link';
import type { CoupleRitual } from '@/types/couple-ritual';
import { nextOccurrence } from '@/lib/rituals/nextOccurrence';

interface RitualTileProps {
  ritual: CoupleRitual;
  spouseName: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RitualTile({ ritual, spouseName }: RitualTileProps) {
  const next = nextOccurrence(ritual);
  const daysUntil = next
    ? Math.max(0, Math.ceil((next.getTime() - Date.now()) / 86400000))
    : null;
  const dayLabel = DAYS[ritual.dayOfWeek];
  const time = ritual.startTimeLocal;
  // Format time as 12-hour
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 || 12;
  const timeStr = `${hour12}:${m.toString().padStart(2, '0')}${ampm}`;

  return (
    <Link href="/rituals/couple/manage" className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Ritual</p>
      <p className="text-sm font-medium" style={{ color: '#3A3530' }}>{dayLabel} {timeStr}</p>
      <p className="text-xs mt-0.5" style={{ color: '#8B7E6A' }}>
        with {spouseName}{daysUntil != null ? ` · ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `${daysUntil} days`}` : ''}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Create MicroActivityTile**

```tsx
// src/components/surface/tiles/MicroActivityTile.tsx
'use client';

import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';

interface MicroActivityTileProps {
  item: GrowthItem;
}

export function MicroActivityTile({ item }: MicroActivityTileProps) {
  return (
    <Link href={`/growth/${item.growthItemId}`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Try today</p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>{item.title}</p>
      {item.targetPersonNames?.length > 0 && (
        <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>for {item.targetPersonNames[0]}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Create PatternTile**

```tsx
// src/components/surface/tiles/PatternTile.tsx
'use client';

import Link from 'next/link';

interface PatternTileProps {
  description: string;
  source: string;
  entryId?: string;
}

export function PatternTile({ description, source, entryId }: PatternTileProps) {
  const Wrapper = entryId ? Link : 'div';
  const props = entryId ? { href: `/journal/${entryId}` } : {};

  return (
    <Wrapper {...(props as any)} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Pattern</p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>{description}</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>{source}</p>
    </Wrapper>
  );
}
```

- [ ] **Step 4: Create BlindSpotTile**

```tsx
// src/components/surface/tiles/BlindSpotTile.tsx
'use client';

import Link from 'next/link';

interface BlindSpotTileProps {
  description: string;
  personName: string;
  personId: string;
}

export function BlindSpotTile({ description, personName, personId }: BlindSpotTileProps) {
  return (
    <Link href={`/people/${personId}/manual`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Blind spot</p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>{description}</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>{personName}&apos;s manual</p>
    </Link>
  );
}
```

- [ ] **Step 5: Create GrowthArcTile**

```tsx
// src/components/surface/tiles/GrowthArcTile.tsx
'use client';

import Link from 'next/link';
import type { ArcGroup } from '@/hooks/useGrowthFeed';

interface GrowthArcTileProps {
  arcGroup: ArcGroup;
}

export function GrowthArcTile({ arcGroup }: GrowthArcTileProps) {
  const { arc, progress } = arcGroup;
  const totalWeeks = arc.phases?.length ?? 6;
  const currentWeek = Math.ceil((progress / 100) * totalWeeks) || 1;

  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Growth</p>
      <p className="text-sm font-medium" style={{ color: '#3A3530' }}>{arc.dimensionLabel ?? 'Growth Arc'}</p>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#F5F0E8' }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#6B8F71' }} />
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: '#8B7E6A' }}>
        Week {currentWeek} of {totalWeeks}{arc.targetPersonNames?.length ? ` · ${arc.targetPersonNames[0]}` : ''}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create DinnerPromptTile**

```tsx
// src/components/surface/tiles/DinnerPromptTile.tsx
'use client';

interface DinnerPromptTileProps {
  prompt: string;
}

export function DinnerPromptTile({ prompt }: DinnerPromptTileProps) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#3A3530' }}>
      <p className="text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: '#8BAF8E' }}>
        Tonight at dinner
      </p>
      <p className="text-sm leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
        &ldquo;{prompt}&rdquo;
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Create RecentJournalTile**

```tsx
// src/components/surface/tiles/RecentJournalTile.tsx
'use client';

import Link from 'next/link';
import type { JournalEntry } from '@/types/journal';

interface RecentJournalTileProps {
  entry: JournalEntry;
}

export function RecentJournalTile({ entry }: RecentJournalTileProps) {
  const date = entry.createdAt?.toDate?.() ?? new Date(entry.createdAt?._seconds * 1000);
  const relative = formatRelativeDate(date);
  const excerpt = (entry.text ?? '').slice(0, 120) + ((entry.text?.length ?? 0) > 120 ? '...' : '');

  return (
    <Link href={`/journal/${entry.id}`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-xs mb-1" style={{ color: '#8B7E6A' }}>{relative}</p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>{excerpt}</p>
      <p className="text-xs mt-2" style={{ color: '#6B8F71' }}>→ Journal</p>
    </Link>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

- [ ] **Step 8: Create FamilyFreshnessTile**

```tsx
// src/components/surface/tiles/FamilyFreshnessTile.tsx
'use client';

import Link from 'next/link';
import type { Person, PersonManual } from '@/types/person-manual';
import { computeFreshness, type FreshnessStatus } from '@/lib/freshness-engine';

interface FamilyFreshnessTileProps {
  people: Person[];
  manuals: PersonManual[];
}

const FRESHNESS_COLORS: Record<FreshnessStatus, string> = {
  fresh: '#6B8F71',
  aging: '#D4A574',
  stale: '#8B7E6A',
};

const FRESHNESS_LABELS: Record<FreshnessStatus, string> = {
  fresh: '✓',
  aging: 'aging',
  stale: 'stale',
};

export function FamilyFreshnessTile({ people, manuals }: FamilyFreshnessTileProps) {
  // Filter to non-self people
  const displayPeople = people.filter((p) => p.relationshipType !== 'self');
  if (displayPeople.length === 0) return null;

  return (
    <div className="flex gap-2 col-span-2">
      {displayPeople.map((person) => {
        const manual = manuals.find((m) => m.personId === person.id);
        const freshness: FreshnessStatus = manual ? computeFreshness(manual) : 'stale';
        const color = FRESHNESS_COLORS[freshness];
        const initial = person.name?.charAt(0).toUpperCase() ?? '?';

        return (
          <Link
            key={person.id}
            href={manual ? `/people/${person.id}/manual` : `/people/${person.id}/create-manual`}
            className="flex-1 bg-white rounded-xl py-2 px-3 flex items-center gap-2 justify-center hover:shadow-sm transition-shadow"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]"
              style={{ background: color }}
            >
              {initial}
            </div>
            <span className="text-xs" style={{ color: '#3A3530' }}>{person.name}</span>
            <span className="text-[10px]" style={{ color }}>{FRESHNESS_LABELS[freshness]}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9: Create remaining simple tiles** (ReflectionPromptTile, PerspectiveGapTile, RitualSetupTile, InviteSpouseTile, ContributionNeededTile)

```tsx
// src/components/surface/tiles/ReflectionPromptTile.tsx
'use client';

import type { GrowthItem } from '@/types/growth';

interface ReflectionPromptTileProps {
  item: GrowthItem;
}

export function ReflectionPromptTile({ item }: ReflectionPromptTileProps) {
  return (
    <div className="bg-white rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Reflect</p>
      <p className="text-sm leading-snug" style={{ color: '#3A3530' }}>{item.title}</p>
    </div>
  );
}
```

```tsx
// src/components/surface/tiles/PerspectiveGapTile.tsx
'use client';

import Link from 'next/link';

interface PerspectiveGapTileProps {
  personName: string;
  personId: string;
}

export function PerspectiveGapTile({ personName, personId }: PerspectiveGapTileProps) {
  return (
    <Link href={`/people/${personId}/manual`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Perspective needed</p>
      <p className="text-sm" style={{ color: '#3A3530' }}>{personName}&apos;s manual is single-view</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>Another perspective would enrich it</p>
    </Link>
  );
}
```

```tsx
// src/components/surface/tiles/RitualSetupTile.tsx
'use client';

import Link from 'next/link';

interface RitualSetupTileProps {
  spouseName: string;
}

export function RitualSetupTile({ spouseName }: RitualSetupTileProps) {
  return (
    <Link href="/rituals/couple/setup" className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Set up a ritual</p>
      <p className="text-sm" style={{ color: '#3A3530' }}>Weekly check-in with {spouseName}</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>Make insights a habit</p>
    </Link>
  );
}
```

```tsx
// src/components/surface/tiles/InviteSpouseTile.tsx
'use client';

import Link from 'next/link';

interface InviteSpouseTileProps {
  spouseName: string;
  spousePersonId: string;
}

export function InviteSpouseTile({ spouseName, spousePersonId }: InviteSpouseTileProps) {
  return (
    <Link href={`/people/${spousePersonId}/manual`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Invite</p>
      <p className="text-sm" style={{ color: '#3A3530' }}>Invite {spouseName}</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>Their perspective unlocks synthesis</p>
    </Link>
  );
}
```

```tsx
// src/components/surface/tiles/ContributionNeededTile.tsx
'use client';

import Link from 'next/link';
import type { Person } from '@/types/person-manual';

interface ContributionNeededTileProps {
  person: Person;
}

export function ContributionNeededTile({ person }: ContributionNeededTileProps) {
  return (
    <Link href={`/people/${person.id}/manual/onboard`} className="block bg-white rounded-xl p-4 hover:shadow-sm transition-shadow">
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>Also needs your view</p>
      <p className="text-sm" style={{ color: '#3A3530' }}>{person.name}</p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>No contributions yet</p>
    </Link>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add src/components/surface/tiles/
git commit -m "feat(surface): grid tile components (12 tiles)"
```

---

## Task 7: HeroSlot + GridSlot Containers

These containers take the resolved recipe and render the correct module components, passing the right props from SurfaceData.

**Files:**
- Create: `src/components/surface/HeroSlot.tsx`
- Create: `src/components/surface/GridSlot.tsx`
- Create: `__tests__/components/surface/HeroSlot.test.tsx`
- Create: `__tests__/components/surface/GridSlot.test.tsx`

- [ ] **Step 1: Write failing test for HeroSlot**

```typescript
// __tests__/components/surface/HeroSlot.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSlot } from '@/components/surface/HeroSlot';
import type { SurfaceData } from '@/types/surface-recipe';

// Mock all hero components
vi.mock('@/components/surface/heroes/StageCTAHero', () => ({
  StageCTAHero: (props: any) => <div data-testid="stage-cta">{props.variant}</div>,
}));
vi.mock('@/components/surface/heroes/SynthesisHero', () => ({
  SynthesisHero: () => <div data-testid="synthesis-hero" />,
}));
vi.mock('@/components/surface/heroes/SpotlightHero', () => ({
  SpotlightHero: () => <div data-testid="spotlight-hero" />,
}));
vi.mock('@/components/surface/heroes/CalmHero', () => ({
  CalmHero: () => <div data-testid="calm-hero" />,
}));

const emptyData = {
  stage: 'new_user' as const,
  people: [], manuals: [], contributions: [], selfPerson: null, spouse: null,
  peopleNeedingContributions: [], hasSelfContribution: false,
  activeGrowthItems: [], arcGroups: [], journalEntries: [], echo: null,
  ritual: null, actionItems: [], dinnerPrompt: null, hasAssessments: false,
} satisfies SurfaceData;

describe('HeroSlot', () => {
  it('renders StageCTAHero for stage-cta-self', () => {
    render(<HeroSlot heroId="stage-cta-self" data={emptyData} />);
    expect(screen.getByTestId('stage-cta')).toBeDefined();
    expect(screen.getByText('self')).toBeDefined();
  });

  it('renders CalmHero for calm', () => {
    render(<HeroSlot heroId="calm" data={emptyData} />);
    expect(screen.getByTestId('calm-hero')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- __tests__/components/surface/HeroSlot.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement HeroSlot**

```tsx
// src/components/surface/HeroSlot.tsx
'use client';

import type { HeroModuleId, SurfaceData } from '@/types/surface-recipe';
import { StageCTAHero } from './heroes/StageCTAHero';
import { SynthesisHero } from './heroes/SynthesisHero';
import { SpotlightHero } from './heroes/SpotlightHero';
import { CalmHero } from './heroes/CalmHero';

interface HeroSlotProps {
  heroId: HeroModuleId;
  data: SurfaceData;
}

export function HeroSlot({ heroId, data }: HeroSlotProps) {
  const heroContent = (() => {
    switch (heroId) {
      case 'stage-cta-self':
        return <StageCTAHero variant="self" selfPersonId={data.selfPerson?.id} />;
      case 'stage-cta-add-person':
        return <StageCTAHero variant="add-person" />;
      case 'stage-cta-contribute':
        return <StageCTAHero variant="contribute" targetPerson={data.peopleNeedingContributions[0]} />;
      case 'fresh-synthesis': {
        const manual = data.manuals.find((m) => m.synthesizedContent?.lastSynthesizedAt != null);
        return manual ? <SynthesisHero manual={manual} /> : <CalmHero />;
      }
      case 'person-spotlight': {
        const manual = data.manuals.find(
          (m) => m.synthesizedContent != null &&
            ((m.synthesizedContent.alignments?.length ?? 0) > 0 ||
              (m.synthesizedContent.gaps?.length ?? 0) > 0 ||
              (m.synthesizedContent.blindSpots?.length ?? 0) > 0)
        );
        return manual ? <SpotlightHero manual={manual} /> : <CalmHero />;
      }
      case 'journal-echo':
        // Reuse SynthesisHero-style display for echo — or build dedicated EchoHero later
        // For v1, fall through to calm if echo somehow resolved but isn't renderable
        return <CalmHero />;
      case 'next-action':
        // For v1, next-action hero shows the ritual or top action item as a stage CTA
        if (data.ritual) {
          return <StageCTAHero variant="contribute" targetPerson={data.peopleNeedingContributions[0]} />;
        }
        return <CalmHero />;
      case 'calm':
      default:
        return <CalmHero />;
    }
  })();

  // Dinner prompt anchors at bottom of hero column (per spec layout)
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">{heroContent}</div>
      {data.dinnerPrompt && (
        <div className="px-8 pb-6">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8BAF8E' }}>
              Tonight at dinner
            </p>
            <p className="text-sm leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
              &ldquo;{data.dinnerPrompt}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- __tests__/components/surface/HeroSlot.test.tsx`
Expected: PASS

- [ ] **Step 5: Implement GridSlot**

```tsx
// src/components/surface/GridSlot.tsx
'use client';

import type { GridModuleId, SurfaceData } from '@/types/surface-recipe';
import { RitualTile } from './tiles/RitualTile';
import { MicroActivityTile } from './tiles/MicroActivityTile';
import { PatternTile } from './tiles/PatternTile';
import { BlindSpotTile } from './tiles/BlindSpotTile';
import { GrowthArcTile } from './tiles/GrowthArcTile';
import { DinnerPromptTile } from './tiles/DinnerPromptTile';
import { RecentJournalTile } from './tiles/RecentJournalTile';
import { FamilyFreshnessTile } from './tiles/FamilyFreshnessTile';
import { ReflectionPromptTile } from './tiles/ReflectionPromptTile';
import { PerspectiveGapTile } from './tiles/PerspectiveGapTile';
import { RitualSetupTile } from './tiles/RitualSetupTile';
import { InviteSpouseTile } from './tiles/InviteSpouseTile';
import { ContributionNeededTile } from './tiles/ContributionNeededTile';

interface GridSlotProps {
  tileIds: GridModuleId[];
  data: SurfaceData;
}

export function GridSlot({ tileIds, data }: GridSlotProps) {
  if (tileIds.length === 0) return null;

  return (
    <div className="p-4 flex flex-col gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        {tileIds.map((id) => (
          <GridTile key={id} id={id} data={data} />
        ))}
      </div>
    </div>
  );
}

function GridTile({ id, data }: { id: GridModuleId; data: SurfaceData }) {
  switch (id) {
    case 'ritual-info':
      return data.ritual ? (
        <RitualTile ritual={data.ritual} spouseName={data.spouse?.name ?? 'partner'} />
      ) : null;
    case 'micro-activity': {
      const item = data.activeGrowthItems.find((i) => i.type === 'micro_activity');
      return item ? <MicroActivityTile item={item} /> : null;
    }
    case 'pattern-detected': {
      const entry = data.journalEntries.find(
        (e) => e.enrichment?.themes && e.enrichment.themes.length > 0
      );
      if (!entry) return null;
      const desc = entry.enrichment?.summary ?? entry.text?.slice(0, 100) ?? '';
      return <PatternTile description={desc} source="From your journal" entryId={entry.id} />;
    }
    case 'blind-spot': {
      for (const m of data.manuals) {
        const bs = m.synthesizedContent?.blindSpots?.[0];
        if (bs) {
          return (
            <BlindSpotTile
              description={bs.description ?? bs.detail ?? ''}
              personName={m.personName}
              personId={m.personId}
            />
          );
        }
      }
      return null;
    }
    case 'growth-arc': {
      const group = data.arcGroups.find((g) => g.arc.status === 'active');
      return group ? <GrowthArcTile arcGroup={group} /> : null;
    }
    case 'dinner-prompt':
      return data.dinnerPrompt ? <DinnerPromptTile prompt={data.dinnerPrompt} /> : null;
    case 'recent-journal':
      return data.journalEntries[0] ? (
        <RecentJournalTile entry={data.journalEntries[0]} />
      ) : null;
    case 'family-freshness':
      return <FamilyFreshnessTile people={data.people} manuals={data.manuals} />;
    case 'reflection-prompt': {
      const item = data.activeGrowthItems.find((i) => i.type === 'reflection_prompt');
      return item ? <ReflectionPromptTile item={item} /> : null;
    }
    case 'perspective-gap': {
      const manual = data.manuals.find(
        (m) => m.perspectives != null && (m.perspectives.observers?.length ?? 0) === 0
      );
      if (!manual) return null;
      const person = data.people.find((p) => p.id === manual.personId);
      return person ? <PerspectiveGapTile personName={person.name} personId={person.id} /> : null;
    }
    case 'ritual-setup':
      return <RitualSetupTile spouseName={data.spouse?.name ?? 'partner'} />;
    case 'invite-spouse':
      return data.spouse ? (
        <InviteSpouseTile spouseName={data.spouse.name} spousePersonId={data.spouse.id} />
      ) : null;
    case 'contribution-needed':
      return data.peopleNeedingContributions[0] ? (
        <ContributionNeededTile person={data.peopleNeedingContributions[0]} />
      ) : null;
    default:
      return null;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/surface/HeroSlot.tsx src/components/surface/GridSlot.tsx __tests__/components/surface/HeroSlot.test.tsx
git commit -m "feat(surface): HeroSlot + GridSlot container components"
```

---

## Task 8: TheSurface Page Component

Wire everything together into the page that replaces the current `/` redirect.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

The page keeps the signed-out library desk experience but replaces the signed-in redirect with TheSurface.

```tsx
// src/app/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useJournalEcho } from '@/hooks/useJournalEcho';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useActionItems } from '@/hooks/useActionItems';
import { useDinnerPrompt } from '@/hooks/useDinnerPrompt';
import { resolveRecipe } from '@/lib/surface-recipes';
import { SurfaceLayout } from '@/components/surface/SurfaceLayout';
import { HeroSlot } from '@/components/surface/HeroSlot';
import { GridSlot } from '@/components/surface/GridSlot';
import type { SurfaceData } from '@/types/surface-recipe';
import Navigation from '@/components/layout/Navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <SignedOutLanding />;
  }

  return <TheSurface />;
}

function TheSurface() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const { ritual } = useCoupleRitual();
  const { entries: journalEntries } = useJournalEntries();
  const { echo } = useJournalEcho(journalEntries);
  const growth = useGrowthFeed();
  const actionItems = useActionItems({
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    assessments: dashboard.assessments,
    userId: user!.userId,
  });
  const { prompt: dinnerPrompt } = useDinnerPrompt();

  if (dashboard.loading) {
    return <LoadingScreen />;
  }

  const data: SurfaceData = {
    stage: dashboard.state,
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    selfPerson: dashboard.selfPerson,
    spouse: dashboard.spouse,
    peopleNeedingContributions: dashboard.peopleNeedingContributions,
    hasSelfContribution: dashboard.hasSelfContribution,
    activeGrowthItems: growth.activeItems,
    arcGroups: growth.arcGroups,
    journalEntries,
    echo,
    ritual,
    actionItems: actionItems.items,
    dinnerPrompt,
    hasAssessments: dashboard.hasAssessments,
  };

  const resolved = resolveRecipe(data);

  return (
    <>
      <Navigation />
      <main style={{ background: '#F5F0E8' }}>
        <SurfaceLayout
          hero={<HeroSlot heroId={resolved.hero} data={data} />}
          grid={<GridSlot tileIds={resolved.gridTiles} data={data} />}
          gridTileCount={resolved.gridTiles.length}
        />
      </main>
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F5F0E8' }}>
      <p style={{ color: '#8B7E6A', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '1.25rem' }}>
        Loading...
      </p>
    </div>
  );
}

function SignedOutLanding() {
  // Preserve existing signed-out library desk experience
  // Copy the current signed-out JSX from the existing page.tsx
  // This will be adapted from the current implementation during build
  return (
    <div className="relative min-h-screen" style={{ background: '#3A3530' }}>
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <Link href="/login" className="text-sm" style={{ color: '#B5AA98' }}>Sign in</Link>
        <Link href="/register" className="text-sm px-4 py-2 rounded-full"
          style={{ background: '#6B8F71', color: 'white' }}>Begin a volume</Link>
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        <h1 className="text-5xl mb-4"
          style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', color: '#F5F0E8' }}>
          Relish
        </h1>
        <p className="text-lg" style={{ color: '#B5AA98' }}>
          Operating manuals for the people you love
        </p>
      </div>
    </div>
  );
}
```

**Important:** During implementation, read the current `src/app/page.tsx` fully and preserve the exact signed-out experience (background image, interactive book elements, etc.). The `SignedOutLanding` above is a simplified placeholder — the real implementation should copy the existing signed-out JSX.

- [ ] **Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds (may have type warnings to fix)

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(surface): wire TheSurface as signed-in home page"
```

---

## Task 9: Navigation Update

Show the navigation bar on `/` for signed-in users (currently hidden on `/`).

**Files:**
- Modify: `src/components/layout/Navigation.tsx`

- [ ] **Step 1: Read current Navigation.tsx to find the hide logic**

The nav currently hides on `/`, `/login`, `/register`. We need to change it to only hide on `/` when the user is signed out, and show it when signed in.

- [ ] **Step 2: Update hide logic**

Find the pathname check that hides navigation on `/` and change it. The nav should hide on `/` only when there is no authenticated user. On `/login` and `/register` it should always hide.

Look for something like:
```typescript
const hiddenPaths = ['/', '/login', '/register'];
if (hiddenPaths.includes(pathname)) return null;
```

Change to:
```typescript
const alwaysHiddenPaths = ['/login', '/register'];
if (alwaysHiddenPaths.includes(pathname)) return null;
if (pathname === '/' && !user) return null;
```

The Navigation component already has access to `useAuth()` — use the existing `user` from that context.

- [ ] **Step 3: Verify nav shows on home when signed in**

Run: `npm run dev`
Open `http://localhost:3000/` signed in — nav should be visible.
Open `http://localhost:3000/` signed out — nav should be hidden.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navigation.tsx
git commit -m "fix(nav): show navigation on / for signed-in users"
```

---

## Task 10: Integration Smoke Test

Verify the full flow works end-to-end in the dev server.

**Files:** None (manual verification)

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All existing tests pass + new tests pass

- [ ] **Step 2: Start dev server and test each stage**

Run: `npm run dev`

Test matrix (use different accounts or manipulate Firestore data):

| Stage | Expected Hero | Expected Grid |
|---|---|---|
| **new_user** (no self-contribution) | Self-assessment CTA, full-width | Empty |
| **self_complete** (self done, no people) | Add person CTA | Reflection prompt |
| **has_people** (people exist, no contributions) | Contribute about [person] | Contribution needed + invite spouse |
| **has_contributions** (2+ contributions) | Synthesis highlight or contribute CTA | Ritual setup + perspective gap |
| **active** (assessments exist) | Fresh synthesis or calm | Ritual + micro-activity + growth arc + journal |

- [ ] **Step 3: Test responsive layout**

- Open browser at full desktop width — should show left hero + right grid, no scrolling
- Narrow to mobile width (<768px) — should stack vertically and allow scrolling
- Check that RitualBanner coexists (if active ritual exists)

- [ ] **Step 4: Fix any issues found during testing**

Address layout bugs, type errors, or missing data handling discovered during manual testing.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix(surface): integration fixes from smoke testing"
```

---

## Task 11: Cleanup Old Surface Components

Remove the scattered Surface components that are no longer used, now that the recipe-driven architecture replaces them.

**Files:**
- Delete or archive: `src/components/surface/TheSurface.tsx` (old orchestrator)
- Delete or archive: `src/components/surface/SurfaceActive.tsx`
- Delete or archive: `src/components/surface/SurfaceContent.tsx`
- Delete or archive: `src/components/surface/SurfaceHome.tsx`

- [ ] **Step 1: Check for imports of old components**

Search the codebase for any remaining imports of the old Surface components. If other routes reference them, update those references or keep the components temporarily.

Run grep for: `TheSurface`, `SurfaceActive`, `SurfaceContent`, `SurfaceHome` in `src/`

- [ ] **Step 2: Remove unused old components**

Delete files that have no remaining imports. Keep any that are still referenced from other routes.

- [ ] **Step 3: Run tests to confirm nothing broke**

Run: `npm run test:run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(surface): remove old scattered Surface components"
```
