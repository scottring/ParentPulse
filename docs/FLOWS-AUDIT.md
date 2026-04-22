# User Flows Audit

**Date:** 2026-04-21
**Scope:** Map all 16 canonical user journeys through Relish, score each against the actual implementation, and propose tweak / rebuild / build-new / park verdicts with an execution order.

---

## Why this audit

Relish has shipped a lot of individual features. The question this audit set out to answer: do those features add up to coherent journeys that a user can follow? Specifically — is it clear how to start, why to start, how to respond, how to acknowledge, when AI is invoked, and when AI is invoking itself?

The audit produced one load-bearing insight:

> **Relish does *receiving* well and *returning* badly.**

Every high-scoring story is about the app receiving input and echoing warmly. Every low-scoring story is about the app *returning* something to the user — and the return is either a manual "Generate" button, an empty room, or an invisible background process. The magic Relish has staked itself on (the synthesis of perspectives) *is* the returning half. That half is under-built.

Two sub-patterns repeat:

- **Onboarding and exploration have pages but no connective tissue between them.** Individual screens are well-made; the journey between them is missing.
- **Deep arcs have primitives but no rooms.** The server-side is built (growth arcs, couple ritual banners, privacy gating). The destinations the user would actually visit are unfinished or empty.

---

## Scoring framework

Each story is scored on five dimensions, 0–5 each (total /25):

| Dimension          | What it measures                                                               |
| ------------------ | ------------------------------------------------------------------------------ |
| **Entry**          | Is it obvious how to start? Visible CTA, not buried.                           |
| **Motivation**     | Does the user know *why* they're here? Framing/copy answers "what will I get?" |
| **Progress**       | Can they tell where they are mid-flow? (steps, %, breadcrumbs, save state)     |
| **Acknowledgment** | Is it clear something happened? (confirmation, echo, receipt)                  |
| **Next step**      | Is the follow-up action obvious? (or does the user hit a void?)                |

**Verdicts:** TWEAK, REBUILD, BUILD NEW, PARK.

---

## Canonical user stories (16)

**Onboarding arc** — new user meets Relish
1. First-time signup (new family lead)
2. First self-manual (answering own perspective)
3. First person added (kid or spouse)
4. Invited spouse accepts & arrives
5. Kid perspective session (parent-led emoji)

**Daily rhythm arc** — what users do on a typical day
6. Capturing a thought in the moment (global Pen)
7. Answering a surfaced prompt (workbook card)
8. Engaging with a ritual (banner → session)
9. Responding to being mentioned ("let it settle" or reply)
10. Reading what the app "returned" (Weekly Lead / Brief)

**Exploration arc** — looking around
11. Reading someone's manual (synthesis / perspectives / gaps)
12. Chatting with an entry ("Ask about this")
13. Archiving / looking back (volumes, year summary)

**Deep arcs** — the big emotional destinations
14. Growth (intention, practices, trajectory)
15. Therapy book (PIN-gated therapy prep)
16. Couple ritual (paired session)

---

## Onboarding arc

### 1. First-time signup

**Ideal:** Stranger lands on Relish. Landing says what it is in one breath. They click **Start your manual**. Short form: name, family name, email, password. Submit and land on a warm welcome that sets expectation — *"We're going to help you see your people through a few different lenses. Let's start with you."* — then drops them into their own self-manual. They know their account is created because the page speaks their family name back to them.

**Reality:** Register page uses "volume" jargon (now fixed in this pass). Success redirects to `/welcome` → 1.2s loader → redirects to `/journal` → redirects to `/workbook`. Triple redirect. Welcome is decorative, not informative. No mention of the "manual" they just began. User lands in an empty workbook with no guidance.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 4     | 2          | 4        | 2   | 1         | **13/25** |

**Verdict:** TWEAK — jargon fixed; welcome-as-real-welcome still needed.

### 2. First self-manual

**Ideal:** Warm page: *"Before you write about anyone else, let's write about you. 12 questions. You can stop anytime — we save as you go."* Progress bar, voice, optional document upload. Close the tab; return resumes exactly where left off. On completion, Claude synthesizes and user sees a one-sentence "what we heard." Clear CTA: *"Add someone else's view of you"* or *"Write about someone in your life."*

**Reality:** The questionnaire itself is the strongest flow in the app — progress bar, draft auto-save/resume, doc upload with AI extraction + conflict resolution, voice input. BUT the first-time user has no discoverable path into it. There is no prompt from `/workbook` to start the self-manual. Only way in: navigate to People/Manual → create a manual → pick relationship → start. AssessmentShell used "Save and close the volume" (now fixed).

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 1     | 3          | 5        | 4   | 2         | **15/25** |

**Verdict:** TWEAK shell · REBUILD discovery path.

### 3. First person added

**Ideal:** User taps **+ Add someone**. They name them, choose a relationship, and immediately see the two divergent paths: *"I'll write about them"* or *"Invite them to write too."* The collaborative-multi-perspective pitch is made *at the moment of adding*, not hidden three screens deep.

**Reality:** `/people/[id]/create-manual` has a clean relationship picker. But the *creation of the Person itself* happens elsewhere — the person must already exist before `/create-manual` renders. `/people` route redirects to `/manual`. Kid/spouse divergence is partially handled but decoupled. Collaborative-multi-perspective pitch is not made at the moment of adding.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 2     | 2          | 3        | 3   | 3         | **13/25** |

**Verdict:** REBUILD as unified flow. Pieces exist; journey doesn't.

### 4. Invited spouse accepts & arrives

**Ideal:** Spouse gets email: *"Scott invited you to the Kaufman family manual."* Preview copy explains in two sentences. They accept, land on pre-filled register, sign up, and immediately land on a welcome tailored to *joining* — they see Scott's name, what's been written about them, and are invited: *"Add your own view. Scott would love to see it."*

**Reality:** Email template is good (Resend, editorial voice). No token — matched by email on registration (fragile if recipient uses different email). Arrival: same register page + same triple-redirect to empty workbook. No distinction between "creating a family" and "joining one." Invitee has no context, no echo of invite, no obvious next step.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 4     | 2          | 3        | 1   | 1         | **11/25** |

**Verdict:** REBUILD arrival. Email fine; landing broken.

### 5. Kid perspective session

**Ideal:** Parent opens child's manual, taps **Ask [Kaleb] about himself**. Device gets handed over. Child sees warm page, big start button, emoji/picture questions. Progress dots. Celebratory "All done!" Parent takes the device back to a gentle: *"Kaleb answered 12 questions. Ready to see what he said?"*

**Reality:** Well-built — child-friendly questionnaire, emoji/picture display, age-gated (6–17), parent-supervised, draft auto-save/resume. Celebratory end state. **Gap:** transition back to parent is not designed. No handoff moment. Entry from manual page is a button among other buttons, not elevated as "the magic moment."

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 3     | 4          | 4        | 4   | 2         | **17/25** |

**Verdict:** TWEAK. Add handoff ritual at both ends.

### Arc subtotal

| \\# | Story                 | /25 | Verdict                   |
| --- | --------------------- | --- | ------------------------- |
| 1   | First-time signup     | 13  | TWEAK (partly done)       |
| 2   | First self-manual     | 15  | TWEAK + REBUILD discovery |
| 3   | First person added    | 13  | REBUILD                   |
| 4   | Spouse accepts invite | 11  | REBUILD arrival           |
| 5   | Kid session           | 17  | TWEAK                     |

**Arc pattern:** Individual screens are carefully built. The connective tissue between them is missing. Every "next step" score is ≤3.

---

## Daily rhythm arc

### 6. Capturing a thought in the moment

**Ideal:** Moment happens. User thinks "oh, I should note this." Pen is always in reach. One tap. They type, save, get a clear receipt ("Saved for Iris."), and are left with a soft optional *"Want to ask Claude about this?"* If dismissed, they're back where they were. 15 seconds total.

**Reality:** Global Pen rendered from root layout, responds to `relish:pen:open` events. Clean state machine: `closed → composing → saved → chatting`. Rich affordances (category, tagging, visibility preset, media, voice, edit/append, child-proxy). Save confirmation names who received it. Post-save "Ask about this" chat is optional, no pressure. **Weakness:** sheet has four collapsible pickers above the textarea — new users see a lot of chrome.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 5     | 3          | 4        | 5   | 4         | **21/25** |

**Verdict:** TWEAK (reduce picker density). Strongest daily flow.

### 7. Answering a surfaced prompt

**Ideal:** User opens workbook, sees a card: *"For Iris — something you've been meaning to say."* They tap; Pen opens pre-filled with context. They respond. After save, card acknowledges it was answered — dismisses or transforms. Prompt doesn't return unless something changes.

**Reality:** Workbook surfaces prompts, but "Answer in the book" opens the Pen **empty**, not prefilled with prompt context. Acknowledgment state exists (per Apr 18 commit). Dinner prompt tile is read-only — no way to respond inline. No decay; prompts persist indefinitely.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 3     | 2          | 2        | 3   | 2         | **12/25** |

**Verdict:** REBUILD prompt↔capture bridge.

### 8. Engaging with a ritual

**Ideal:** Soft fixed banner: *"Your check-in with Iris is tonight at 8 PM."* At 8, banner shifts to accent: *"Starting now — tap to begin together."* One tap lands both partners in a shared session with prepared recap, turn-taking, closing reflection. Session saves, banner clears, both get a "we kept this" moment.

**Reality:** Ritual banner is fixed-top, 48px, elegant pre-window/in-window states, per-(ritual, state, date) dismissal. localStorage-only — won't sync cross-device. **Session destination is a placeholder page** — the copy explicitly says *"The shared Surface is coming. For now this is simply the signal to start."* Highest-stakes dead-end in the app.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 4     | 3          | 2        | 2   | 1         | **12/25** |

**Verdict:** BUILD NEW (couple session). See story 16 — same dead-end.

### 9. Responding to being mentioned

**Ideal:** Iris sees Scott wrote about her Tuesday. She opens the entry. Below his words is her own invitation: *"How did this feel from where you were?"* She can answer or quietly close it (a "let it settle" button — no guilt, no nag).

**Reality:** CompanionComposer renders below parent entry for mentioned subjects. Thoughtful visibility resolution (match-parent minus self plus parent author). After posting → **ReturnPanel** with book-voice paragraph + two closes: "carry forward" or "let it settle." "Let it settle" is graceful — single best-designed moment in the app. **Gap:** discovery — no prominent "3 new things written about you" dispatch on the workbook.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 3     | 5          | 4        | 5   | 4         | **21/25** |

**Verdict:** TWEAK discovery. The response flow itself is a model.

### 10. Reading what the app "returned"

**Ideal:** Sunday evening. Workbook masthead: *"This week, Relish noticed three things."* One paragraph, three bullets, a verbatim quote. Below: *"Read more →"* for depth. At bottom: *"Carry one into next week"* converts a noticing into a practice or conversation. Lead arrives on cadence, not on demand.

**Reality:** `useWeeklyLead` + `useWeeklyBrief` hooks exist. Workbook has gated "What Relish is returning to you" section — shows only if family has ever generated a Lead. **Generation is manual** — user must click "Generate Lead" button. Output is read-only. No acknowledgment, no "carry one forward," no reaction surface. Very little motivational framing around *why* to generate.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 2     | 2          | 3        | 1   | 1         | **9/25**  |

**Verdict:** REBUILD. This is the flagship payoff and it's currently a button hidden in a gated section.

### Arc subtotal

| \\# | Story                 | /25 | Verdict                       |
| --- | --------------------- | --- | ----------------------------- |
| 6   | Capture (Pen)         | 21  | TWEAK — reduce picker density |
| 7   | Surfaced prompt       | 12  | REBUILD prompt↔capture bridge |
| 8   | Ritual engagement     | 12  | BUILD NEW couple session      |
| 9   | Responding to mention | 21  | TWEAK discovery               |
| 10  | Weekly Lead / Brief   | 9   | REBUILD                       |

**Arc pattern:** What works (6, 9) is post-action echoes. "Saved for Iris." / ReturnPanel. When the app *responds* to a user action with specific, warm, book-voice copy, it works. What fails (7, 8, 10): promises without payoffs. Workbook promises "things returning to you" / banner promises "check-in tonight" / prompts promise surfaced attention — but the payoff is manual-trigger, empty room, or context-stripped.

---

## Exploration arc

### 11. Reading someone's manual

**Ideal:** User opens Iris's manual. Page immediately says: *"Two perspectives — yours and Iris's. Last updated 3 days ago."* Synthesized view is default. Tabs: Synthesized / By Perspective / Gaps & Insights. Each section has inline next actions. When Iris updates her contribution, Scott sees a small notice.

**Reality:** Rich page — masthead, relationship label, synthesized content, top strategies (sorted), top triggers (by severity), strengths, emerging patterns, perspective count, three-mode view, ManualChat. **Weaknesses:** uses "volume" jargon in loading/empty states. No freshness indicator. No "Iris updated her view" delta. No inline "add a strategy" / "add a trigger" — editing happens via questionnaire re-entry.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 4     | 3          | 3        | 2   | 2         | **14/25** |

**Verdict:** TWEAK (jargon, freshness, inline CTAs).

### 12. Chatting with an entry

**Ideal:** User re-reads an old entry, taps sparkles. Chat panel slides in. Claude opens with context: *"You wrote this three weeks ago. What are you noticing now?"* Every few turns, the panel surfaces a "noticed" chip. User can commit any turn as a practice, or close.

**Reality:** `useEntryChat` hook, `entry_chat_turns` collection, multi-turn, persistent. Two entry surfaces (inline + AskAboutEntrySheet overlay) — mild discoverability noise. **Backend:** `distillChatToInsights` fires every 2 turns (Haiku 4.5) and writes to `entry.chatInsights` — **completely invisible to user**. `commitChatTurnAsPractice` exists but hidden. No context-setting opener from Claude. No "noticed" chip.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 3     | 2          | 3        | 2   | 2         | **12/25** |

**Verdict:** TWEAK + surface the invisible. Highest-leverage single fix: render chip-sized insights back into the chat panel.

### 13. Archiving / looking back

**Ideal:** User taps Archive. Sees bound volumes on a shelf. Tap a year: masthead (*"2026 — 182 entries · 3 people written about most"*), months down the page. Entry cards show title, date, people mentioned, moment indicator. Tapping an entry opens it in original context. Archive feels like a lived-in record, not a database list.

**Reality:** `/archive` page exists — masthead + year selector + monthly groupings + search + stats + privacy gate. Code comment explicitly flags *"needing more design iteration; this is a first pass."* The **`Volumes.tsx` bookshelf design exists but isn't wired into the live `/archive` route.** No stat lines, no moment visuals on cards, no re-entry affordances.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 3     | 2          | 3        | 2   | 2         | **12/25** |

**Verdict:** REBUILD (wire bookshelf, add stats, add re-entry affordances).

### Arc subtotal

| \\# | Story                    | /25 | Verdict |
| --- | ------------------------ | --- | ------- |
| 11  | Reading someone's manual | 14  | TWEAK   |
| 12  | Chatting with an entry   | 12  | TWEAK   |
| 13  | Archive / looking back   | 12  | REBUILD |

**Arc pattern:** Lacks return loops. Reading manual → no back-to-doing. Chatting → distilled insights go nowhere visible. Reading archive → no handles to grab. The app is good at "go somewhere and look." It's bad at "looking turns into acting."

---

## Deep arcs

### 14. Growth

**Ideal:** User notices a pattern, clicks *"Grow into this."* Short setup: name the arc, pick dimensions, set cadence. System generates starter arc with stages, practices, prompts. Over weeks, practices appear contextually in the workbook. Each practice logged marks a visible trajectory. Over months: *"We started here, and here's where we are now."*

**Reality:** `/growth` has **no index page** — only `/growth/[itemId]` deep-links. Per-item flow is elaborate (provenance → brief → doing → reflect → complete, multiple performance modes). Server-side exists: `growth_arcs` collection, `generateGrowthArc` (Opus 4), `seedDimensionAssessments`, `processGrowthFeedback`, auto-spawned activities in workbook. **User has no browseable way to initiate, list, or see trajectories of growth arcs.** Growth page uses "volume" jargon.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 1     | 2          | 4        | 3   | 2         | **12/25** |

**Verdict:** BUILD NEW hub · TWEAK item. Backend exists; front-end hub doesn't.

### 15. Therapy book

**Ideal:** User has therapy Thursday. They open the Therapy book (third spine, locked). PIN unlocks. Page opens to themed clusters — 3–5 topics pulled from journal/manual with verbatim quotes and framing questions. User reads, annotates, pastes in last session's transcript. Exports a one-page "what I want to bring." After session, pastes notes; they carry forward to next week.

**Reality:** **The Therapy book does not exist in code.** No `/therapy` route. Approved Apr 16 per memory but never built. Privacy infrastructure (`usePrivacyGate`, `PinSetupModal`) exists. Weekly Brief system partially overlaps but isn't therapy-specific.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 0     | 0          | 0        | 0   | 0         | **0/25**  |

**Verdict:** PARK. Unbuilt. The user has stronger unmet needs in already-scored stories.

### 16. Couple ritual — paired session

**Ideal:** Tuesday 8 PM. Both partners see banner flip. Both tap "Start together." Session opens: *"This week you both wrote about X. Read each other's view, then take 60 seconds each."* Guided prompts, turn-taking, optional shared "we both noticed…" moment. Saves as joint ritual entry. Ends with one shared carry-forward.

**Reality:** Scaffolding is excellent: `/rituals` index, `/rituals/couple/setup`, `/rituals/couple/manage`, ICS calendar invites, banner. **`/rituals/couple/session` is a cinematic placeholder** — dark-amber page with *"Begin together. Sit down. Put your phones face-down…"* and *"The shared Surface is coming. For now this is simply the signal to start."* No session UI, no prompts, no turn-taking, no save. Solo ritual (`/rituals/[ritualId]/run`) is fully built — but that's a different flow.

| Entry | Motivation | Progress | Ack | Next step | **Total** |
| ----- | ---------- | -------- | --- | --------- | --------- |
| 5     | 4          | 0        | 0   | 0         | **9/25**  |

**Verdict:** BUILD NEW the session room. Highest-stakes gap-between-promise-and-payoff in the app.

### Arc subtotal

| \\# | Story         | /25 | Verdict                    |
| --- | ------------- | --- | -------------------------- |
| 14  | Growth        | 12  | BUILD NEW hub · TWEAK item |
| 15  | Therapy book  | 0   | PARK                       |
| 16  | Couple ritual | 9   | BUILD NEW                  |

**Arc pattern:** Primitives built, rooms empty. Growth: data model + synthesis + auto-spawn + per-item flow — all working; no hub. Couple ritual: banner + calendar + setup + manage — all working; no session. Therapy: privacy primitives exist; book UI doesn't. These features were scaffolded eagerly and paused mid-build.

---

## Full scorecard

| \\# | Story                    | /25    | Verdict                    |
| --- | ------------------------ | ------ | -------------------------- |
| 1   | First-time signup        | 13     | TWEAK (partly done)        |
| 2   | First self-manual        | 15     | TWEAK + REBUILD discovery  |
| 3   | First person added       | 13     | REBUILD                    |
| 4   | Spouse accepts invite    | 11     | REBUILD                    |
| 5   | Kid session              | 17     | TWEAK                      |
| 6   | Capture (Pen)            | **21** | TWEAK                      |
| 7   | Surfaced prompt          | 12     | REBUILD                    |
| 8   | Ritual engagement        | 12     | BUILD NEW (= 16)           |
| 9   | Responding to mention    | **21** | TWEAK                      |
| 10  | Weekly Lead / Brief      | 9      | REBUILD                    |
| 11  | Reading someone's manual | 14     | TWEAK                      |
| 12  | Chatting with an entry   | 12     | TWEAK                      |
| 13  | Archive                  | 12     | REBUILD                    |
| 14  | Growth                   | 12     | BUILD NEW hub · TWEAK item |
| 15  | Therapy book             | 0      | PARK                       |
| 16  | Couple ritual session    | 9      | BUILD NEW                  |

**Average:** 12.7 / 25
**Best:** 6 Capture (21), 9 Responding to mention (21)
**Worst:** 15 Therapy (0), 10 Weekly Lead (9), 16 Couple session (9)

---

## Proposed execution order

### Tier 1 — Unblocks everyone, low-to-medium cost (do next)

**1A. Finish post-signup routing (stories 1, 2, 4)**
The welcome page is still a thin 1.2s loader (first fix applied this session removed the double redirect but the page itself is empty). Build a real *"Welcome, [Name]. Let's start with you."* moment that:
- Routes new family-leads into self-onboard
- Routes invited spouses into their own self-onboard with context about who invited them
- Speaks the family name back to confirm account creation landed
Highest-leverage single fix. Connective tissue we started on.

**1B. Unify "add a person" (story 3)**
One flow that handles: create person record → pick relationship → either start observer questionnaire OR send spouse invite. Ends the 3-page diaspora.

**1C. Prompt-to-capture bridge (story 7)**
Workbook prompt cards open the Pen with provenance (prompt title, context, suggested prefill). The Pen already supports prefill via `relish:open-capture` event — wire the workbook prompts to use it.

**Estimated scope:** \~1 week of focused work across 1A/1B/1C.

### Tier 2 — Medium cost, high impact on "returning" half

**2A. Scheduled Weekly Lead + action surface (story 10)**
Auto-generate on Sunday evening. Make it the opening of the workbook that day, not a gated section. Add one action: *"Carry one forward"* that creates a workbook prompt for the week.

**2B. Surface invisible AI (story 12 + cross-cutting)**
- Render chat-distilled insights as chips in the entry chat
- Add "last synthesized" timestamps on manual pages
- Show "Claude noticed" affordances on entries that had enrichment
The pipes are already moving; just un-hide the output.

**2C. Mention discovery (story 9)**
Make "people wrote about you" a prominent workbook dispatch, not a buried line in the "since last visit" summary. Story 9's response UX is already the best in the app — this just pushes it upstream.

**Estimated scope:** \~1–2 weeks.

### Tier 3 — Bigger builds (do when Tier 1/2 is shipped)

**3A. Couple session (stories 8 + 16)**
Build the actual session UI. Turn-taking, shared state, guided prompts based on the week's entries, joint save. Highest-stakes build — it's the promise the banner has been making all along.

**3B. Growth hub (story 14)**
`/growth` index page: list arcs, visualize trajectory, initiate new arc. Per-item flow stays as is.

**3C. Archive rebuild (story 13)**
Wire the `Volumes.tsx` bookshelf component into the live archive. Add stats. Add re-entry affordances.

**Estimated scope:** \~3–6 weeks depending on couple-session depth.

### Tier 4 — Park

**4A. Therapy book (story 15)**
Don't build yet. Revisit after Tier 1–3. Primitives will be further along and the design will be clearer.

### Cross-cutting cleanup (bundle into whichever tier is touching that surface)

- **Volume jargon pass** in `manual/ClientPage.tsx` loading/empty states, `growth/[itemId]` refs, `manual/people/[id]/page.tsx`. Not urgent — cheap to fix when editing those pages.
- **"Create your library"** copy on register — decide keep or change when doing 1A.
- **Capture sheet picker density** (story 6) — collapse advanced pickers by default.
- **Kid session parent handoff** (story 5) — add one screen at the end.
- **Growth page volume copy** — rewrite when doing 3B.

---

## Fixes applied during this audit

Bundled into commits during the audit pass:

- `app/page.tsx` — "Begin a volume" → "Create an account" (landing CTA)
- `app/register/page.tsx` — "Begin a volume" / "Bind the volume" / "Binding the volume…" / "Already have a volume?" → account-neutral language
- `app/login/page.tsx` — "Begin a volume" → "Create an account"
- `design/shell/TopNav.tsx` — same
- `components/shared/AssessmentShell.tsx` — "Save and close the volume" → "Save and close"
- `app/welcome/page.tsx` — redirect to `/workbook` directly (was `/journal` → `/workbook`, a stale double redirect)

**Intentionally preserved:** "Volume" as yearly-book metaphor (`design/manual/Volumes.tsx`, `archive/YearSummary.tsx`, CSS `.press-volume`). This is the load-bearing bookshelf design language, not account jargon.

**Still flagged:** `growth/[itemId]/ClientPage.tsx` and `manual/people/[id]/page.tsx` use "volume" ambiguously (closer to "manual" than "year-book"). Worth a second pass when rebuilding those surfaces.

---

## Recommendation

**Do Tier 1 next as a single cohesive sprint.** It's the cheapest work that raises the largest number of scores, fixes the "connective tissue" pattern that shows up in 6 of 16 stories, and sets a template for what good connective tissue looks like — which makes Tier 2 and 3 easier to design.

Tier 2 becomes a natural follow-on since many of its fixes share surfaces with Tier 1 (workbook, Pen, manual).

Tier 3 is big enough to plan independently once foundations feel right.

Tier 4 gets revisited when we get there.
