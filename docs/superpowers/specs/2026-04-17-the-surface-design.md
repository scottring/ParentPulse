# The Surface — Single-Page Curated Home

**Date:** 2026-04-17
**Status:** Approved

## Overview

The Surface replaces the current signed-in home (which redirects to `/journal`) with a single-page curated dashboard at `/`. It draws from all data sources — journal, manuals, growth, rituals — and distills what's most important right now. All 32 possible modules exist in the system; any given visit shows 2–6 based on stage, data availability, and a hand-authored recipe.

### Core Principles

- **One route, context-driven content.** `/` is The Surface for signed-in users. What appears changes by stage and data, not by navigation.
- **Recipe-driven composition.** Each stage has a hand-authored recipe defining which modules fill which slots. Not algorithmically scored — curated.
- **Modules only appear when they have data.** Empty slots collapse. No placeholders, no "coming soon."
- **Person spotlight over roster.** People appear on The Surface when the AI has something new about them, not as a static list.
- **Existing capture button handles entry.** No new capture affordance needed — `CaptureSheet` is already global in `Navigation`.

### Visual Registers (v1 ships one)

| Context | Register | Status |
|---|---|---|
| Between rituals (active) | **Warm Hero + Grid** | **v1 — ships** |
| Ritual window (couple) | Cinematic Dark | Deferred |
| Quiet / calm state | Magazine Editorial | Deferred |
| Sparse user (Iris) | Simplified 1-2 cards | Deferred |

The recipe system supports all four registers — different recipe + different component wrappers per context. v1 ships only Warm Hero + Grid.

## Layout

### Desktop / Landscape — Single Viewport, No Scroll

Left Hero (40%) + Right Grid (60%). The "why" on the left, the "what now" on the right.

```
┌─────────────────────────────────────────────────────────┐
│  Nav: Relish wordmark                          [avatar] │
├──────────────────────┬──────────────────────────────────┤
│                      │  ┌─────────┐ ┌─────────┐        │
│   HERO               │  │ Ritual  │ │ Try     │        │
│                      │  │ info    │ │ today   │        │
│   Big insight,       │  └─────────┘ └─────────┘        │
│   synthesis quote,   │  ┌─────────┐ ┌─────────┐        │
│   or stage CTA       │  │ Pattern │ │ Growth  │        │
│                      │  │         │ │ arc     │        │
│                      │  └─────────┘ └─────────┘        │
│   ┌────────────────┐ │  ┌───────────────────────┐      │
│   │ Dinner prompt  │ │  │ Recent journal entry   │      │
│   └────────────────┘ │  └───────────────────────┘      │
│                      │  ┌──┐ ┌──┐ ┌──┐                 │
│                      │  │L │ │M │ │I │ Family pills    │
│                      │  └──┘ └──┘ └──┘                 │
├──────────────────────┴──────────────────────────────────┤
```

- Hero column includes the primary content + dinner prompt anchored at the bottom
- Grid column holds up to 6 tiles in a 2-column sub-grid + family freshness row
- If fewer than 3 grid tiles are eligible, hero column widens from 40% to 60% and grid becomes a single column
- If 0–1 grid tiles, hero goes full-width (100%) with the single tile (if any) rendered inline below the hero content

### Mobile / Portrait — Stacked, Scrollable

Same content, same recipes, same modules. Hero on top, grid tiles stacked vertically below. Natural scroll.

```
┌────────────────────┐
│  Nav               │
├────────────────────┤
│  HERO              │
│  (full width)      │
├────────────────────┤
│  ┌──────┐ ┌──────┐ │
│  │Ritual│ │Try   │ │
│  └──────┘ └──────┘ │
│  ┌──────┐ ┌──────┐ │
│  │Patt. │ │Growth│ │
│  └──────┘ └──────┘ │
│  ┌────────────────┐ │
│  │ Dinner prompt  │ │
│  └────────────────┘ │
│  ┌────────────────┐ │
│  │ Recent journal │ │
│  └────────────────┘ │
│  ┌──┐ ┌──┐ ┌──┐    │
│  │L │ │M │ │I │    │
│  └──┘ └──┘ └──┘    │
└────────────────────┘
```

## Stage Recipes

### Stage 1: `new_user`

User signed up but hasn't completed self-assessment.

- **Hero:** Stage CTA — "Start by telling us about yourself." Full-width (no grid).
- **Grid:** None. Hero goes full-width with a single clear action.
- **Modules:** 1

### Stage 2: `self_complete`

Self-assessment done, no other people added.

- **Hero:** Stage CTA — "Now add someone you care about."
- **Grid:** Reflection prompt ("Who in your life would benefit most from being better understood?")
- **Modules:** 2

### Stage 3: `has_people`

People exist but not enough contributions for synthesis.

- **Hero:** Next contribution CTA — "Share your perspective on [person]." Picks the person most in need of a contribution.
- **Grid:** Other people needing contributions + Invite spouse (if spouse exists but hasn't been invited).
- **Modules:** 2–3

### Stage 4: `has_contributions`

2+ contributions exist, synthesis is starting to produce insights.

- **Hero:** Fresh synthesis highlight (if available) → falls back to next contribution CTA.
- **Grid:** Ritual setup nudge (if no couple ritual exists yet) + Perspective gap (people with single-view manuals).
- **Modules:** 2–3

### Stage 5: `active`

Full data — assessments, arcs, multiple perspectives. The steady state.

**Hero fallback chain** (first match wins):
1. **Fresh synthesis** — new since last visit. Always wins if available.
2. **Person spotlight** — AI has something new about a specific person.
3. **Journal echo** — AI reflection on recent entries.
4. **Next action** — ritual approaching, draft to resume, kid session due.
5. **Calm state** — warm message, reflection prompt, or quote.

**Grid tile priority** (ordered by recipe, filtered by eligibility):
1. Ritual info (if couple ritual exists)
2. Micro-activity (today's growth item)
3. Pattern detected (from journal enrichment)
4. Blind spot (from synthesis)
5. Growth arc progress (if active arc exists)
6. Dinner prompt (if available today)
7. Recent journal (last 1-2 entries)
8. Family freshness (people pills with staleness indicators)
9. On This Day (deferred from v1 — needs history)

Grid shows up to 6 tiles. Each has an eligibility check: the data must exist and meet a freshness threshold. Tiles that don't qualify are simply absent.

## Module Catalog

All 32 modules identified during brainstorming. Each module is a self-contained component with an eligibility function and a priority position in the recipe.

### Priority / Next Action
| Module | Description | v1 |
|---|---|---|
| The Next Thing | Single most important action. Changes by stage + priority. | Yes |
| Pending Question From Partner | Targeted one-question ask from spouse. | No |
| Resume Draft | Unfinished contribution or journal entry. | Yes |
| Kid Session Due | Scheduled cadence reminder for child emoji session. | Yes |
| Tonight's Dinner Prompt | Conversation starter from dinner prompt API. | Yes |

### AI Synthesis & Insights
| Module | Description | v1 |
|---|---|---|
| Fresh Synthesis Highlight | New alignment, gap, tension, or emergence from synthesis. | Yes |
| Pattern Detected | Recurring theme across journal entries. | Yes |
| Blind Spot Flag | Perspective divergence only visible with multiple views. | Yes |
| Cross-Person Insight | Pattern spanning multiple people. | Yes |
| Perspective Gap — Input Needed | Gentle pull toward multi-perspective. | Yes |
| Journal Echo | AI reflection/reframing of recent entries. | Yes |

### Metrics & Statistics
| Module | Description | v1 |
|---|---|---|
| Three-Ring Health Overview | 20 dimensions → 3 domains → 1 center score. | No |
| Dimension Sparklines | Trend lines for each dimension over time. | No |
| Contribution Freshness | How recent perspectives are per person. | Yes (as family pills) |
| Activity Heatmap | Engagement grid over weeks/months. | No |
| Family Completeness | Which people have multi-perspective data. | No |

### Journal & Content
| Module | Description | v1 |
|---|---|---|
| Recent Journal Peek | Last 1-2 entries as compact cards. | Yes |
| On This Day | Journal entry from this date in the past. | No (needs history) |
| Quick Capture Strip | N/A — existing CaptureSheet in Navigation handles this. | N/A |
| Active Margin Thread | Margin note conversation activity. | No |

### Growth & Activities
| Module | Description | v1 |
|---|---|---|
| Active Growth Arc | Current arc with progress bar. | Yes |
| Today's Micro-Activity | One concrete thing to try today. | Yes |
| Conversation Guide | Structured prompt for a deeper talk. | No |
| Reflection Prompt | Journaling prompt tied to growth focus. | Yes |

### Ritual
| Module | Description | v1 |
|---|---|---|
| Next Ritual Info | Schedule + countdown. | Yes |
| Last Ritual Recap | Summary of previous check-in. | No |
| Ritual Session Content | Guided shared experience during live ritual. | No |

### People & Family
| Module | Description | v1 |
|---|---|---|
| Family Roster | N/A — replaced by person spotlight. | N/A |
| Person Spotlight | Featured person when AI has something new. | Yes |
| Who Needs Attention | Staleness signal per person. | Yes (as family freshness pills) |

### Meta / Calm
| Module | Description | v1 |
|---|---|---|
| Calm State | "All clear" message when nothing to do. | Yes |
| Intensity / Volume Control | User-controlled slider for Surface density. | No |

## Data Flow

### Module-to-Hook Mapping

| Module | Data Source | Hook |
|---|---|---|
| Stage CTA | Dashboard state | `useDashboard()` |
| Fresh synthesis | `synthesizedContent` on person manuals | `usePersonManual()` / `useFamilyManual()` |
| Person spotlight | Synthesis + journal mentions + freshness | `useDashboard()` + `useJournalEntries()` |
| Journal echo | AI reflection on recent entries | `useJournalEcho()` |
| Next action | Priority cascade of pending items | `useSurfaceNext()` |
| Ritual info | Active couple ritual + next occurrence | `useCoupleRitual()` |
| Micro-activity | Active growth item for today | `useGrowthFeed()` |
| Pattern detected | AI enrichment on journal entries | `useJournalEntries()` (enrichment field) |
| Blind spot | Synthesis gaps/blindSpots | `usePersonManual()` |
| Growth arc | Active arc progress | `useGrowthFeed()` |
| Dinner prompt | Cloud Function API | **New:** `useDinnerPrompt()` |
| Recent journal | Last 1-2 entries | `useJournalEntries()` |
| Family freshness | Last contribution date per person | `useFreshness()` |
| On This Day | Journal entries from same date in past | **New:** `useOnThisDay()` (deferred) |
| Reflection prompt | Growth dimension prompts | `useGrowthFeed()` |
| Perspective gap | People with single-perspective manuals | `useDashboard()` |

### New Hooks Needed

- `useDinnerPrompt()` — fetches today's dinner prompt from the existing Cloud Function API (`getDinnerPrompt`).
- `useOnThisDay()` — queries journal entries from the same date in prior months/years. Deferred from v1.

All other data is served by existing hooks.

### Component Tree

```
TheSurface (route: /)
├── useDashboard() → stage + people + manuals + growth data
├── getSurfaceRecipe(stage, dataAvailability) → recipe
├── SurfaceLayout (responsive: landscape | portrait)
│   ├── HeroSlot
│   │   └── renders recipe.hero module component
│   └── GridSlot
│       └── renders recipe.grid module components (filtered by eligibility)
```

- `TheSurface` — new top-level page component, replaces current `/` redirect
- `SurfaceLayout` — responsive wrapper (CSS grid for landscape, flex column for portrait)
- `HeroSlot` / `GridSlot` — slot containers that render the module component specified by the recipe
- Individual module components — many already exist in `src/components/surface/`, will be refactored into the slot architecture

## What's Deferred

Designed for but not shipped in v1:

1. **Cinematic Dark register** — ritual window visual transformation. Recipe system supports it.
2. **Magazine Editorial register** — calm/quiet state aesthetic. Same mechanism.
3. **Intensity/proactivity slider** — user-controlled density. Recipe system can filter by level.
4. **Sparse user experience** — Iris's simplified view. Needs user-role detection.
5. **Between-ritual targeted pulls** — one-question asks in Iris's app. Separate feature.
6. **Ritual session content** — guided shared experience. `/rituals/couple/session` stays as placeholder.
7. **Push notifications** — still ICS + in-app banner only.
8. **On This Day** — needs journal history. Low priority for v1.
9. **Three-Ring Health Overview** — ring diagram on Surface. Needs more assessment data.
10. **Dimension Sparklines** — trend visualization. Same prerequisite.
11. **Activity Heatmap** — engagement grid. Nice-to-have, not load-bearing.
12. **Last Ritual Recap** — needs ritual occurrence history (not yet stored).
13. **Conversation Guide** — growth items exist but dedicated Surface treatment deferred.

## Existing Code Impact

### Replaced
- Current `/` page (`src/app/page.tsx`) — signed-in redirect to `/journal` replaced by The Surface
- `TheSurface.tsx` / `SurfaceHome.tsx` — existing scattered Surface components replaced by new recipe-driven architecture
- `SurfaceContent.tsx`, `SurfaceActive.tsx` — subsumed by the recipe system

### Reused
- `useDashboard()` — stage detection, people, manuals, growth data. Core data source.
- `useSurfaceNext()` — may need refinement but the priority cascade logic is sound.
- `useCoupleRitual()`, `useSpouse()` — ritual data.
- `useGrowthFeed()` — growth items and arcs.
- `useJournalEntries()`, `useJournalEcho()` — journal data.
- `useFreshness()` — family completeness metrics.
- `RitualBanner` — stays as-is, coexists via `--relish-top-offset`.
- `CaptureSheet` in `Navigation` — global capture, unchanged.
- Existing module components (`CalmStateCard`, `StageCTA`, `NextThingCard`, `SynthesisHighlightCard`, `InlineJournalPeek`, etc.) — refactored to fit the slot interface.

### New
- `TheSurface` page component (`src/app/page.tsx` rewrite)
- `SurfaceLayout` responsive wrapper
- `HeroSlot` / `GridSlot` slot containers
- `getSurfaceRecipe()` — recipe lookup function
- `useDinnerPrompt()` hook
- Module eligibility functions
- New module components as needed (person spotlight, pattern card, blind spot card, family freshness pills)
