# Relish: Design Vision & UX Principles

## Core Metaphor: The Book

The app is a leather-bound family manual — warm, tangible, crafted. Not a SaaS dashboard.

### Visual Direction
- **Leather-bound book** as hero image and primary metaphor
- **Bookshelf** as home screen — spatial metaphor that orients the whole app
- The weather metaphor is retired. Manual metaphor is primary.
- Aesthetic: warm, familial, storybook — not analytical/technical/reference
- Content should be **pictorial, not wordy** — shapes, colors, icons, visual scales over paragraphs

### The Bookshelf (Home)
- Family Manual (leather-bound, main book) → opens to family dashboard
- Individual person manuals → chapters within the family manual
- Growth Workbook (softer cover) → daily growth items, exercises
- Reports Binder (utilitarian) → therapist exports, status views
- **One book is cleaner** — everything interconnected, not separate contexts
- The book that needs attention most should visually indicate it (glow, bookmark, pulled from shelf)

### The Open Book: Two-Page Spread (Landscape)

```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│   FAMILY CONSTELLATION  │    THE ONE THING        │
│   (visual map)          │    (primary CTA)        │
│                         │                         │
│                         ├─────────────────────────┤
│   INSIGHT CARDS         │    YOUR ACTIVE GROWTH   │
│   (2-3 rotating)        │    (arc progress)       │
│                         │                         │
│                         ├─────────────────────────┤
│                         │    WHAT'S NEW           │
│                         │    (since last visit)   │
│                         │                         │
├─────────────────────────┴─────────────────────────┤
│                                                   │
│              TIMELINE (horizontal)                │
│  ·──────·────·──·─────────·───·──·────── NOW ●    │
│                                                   │
└───────────────────────────────────────────────────┘
         LEFT PAGE              RIGHT PAGE
```

**Left page = The Family** (stable, collective view)
- Family Constellation: visual map of all members with avatar/initial, completion rings, connection lines colored by relationship health
- 2-3 rotating insight cards beneath (gaps, staleness, positive patterns)

**Right page = Your View** (dynamic, personal, addressed to signed-in user)
- The One Thing: single most important action right now
- Active growth arc progress (visual path, not numbers)
- What's New since last visit (filtered to you)

**Bottom: Timeline** (horizontal, runs across both pages)
- Timeline is the living table of contents / spine of the book
- Left = past, Right = present. Spine/gutter = meaningful landmark
- Entries are visual marks (dots/nodes), not cards or rows
- Above the line = inputs (contributions, check-ins)
- Below the line = outputs (syntheses, growth items, insights)
- Right edge = "what needs attention now" — most valuable real estate
- Entries alternate above/below to avoid crowding
- Sized by significance (synthesis > single check-in)
- Mobile: timeline goes vertical (top = present, scroll down = past)

---

## The Dual Lens: Family + Individual

Two perspectives always in play, layered not separated:

- **The family** — collective understanding, shared story, how everyone relates
- **You** — the signed-in person's relationships, growth, contributions, unread items

Two family members see different dashboards from the same shared data. The book is shared. The reading experience is personal.

**Always use names, not role labels.** "Iris added to Alex's manual" — not "your partner added to mom's manual." Role labels are ambiguous in a family app.

---

## The One Thing Principle

> Every screen has one clear purpose. When action is needed, one clear action. When understanding is the purpose, one clear focus. When nothing is needed, say so with confidence.

### How it applies per screen type:

| Screen Type | Purpose | The One Thing |
|---|---|---|
| **Action screens** (dashboard, workbook, check-in, onboarding) | Doing | A single CTA |
| **Reading screens** (manual portrait, synthesis view) | Understanding | A gentle visual emphasis on what to notice — not a button |
| **Transition moments** (finishing onboarding, completing exercise) | Momentum | What comes next — the bridge |

### The "Nothing" State
If everything is current — no check-ins due, growth on track, manuals fresh — the system says so with confidence. "Everything's steady. Open the book and read." No manufactured urgency. Calm builds trust.

### Priority Hierarchy (what beats what)

When multiple things could be The One Thing:

1. **Unfinished business** — started a check-in and didn't finish, reflection prompt waiting. Highest because it's a broken loop.
2. **Time-sensitive items** — growth item expiring today, overdue weekly check-in. Clock is ticking.
3. **New information from others** — Iris contributed to Alex's manual and you haven't seen it. Relational — someone did something for the family.
4. **Synthesis ready for review** — AI updated a manual. Important but not urgent.
5. **Growth arc next step** — current exercise, phase transition. Steady drumbeat, not interrupt.
6. **Gaps and invitations** — missing perspectives, stale manuals, low-confidence dimensions. "You could go deeper" — never urgent.
7. **Nothing** — everything is current. The app is calm.

Each page runs this same hierarchy scoped to its context:
- Dashboard: runs it globally
- Person's manual page: filtered to that person
- Workbook: filtered to active arc

### CTAs by User Stage

| User Stage | Primary CTA | Secondary |
|---|---|---|
| Brand new | "Add your first family member" | — |
| One person, no manual | "Create their manual" | "Add another person" |
| Manual created, solo perspective | "Invite someone to add their perspective" | "Review the synthesis" |
| Multiple perspectives, no growth | "Start your first growth arc" | "Explore gaps" |
| Growth arc active | Today's growth item | "Check in", "View manual updates" |
| Check-in overdue | "Weekly check-in" | Today's growth item |
| Returning after absence | "Here's what changed" | "Resume your growth arc" |

---

## Pictorial Content Principles

### Person Portrait / Manual
- **Visual scales** instead of text: "Needs space ←→ Needs closeness"
- **Icon clusters** for love languages, communication styles, triggers
- **Relationship map** showing connections with one-word descriptors ("playful," "tense," "protective")
- **Color-coded cards** — green for "what works," amber for "handle with care"
- **Quote bubbles** — actual quotes from contributors over synthesized paragraphs

### Family Dashboard
- **Family constellation** — visual map with color-coded connection lines
- **Attention heat map** — relationships needing focus shown as visual warmth/coolness
- **Progress rings/arcs** for growth completion — not percentage numbers
- **Snapshot cards** per person: avatar, one key insight, one action item

### The Principle
> If you can show it as a shape, color, position, or icon — don't write a sentence.

---

## Timeline Design Details

### Entry Types (visual marks on the timeline)
- New contribution added — speech bubble icon
- Synthesis generated/updated — refresh icon
- Growth item completed — small plant icon
- Check-in logged — checkmark
- Milestone/flag — staleness ("6 weeks since anyone updated Jamie's manual")
- Staleness shows as a visible gap in the timeline

### Navigation
- Scrolling the timeline = moving through the family's story
- Tapping an entry = turning to that page in the book
- The present moment is always at the right edge
- Unprocessed contributions appear as visually distinct (different color, "unread" dot)
- Once AI synthesizes them, they transform into integrated entries

### Open Questions
- **Time scale:** Auto-zoom based on density? Compressed when quiet, expanded when busy?
- **Per-person lanes** vs unified timeline with person-colored nodes?
- **How far back:** Rolling window (90 days) with archive, or all history?
