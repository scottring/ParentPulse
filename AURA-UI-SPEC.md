# ParentPulse UI/UX Design Specification

## Post-AURA Redesign — Complete Screen-by-Screen Reference

---

## 1. Design Principles

### 1.1 The core experience promise
ParentPulse is a relationship weather station. You check it like you check the weather — a quick glance tells you the state of things, and when conditions change, you know what to do. The app should feel like a calm, intelligent companion, not a clinical tool or a gamified self-help app.

### 1.2 Five design principles

**Rhythm over novelty.** Every screen belongs to one of four AURA phases. The user learns the rhythm once and recognizes it everywhere. New features feel familiar because they follow the same pattern.

**Metaphor over metrics.** The weather metaphor carries the emotional weight. Raw numbers stay hidden. Qualitative language and atmospheric visuals communicate health. "Clear skies, holding steady" tells you more than "3.8 / 5.0."

**Depth on demand.** The surface layer is always simple — a greeting, a climate state, a single suggested action. Depth is available for those who want it (tap into a dimension, open a workbook chapter, explore a perspective gap) but never forced.

**Warmth in hard moments.** When scores are low, the app gets gentler, not more alarming. The language shifts to "rebuilding" and "you're here." The visual palette deepens but never turns harsh. This is not a report card.

**Progressive familiarity.** The first session takes 45 minutes and covers a lot of ground. Every session after that takes 3-5 minutes and follows the same shape. The app earns the right to be opened weekly by respecting the user's time.

### 1.3 Aesthetic direction
The existing design language is strong and should be preserved: editorial serif display font, clean sans body font, warm cream-to-sage gradient backgrounds, glass-card components, and the weather metaphor. The redesign extends this language to new surfaces (Workbook, Check-in, Deepen) rather than replacing it.

---

## 2. Visual System

### 2.1 Typography (unchanged from current)
- **Display:** `--font-parent-display` — Serif, used for greetings, climate labels, section heroes. Weight 300, italic for emotional register.
- **Body:** `--font-parent-body` — Sans-serif, used for everything else. Weight 400 for body, 500 for labels, 600 for emphasis.
- **Micro labels:** 10-11px, `--font-parent-body`, weight 500-600, uppercase, letter-spacing 0.08-0.12em. Used for phase indicators, section labels, metadata.

### 2.2 Color system

**Existing palette (preserved):**
- `--parent-primary`: The accent color for CTAs and interactive elements
- `--parent-text`: Primary text on light backgrounds
- `--parent-text-light`: Secondary/muted text
- Climate gradients: Warm cream → sage → forest green spectrum

**New AURA phase colors:**
These four colors are used exclusively for the phase indicator and phase-related UI accents. They should be defined as CSS variables in `globals.css`:

| Phase | Variable | Hex | Usage |
|---|---|---|---|
| Assess | `--aura-assess` | `#0F6E56` | Teal — input, gathering, listening |
| Understand | `--aura-understand` | `#534AB7` | Purple — synthesis, insight, revelation |
| Respond | `--aura-respond` | `#D85A30` | Coral — action, practice, doing |
| Assimilate | `--aura-assimilate` | `#BA7517` | Amber — reflection, integration, growth |

Each phase color also needs a light variant at 12% opacity for card backgrounds when a phase is active:
- `--aura-assess-bg`: `rgba(15, 110, 86, 0.12)`
- `--aura-understand-bg`: `rgba(83, 74, 183, 0.12)`
- `--aura-respond-bg`: `rgba(216, 90, 48, 0.12)`
- `--aura-assimilate-bg`: `rgba(186, 117, 23, 0.12)`

### 2.3 Component patterns

**Glass cards** (existing — use everywhere for content containers):
- `glass-card`: Subtle — `rgba(255,255,255,0.3)` background, no border
- `glass-card-strong`: Prominent — `rgba(255,255,255,0.5)` background, subtle border

**Phase-tinted cards** (new — used when content belongs to a specific AURA phase):
Same glass-card base but with a 2px left border in the phase color and the phase's light background:
```css
.phase-card-assess {
  border-left: 2px solid var(--aura-assess);
  background: linear-gradient(135deg, var(--aura-assess-bg), rgba(255,255,255,0.4));
}
```

**Buttons:**
- Primary: `--parent-primary` background, white text, rounded-full, 13px font
- Secondary: Glass background, `--parent-text` color, rounded-full
- Ghost: No background, `--parent-text-light` color, hover opacity change

**Progress bars:**
- Thin (2px height): Used in the assessment shell for section/question progress
- Colors: Filled portion uses the current phase color, unfilled is `rgba(0,0,0,0.06)`

### 2.4 The AURA Phase Indicator

This component appears on every screen that's part of a cycle. It is the single most important consistency mechanism in the redesign.

**Compact mode (default):**
```
 ● ○ ○ ○
ASSESS
```
- Four circles, 8px diameter, 12px gap, horizontally centered
- Active: filled with phase color, 10px diameter
- Inactive: 1px stroke in `--parent-text-light` at 30% opacity
- Label below: phase name in micro-label style (10px, uppercase, tracking)
- Total height: ~44px

**Inline mode (for cards and headers):**
Same dots but without the label, in a horizontal row. Used when the phase indicator needs to fit inside a card header.

**Placement rules:**
- On full pages (dashboard, workbook, check-in): top-left of content area, below navigation
- On cards (DeepenCard, WorkbookChapterCard): inline in the card header
- On modal/slide-up flows (ReflectionForm): top-center of the modal

---

## 3. Screen-by-Screen Specification

### 3.1 Dashboard (redesigned)

The dashboard is the home screen. It adapts to the user's state.

**Layout:** Full-bleed weather gradient background. Side nav on desktop (lg:pl-64). Content area max-w-xl mx-auto.

**State: New User**
```
┌──────────────────────────────────┐
│ ● ○ ○ ○  ASSESS                 │
│                                  │
│ Good morning, Scott              │  ← Display font, italic, large
│                                  │
│ Welcome. Let's start with you.   │  ← Body font, muted
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Start with you               │ │  ← glass-card-strong, phase-card-assess
│ │ How you handle stress, what  │ │
│ │ you need, how you communicate│ │
│ │                              │ │
│ │ [Begin →]                    │ │  ← Primary button
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**State: Active (post-analysis)**
```
┌──────────────────────────────────┐
│                                  │
│ Good evening, Scott              │  ← Display font, italic
│                                  │
│ Clear skies                      │  ← Display font, large, primary text
│ holding steady                   │  ← Body font, muted, italic
│                                  │
│ Things are feeling good. You     │  ← Narrative summary, body font
│ and Iris are strong right now.   │
│                                  │
│ ─────────────────────────────── │  ← Thin gradient separator
│                                  │
│  DEEPEN (if assessment needs     │
│  exist — max 1-2 cards)          │
│ ┌──────────────────────────────┐ │
│ │ ● ○ ○ ○                      │ │  ← Phase indicator inline
│ │ Want a clearer picture of    │ │
│ │ how you handle conflict?     │ │
│ │ 2 quick questions · ~2 min   │ │
│ │ [Sharpen the picture]  Skip  │ │
│ └──────────────────────────────┘ │
│                                  │
│  FORECASTS                       │  ← Micro label
│ ┌──────────────────────────────┐ │
│ │ Iris · Warm & connected      │ │  ← RelationshipCard
│ │ Strong on responsiveness     │ │
│ │ Watch: conflict patterns     │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Ella · Good connection       │ │  ← RelationshipCard
│ │ Warm & attuned               │ │
│ │ Working on: autonomy support │ │  ← Links to Workbook
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Kaleb · Getting there        │ │
│ │ Building structure            │ │
│ └──────────────────────────────┘ │
│                                  │
│  CHECK-IN PROMPT (if 7+ days)    │
│ ┌──────────────────────────────┐ │
│ │ It's been a week. Ready for  │ │  ← Amber-tinted card
│ │ a quick check-in?            │ │
│ │ [Check in → ]                │ │
│ └──────────────────────────────┘ │
│                                  │
│  People · Workbook · Manual      │  ← Footer links, micro labels
└──────────────────────────────────┘
```

**Key changes from current:**
- No raw numeric score. Climate label is the hero.
- DeepenCard appears between summary and forecasts when assessment needs exist.
- RelationshipCards show qualitative bands, not numbers.
- Active Workbook chapters surface as inline links on relationship cards.
- Check-in prompt appears at bottom when overdue.
- "Re-analyze" button removed. Analysis happens automatically via check-ins and deepen flows.

### 3.2 Assessment Shell (all questionnaires)

Every questionnaire — self-onboarding, observer sessions, child sessions, deepen flows, check-in micro-assessments — renders inside this shell.

```
┌──────────────────────────────────┐
│ ● ○ ○ ○  ASSESS                 │  ← Phase indicator
│                                  │
│ ━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░ │  ← Section progress (e.g., 3 of 7)
│ ━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░ │  ← Question progress within section
│                                  │
│ ✨ Self-Worth & Confidence       │  ← Section emoji + name (display font)
│ Understanding how Ella feels     │  ← Section description (body font, muted)
│ about herself                    │
│                                  │
│ ~8 minutes remaining             │  ← Estimated time (micro label)
│                                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │  [Question content renders   │ │  ← The actual question component
│ │   here — Likert, text area,  │ │     (varies by question type)
│ │   emoji scale, checkboxes,   │ │
│ │   frequency, etc.]           │ │
│ │                              │ │
│ │  + Add a comment (optional)  │ │  ← Qualitative toggle
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│        [← Back]    [Next →]      │  ← Navigation buttons
│                                  │
│        Skip this section →       │  ← If section is skippable
└──────────────────────────────────┘
```

**Consistency rules:**
- This shell NEVER changes regardless of questionnaire type. The content inside the card changes (Likert vs. emoji vs. text) but the surrounding experience is identical.
- Progress bars use the assess phase color (teal).
- Section transitions animate: the card slides left, new card slides in from right.
- Time estimate updates as questions are answered.
- "Add a comment" toggle is present on all structured questions (Likert, frequency, etc.) and absent on text-area questions (where the whole answer is qualitative).

### 3.3 Understanding Reveal Page

Shown after initial analysis, accessible from dashboard via "View full report" link.

```
┌──────────────────────────────────┐
│ ○ ● ○ ○  UNDERSTAND             │
│                                  │
│ (Weather gradient animates in)   │
│                                  │
│         Your family              │  ← Display font, centered
│        climate today             │
│                                  │
│  ┌────────┐ ┌────────┐ ┌──────┐ │
│  │  You   │ │ Couple │ │ Kids │ │  ← Three domain cards
│  │        │ │        │ │      │ │
│  │ Steady │ │ Warm   │ │ Good │ │  ← Qualitative label, animated in
│  │        │ │        │ │      │ │
│  │ ~~~~   │ │ ~~~~   │ │ ~~~~ │ │  ← Mini climate gradient
│  └────────┘ └────────┘ └──────┘ │
│                                  │
│  LIFTING YOU UP                  │  ← Micro label
│  Warmth · Responsiveness ·       │  ← Top forces, body font
│  Self-awareness                  │
│                                  │
│  NEEDS ATTENTION                 │  ← Micro label
│  Conflict patterns · Burnout     │  ← Bottom forces, body font
│                                  │
│  ─────────────────────────────── │
│                                  │
│  "Things are feeling good.       │  ← Narrative, display font, italic
│   You and Iris are strong        │     centered, editorial treatment
│   right now. Burnout is          │
│   creeping in — that's           │
│   worth watching."               │
│                                  │
│  ─────────────────────────────── │
│                                  │
│  [Start working on something →]  │  ← Primary CTA → Workbook
│   Explore the dashboard →        │  ← Ghost link → Dashboard
└──────────────────────────────────┘
```

**Animation sequence:**
1. Background gradient fades in (1s)
2. "Your family climate today" types or fades in (0.5s)
3. Domain cards appear one by one, left to right (0.3s each, 0.2s stagger)
4. Each card's qualitative label fades up after a beat
5. Forces section fades in (0.5s)
6. Narrative types or reveals word by word (optional — could just fade)
7. CTAs appear last

### 3.4 Workbook Page

The Workbook is where active exercises live. This is the Respond phase home.

```
┌──────────────────────────────────┐
│ ○ ○ ● ○  RESPOND                │
│                                  │
│ Your workbook                    │  ← Display font
│ What you're working on           │  ← Body font, muted
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Conflict Style · with Iris   │ │  ← WorkbookChapterCard
│ │ Practice phase               │ │  ← Phase badge
│ │ Needs attention → Getting    │ │  ← Score trajectory (qualitative)
│ │ better                       │ │
│ │                              │ │
│ │ THIS WEEK                    │ │  ← Micro label
│ │ "The gentle startup          │ │  ← Exercise title (display font)
│ │  experiment"                 │ │
│ │                              │ │
│ │ Next time you need to raise  │ │  ← Exercise description
│ │ a concern with Iris, start   │ │
│ │ with "I feel..." instead of  │ │
│ │ "You always..." Do this 3    │ │
│ │ times this week.             │ │
│ │                              │ │
│ │ ⏱ ~5 min  📍 During a calm  │ │  ← Time + timing
│ │ moment                       │ │
│ │                              │ │
│ │ ● ● ● ○ ○                   │ │  ← Progress dots (3 of 5 done)
│ │                              │ │
│ │ [Mark complete ✓]            │ │  ← Primary button → opens reflection
│ │  Pause this chapter          │ │  ← Ghost link
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Warmth · with Ella           │ │  ← Second active chapter
│ │ Awareness phase              │ │
│ │ ...                          │ │
│ └──────────────────────────────┘ │
│                                  │
│  + Explore more areas to         │  ← Link → Understanding page
│    work on                       │     to pick new dimensions
└──────────────────────────────────┘
```

### 3.5 Reflection Form (modal/sheet)

Opens when user taps "Mark complete" on a Workbook exercise.

```
┌──────────────────────────────────┐
│ ○ ○ ○ ●  ASSIMILATE             │
│                                  │
│ How did it go?                   │  ← Display font
│ "The gentle startup experiment"  │  ← Body font, muted
│                                  │
│ ┌──────────────────────────────┐ │
│ │  😐          🙂         😊  │ │
│ │ Didn't   Tried but   Went   │ │
│ │  try      hard       well   │ │
│ └──────────────────────────────┘ │
│                                  │
│ What did you notice about how    │  ← Exercise-specific reflection prompt
│ Iris responded?                  │
│ ┌──────────────────────────────┐ │
│ │                              │ │  ← Text area
│ └──────────────────────────────┘ │
│                                  │
│ Did you discover anything new    │  ← Second prompt
│ about what works?                │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│ ─────────────────────────────── │
│                                  │
│ ADD TO IRIS'S MANUAL?            │  ← Micro label
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ✓ "Iris responds better when │ │  ← Suggested entry, tap to accept
│ │    I lead with feelings"     │ │
│ │    → What Works              │ │  ← Target manual section
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ○ "Financial talks are the   │ │  ← Another suggestion, unselected
│ │    main conflict trigger"    │ │
│ │    → Triggers                │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Save reflection →]              │
└──────────────────────────────────┘
```

### 3.6 Weekly Check-In Page

A single scrolling page that walks through all four AURA phases in miniature. The phase indicator at the top advances as the user progresses.

```
┌──────────────────────────────────┐
│ ● ○ ○ ○  ASSESS                 │  ← Advances as user scrolls/steps
│                                  │
│ Quick check-in                   │  ← Display font
│ ~3 minutes                       │
│                                  │
│ CONFLICT STYLE · WITH IRIS       │  ← Micro label, from active chapter
│                                  │
│ This week, how often did you     │  ← Assessment prompt
│ or Iris use "you always" or      │
│ "you never" language?            │
│                                  │
│ ○ Never  ○ Once  ● A few  ○ Many│
│                                  │
│ [Next →]                         │
│                                  │
│ ═══════════════════════════════  │
│                                  │
│ ○ ● ○ ○  UNDERSTAND             │  ← Phase advances
│                                  │
│ Conflict patterns                │
│ Needs attention → Getting better │
│        ↗                         │  ← Trend arrow
│                                  │
│ You used fewer absolutes this    │
│ week. That's real progress.      │
│                                  │
│ ═══════════════════════════════  │
│                                  │
│ ○ ○ ● ○  RESPOND                │
│                                  │
│ Your current exercise:           │
│ "The gentle startup experiment"  │
│                                  │
│ ○ Still working on it            │
│ ● Completed it!                  │
│ ○ Want to skip to next           │
│                                  │
│ ═══════════════════════════════  │
│                                  │
│ ○ ○ ○ ●  ASSIMILATE             │
│                                  │
│ This week's picture:             │
│                                  │
│ Conflict style: ↗ improving      │
│ Warmth with Ella: → steady       │
│                                  │
│ Iris's manual was updated with   │
│ 1 new insight from your          │
│ reflections.                     │
│                                  │
│ "Tough weeks shape us more       │
│  than easy ones."                │
│                                  │
│ [Back to dashboard →]            │
└──────────────────────────────────┘
```

### 3.7 Deepen Flow (`/deepen/[dimensionId]`)

A minimal assessment flow for 1-3 targeted questions. Uses the Assessment Shell from 3.2 with fewer questions. After completion, shows a brief micro-understand moment:

```
┌──────────────────────────────────┐
│ ○ ● ○ ○  UNDERSTAND             │
│                                  │
│ Picture sharpened.               │  ← Display font
│                                  │
│ Conflict style confidence:       │
│ Limited → Clear                  │  ← Qualitative confidence change
│                                  │
│ [Back to dashboard →]            │
│ [Open workbook for this →]       │
└──────────────────────────────────┘
```

### 3.8 Person Manual Page (redesigned)

The Manual is a reference document. New entries from Workbook reflections are highlighted.

```
┌──────────────────────────────────┐
│                                  │
│ Iris's Manual                    │  ← Display font, large
│ Last updated 3 days ago          │
│                                  │
│ OVERVIEW · TRIGGERS · WHAT WORKS │  ← Section tabs or scroll anchors
│ · BOUNDARIES · STRENGTHS         │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Overview                     │ │
│ │                              │ │
│ │ Iris is driven by deep       │ │  ← Synthesized overview
│ │ connection and creative      │ │
│ │ expression...                │ │
│ │                              │ │
│ │ ⚡ PERSPECTIVE GAP           │ │  ← Highlighted gap
│ │ You rate her burnout higher  │ │
│ │ than she does.               │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Triggers                     │ │
│ │                              │ │
│ │ • Financial discussions →    │ │
│ │   shutdown (moderate)        │ │
│ │                              │ │
│ │ NEW from workbook:           │ │  ← Amber accent for workbook entries
│ │ • Criticism at bedtime →     │ │
│ │   withdrawal                 │ │
│ │                              │ │
│ │ [+ Add trigger]              │ │
│ └──────────────────────────────┘ │
│                                  │
│ WORKING ON                       │  ← Active workbook link
│ Conflict Style · Practice phase  │
│ [Open workbook →]                │
└──────────────────────────────────┘
```

### 3.9 Relationship Card (dashboard component)

```
┌──────────────────────────────────┐
│ Iris                        ☀️  │  ← Name + mini climate icon
│ Warm & connected                 │  ← Qualitative band (no number)
│                                  │
│ Strong: Responsiveness, Turning  │  ← Top forces
│ toward                           │
│ Watch: Conflict patterns         │  ← Weakest dimension
│                                  │
│ Working on: Conflict Style       │  ← Active workbook link
│                                  │
│ Manual · Workbook · Deepen       │  ← Action links (micro labels)
└──────────────────────────────────┘
```

---

## 4. Interaction Patterns

### 4.1 Transitions between AURA phases
- Phase indicator dot animates: active dot slides to new position (300ms ease)
- Background tint shifts subtly toward the new phase's color
- Content cross-fades (200ms out, 200ms in)

### 4.2 Card interactions
- **Tap/click:** Opens detail view or navigates to related page
- **Hover (desktop):** Subtle lift (translateY -1px) + slight shadow increase
- **Active state:** Scale down slightly (0.98) for tactile feedback
- **No swipe gestures** on cards

### 4.3 Question navigation
All questionnaires use the same navigation pattern:
- **Next:** Slide-left animation (300ms)
- **Back:** Slide-right animation (300ms)
- **Skip section:** Fade transition (200ms)
- **Keyboard:** Enter advances, Escape goes back (desktop)
- **Progress bar:** Tapping a completed section jumps back to it

### 4.4 Score display rules — NEVER show raw 1.0-5.0 scores

| Score Range | Qualitative Band | Climate Equivalent |
|---|---|---|
| 4.0-5.0 | "Strong" or "Bright & steady" | Clear skies |
| 3.5-3.9 | "Steady" or "Good foundation" | Mostly sunny |
| 3.0-3.4 | "Developing" or "Some distance to close" | Partly cloudy |
| 2.0-2.9 | "Needs attention" or "In a rough patch" | Overcast |
| 1.0-1.9 | "Rebuilding" or "Working through it" | Heavy weather |

**Trajectories:**
- ↗ "Getting better" (never "improving" — too clinical)
- → "Holding steady"
- ↘ "Needs attention" (never "declining" or "getting worse")

### 4.5 Empty states

| Screen | Message | CTA |
|---|---|---|
| Dashboard (new) | "Welcome. Let's start with you." | Begin → self-onboard |
| Workbook (empty) | "No active exercises yet." | View your climate → reveal |
| Check-in (empty) | "Nothing to check in on yet." | Go to workbook |
| Manual (empty) | "This manual is blank." | Start session → onboard |

### 4.6 Loading states
Weather background renders immediately. Content areas show subtle pulse animation on glass-card-shaped placeholders. Never a full-screen spinner.

---

## 5. Mobile Considerations

### 5.1 Layout
- Side nav → bottom tab bar (Home, People, Workbook, Check-in, More)
- Content: full-width, px-4 padding
- Cards: full-width, no horizontal margins

### 5.2 Assessments on mobile
- One question per screen (no scrolling within a question)
- Large tap targets: minimum 44px height per Likert option
- Emoji scales: 48px emoji with clear tap areas
- "Add a comment" expands inline, no modal
- Next/Back buttons sticky at bottom of viewport

### 5.3 Workbook on mobile
- Chapter cards stack full-width
- "Mark complete" is a bottom-sticky button
- Reflection form is a full-screen sheet (slides up from bottom)

---

## 6. Tone of Voice

### 6.1 What the app says
- Greetings: warm, personal. "Good morning, Scott."
- Climate: descriptive, not evaluative. "Clear skies, holding steady."
- Exercises: action-oriented, human. "The gentle startup experiment."
- Section labels: ultra-concise, uppercase. "FORECASTS", "THIS WEEK."
- Hard moments: compassionate. "It's a harder stretch. But you're here."

### 6.2 What the app never says
- Never "score" or "rating" in user-facing text
- Never "failing," "poor," or "bad"
- Never "you need to fix this" — always "this needs attention"
- Never clinical jargon without explanation
- Never raw numbers in the main UI flow

---

## 7. Accessibility

### 7.1 Color
- All phase colors meet WCAG AA contrast against card backgrounds
- No information conveyed by color alone — always paired with text
- Climate works in both light-sky and dark-sky modes

### 7.2 Structure
- Semantic headings (h1 greeting, h2 sections, h3 cards)
- ARIA labels on phase indicator ("Step 1 of 4: Assess, current step")
- Focus management after transitions
- All elements keyboard-reachable

### 7.3 Motion
- All animations respect `prefers-reduced-motion`
- No auto-play that can't be paused
- Phase transitions are CSS-only (respects media query)
