# Dispatch-row collapse — "What Relish is returning to you"

**Date:** 2026-04-20
**Status:** Spec — awaiting implementation plan
**Session:** Simplify-vocabulary pass (NEXT-SESSION-SIMPLIFY.md)

## Problem

On `/workbook`, the section headed *"What Relish is returning to you"* renders four peer cards — Lead (weekly synthesis), Brief, Pattern, Echo — under a giant header with an explanatory sub-paragraph. For a first-time user with zero entries, all four cards are empty-state stubs ("ready Sunday 9pm," "Briefs come online once you've been writing a while," "A rhythm will surface here," "Nothing to echo yet"). That is four restatements of *"this part of the app doesn't work yet"* on the canonical landing page, each wearing a jargon label a newcomer has to decode.

Two specific problems this spec addresses:

1. **Vocabulary.** *"Synthesis,"* *"Brief,"* *"Pattern,"* *"Echo"* are four literary/analytical nouns clustered in one section. Flagged as a top-three tripper in the simplify audit.
2. **Empty-state load.** On day one the section is all placeholder. Empty cards are louder than no section — they perform failure. The first-impression surface should stay quiet until Relish has something real to hand back.

A third adjacent problem: the Echo card surfaces a year-ago entry; the Memory-of-the-day card in the feature row *above* it also surfaces a year-ago entry. A reader scrolling the page lands on two near-identical year-ago blocks with differences only a power user would parse.

## Goal

Make the returning-things section **earn itself** and collapse its vocabulary. Specifically:

- Hide the section entirely until any Weekly Lead has ever been generated for the family.
- When unfurled, show **two peer cards** (Lead + Brief) and **one subtle italic footer line** for Pattern.
- Delete the Echo card; fold its theme-match logic into Memory-of-the-day.
- Rewrite the section header and all eyebrows in plain English. Zero uses of *synthesis / Brief / Pattern / Echo* as labels.

## Non-goals

- Changes to Firestore schema, security rules, or Cloud Functions.
- Changes to the weekly generation pipelines (`generateWeeklyLead`, `generateWeeklyBrief`) or their data.
- Changes to the Pattern histogram logic itself (`useDispatches().pattern`) — the hook keeps running; we just stop rendering its card and histogram chart.
- Changes to the per-card internal body copy (Brief topics, Lead evidence quotes, etc.). Only the section header, card eyebrows, and Pattern placement are redesigned.
- Changes to any other route. Spec is `/workbook`-only.

## Architecture

### Gating logic

The section has two states on `/workbook`:

**State A — section hidden.** When `useWeeklyLead()` returns `{ loading: false, dispatch: null }`, the entire `<section className="dispatches">` is not rendered. In its place, a single soft line appears inside the existing spread (detail below).

**State B — section unfurled.** As soon as `useWeeklyLead()` returns a non-null `dispatch`, the full section renders: header + Lead card + Brief card + Pattern footer line.

The gate is based on *any* Lead ever — not "a Lead for this week." `useWeeklyLead` already returns the latest dispatch regardless of age. Once the first Lead is written into Firestore, the section is permanent furniture.

While `useWeeklyLead({ loading: true })`, the section is also hidden (no flicker — we wait for the hook to resolve before deciding).

### Zero-state line (when section is hidden)

A single italic line appended to the existing `QuietBlock` copy. Exact text:

> *After a week of writing, Relish starts reading back to you. Come back Sunday.*

No card, no CTA, no count-down. One line, full stop. Appears **only inside `QuietBlock`** — i.e. when there are also zero open threads. When open threads exist, the threads take the column and this line does not appear; the page already has signal to show, and the absent dispatch section below doesn't need additional explanation.

Edge case: a brand-new user with zero Leads and zero open threads. The default solo-weekly ritual is seeded on first visit (`ensureSoloWeekly`) with `nextRunAt` about a week out, so it won't be overdue on day 1 — confirming the `QuietBlock` branch is the right place for the zero-state line. By the time the solo-weekly ritual goes overdue (~day 7), the first Weekly Lead is also likely to have run. The two transitions are approximately synchronous; there is no extended window where a user would benefit from the zero-state line but not see it.

### Section header (when unfurled)

Replace the current `<h2 className="dispatches-title">` and its sub-paragraph with a single line:

```tsx
<h2 className="dispatches-title">This week, <em>from Relish.</em></h2>
```

Delete the existing sub-paragraph (*"You write the raw material in. Once a week Relish sends a few things back…"*). The two card eyebrows below now narrate the section on their own.

### Card renaming

Two eyebrows change. Nothing else in the cards changes.

| Card | Old eyebrow | New eyebrow |
|---|---|---|
| Lead | `The weekly synthesis` (with optional `· {range}` suffix) | `What Relish noticed this week` (same `· {range}` suffix) |
| Brief | `Brief for your next conversation` | `What to bring up` |

Placeholder variants inside `DispatchLeadPlaceholder` and `DispatchBriefPlaceholder` inherit the new eyebrows automatically. These placeholders will in practice never render post-change — the section itself is hidden until a Lead exists — but we keep them callable so the components remain self-contained.

### Pattern: demote to footer line

The current `DispatchPattern` card (full article, histogram chart, legend) is replaced by a single italic line placed beneath the Lead + Brief pair, inside the unfurled section.

**Render only when `pattern.confidence` is `'moderate'` or `'high'`.** When `'none'`, `'low'`, or `loading`, render nothing. No "still watching" placeholder. (Confidence values come from `PatternDispatch` in `useDispatches.ts`: `'low' | 'moderate' | 'high' | 'none'`.)

Reuse the existing `patternHeadline()` helper verbatim — the copy is already good:

> *Mondays carry more of the book than the rest.*
> *Your week runs hot on Sundays.*

Line styling: italic serif, secondary text color, small size, aligned left under the `.dispatch-row`. One line, no chart, no CTA.

**Dead code to remove:**

- `<DispatchPattern />` and `<DispatchPatternView />` are no longer called as card components. The file can keep a tiny inline `PatternFooterLine` renderer that reads from `useDispatches().pattern` and renders nothing / one italic line.
- `shiftToMonStart` is no longer needed (no chart).
- CSS rules for `.pattern-chart`, `.pattern-legend`, and the `.dispatch` class modifiers for Pattern can be deleted.

### Echo: merge into Memory-of-the-day

**Delete `<DispatchEcho />` and `<DispatchEchoView />` from the workbook page.** They no longer render in the dispatch row.

**Upgrade `FeatureMemory` / `FeatureMemoryView` in the feature row** to consume both `useMemoryOfTheDay()` and `useDispatches().echo`, preferring the Echo entry when present:

```ts
const { entry: calendarEntry, loading: memLoading } = useMemoryOfTheDay();
const { echo, loading: echoLoading } = useDispatches();

const preferred = echo?.entry ?? calendarEntry;
const origin: 'echo' | 'calendar' | 'none' =
  echo?.entry ? 'echo'
  : calendarEntry ? 'calendar'
  : 'none';
```

Render logic in `FeatureMemoryView`:

- `origin === 'echo'`: eyebrow reads *"From the archive · a year ago · like what you're writing now"*. Link target: the echo's entry. Date/weekday label still rendered from the entry.
- `origin === 'calendar'`: eyebrow stays plain *"From the archive · a year ago"* (unchanged).
- `origin === 'none'`: existing "not quite a year of book yet" placeholder renders (unchanged).

The Echo data's reason string (`echo.reason`) and its "Read both" CTA from the old Echo card are dropped. Memory's existing simpler presentation wins — the point of the merge is *fewer surfaces*, not richer ones.

### Layout after the change

Current DOM:

```tsx
<DispatchLead />                 // full-width above
<div className="dispatch-row">   // 1.1fr 1fr 1fr grid
  <DispatchBrief />
  <DispatchPattern />            // deleted
  <DispatchEcho />               // deleted
</div>
```

After:

```tsx
<DispatchLead />                                   // unchanged, full-width
<DispatchBrief />                                  // promoted out of .dispatch-row
<PatternFooterLine />                              // new, italic line, conditional
```

`.dispatch-row` is deleted (along with its CSS grid rule at line 1941). Brief becomes a full-width block under Lead, same styling as before (it already fills its column at current widths — the container just gets wider). Pattern footer is a single `<p className="pattern-footer">` rendered below Brief when `pattern.confidence` meets the threshold; same horizontal margins as the Lead/Brief blocks.

Visually:

```
┌──────────────────────────────────────────────────────┐
│ This week, from Relish.                              │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [Lead card — full width]                         │ │
│ │ What Relish noticed this week · 14–20 Apr        │ │
│ │ headline · dek · evidence quotes · emergent line │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [Brief card — full width]                        │ │
│ │ What to bring up                                 │ │
│ │ topic blocks · +N more                           │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Your week runs hot on Sundays.                       │
└──────────────────────────────────────────────────────┘
```

### Scope of code change

Files touched:

- `src/app/workbook/page.tsx` — gate the dispatches section on `useWeeklyLead` loading/nullity, update header copy, swap Lead + Brief eyebrows, delete `DispatchPattern` + `DispatchEcho` components, add `PatternFooterLine` inline, update `FeatureMemoryView` to prefer echo over calendar, append zero-state line to `QuietBlock` (only when no Lead exists). Delete now-dead CSS for `.pattern-chart` / `.pattern-legend`.

No new files. No hook changes. No Firebase work. No tests to update (grep confirmed no test asserts these strings).

### Deploy

Vercel auto-deploys on push to `main`. No `firebase deploy` needed.

## Testing

- Unit: none required — no logic branches new enough to warrant tests, and no tests assert the old copy strings.
- Manual: confirm three states on `/workbook`:
  1. Brand-new family, zero Leads: section hidden, zero-state line visible in `QuietBlock`.
  2. Family with a Lead but weak/none Pattern: Lead + Brief render; no Pattern footer.
  3. Seasoned family with Lead + medium/strong Pattern: Lead + Brief + Pattern footer all render; Memory card prefers echo over calendar when available.

## Open questions

None at spec sign-off.

## Decisions captured during brainstorm

- **Q1 (approach):** earn the section (Option C), with Option-B-style renames inside. *Rationale: renaming wallpaper on an empty room doesn't help a new user; the section shouldn't exist until there's something to return.*
- **Q2 (gate):** "any Weekly Lead ever written" — not "Lead for this week." *Rationale: avoids a weird regression where the section disappears mid-week when last week's Lead "expires."*
- **Q3 (Echo):** merge into Memory-of-the-day in the feature row. *Rationale: two year-ago blocks on the same page is the real duplication; better presentation beats two presentations.*
- **Q4 (Pattern):** demote to a single italic footer line; silent when not earned. *Rationale: a third peer card is analytical trivia beside two prose beats, and a "still watching" placeholder just restates the empty-state problem we're killing.*
- **Q5 (header + copy):** Relish as load-bearing noun throughout. *"This week, from Relish."* / *"What Relish noticed this week"* / *"After a week of writing, Relish starts reading back to you."* *Rationale: the book metaphor stays in body copy, but the brand noun leads in eyebrow/header positions.*
