# Raison d'être

One honest line per element across the app. Why it exists, why here, why this wording. Flags (⚠) mark anything that can't justify itself and should be reworded or cut.

Scope: as of 2026-04-22, after the Tier-1 clarity pass. This is a living doc — update the relevant section when you touch a page.

---

## Global shell

### Top nav (`src/design/shell/TopNav.tsx`)

**Mission:** always-visible anchor so the user knows where they are and can jump between the destinations.

| Element | Why it's there |
|---|---|
| "Relish" wordmark (left) | Brand anchor + home link. Clicking returns to `/workbook`. |
| "The Workbook" link | One of three destinations. Today's home. |
| "The Family Manual" link | One of three destinations. People directory. |
| "The Archive" link | One of three destinations. Past entries. |
| User badge (right) | Shows who's signed in. Clicking opens settings/logout. Confirms identity. |
| Sign-in / Create account links (signed-out) | Give visitors the two doors into the app. |

✅ Therapy is now the fourth destination in the top nav (shipped 2026-04-22).

### Global Pen / FAB (`src/components/capture/CaptureSheet.tsx` + `PenHost`)

**Mission:** capture a thought in under 15 seconds from anywhere in the app.

| Element | Why it's there |
|---|---|
| Floating pen button (bottom-right) | Always in reach. The capture action is the app's single most important primitive and should never be hunted. |
| Textarea | Where you write. |
| Category picker (moment / reflection / question / etc.) | Lets the app organize entries later and compute counts. |
| Visibility chips (just me / [spouse] / family) | Scott's visibility refinement — one journal, audience varies per entry. First-class so private writing is easy. |
| Person mentions | Ties an entry to a person's page for context. |
| Media / voice | Fast non-text capture paths. |
| Save button | Commits the entry + shows "Saved for [name]" confirmation. |
| Post-save "Ask about this" chat | Optional follow-up conversation that enriches the entry; easy to dismiss. |

⚠ Four collapsible pickers above the textarea is a lot for a brand-new user. Consider collapsing advanced pickers by default for first-time users (per audit recommendation).

---

## Entry points

### Landing `/` (signed-out)

**Mission:** one breath — what Relish is, one way in.

Current elements:

| Element | Why it's there |
|---|---|
| Wordmark + "Operating manuals for the people you love" tagline | One-sentence product promise. |
| "Sign in" / "Create an account" | The only two actions that matter on this page. |

### `/register`

**Mission:** collect the essentials and create the family.

| Element | Why it's there |
|---|---|
| "Create an account" eyebrow | Confirms what's happening. |
| "Create your library" title | Softens a generic signup moment. The library is the family's shared space — this is what's being made. |
| Name / family name / email / password | Minimum to create a user and a family document at once. |
| Submit → `/welcome` | Warm hello moment, not straight into an empty app. |

### `/login`

**Mission:** get returning users home.

| Element | Why it's there |
|---|---|
| Email / password fields | Standard. |
| "Create an account →" footer link | For visitors who ended up here by mistake. |
| Success → `/workbook` | Home. No intermediate redirect. |

### `/welcome` (post-signup)

**Mission:** acknowledge the account, say the family name back, give one obvious next step.

| Element | Why it's there |
|---|---|
| "Welcome, [Name]." | Proves the form landed — the app heard you. |
| "The [FamilyName] library is open." | Speaks the family name back so it feels like theirs. |
| "Relish helps you see the people you love through a few different lenses…" | One sentence of product vision, at the only moment when the user is ready to hear it. |
| "Before anyone else, let's start with you." | Primes the self-questionnaire's "why". |
| **"Start with myself ⟶"** | Single primary action — no fork. |

---

## Daily home

### `/workbook`

**Mission:** answer *"what needs me today, across the people I care about?"*

| Element | Why it's there |
|---|---|
| Masthead: date · season · waiting-on-you count | At-a-glance "where are we right now." |
| Masthead sub-strip: family balance rollup | Scott's balance signal, one scale up from the person page. Names click into the page. |
| Hero greeting + "Since you were last here" line | Personal re-entry moment; surfaces whatever arrived while you were away. |
| "Write a line" button | Opens the Pen. The single most important workbook action. |
| Waiting-on-you threads | Reply surface. Hidden when nothing's waiting. |
| Feature row: memory · person · prompt | Three light re-engagements: something from the past, someone to think about, a question to answer. |
| Prompt card (rotating daily) | One-minute entry starter. Prefills the Pen with the prompt so the answer keeps its question. |
| Dispatches (Weekly Lead / Brief) | The app's "returning" voice — what it's noticed this week. Hidden until first Lead exists. |
| Week ahead | Rituals + practices. Keeps the cadence visible. |
| Colophon | Edition marker + sign-out. Subtle closure. |

⚠ The "song strip" / `SongStripPlaceholder` below the week grid is unbuilt. Either wire it or cut.
⚠ Dispatches section is gated on first Lead — brand-new users see no "see" surface. Defensible for now; revisit when Weekly Lead becomes scheduled instead of button-triggered.

---

## Family directory

### `/manual`

**Mission:** show everyone in the user's manual at a glance, route into each person.

**First-run (family of one):** simple cards — you + "Add someone". No stats, no constellation, no filters.

**Steady state:**

| Element | Why it's there |
|---|---|
| Masthead: people count · replies waiting · written this week · longest silence | Family-wide state in four numbers. |
| Hero spread (when someone's quiet longest) | Lead with the person most in need of attention — replaces a dashboard of numbers with a specific call. |
| Constellation | Visual "who you keep close." Click a node → their page. |
| Thematic groups | Household · Parents & siblings · Friends. Editorially meaningful subsets. |
| "Everyone" roster | Full index, filterable by waiting / quiet / recent. |
| "Add someone" card | Persistent entry point to `/people/new`. |

⚠ Constellation is beautiful but adds little over the cards for a first-time user with 2–3 people. Defensible as earned richness; flag if it costs implementation effort disproportionate to engagement.

### `/people/new`

**Mission:** add a person in one screen — name + relation + which path (write about them or invite them).

| Element | Why it's there |
|---|---|
| Name field | Minimum needed. |
| Relationship picker (6 options) | Shapes the questionnaire content + enables / disables invite. |
| Email field (conditional) | Only appears for relationships that can have accounts. |
| "I'll write about them" | Primary path when no email / kids / quick add. |
| "Invite them to write" | The collaborative-multi-perspective pitch, available at the moment of adding. |
| Invite confirmation state | Proves the email was sent; explains what happens when they sign up. |

### `/people/[personId]`

**Mission:** one scroll about one person. "What do I know about them right now?"

| Element | Why it's there |
|---|---|
| Breadcrumb + edit | Orientation + a way to amend basic facts. |
| Hero portrait + name + relation | Their identity in one glance. |
| **Balance line** (in balance / mostly / needs attention / new) | Tells you where things stand — the single most useful signal on the page. |
| Synthesis lead | The app's 1–3-sentence distillation. When present, this is the magic. |
| Stats row (entries / waiting / since last) | Three small anchors for context. |
| CTA row (Write about · Answer questions / Revise) | The two actions you'd take on this page. |
| "Still open about [name]" | Reply surface. Hidden when nothing's open. |
| Timeline aside | Entry history, short. |
| "What helps" (What works · Handle with care · Strengths) | The manual content distilled from contributions. Hidden when there's nothing. |
| **"Their own side"** card (invite / "hasn't added their view" / "has added their view") | Single visible home for the collaborative-multi-perspective pitch at the page that person anchors. |
| Recent entries list | Drill-in to specific moments. |
| Colophon | Close. |

⚠ Self page (viewing your own): "Write about myself" is hidden — good. The stats row labels ("Waiting" etc.) still read third-person-ish. Defensible but could warm.

### `/people/[id]/manual/self-onboard` + `/onboard` + `/kid-session`

**Mission:** gather one perspective through a conversational questionnaire.

Self: your own words about you.
Observer: your words about someone else.
Kid: child-friendly emoji/picture version for ages 6–17.

| Element | Why it's there |
|---|---|
| Section title + chapter label | Orientation — which section, which chapter. |
| Question at the top of each screen | One question at a time is the audit's strongest-designed surface. |
| Textarea (DM Sans 17px after readability fix) | Where you write. |
| Voice mic button | Fast non-typing input. |
| Progress bar | Tells you how far along you are. |
| Save indicator | Reassures that drafts persist. |
| Save-and-close button → acknowledgment screen | Explicit receipt of where the answers went and how to return. Links to `/workbook`. |
| Completion screen | Warm end state + **Add someone** CTA. |

---

## Single entry

### `/journal/[entryId]`

**Mission:** read one entry in full context; reply if it's about you; see what the app has noticed in it.

| Element | Why it's there |
|---|---|
| Back link ("← The Journal") | ⚠ Links to `/journal` which redirects to `/workbook`. The label "The Journal" implies a destination that doesn't exist. Rename to "← Back" and link to `/workbook` or referrer. |
| MentionSettleBar (if entry is about you) | Offers the "reply or let it settle" closure — the audit's best-designed moment. |
| Momentbanner (if part of a shared moment) | Shows the wider context. |
| "Carried forward" banner (if a reflection exists) | Closes the loop; link into the reflection entry. |
| Category pill + person mentions | Metadata; editable in place for your own entries. |
| Visibility indicator | Private / shared-with / everyone. Lock glyph for private. |
| Entry body | The actual writing. |
| Companion composer (if about you, not author) | Invitation to reply below the parent entry. |
| Return panel (after you reply) | The book-voice closure — "carry forward" or "let it settle." |
| "Ask about this" chat | Optional deeper conversation with Claude. |
| ⚠ Chat-distilled insights | *Already computed in the background, written to `entry.chatInsights`, never shown.* Highest-leverage fix in the journal clarity pass. |

### ⚠ `/journal` (the list route)

**Current mission:** nothing. 8-line client-side redirect to `/workbook`. The `SpreadHome` component designed for this route is orphaned dead code.

**Decision pending:** keep as redirect (accept that journal-as-concept lives across workbook/manual/archive) or resurrect as a dedicated reading-mode view. Until decided, clean up:
- Update "← The Journal" back-links on entry detail to "← Back" or "← Workbook".
- Delete `src/components/spread-home/SpreadHome.tsx` if confirmed unused.

---

## History

### `/archive`

**Mission:** *read back through it.* Chronological reading of all your entries.

| Element | Why it's there |
|---|---|
| Masthead: entries · this month · this year · first line | The archive at a glance. |
| Hero "Read back through it." | Sets the reading posture. |
| Search | Non-chronological entry — find a specific moment. |
| Year / month groupings | How you naturally navigate old writing. |
| Privacy gate | Respects the user's "just me" visibility. |

⚠ Audit verdict: REBUILD — the `Volumes.tsx` bookshelf component exists but isn't wired up. Entry cards lack moment indicators, stats. First-pass only. Revisit after Tier 2.

---

## Therapy (shipped — simpler brief model)

### `/therapy`

**Mission:** produce a brief for your therapist from the last N days of Relish material. One-shot, read-only compile.

| Element | Why it's there |
|---|---|
| PIN gate | Therapy content is sensitive; reuse existing privacy primitive. |
| "Prepare a brief" button | Primary action. Single purpose. |
| Past briefs list | Lets you reference prior session prep. |
| Brief detail: themed clusters with verbatim quotes | The output the user takes to session. |
| Post-session notes field | Short carryover that becomes context for next brief. |
| Print stylesheet | Physical output for the room. |

Not built: Therapist entity, window/session state machine, auto-regeneration, carry-forward automation. Full model preserved on `origin/therapy-prep` for reference.

---

## Couple ritual session (shipped 2026-04-23)

### `/rituals/couple/session`

**Mission:** a guided sit-down for the two partners to review the week together and plan the next one, grounded in what they've actually written.

| Element | Why it's there |
|---|---|
| AI-generated 5-section script | Week in review → went well → was hard → small joys → plan ahead. Sections open with real pulls from the couple's shared journal entries so the conversation lands in specifics. |
| Shared note per section | Captures a single sentence or two per section; saves on blur. Private to the couple. |
| 1–3 intentions on the final section | What you're carrying into the next week. Becomes the "past session" summary on `/rituals`. |
| Dark cinematic stage | Signals this is a dedicated focus mode, not a feed surface. |
| Past sessions list on `/rituals` | Lets the couple reference prior intentions before the next session. |

Powered by `generateRitualScript` Cloud Function; rules on `ritual_sessions` allow only the two participants to read/update.

---

## Growth Hub (shipped 2026-04-23)

### `/growth`

**Mission:** a front door for any active growth arcs. Before this shipped, arcs could only be reached via deep-link.

| Element | Why it's there |
|---|---|
| Active arcs grouped by domain | Connection / Communication / Values & meaning / etc. Makes it scannable even with multiple arcs in flight. |
| Phase chip + progress bar per arc | Awareness / Practice / Integration + % complete. Gives a glance-read of where each arc is. |
| "Next" link per arc | Deep-links into the existing `/growth/[itemId]` detail. No lost functionality. |
| Empty state | Explains arcs and points back to the Workbook when none exist. |
| Nav entry in user-menu dropdown | Alongside Rituals. Top nav stays at the four core rooms. |

---

## Other surfaces (to expand as we touch them)

- `/rituals` — ritual setup / manage / active / past. Couple ritual session is fully built.
- `/settings` — user profile, framework context, sign-out.
- `/moments/[momentId]` — shared moment view.
- `/practices/[practiceId]` — single-practice detail.

---

## Overall flags to revisit

1. ⚠ "← The Journal" back-links everywhere should become "← Back" or "← Workbook" since `/journal` is a redirect.
2. ⚠ `SpreadHome` is dead code — delete when convenient.
3. ⚠ Workbook dispatches section is hidden on first-run — acceptable but revisit when Weekly Lead auto-generates.
4. ⚠ Archive needs a rebuild to match the other surfaces' quality.
5. ⚠ Pen sheet picker density — four collapsible pickers is a lot; default to collapsed for first-time users.
6. ⚠ Styled-jsx global bundles are silently dropping rules on Next 16 + Turbopack. `/manual` and `/people/[id]` both carry plain-`<style>` safety nets. If another page renders unstyled, apply the same pattern. Worth a framework-level fix when we have bandwidth.
7. ⚠ Weekly Lead auto-scheduling is still a manual "Generate Lead" button behind a gate.
