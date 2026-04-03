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

### 1.3 Aesthetic direction — "A beautiful old library reimagined for the 22nd century"

The app should feel like entering a reading room with leather-bound volumes and warm lamplight — but the shelves are made of glass, the air hums with quiet intelligence, and the books know your name. This is not nostalgia; it's warmth carried forward through modern materials.

**What this means in practice:**

- **Typography is the architecture.** Cormorant Garamond does the heavy lifting at generous sizes (42-56px for heroes, 19-22px for card titles). The serif is the warm wood. DM Sans is the modern glass — clean, precise, used for body text and micro labels. The hierarchy is built entirely through size and weight within these two families. No icons needed for navigation. No badges. No decorative elements. The type IS the design.

- **The color palette is earth, not clinical.** Primary text is warm dark brown (#3A3530), not black. Secondary text is warm gray (#7C7468, #8A8078), not cool gray. The sage green (#7C9082) is the one accent — muted, natural, never saturated. The background gradient moves through parchment tones (cream → linen → sage), not blue-white.

- **Surfaces are frosted glass over warm light.** Glass cards use warm-tinted transparency (rgba(255,255,255,0.45) over the parchment gradient). The subtle paper-texture overlay (already in globals.css) adds just enough grain to feel handmade. Borders are white at low opacity, never gray lines.

- **The navigation is a whisper.** No chunky header bars, no industrial mono fonts, no colored borders. The wordmark sits in Cormorant Garamond. Nav links are tiny, lowercase, unobtrusive. The user's presence is shown with a small green dot and their first name. The logout button is invisible until hovered. The navigation should feel like the brass plaque on a library door — you notice it once, then you just know where you are.

- **Whitespace is generous.** The content area is narrow (max-w-xl, ~520px). Vertical spacing between sections is 32-40px. Cards have 24-28px internal padding. There's always room to breathe. Dense information is reserved for the Manual; everywhere else, less is more.

**What this is NOT:**
- Not industrial/brutalist (no mono fonts, no hard borders, no square corners)
- Not playful/rounded (no bouncy animations, no emoji-heavy, no bright colors)
- Not clinical/dashboard (no data tables, no metric grids, no chart-heavy layouts)
- Not dark mode by default (the warmth comes from light, not from darkness)

---

## 2. Visual System

### 2.1 Typography

**Display font: Cormorant Garamond** (`--font-parent-display`)
The signature typeface. Used for everything with emotional weight.
- Hero greetings: 42px, weight 300, italic. "Good evening, Scott"
- Climate labels: 56px, weight 300. "Clear skies"
- Card titles (person names): 22px, weight 400. "Iris"
- Section heroes: 19-22px, weight 400-500.
- Trend phrases: 18px, weight 300, italic. "holding steady"

**Body font: DM Sans** (`--font-parent-body`)
Used for everything informational and interactive.
- Body text: 14px, weight 400, line-height 1.7, color #6B6560
- Card descriptions: 13px, weight 400, line-height 1.55
- Buttons: 12px, weight 500, letter-spacing 0.01em
- Micro labels: 10px, weight 500-600, uppercase, letter-spacing 0.10-0.12em
- Nav links: 12px, weight 400-500, letter-spacing 0.04em
- Qualitative bands: 11px, weight 500

### 2.2 Color system

**Text colors (warm brown-gray spectrum):**
- `--parent-text`: #3A3530 (primary — warm near-black)
- `--parent-text-mid`: #5C5347 (nav text, secondary headings)
- `--parent-text-light`: #7C7468 (descriptions, secondary body)
- `--parent-text-muted`: #8A8078 (timestamps, hints, micro labels)

**Background gradients:**
- Clear skies: `linear-gradient(170deg, #FAF6F0 0%, #F0E8DD 30%, #E2D9CC 60%, #C8CFC5 100%)`
- Mostly sunny: `linear-gradient(170deg, #FAF6F0 0%, #EDE5D8 50%, #D4CFC7 100%)`
- Partly cloudy: `linear-gradient(170deg, #F5F2EE 0%, #E0DBD3 50%, #C8C3BC 100%)`
- Overcast: `linear-gradient(170deg, #E8E3DC 0%, #C8CFC5 40%, #8A9E90 100%)`
- Stormy: `linear-gradient(170deg, #8A9E90 0%, #5C7566 50%, #3A5548 100%)`

**Accent colors:**
- Primary sage: #7C9082 (buttons, active states, success indicators)
- AURA Assess: #0F6E56 (teal)
- AURA Understand: #534AB7 (purple)
- AURA Respond: #D85A30 (coral)
- AURA Assimilate: #BA7517 (amber)

**Card surfaces:**
- Glass standard: `rgba(255,255,255,0.45)` with blur(20px)
- Glass strong: `rgba(255,255,255,0.55)` with blur(32px)
- Border: `1px solid rgba(255,255,255,0.5)`
- Corner radius: 20px
- Shadow: `0 8px 32px rgba(0,0,0,0.04)`

### 2.3 Navigation redesign

**Top navigation (replaces the old industrial header):**

The navigation is a single horizontal bar with no background color, no border, no shadow. It's just text sitting on the weather gradient.

```
parentpulse          home  people  workbook  check-in          ● Scott
```

- Wordmark: "parentpulse" in Cormorant Garamond, 19px, weight 500, color #5C5347
- Nav links: DM Sans, 12px, weight 400, color #5C5347 at 45% opacity
- Active link: full opacity, 1.5px bottom border in sage (#7C9082)
- User indicator: 6px sage dot + first name, 11px, far right
- Height: ~60px (down from 80px)
- No logo image, no logout button visible (logout lives in settings or behind a user menu)
- Padding: 20px vertical, 32px horizontal
- Bottom border: `1px solid rgba(124,100,77,0.08)` — barely visible

**Side navigation: REMOVED on desktop.** The top nav links replace the side nav entirely. The content area becomes full-width (no more lg:pl-64). The narrow max-width (520px) centered on the page provides the reading-room feel — a column of text in a vast space, like a book laid open on a wide desk.

**Mobile bottom tab bar: Kept** but restyled to match. Same items (Home, People, Workbook, Check-in, Settings), same glass treatment, but icons reduced to 18px, labels in DM Sans 10px, active state uses sage color.

### 2.4 The AURA Phase Indicator (unchanged from previous spec)

Same component, same behavior. Four dots, phase colors, compact and inline modes.

---

## 3. Screen-by-Screen Specification

(Note: All screens now use the warm library aesthetic described above. Typography, colors, and spacing are governed by Section 2.)

### 3.1 Dashboard

Layout: Full-bleed weather gradient. NO side nav. Top nav bar. Content max-w-xl centered.

**Typography scale on the dashboard:**
- Greeting: Cormorant Garamond, 42px, weight 300, italic
- Climate label: Cormorant Garamond, 56px, weight 300
- Trend phrase: Cormorant Garamond, 18px, weight 300, italic
- Narrative summary: DM Sans, 14px, weight 400, max-width 400px
- Section labels: DM Sans, 10px, weight 600, uppercase, tracking 0.12em
- Card person names: Cormorant Garamond, 22px, weight 400
- Card descriptions: DM Sans, 13px, weight 400
- Card action links: DM Sans, 11px, underline-on-hover

These sizes are NOT negotiable — they define the editorial feel. If the content looks "too big," that's the point. The generous type scale is what separates this from every other health app.

### 3.2 Assessment Shell

Same structure as previous spec. The shell inherits the warm palette:
- Section name: Cormorant Garamond, 22px
- Section description: DM Sans, 14px, #7C7468
- Time estimate: DM Sans, 11px, #8A8078
- Progress bars: 2px height, teal fill (#0F6E56) over rgba(124,100,77,0.08)

### 3.3 Understanding Reveal Page

Same structure. Domain cards use the warm glass treatment. "Your family climate today" in Cormorant Garamond 32px centered.

### 3.4 Workbook Page

- Page title: Cormorant Garamond, 32px, "Your workbook"
- Subtitle: DM Sans, 14px, #7C7468, "What you're working on"
- Exercise title within card: Cormorant Garamond, 19px, italic
- Exercise description: DM Sans, 14px

### 3.5 Reflection Form

- "How did it go?": Cormorant Garamond, 28px
- Exercise name subtitle: DM Sans, 14px, italic, #8A8078
- Manual entry suggestions: warm glass cards with a 2px left amber border

### 3.6 Weekly Check-In

- "Quick check-in": Cormorant Garamond, 32px
- Phase section dividers: horizontal gradient line (same as dashboard separator)
- Closing quote: Cormorant Garamond, 18px, italic, centered

### 3.7 Person Manual

- Person name: Cormorant Garamond, 36px
- "Last updated 3 days ago": DM Sans, 12px, #8A8078
- Section tabs: DM Sans, 12px, uppercase, tracking
- Perspective gap callout: warm amber-tinted glass card
- New-from-workbook entries: highlighted with amber left border

### 3.8 Relationship Card

- Person name: Cormorant Garamond, 22px
- Qualitative band: DM Sans, 11px, weight 500, #7C9082
- Description: DM Sans, 13px, #7C7468
- Action links: DM Sans, 11px, #8A8078 with subtle underline

---

## 4. Interaction Patterns

(Same as previous spec — transitions, card hover, question navigation, score display rules, empty states, loading states.)

### 4.1 Score display rules — NEVER show raw 1.0-5.0 scores

| Score Range | Qualitative Band | Climate |
|---|---|---|
| 4.0-5.0 | "Strong" / "Bright & steady" | Clear skies |
| 3.5-3.9 | "Steady" / "Good foundation" | Mostly sunny |
| 3.0-3.4 | "Developing" / "Some distance" | Partly cloudy |
| 2.0-2.9 | "Needs attention" / "Rough patch" | Overcast |
| 1.0-1.9 | "Rebuilding" / "Working through it" | Heavy weather |

---

## 5. Mobile Considerations

- Top nav collapses to wordmark only + hamburger (or just the bottom tab bar)
- Bottom tab bar: same warm glass, 18px icons, 10px labels
- Content: full-width, px-4 padding
- Type scale reduces by ~20% on mobile (greeting 32px, climate 42px, etc.)
- One question per screen in assessments, sticky bottom nav buttons

---

## 6. Tone of Voice

**What the app says:** Warm, personal, editorial. Reads like a well-written essay, not a product.
**What the app never says:** "score", "rating", "failing", "poor", "bad", raw numbers.

---

## 7. Accessibility

Same as previous spec — WCAG AA contrast, semantic headings, ARIA labels, keyboard navigation, prefers-reduced-motion support.
