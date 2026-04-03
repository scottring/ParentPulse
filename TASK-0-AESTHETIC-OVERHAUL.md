# Task 0: App-Wide Aesthetic Overhaul

> **Run this task BEFORE any tasks in AURA-IMPLEMENTATION-PLAN.md.**
> This is the most important task. It replaces the old industrial design language
> with the warm library aesthetic across EVERY page, EVERY component, EVERY modal.
> Nothing should look "old" when this is done.

## The problem

The app currently has two warring design languages:
1. **The weather dashboard** — warm, editorial, Cormorant Garamond serif, glass cards, weather gradients. This is correct.
2. **Everything else** — industrial/brutalist with `font-mono`, hard borders (`2px solid #E8E3DC`), amber (#d97706) accents, uppercase mono labels, square corners, slate/gray color palette. This must be replaced entirely.

The industrial style appears in: Navigation.tsx, People page, Manual pages, Login/Register, Settings, Roadmap, modals, PersonCard, StatusChip, all onboarding flows, all MainLayout-wrapped pages.

## Read first — understand the target aesthetic

Read `AURA-UI-SPEC.md` sections 1.3 and 2.1-2.3 completely. The aesthetic is:
- "A beautiful old library reimagined for the 22nd century"
- Typography does the heavy lifting: Cormorant Garamond for emotional/display text, DM Sans for body/UI
- Warm brown-gray text palette (#3A3530 primary, #5C5347 mid, #7C7468 secondary, #8A8078 muted)
- Sage green accent (#7C9082) instead of amber
- Glass cards (already exist as `glass-card` and `glass-card-strong` in globals.css)
- Weather gradient backgrounds instead of flat white
- Generous whitespace, narrow content column, editorial feel

## Global find-and-replace patterns

Apply these systematically across ALL files in `src/`:

### Fonts
| Find | Replace with |
|---|---|
| `font-mono` (Tailwind class) | Remove. Use inline `fontFamily: 'var(--font-parent-body)'` or `fontFamily: 'var(--font-parent-display)'` |
| `fontFamily: 'monospace'` or similar | `fontFamily: 'var(--font-parent-body)'` |
| Any heading using DM Sans or mono | Switch to `fontFamily: 'var(--font-parent-display)'` (Cormorant Garamond) |

### Colors — text
| Find | Replace with |
|---|---|
| `text-slate-800`, `text-slate-900`, `color: '#1e293b'` | `color: '#3A3530'` (warm near-black) |
| `text-slate-600`, `text-slate-700`, `color: '#475569'` | `color: '#5C5347'` (warm mid) |
| `text-slate-500`, `color: '#64748b'`, `color: '#6B6B6B'` | `color: '#7C7468'` (warm secondary) |
| `text-slate-400`, `color: '#94a3b8'`, `color: '#A3A3A3'` | `color: '#8A8078'` (warm muted) |
| `color: '#2C2C2C'` | `color: '#3A3530'` |

### Colors — accent
| Find | Replace with |
|---|---|
| `#d97706` (amber — used for active states, buttons, accents) | `#7C9082` (sage green — the primary accent) |
| `rgba(217,119,6,...)` (amber with opacity) | `rgba(124,144,130,...)` (sage with equivalent opacity) |
| `border-amber-600`, `bg-amber-600` | Use sage: `border-color: #7C9082`, `background: #7C9082` |
| `text-amber-600` | `color: #7C9082` |

### Borders and surfaces
| Find | Replace with |
|---|---|
| `border: '2px solid #E8E3DC'` (hard card borders) | `border: '1px solid rgba(255,255,255,0.5)'` + add `glass-card` or `glass-card-strong` class |
| `border: '1px solid #E8E3DC'` | `border: '1px solid rgba(255,255,255,0.4)'` |
| `background: '#FFFFFF'` (flat white cards) | `background: 'rgba(255,255,255,0.45)'` with `backdropFilter: 'blur(20px)'` — i.e., glass treatment |
| `background: '#FAF8F5'` (light gray surfaces) | `background: 'rgba(255,255,255,0.25)'` or just transparent on the weather gradient |
| `backgroundColor: '#FFF8F0'` (old warm white) | Use the weather gradient background via WeatherBackground component |
| `rounded-lg` on cards | `rounded-2xl` (border-radius: 20px for cards) |

### Typography scale
| Element | Old | New |
|---|---|---|
| Page titles (h1) | `font-mono font-bold text-xl` or `text-2xl` | `fontFamily: 'var(--font-parent-display)'`, 32-36px, weight 400 |
| Card titles / person names | `font-mono text-[14px] font-bold` | `fontFamily: 'var(--font-parent-display)'`, 22px, weight 400 |
| Section labels | `font-mono text-[10px] tracking-wider uppercase` | `fontFamily: 'var(--font-parent-body)'`, 10px, weight 600, tracking 0.12em, uppercase, color #8A8078 |
| Body text | `font-mono text-[11px]` or `text-[9px]` | `fontFamily: 'var(--font-parent-body)'`, 13-14px, weight 400 |
| Buttons | `font-mono text-[10px] font-bold uppercase` | `fontFamily: 'var(--font-parent-body)'`, 12px, weight 500, NOT uppercase, rounded-full |
| Badge/chip text | `font-mono text-[8px]` or `text-[9px]` | `fontFamily: 'var(--font-parent-body)'`, 11px, weight 500 |
| Back links | `font-mono text-xs text-slate-400` → `← DASHBOARD` | `fontFamily: 'var(--font-parent-body)'`, 12px, #8A8078 → `← Dashboard` (sentence case) |

## File-by-file changes

### 1. `src/components/layout/Navigation.tsx` — FULL REWRITE

Replace the entire component. The new navigation:
- No background color, no border-b-4, no shadow, no corner brackets
- Sits transparently on the weather gradient
- Height: ~60px
- Left: wordmark "parentpulse" in Cormorant Garamond, 19px, weight 500, #5C5347
- After wordmark: nav links (home, people, workbook, check-in) in DM Sans, 12px, lowercase
- Active link: full opacity + 1.5px bottom border in sage
- Inactive links: 45% opacity
- Right: 6px sage dot + first name, 11px
- No Relish logo image. No mono fonts. No industrial elements.
- Bottom border: `1px solid rgba(124,100,77,0.08)`
- Mobile: just the wordmark centered, 48px height

### 2. `src/components/layout/SideNav.tsx` — REMOVE DESKTOP SIDEBAR

- Delete the entire desktop `<aside>` section
- Keep the mobile bottom tab bar but restyle: 18px icons, 10px DM Sans labels, sage active color
- Remove the collapse toggle button

### 3. `src/components/layout/MainLayout.tsx` — UPDATE LAYOUT

- Remove `lg:pl-64` (no more sidebar offset)
- Replace flat `backgroundColor: 'var(--parent-bg)'` with the WeatherBackground component (import it)
- The main content area should be full-width with centered content
- Import WeatherBackground from `@/components/dashboard/WeatherBackground`

### 4. `src/app/people/page.tsx` — FULL RESTYLE

This page is deeply industrial and needs comprehensive changes:
- Replace `MainLayout` usage: use WeatherBackground + Navigation + SideNav directly (like dashboard does), OR update MainLayout first and use that
- Remove `lg:pl-64` and use centered layout
- Page title: Cormorant Garamond, 32px, "People" — not `font-mono font-bold text-xl`
- Back link: DM Sans, 12px, #8A8078, sentence case
- "Add person" button: sage accent, rounded-full, DM Sans, not mono uppercase
- PersonCard component: complete restyle (see below)
- Add modal: glass treatment, rounded-2xl, DM Sans fonts, sage buttons
- Delete modal: same glass treatment
- Grid: keep the 2-column grid but cards use glass styling
- Empty state: glass card with Cormorant heading

### 5. PersonCard component (inside people/page.tsx) — FULL RESTYLE

- Card wrapper: `glass-card` class instead of hard-bordered white div
- Header band: remove the flat gray background, use transparent with subtle bottom border
- Person name: Cormorant Garamond, 22px, weight 400, #3A3530
- Relationship type: DM Sans, 11px, #8A8078, sentence case (not uppercase)
- Score display: REMOVE the big numeric score. Replace with qualitative band text (Strong / Steady / Developing / Needs attention)
- PERSPECTIVES section label: DM Sans, 10px, #8A8078, uppercase tracking
- StatusChip: rounded-full pill, DM Sans 11px, sage for done, muted for pending
- Progress bar: sage fill color, thinner (2px)
- JOURNEY label: same micro label style
- Next action card: glass-card treatment, sage accents
- Workbook section: use coral accent (#D85A30) for workbook references
- Delete button: DM Sans, subtle, no mono

### 6. `src/app/people/[personId]/manual/ClientPage.tsx` — FULL RESTYLE

- Replace MainLayout with WeatherBackground-based layout
- Page title: Cormorant Garamond, 36px, "{Name}'s Manual"
- Back link: DM Sans, 12px, #8A8078, sentence case
- All section headers: Cormorant Garamond, 19px
- All body text: DM Sans, 14px
- All mono text: replace with DM Sans at appropriate sizes
- Contribution cards: glass treatment
- Loading spinner: sage color, not amber
- View mode tabs: DM Sans, not mono, sage active state
- Synthesis buttons: sage accent, rounded-full
- All data display: warm color palette

### 7. `src/app/login/page.tsx` and `src/app/register/page.tsx` — RESTYLE

- Remove the VintageCard and RuledHeader components (these are a third design language)
- Use the warm library aesthetic: weather gradient background, glass card for the form
- Page title: Cormorant Garamond, centered
- Form inputs: DM Sans, glass-card treatment (slightly transparent background)
- Buttons: sage primary, rounded-full
- "Sign in" / "Create account": Cormorant Garamond for the heading, DM Sans for the form

### 8. `src/app/settings/page.tsx` — RESTYLE

- Same pattern: Cormorant title, DM Sans body, glass cards, warm colors
- Remove all mono fonts and industrial styling

### 9. `src/app/roadmap/page.tsx` — RESTYLE

- Same pattern throughout

### 10. `src/app/welcome/page.tsx` — RESTYLE

- Same pattern throughout

### 11. ALL onboarding ClientPage files — RESTYLE

These files contain the questionnaire flows:
- `src/app/people/[personId]/manual/onboard/ClientPage.tsx`
- `src/app/people/[personId]/manual/self-onboard/ClientPage.tsx`
- `src/app/people/[personId]/manual/kid-session/ClientPage.tsx`
- `src/app/people/[personId]/manual/kid-observer-session/ClientPage.tsx`
- `src/app/people/[personId]/create-manual/ClientPage.tsx`

For each: replace mono fonts, industrial colors, hard borders with the warm library aesthetic. Section headers in Cormorant. Questions in DM Sans. Progress bars in sage. Glass cards for question containers.

### 12. ALL manual components — RESTYLE

- `src/components/manual/ManualChat.tsx`
- `src/components/manual/AddTriggerModal.tsx`
- `src/components/manual/AddBoundaryModal.tsx`
- `src/components/manual/AddStrategyModal.tsx`
- `src/components/manual/ContentReviewStep.tsx`
- `src/components/manual/RelationshipContentReview.tsx`
- `src/components/manual/SelfWorthAssessmentModal.tsx`
- `src/components/manual/ManualIcons.tsx`

Replace all mono fonts, amber accents, hard borders, and industrial elements with the warm library aesthetic.

### 13. ALL onboarding components — RESTYLE

- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/QuestionDisplay.tsx`
- `src/components/onboarding/QuestionRenderer.tsx`
- `src/components/onboarding/LikertScaleQuestion.tsx`
- `src/components/onboarding/FrequencyQuestion.tsx`
- `src/components/onboarding/MultipleChoiceQuestion.tsx`
- `src/components/onboarding/QualitativeComment.tsx`
- `src/components/onboarding/ChildQuestionDisplay.tsx`
- `src/components/onboarding/DocumentUploader.tsx`
- All Step components (ChallengesStep, EnvironmentStep, StrategiesStep, StrengthsStep)

Replace all mono fonts, hard borders, industrial accents.

### 14. People components

- `src/components/people/PersonCard.tsx` (if separate from the inline one)
- `src/components/people/JourneyTimeline.tsx`

### 15. Growth components

- `src/components/growth/ArcHeader.tsx`
- `src/components/growth/DimensionBars.tsx`
- `src/components/growth/GrowthCard.tsx`
- `src/components/growth/RoleCard.tsx`

### 16. Roadmap components

- `src/components/roadmap/JourneyPath.tsx`
- `src/components/roadmap/StageCard.tsx`

### 17. Coach component

- `src/components/coach/CoachChat.tsx`

### 18. Navigation component

- `src/components/navigation/RelationshipNavigator.tsx`

### 19. `src/app/globals.css` — ADD WARM TEXT VARIABLES

Add these alongside existing CSS variables:
```css
:root {
  --parent-text-warm: #3A3530;
  --parent-text-mid: #5C5347;
  --parent-text-body: #6B6560;
  --parent-text-secondary: #7C7468;
  --parent-text-muted: #8A8078;
}
```

### 20. CSS files

- `src/styles/relationship-themes.css` — update any industrial colors
- `src/styles/relish-theme.css` — update or remove if it contains the old branding

## How to approach this (for Claude Code)

This is too large for a single pass. Break it into sub-sessions:

**Sub-task 0a: Foundation** — Update globals.css, MainLayout.tsx, Navigation.tsx, SideNav.tsx. This changes the shell that wraps everything.

**Sub-task 0b: People page** — Restyle the entire people/page.tsx including PersonCard and StatusChip components, plus the add/delete modals.

**Sub-task 0c: Manual pages** — Restyle manual/ClientPage.tsx and all manual components.

**Sub-task 0d: Onboarding flows** — Restyle all onboarding ClientPage files and onboarding components.

**Sub-task 0e: Auth & other pages** — Restyle login, register, welcome, settings, roadmap pages.

**Sub-task 0f: Remaining components** — Restyle growth, roadmap, coach, and navigation components.

For each sub-task: read the files, apply the global find-and-replace patterns, then refine. Every `font-mono` should be gone. Every `#d97706` amber should become `#7C9082` sage. Every hard-bordered white card should become a glass card. Every uppercase mono heading should become a Cormorant Garamond editorial heading.

## Verify (after ALL sub-tasks complete)

Run these checks:
```bash
# No mono fonts remaining
grep -r "font-mono" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
# Should return ZERO results

# No amber accent remaining
grep -r "d97706" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
# Should return ZERO results

# No old slate colors
grep -r "text-slate" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
# Should return ZERO results

# No hard-bordered cards
grep -r "2px solid #E8E3DC" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
# Should return ZERO results
```

Visual checks:
- Every page uses the warm parchment gradient background (via WeatherBackground or equivalent)
- Every card uses glass treatment (frosted, slightly transparent, rounded-2xl)
- Every heading uses Cormorant Garamond
- Every body text uses DM Sans
- No page has a different "feel" from the dashboard
- The app feels like one cohesive experience — a warm, editorial, library-like environment
- Mobile bottom tab bar is the only navigation on small screens
- No sidebar on desktop — content is centered with generous whitespace
