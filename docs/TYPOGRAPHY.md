# Typography & Readability Standard

*A comprehensive readability standard for Relish. Every text color used in the app must meet this standard. This is a rule, not a suggestion.*

---

## The non-negotiable rule

**Every piece of readable text on a cream (`#F7F5F0`) or warm-ash (`#ECEAE5`) background must have a contrast ratio of at least 4.5:1.** This is WCAG AA for normal text.

If a color would fall below 4.5:1, use one of the approved colors in the table below or pick a darker tone. There are no exceptions for "decorative" text, "quiet" labels, marginalia, or "muted" hints — if a user is expected to read it, it must be legible.

---

## The approved text palette (all measured on `#F7F5F0`)

| Use | Color | Contrast | Notes |
|---|---|---|---|
| **Primary text** (body, titles) | `#3A3530` | 10.2:1 | Warm near-black |
| **Secondary text** (headings, emphasis) | `#5C5347` | 6.8:1 | Warm dark-brown |
| **Tertiary text** (captions, chapter labels) | `#5F564B` | 6.5:1 | Replaces old `#7C7468` |
| **Muted text** (small labels, micro copy) | `#6B6254` | 5.9:1 | Replaces old `#8A8078` |
| **Very muted** (marginalia, footnotes) | `#746856` | 5.2:1 | Replaces old `#9B9488` |
| **Faintest readable** (decorative text with words) | `#7A6E5C` | 4.7:1 | Replaces old `#B5AC9E` — just above AA threshold |

**Rule:** If you find yourself reaching for a color lighter than `#7A6E5C` for something that contains words, stop. Use strokes or ornaments instead (see below).

---

## The approved non-text palette (strokes, rules, ornaments)

These colors are only allowed for **non-textual decoration**: hairline rules, dotted leaders, corner ornaments, thin frames. They do not convey information a reader needs to parse.

| Use | Color |
|---|---|
| Prominent hairline rule | `#A8988A` (darkened from old `#B0A58F`) |
| Quiet hairline rule | `#B5A99A` (darkened from old `#CEC6B8`) |
| Ornamental border | `#C0B49F` |
| Fleuron / asterism / typographic ornament | `#8C8070` (must still be visible) |
| Very faint divider | `#DDD5C4` |

---

## The replacement table

This is how every existing color in the codebase maps to its new value. **When touching any text in the app, replace every instance of a left-column color with its right-column equivalent.**

| Old | → | New | Reason |
|---|---|---|---|
| `#7C7468` | → | `#5F564B` | was 4.19:1, now 6.5:1 |
| `#8A8078` | → | `#6B6254` | was 3.53:1, now 5.9:1 |
| `#9B9488` | → | `#746856` | was 2.72:1, now 5.2:1 |
| `#B5AC9E` | → | `#7A6E5C` | was 2.06:1, now 4.7:1 |
| `#BCB5A8` | → | `#7C6F5D` | was ~1.9:1, now 4.7:1 |
| `#B9B0A1` | → | `#8C8070` | fleurons — decorative but visible |
| `#AAA199` | → | `#7C6F5D` | folios — readable |
| `#9ca3af` | → | `#5F564B` | Tailwind grey-400 (was failing) |
| `#A3A3A3` | → | `#5F564B` | Tailwind neutral-400 (was failing) |
| `#6B6B6B` | → | `#4A4238` | stray grey |
| `#6b7280` | → | `#4A4238` | Tailwind slate |

**Strokes and borders can stay lighter** — these are decorative only:
- `#CEC6B8`, `#D4CCB8`, `#D8D3CA`, `#E5E0D8`, `#E8E3DC` — keep as-is for lines and borders
- `#D4C89E` — gold ornaments on the waiting-volume illustration, keep as-is

---

## The rule of thumb

> If a user is expected to read something, the contrast on its background must be 4.5:1 or better. Period.

**Quick tests before committing any text color:**

1. Is this text conveying information? (If yes → must pass AA)
2. Is it small (<18px)? (If yes → AA at 4.5:1, not 3:1 "large text" allowance)
3. Is it on a cream or warm background? (Use the approved palette above)
4. Is it italic or low-weight? (Italic/light weights need *more* contrast, not less — italic Cormorant at 300 weight is visually thinner than regular weight, so lean darker)

---

## Applying this standard across the codebase

1. Open the replacement table above.
2. For each "Old" value, do a global find across `.tsx`, `.ts`, and `.css` files.
3. Replace with the "New" value — but **only** when the color is being used for a `color:` property or as a `fill=` on text elements.
4. When in doubt, pick the darker option. There is no "too dark" in this system — `#3A3530` is the darkest, and that's the primary body text color.

**What NOT to replace:**
- `border-color:`, `stroke:` (non-text), `background:` — these can stay light
- Colors on dark surfaces (in case we ever add dark cards) — those follow the inverse rules

---

## Why contrast matters

The warm library aesthetic of Relish depends on typography. Low-contrast grey text defeats the entire premise — you cannot have a "beautiful old library" aesthetic when visitors need to squint to read the labels. The generous whitespace and elegant Cormorant typography only work when the words are *actually legible*.

This is not a brand compromise. Real fine-print books and editorial magazines use **very dark** ink on their cream pages. The faint-grey-on-cream look comes from low-end web design trends, not from the real bookbinding tradition this app is meant to evoke.

Darker is better. Always.

---

# Part Two: Type Sizes

The other half of the readability problem is type that's too small. An italic Cormorant at 14px looks "elegant" in a figma mockup but is genuinely hard to read for anyone over 30, on a laptop screen, in normal light.

## The minimum sizes (non-negotiable)

| Kind of text | Minimum | Target | Notes |
|---|---|---|---|
| **Display titles** (h1, heroes) | 32px | 48-80px | Cormorant italic; no upper limit |
| **Section titles** (h2) | 22px | 26-32px | Cormorant italic |
| **Sub-titles** (h3) | 18px | 20-22px | Cormorant italic |
| **Body text (Cormorant italic)** | **18px** | 19-22px | Italic Cormorant is optically smaller than sans-serif at the same pixel size — compensate by going bigger |
| **Body text (DM Sans)** | **15px** | 15-16px | Lower x-height but no italic penalty |
| **Marginalia (italic Cormorant)** | **15px** | 15-16px | Was often 11-13px — bumped up |
| **Captions / sub-text (DM Sans)** | **13px** | 13-14px | Minimum for any running text that's not display |
| **Small caps labels (`.press-chapter-label`)** | **11px** | 11-12px | Small caps have high x-height so can be smaller |
| **Running headers** (tiny orientation strip) | 10px | 10-11px | Orientation only, not content |
| **Legal / colophon text** | 12px | 12-13px | Still has to be readable |

## Rules

1. **Nothing below 13px for any running text** (lower x-height fonts like Cormorant italic need 15px minimum).
2. **If it's italic Cormorant, add 2-3px** compared to a sans-serif equivalent — the italic form is visually lighter.
3. **Small-caps labels can go to 11px** (high x-height makes them legible smaller), but below 11px is off-limits.
4. **Page numbers and truly decorative labels** on illustrations can go down to 9-10px, but only if they're not conveying information the user needs to act on.
5. **Dialogue copy / chat messages** should be at least 17px, ideally 18-19px — people read these slowly.

## The size replacement table

Common offenders and their fixes:

| Found | Context | Replace with |
|---|---|---|
| `fontSize: 10` | marginalia, hints | `fontSize: 13` (or `fontSize: 11` if small caps only) |
| `fontSize: 11` | captions, marginalia | `fontSize: 13` (or `fontSize: 11` if small caps only) |
| `fontSize: 12` | body/caption text | `fontSize: 14` |
| `fontSize: 13` | body text | `fontSize: 15` |
| `fontSize: 14` (DM Sans) | OK as-is for DM Sans | keep |
| `fontSize: 14` (Cormorant) | too small for Cormorant italic | `fontSize: 16` |
| `fontSize: 15, 16` | body | generally OK |
| `fontSize: 17` (Cormorant italic body) | borderline | bump to `18` if used for main body copy |

## SVG label exceptions

Labels inside SVG illustrations — small captions like *"fig. i"*, node initials in the constellation, labels inside the venn diagram — can be smaller (9-12px) because they sit inside a visual frame and are part of the illustration. They're not running text.

Labels inside **miniature product mockups** (the tiny Workbook/Family Manual/Archive previews on the landing page) can be very small (4-8px) because the mockup as a whole is a simulated zoomed-out preview.

## Why size matters

We've been designing as if the whole audience has perfect 20-year-old eyes on a 27" 5K display in a well-lit studio. The actual audience is parents in their 30s and 40s reading in poor light during a break. They will squint at 11px text and then close the app.

The press aesthetic works at **larger** sizes than a dashboard app. Cormorant italic at 20px is still elegant. Cormorant italic at 12px is just small.

**When in doubt, go bigger.**
