# Handoff: Relish — Redesign

## Overview

Relish is a private, long-running family journal. You (and your partner) write about the people in your life — kids, parents, friends — and the product gives you back patterns, prompts, briefs, and memories that help you pay attention.

This handoff covers a full redesign around an **editorial / broadsheet** visual language ("a book the family keeps"), with three rooms: **The Workbook** (the daily/weekly home), **The Family Manual** (people + relationships), and **The Archive** (everything written). Supporting surfaces: a **Person Page**, a **Weekly Relish** practice detail, a **Pen** capture sheet, and a **Design System** reference.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing the intended look, layout, content, and micro-interactions. They are *not* production code to copy directly.

The task is to **recreate these HTML designs in the target codebase's existing environment** (React Native / React / whatever the Relish app uses) using its established patterns, component library, and data layer. If no environment exists yet, use the framework appropriate for the platform — React Native for mobile, React / Next.js for web.

Where a static mock hardcodes content ("Jenny, 18 days"), that content is *illustrative* — it shows what the rendered component should look like when fed real data, not the literal copy to ship. All counts, names, dates, entry text, avatars, and thread titles are seeds, not fixtures.

## Fidelity

**High-fidelity.** Pixel-perfect mockups with final colors, typography, spacing, shadows, and interaction states. The developer should recreate the UI pixel-perfectly using the codebase's existing libraries and patterns. Use the design tokens in this README as canonical.

## Visual Language (read this first)

Before building any screen, internalize these principles:

- **Editorial, not dashboard.** The product is framed as a printed artifact the family keeps — a book, a broadsheet. Use serif display type, italic for voice and names, sans-serif for functional micro-copy (eyebrows, labels, counts).
- **Paper + ink + warmth.** Cream paper background, deep leather accents, ember (warm orange) and burgundy for attention, sage for kept/calm, amber for highlights.
- **One strong voice.** Copy is warm, specific, and writerly — never marketing. Use italic for lifted phrases. Never use "Dashboard", "Widget", "Entry #3". Use "written about", "kept", "waiting", "quiet".
- **Density earns its keep.** Lots of information per screen, but organized into clear editorial sections with generous rules between. Not minimalist, not cluttered — composed.
- **No AI-slop tropes.** No gradient-rainbow backgrounds, no emoji in UI, no rounded-corner left-border accent containers, no SVG-drawn icons that try to be illustrations. Real imagery (photos) where people are shown.

---

## Design Tokens

### Color

All tokens below are defined in `shared.css` under `:root` and should be mirrored as theme tokens in the target codebase.

```
/* Paper / backgrounds */
--r-paper:        #FBF8F2   /* primary card/paper */
--r-paper-soft:   #F7F5F0
--r-cream:        #F5F0E8   /* page background */
--r-cream-deep:   #ECEAE5   /* app chrome */
--r-cream-warm:   #E8DDC8

/* Leather / ink (dark surfaces + text) */
--r-leather:      #14100C   /* darkest — therapist brief, pen button */
--r-leather-2:    #2A2520
--r-ink:          #3A3530   /* primary text */
--r-ink-2:        #2A2522

/* Text ramp (lightest to darkest, top to bottom) */
--r-text-2:       #5C5347
--r-text-3:       #5F564B
--r-text-4:       #6B6254
--r-text-5:       #887C68
--r-text-6:       #9A8E7A

/* Rules (dividers, lightest to darkest) */
--r-rule-1:       #A8988A   /* strongest rule */
--r-rule-2:       #B5A99A
--r-rule-3:       #C0B49F
--r-rule-4:       #D8D3CA   /* standard section rule */
--r-rule-5:       #E5E0D8   /* subtle rule */

/* Accent — semantic */
--r-sage:         #7C9082   /* kept / done / calm */
--r-sage-deep:    #4A5D50
--r-ember:        #C9864C   /* attention / someone waiting */
--r-ember-soft:   #D4A872
--r-burgundy:     #8C4A3E   /* overdue / strong alert */
--r-amber:        #C9A84C   /* highlight / pen glyph */

/* Tints (low-opacity backgrounds) */
--r-tint-sage:    rgba(124,144,130,0.18)
--r-tint-ember:   rgba(201,134,76,0.14)
--r-tint-burgundy:rgba(140,74,62,0.16)
--r-tint-amber:   rgba(201,168,76,0.18)
```

**Semantic usage:**
- **Sage** = kept, done, calm, positive affirmation (e.g. ritual kept this week)
- **Ember** = someone is waiting / attention / hover CTAs
- **Burgundy** = overdue / missed / stronger alert
- **Amber** = highlight, pen glyph, small accents on dark surfaces
- **Leather** = dark-paper surfaces (therapist brief, pen floating button, dark pills)

### Typography

```
--r-serif: 'Cormorant Garamond', Georgia, serif;
--r-sans:  'DM Sans', system-ui, sans-serif;
--r-mono:  ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

Load from Google Fonts:
`Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600`
`DM+Sans:ital,wght@0,400;0,500;0,600;0,700`

**Scale / pairings** (observed patterns across screens):

| Role | Font | Style | Size | Weight | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|---|
| Display headline (hero) | Serif | italic | clamp(52–96px) | 300 | 0.96–1.0 | -0.022em to -0.025em | H1 on Family Manual, Weekly Relish |
| Section headline | Serif | italic | 44px | 300 | 1.0 | -0.015em | "What Relish is returning to you" |
| Dispatch title | Serif | italic | 38px (lead) / 24px (secondary) | 300–400 | 1.08–1.2 | -0.02em to -0.005em |  |
| Person name (hero plate) | Serif | italic | 32px | 400 | 1.0 | -0.01em | Over photo |
| Editorial blockquote | Serif | italic | 22px | 400 | 1.3 | -0.005em | Echo quote |
| Lede / body serif | Serif | regular | 17–22px | 400 | 1.5–1.6 | 0 | `em` inside for italic emphasis, pulls to `--r-ink` |
| Plate value (numeric) | Serif | italic | 26–32px | 400 | 1.0 | -0.01em |  |
| Eyebrow / label (UPPERCASE) | Sans | regular | 10–11px | 600–700 | 1.0 | 0.18–0.22em | text-transform:uppercase |
| Wordmark / italic voice | Serif | italic | 28px | 300 | 1.0 |  | Top nav |
| Room tab | Serif | italic | 17px | 400 | 1.0 |  | Top nav |
| Functional copy in cards | Sans | regular | 12–14px | 500–600 |  |  |  |

**Rule: italic = voice.** Names, emphases inside sentences, section titles, and any phrase in a user's voice is italic serif. Sans-serif is reserved for functional micro-copy.

### Spacing

Based on an **8-point base** with editorial breathing room at section boundaries:
- **Tight:** 4, 6, 8, 10, 12, 14 px — within cards, between label and value
- **Comfortable:** 16, 18, 20, 22, 24 px — between rows in a list, inside card padding
- **Section:** 28, 32, 36, 40, 44, 48 px — between sections within a page
- **Page:** 56, 64, 72, 80 px — between major page regions

Top nav height: **68px** sticky.

### Radii

- **3px** — cards, paper surfaces (the standard)
- **2px** — small cells (streak grid, pattern chart bars)
- **999px** — pills, chips, roster filter buttons
- **50%** — portraits, avatars, status pips

### Shadows

```
--r-shadow-card: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05);
--r-shadow-pen:  0 2px 6px rgba(20,16,12,0.18), 0 12px 28px rgba(20,16,12,0.22);
--r-shadow-page: 0 1px 0 rgba(60,48,28,0.03), 0 2px 6px rgba(60,48,28,0.05),
                 0 12px 44px rgba(60,48,28,0.09), 0 36px 80px rgba(60,48,28,0.08);
```

- **card** = hover state on dispatch cards, roster cards
- **pen** = floating pen button (amber/leather)
- **page** = masthead / hero surfaces that feel like a page lifted off a desk

### Motion

```
--r-ease-ink: cubic-bezier(0.22, 1, 0.36, 1);
```
Standard transition: **140–200ms** on hover states (opacity, transform, box-shadow). Keep motion minimal and editorial — nothing bouncy.

---

## Information Architecture

Three rooms (primary nav):
1. **The Workbook** — daily + weekly home. Today's status, prompts, memory, week ahead, dispatches.
2. **The Family Manual** — people. Constellation, thematic groups, full roster.
3. **The Archive** — everything written.

Sub-surfaces reached from the rooms:
- **Person Page** (from Family Manual → roster card)
- **Weekly Relish** (from Workbook → ritual card)
- **The Pen** (floating button, available from every room — capture sheet)
- **Design System** (internal reference)

Shared chrome:
- **Top nav** (68px, sticky): wordmark "Relish" (left), rooms (center: The Workbook / The Family Manual / The Archive), user menu (right, with sage status pip)
- **Pen button**: floating bottom-right, leather background, amber pen glyph

---

## Screens

### 1. Workbook Home (`Workbook Home.html`) — primary landing

**Purpose:** The daily entry point. Orients you ("what's open, what's kept, what's waiting"), surfaces today's prompt, and delivers the weekly synthesis.

**Layout:** Max-width 1440px, 40px horizontal padding, stacked sections separated by 1px rule (`--r-rule-4`).

**Sections (top to bottom):**

1. **Masthead** — dateline, big italic greeting ("Still up, Scott"), masthead strip of 4 stats (Open threads / Written this week / Someone's waiting / Kept this week) separated by vertical dividers
2. **Feature row** — 3 side-by-side cards:
   - **Memory** (from archive, a year ago): photo, eyebrow, date, pulled quote, foot with "Three entries this week · Open →"
   - **Person** (haven't written about in a while): portrait circle with initial, name, last-entry meta, note with italic emphasis, stats row (12 entries / 3 open / 18d since)
   - **Prompt** (dark leather card): eyebrow, big italic blockquote, attribution, dark CTA row "Answer in the book →"
3. **Dispatches** — what Relish returns:
   - **Lead story** (full-width, 2-col: text + photo). Eyebrow with red pip ("The weekly synthesis · ready Sunday 9pm"), italic h3, dek with italic emphases, **evidence list** (3 rows: date / attributed quote), action pills (dark "Read the full dispatch", outline "Add to Tuesday's brief", outline "Already discussed")
   - **Three secondary dispatches** in a 1.1:1:1 grid:
     - **Brief for Dr. Mehta** (dark leather, 3px top border ember→amber gradient, bulleted talking points with em-dash bullets)
     - **Pattern card** ("Your mornings run hot on Wednesdays") with inline 7-bar chart (one bar highlighted ember, rest ember-soft), day-of-week legend
     - **Echo card** (a year ago) — italic blockquote with ember left border, attribution, a short serif note below
4. **Week ahead** — 7-day row (Sun–Sat), past day sage (kept), today ember, future days with scheduled entries color-coded
5. **Song strip** — artwork + family's-record quote ("Iris has been humming…"), play CTA
6. **Colophon** — italic "The Workbook, Monday edition." with fleuron ornament

**Key components used:**
- `masthead-strip` (4-cell stat strip with vertical dividers)
- `feature` card (x3 variants: memory / person / prompt)
- `lead` dispatch (editorial story card, 2-col text+photo)
- `dispatch` card (secondary dispatch, including `.brief` dark variant)
- `week-grid` (7-day horizontal scale)
- `pen` floating button

---

### 2. Family Manual (`Family Manual.html`)

**Purpose:** The people view. Who's in the family, who's waiting, how they relate.

**Layout:** Same page shell as Workbook Home.

**Sections:**

1. **Masthead strip** — "Ten kept · Open threads: 7 across 4 people · Written about this week: 5 of ten · Quiet longest: Jenny · 18 days"
2. **Hero spread** — 2-column (1.1:1 with 1px rule between):
   - **Left:** 4:5 portrait of the "person most worth thinking about" (Jenny), gradient darken at bottom, plate overlays with name + relationship
   - **Right:** dateline eyebrow, huge italic h1 ("Eighteen days is a while."), lede, 3-stat row (Entries / Open threads / Since last), CTA pills (dark "Write about Jenny" with pen glyph, outline "Open her page")
3. **Constellation** — 520px canvas, paper background. You at center (leather circle, initial, ember tint ring). Inner orbit (partner + kids) at 66px. Outer orbit (parents + friends) at 52px. SVG lines connecting you to each node (solid for close, dashed for further). Ember pips on "someone's waiting" nodes. Hover scales node.
4. **Thematic groups** — 3 article cards side-by-side:
   - **Your household** (4 people)
   - **Your parents, and hers** (4 people)
   - **Kept company** (2 people)
   Each with eyebrow, count badge, italic h3, short description, and mini-rows (avatar / name + last-written / open badge or "Quiet").
5. **Full index (roster)** — filter chips (All · 10 / Has open threads · 4 / Quiet longest / Written recently), then grid of person cards (`pc`). Each card: 3:4 photo with tag chip overlay + open-pip, body with name / meta / italic last-entry sentence + "X days ago". Jenny's card demonstrates the flow (links to Person Page); others are `href="#"` prototypes.
   Plus an **"+ Someone worth keeping"** add-card (dashed outline, cross glyph, label + hint).
6. **Colophon** — "The Family Manual — ten kept, seven threads open."

**Interactive:** Roster filter chips toggle `on` class on click (visual only for design — in production, these would filter the roster grid).

---

### 3. Person Page (`Person Page.html`)

**Purpose:** Dossier for a single person. Pulled in from Family Manual → roster card.

**Layout:** (Refer to source file for exact structure.) Portrait hero, open threads list, dossier details. Shares chrome with Family Manual.

**Behavior:** Currently only Jenny's card wires here; in production every roster card would route to `/person/:id`.

---

### 4. Weekly Relish (`Weekly Relish.html`)

**Purpose:** Detail page for a recurring ritual (the "Weekly Relish" practice). Shows what it is, when it happens, who keeps it, and the 12-week streak history.

**Sections:**
- **Breadcrumbs** (The Workbook → Practices → Weekly Relish)
- **Hero** (2-col with 1px rule): italic h1, lede, **cadence plate** (3-cell: Cadence / Last kept / Next), CTAs. Right side: **12-week streak grid** (7×12 cells, sage for kept, sage-deep for strong, ember for now, dashed outline for skipped), legend, note card
- **Ritual body** (2-col 1.15:1): step-by-step ("1…2…3…" in italic serif ember numerals) + side cards ("When" with dl grid, "Who keeps it" with keeper chips)
- **Log** — past kept, chronological. Each entry: date (italic, serif) / body (pulled quote) / action

---

### 5. The Pen (`The Pen.html`)

**Purpose:** The capture sheet. Warm, inline, for writing a new entry. Not a modal dialog — feels like flipping a page open.

No top nav (it's a modal surface). See file for structure.

---

### 6. The Archive (`Archive.html`)

**Purpose:** Everything written. Search and browse.

Shares chrome with Workbook Home. (Structure present; treat as needing more design iteration than the other rooms.)

---

### 7. Design System (`Design System.html`)

Internal reference — colors, type scale, components. Useful for onboarding a new developer.

---

## Interactions & Behavior

### Navigation
- Top-nav room links: soft opacity transition (0.55 → 1 on active), 1px ink underline when active
- Wordmark always routes to Workbook Home
- Pen button is present on every room page; in production it opens The Pen as a modal/sheet (design shows it as a full page for prototype purposes)

### Hover states
- **Cards** (`.dispatch`, `.feature`, `.pc` roster card): `translateY(-1px)` + `--r-shadow-card`, 180ms `--r-ease-ink`
- **Constellation nodes**: `scale(1.06)` + `--r-shadow-card`, 160ms
- **Pills**: subtle darkening
- **Room tabs**: opacity 0.55 → 0.85

### Transitions
All transitions use `--r-ease-ink` (`cubic-bezier(0.22,1,0.36,1)`) — editorial, no bounce. Durations 140–200ms.

### States to implement
- **Week day** — 3 states: past-kept (sage bg + check glyph), today (ember accent), future (rule outline, may contain scheduled entries)
- **Person card** — needs-you (ember tag + open-pip count), quiet (muted tag), household/kept-close/parents tags
- **Ritual cell** — kept / strong / skipped / now (see streak grid)
- **Dispatch eyebrow pip** — color = category (burgundy=lead, amber=pattern, sage=echo, ember=brief)

### Empty states
The Workbook file includes a **Tweaks panel** (design-only, host-toggled) that previews day/time/season/photo states. Use those as references for empty states:
- **Empty day:** "The book is quiet. When you want a line, a prompt is waiting — or pick up the Pen."
- **Quiet day:** muted palette, fewer cards
- **Full day:** default — all sections populated

---

## State Management

The screens imply these data models (shape them to your backend):

### User / Session
- `currentUser: { id, displayName, status: 'sage' | 'ember' | 'burgundy' }`
- `activeRoom: 'workbook' | 'manual' | 'archive'`

### Workbook Home
- `masthead: { openThreads: number, writtenThisWeek: number, waitingOn: Person, keptThisWeek: number }`
- `todaysMemory: ArchiveEntry` (with photo, date, quote)
- `suggestedPerson: Person` (least-written-about)
- `todaysPrompt: { text, attribution }`
- `weeklyDispatch: { title, dek, evidence: EvidenceRow[], actions }`
- `secondaryDispatches: [TherapistBrief, Pattern, Echo]`
- `weekAhead: Day[]` (7 items, each with entries[])
- `songOfWeek?: { artworkUrl, title, attribution, playUrl }`

### Family Manual
- `peopleCount: { kept, withOpenThreads, writtenThisWeek, quietLongest }`
- `personOfTheWeek: Person` (hero)
- `constellation: { you: Person, orbits: Orbit[] }` where `Orbit { ring: 1 | 2, members: Person[] }`
- `groups: ThematicGroup[]` (household / parents / kept-close)
- `roster: Person[]`
- `filters: ('all' | 'open' | 'quiet' | 'recent')`

### Person
```ts
Person {
  id, name, relationship, age?,
  photoUrl,
  daysSinceLastWritten: number,
  entriesCount: number,
  openThreadsCount: number,
  lastEntry?: { quote, date },
  tags: ('household' | 'parents' | 'kept-close' | 'needs-you' | 'quiet')[]
}
```

### Weekly Relish
- `ritual: { name, cadence, lastKept, next, currentStreak, totalKept }`
- `streakGrid: Cell[][]` (12 weeks × 7 days)
- `keepers: Person[]`
- `log: LogEntry[]`

---

## Assets

### Photography
Mock photos use Unsplash placeholders (portrait, family, food, objects). **Replace with the user's own uploaded photos** from the family's library. Crop specs:
- **Hero portrait (Family Manual):** 4:5 aspect, subject in upper third
- **Memory card (Workbook):** landscape 4:3, soft background preferred
- **Roster card:** 3:4, center-weighted
- **Constellation node:** 1:1 square crop to circle
- **Lead dispatch art:** landscape 16:9 or 3:2

### Fonts
Google Fonts — load `Cormorant Garamond` (italic + roman, weights 300–600) and `DM Sans` (weights 400–700).

### Icons
All glyphs used are **inline SVG** drawn with 1.5–1.6 stroke width, round line-caps and line-joins, viewBox 0 0 16 16 or 0 0 24 24. See source HTML for exact paths:
- Pen glyph (favorite / write action)
- Check (kept / done)
- Plus (add)
- Arrow (→ for CTAs)
- Document/calendar (brief)

---

## Files in this Handoff

- `Workbook Home.html` — room 1 (landing)
- `Family Manual.html` — room 2 (people)
- `Archive.html` — room 3 (stub, more iteration needed)
- `Person Page.html` — sub-page
- `Weekly Relish.html` — sub-page
- `The Pen.html` — capture sheet
- `Design System.html` — token + component reference
- `shared.css` — shared chrome (top nav, wordmark, room tabs, user pip, pen button, global tokens)

**Open `Workbook Home.html` first.** It's the canonical example of the system working end-to-end.

---

## Implementation Notes

1. **Start with tokens.** Before building any screen, encode the full color, type, spacing, radii, and shadow scales in your theme system.
2. **Build shared chrome once.** Top nav + pen button should be a single `<AppShell>` layout component used by all three rooms.
3. **Workbook Home first, then Family Manual.** These are the two surfaces at full quality. The sub-pages follow patterns they establish.
4. **Photos are the visual anchor.** Don't stub with gradient rectangles in production. Wire up the user's real images early — the design's warmth depends on them.
5. **Copy is a first-class deliverable.** Keep the editorial voice intact. Where you need new strings, write them in the same register (italic for voice, specific not generic, warm not clinical). If in doubt, read existing strings in the HTML and match the register.
6. **Avoid slop.** Do not introduce: gradient backgrounds behind cards, rainbow accent bars, emoji in UI, rounded left-border-accent alert boxes, stock icon-label chip combos. The design deliberately avoids these.

---

## Questions for the Product Team

Before implementing, confirm:
- The three-room IA (Workbook / Family Manual / Archive) — is Archive in scope for v1?
- Scope of the Pen capture sheet — inline sheet or full page?
- Dispatch generation — real ML/synthesis or curated for v1?
- The constellation layout — fixed positioning or algorithmic (e.g. force-directed)?
- Weekly Relish — one ritual or user-configurable N rituals?


---

# UPDATE — Workings section (added after initial handoff)

A new section was added to **Workbook Home** between Dispatches and the Week Ahead, called **Workings**. It is a key feature, not a polish addition. Implement it.

## What it is

The Workbook had three modes before: things to read (Dispatches), things kept open (Threads), things to write (the Pen). It was missing a fourth: **things to work out**. Workings is that mode — practical worksheets the user fills in and comes back to.

A Working is a structured document with editable fields. It can be started by the user blank, started from a template, or **suggested by Relish** when it notices a pattern that warrants planning (e.g. "you wrote three times this month that Kaleb does better with shape — here's a draft Saturday plan").

This closes a loop the user explicitly named:
1. User writes raw entries.
2. Relish notices a pattern across them.
3. Relish surfaces the pattern as a **Dispatch** (existing).
4. User taps "Make a working plan" on the dispatch (NEW — see below).
5. Relish opens a pre-filled Working (e.g. day plan) using the pattern context.
6. User edits, lives the day.
7. User reflects (1–5 scale).
8. Relish learns and tunes the next draft.

## IA placement

`/workbook` (Workbook Home) gains a new section. **Workings is the headline content — it sits at the top of the page, immediately under the masthead strip.** Everything else moves down.

Order top-to-bottom:

1. Masthead strip
2. **Workings (NEW — headline)**
3. Hero spread (Still up, Scott + open threads)
4. Feature row (memory / quiet person / prompt)
5. Dispatches (existing)
6. Week ahead
7. Song strip
8. Colophon

Why first: Workings is what the user is *actively working on* — open plans, briefs, lists. It's the most operationally valuable surface, so it leads. The hero spread, feature row, and dispatches are framing/context that follow.

## Data model

```ts
type WorkingKind =
  | 'day-plan'         // Time-blocked schedule, the marquee type
  | 'call-brief'       // List of things to ask someone
  | 'meal-plan'        // 7-day grid (NOT in v1 — needs Symphony or other meal-data feed first)
  | 'packing-list'     // For a trip
  | 'bedtime-sequence' // Steps to follow
  | 'conversation-script' // Hard talk prep
  | 'birthday-plan'    // Logistics + gift ideas
  | 'blank';           // User-defined

interface Working {
  id: string;
  kind: WorkingKind;
  title: string;          // "Kaleb's Saturday", "What to ask your mom"
  subtitle?: string;      // "Saturday · 25 April"
  why?: string;           // Editorial explanation; can reference entries
  startedBy: 'user' | 'relish';
  // If Relish-started, link to the pattern/dispatch that triggered it
  startedFromPatternId?: string;
  startedFromDispatchId?: string;
  createdAt: Date;
  updatedAt: Date;
  pinnedTo?: 'saturday' | 'sunday' | string; // For recurring day plans
  // Sharing — if the working is visible to a co-parent etc.
  sharedWith?: PersonId[];
  status: 'in-progress' | 'done' | 'archived';
  // Most workings have steps; day-plans have time blocks
  steps?: WorkingStep[];
  blocks?: DayPlanBlock[];
  // Reflection feeds back to the pattern engine
  reflection?: { score: 1 | 2 | 3 | 4 | 5; recordedAt: Date; note?: string };
}

interface DayPlanBlock {
  id: string;
  startTime: string;       // "07:00", free-form HH:MM
  durationMinutes?: number;
  label: string;           // Editable text
  kind: 'active' | 'calm' | 'together' | 'solo';
}

interface WorkingStep {
  id: string;
  text: string;
  done: boolean;
  source?: { kind: 'entry' | 'pattern' | 'user-added'; entryId?: string; addedAt: Date };
}
```

## Three worksheets shown on Workbook Home

The section uses a 1.55fr / 1fr grid (lead on the left, two stacked on the right):

### 1. Lead — Day plan (`kind: 'day-plan'`)
- The marquee Working type. Color-coded time blocks.
- Shown example: **"Kaleb's Saturday"**, started by Relish from a pattern about morning behavior.
- 11 default blocks at 7am–8pm with kinds Active / Calm / Together / Solo.
- Each block: editable start time (text input), color swatch, editable label, kind button that cycles through the four kinds (also recolors the swatch).
- "+ Add a block" appends a new editable row defaulting to `kind: 'calm'` and focuses the label.
- **Reflection bar** at the bottom: 1–5 scale buttons. One tap on the morning after. Persists and feeds back to the pattern engine.
- Actions: Print for the fridge, Save as template, Pin to Saturday.

### 2. Call brief (`kind: 'call-brief'`)
- Shown example: **"What to ask your mom"** — Sunday 11am.
- Checklist of items. Each has an optional source (pulled from an entry, an open thread, or user-added) and a relative timestamp.
- Becomes a journal entry after the call (i.e. checking everything done + tapping a closing action creates a new entry with what was discussed).

### 3. "Start a working" — empty card
- Dashed border, hover-fills.
- Template chips: Bedtime sequence, Trip packing list, Hard conversation script, Birthday plan, Blank sheet.
- Tapping a chip creates a new Working of the matching kind.

## Wiring to Dispatches

The Dispatches **lead card** has an actions row. A new action sits between "Add to Tuesday's brief" and "Already discussed":

```
[ Read the full dispatch ] [ Add to Tuesday's brief ] [ Make a working plan ] [ Already discussed ]
```

"Make a working plan" creates a Working pre-filled from the dispatch:
- For sleep/morning patterns → a day-plan template with default blocks.
- For relationship patterns → a call-brief or conversation-script with cited entries already as steps.
- For seasonal/recurring patterns → a list-style sheet.

## Visual / interaction notes

- Each sheet has a 3px colored top border in the accent for its kind (`amber` for day-plan, `sage` for meal/calm worksheets, `burgundy` for briefs). The border is a visual stamp.
- "Stamps" in the top-right of each sheet head: `In progress` (sage tint), `4 to ask` (neutral), etc. Use these for state.
- Inputs use cream-tinted focus state with a 1px inset rule. No standard form-input chrome.
- All editable inputs commit on Enter or blur. No save buttons inside the sheet.

## What's NOT in v1

- **Meals worksheet.** Was prototyped but removed pending a real meal-data feed (Symphony or similar). Do not implement until there's a source.
- **Drag-to-reorder blocks** within a day plan. Nice-to-have, not v1.
- **Drag-to-resize block durations.** Same.
- **Multi-user real-time editing.** v1 is single-writer with a "last edited by Iris" stamp.

## Names in the prototype

`Iris`, `Kaleb`, `Nell`, `Margot`, `Daniel`, `Jenny`/`your mom` are placeholder copy in the prototype HTML. In production these should come from the user's roster (`/people`), never hard-coded. Where the prototype shows "your mom," interpret as `{relationship: 'parent'}` resolved from the roster.

## File reference

The Workings markup and styles live inline in `Workbook Home.html`:
- CSS: search for `/* ═══ WORKINGS — practical worksheets ═══ */`
- Markup: search for `<!-- ═══ WORKINGS — practical worksheets ═══ -->`
- Script: at the bottom, search for `/* WORKINGS — small interactivity`
