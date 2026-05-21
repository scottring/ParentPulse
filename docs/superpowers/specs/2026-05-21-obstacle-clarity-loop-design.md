# The Obstacle / Clarity / Ascend Loop — Design Spec

**Date:** 2026-05-21
**Author:** Scott Kaufman + Claude
**Status:** Design approved; ready for phased implementation plans.

---

## 1. Summary

This spec defines the **central nervous system** of Relish: a four-phase loop that turns
fuzzy relational friction into clear, concrete moves, marks the arrival when an obstacle
is cleared, and writes that arrival back into the manual of the person involved — so the
manual becomes a living chronicle of how the relationship has developed.

The loop runs across all relationship types (spouse, kids, parents, siblings, friends,
work) with one structural model, an adult UI in v1, and a structurally different kid UI
deferred to v2. Every existing platform surface (Journal, Mirror, Couple Ritual,
Experiments, Therapy, Manuals) feeds into or out of this loop. The loop is the spine; the
existing rooms are pipes.

---

## 2. Background & motivation

Two things prompted this spec:

1. **A coach-conversation transcript** Scott shared (a guided dialogue that surfaced an
   unspoken question between Scott and Iris and ended in a single specific sentence to
   ask her). Scott named this as the answer he'd been looking for to the question "what is
   Relish ultimately for?"
2. **Scott's articulation of the meta-loop:** identify a blocker to connection → unblock
   it → ascend (the relationship reaches a new level) → repeat. The magic is "feeling
   like you're reaching a destination" even though the path is endless. Milestones, not
   scores.

The platform has shipped pieces of this loop already — the couple ritual produces a
Weekly Focus (a prescription), the Mirror produces a synthesis line (clarity work), the
manual contains multi-perspective synthesis. But the pieces aren't wired together. There's
no central place that says "you have N open obstacles, here's where you stand on each,
here's what you've cleared." There's no felt destination beat. There's no live chronicle.

This spec wires it all together.

---

## 3. The meta-loop

Four phases per Obstacle:

1. **Identified.** Something between you and someone you love isn't fully working. The
   obstacle is named (by you, or by AI noticing a pattern across journal/mirror data).
   Status: `fresh`.
2. **Clarity.** A guided dialogue (the **Clarity Session**) works the obstacle into
   something nameable and actionable. Status: `clarifying`.
3. **Unblock.** A **Prescription** is proposed and confirmed — a specific move that, when
   performed, removes the obstacle. The user executes it. Status: `prescribed` →
   `executed`.
4. **Ascend.** The user reflects on what happened. If the obstacle is cleared, the
   **Ascend beat** fires: a brief ceremony, an AI-drafted milestone sentence in the
   user's own (edited) words, and a new entry written to the per-person **Chronicle** on
   that person's manual. Status: `cleared`. A new obstacle becomes visible — because
   clarity creates capacity to see what was previously invisible.

**The felt experience:** *I'm working on a real obstacle → I see it clearly → I do the
hard thing → we're somewhere new together → marked.*

---

## 4. Vocabulary & key concepts

| Term | Meaning |
|---|---|
| **Obstacle** | The persistent unit. A friction, an unspoken thing, a pattern that's costing connection. Topic-scoped, tagged to one or more people. |
| **Move** | An append-only log entry on an Obstacle (clarity session, prescription, execution note, reflection, milestone, revisit). |
| **Prescription** | The specific next move to unblock the obstacle. Shapes: `atomic` / `sequence` / `experiment` / `illustrated-story` (kid form). |
| **Ascend beat** | The user-confirmed moment that an obstacle is cleared. Writes a milestone. |
| **Milestone** | The user-confirmed sentence describing what changed. Lives forever in the Chronicle. |
| **Chronicle** | The per-person accumulated list of cleared-obstacle milestones, on their manual page. The "where we've gone together" view. |
| **Clarity Session** | The full-screen chat surface where dialogue produces clarity and then a prescription. |
| **Dashboard** | The rescoped `/unspoken` view: top-of-mind hero + open obstacles by person + held journal entries + recently cleared chronicle. |

---

## 5. Architecture & IA

**Approach A** — promote `/unspoken` into the dashboard for the entire loop. No new
top-level rail item (honors journal-first vision). Existing rail unchanged:

> Journal (`/`) · People · Therapy 🔒 · Rituals · Experiments · Unspoken — Archive

**New routes added:**
- `/clarity/[obstacleId]` — the Clarity Session chat surface (full-screen, intimate)
- `/unspoken` — rescoped (held entries continue to live here as a section)

**Existing rooms (no IA changes):**
- Journal, People, Therapy, Rituals, Experiments, Archive — see Section 10 for how each
  feeds in/out of the loop.

---

## 6. Data model

### `obstacles/{obstacleId}`

| Field | Type | Notes |
|---|---|---|
| `id` | string | doc id |
| `title` | string | user-editable, AI-suggested |
| `summary` | string | one-line, AI-maintained |
| `authorId` | string | the user working the obstacle |
| `subjectPersonIds` | string[] | who this is between you and (1+; empty for non-person clarity work) |
| `status` | enum | `fresh` \| `clarifying` \| `prescribed` \| `executed` \| `cleared` \| `paused` (user-set; explicit "rest this for now"; resumes to its prior status) |
| `visibility` | object | `{ mode: 'private' \| 'shared-with' \| 'family', sharedWith: string[] }` |
| `visibleToUserIds` | string[] | denormalized — required for Firestore rule + query |
| `sensitive` | bool | orthogonal to visibility; controls kid-mode visibility |
| `allowSpecificsInOutput` | bool | per-Section 7; default false |
| `bringToTherapy` | bool | default false; per-Section 10 |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |
| `clearedAt` | Timestamp? | set on ascend |
| `origin` | enum | `journal-entry` \| `clarity-session` \| `ritual-focus` \| `mirror` \| `manual` \| `direct` |
| `originRefId` | string? | id of the source artifact |

### `obstacles/{obstacleId}/moves/{moveId}` (append-only)

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `clarity-session` \| `prescription` \| `execution-note` \| `reflection` \| `milestone` \| `revisit` \| `manual-writeback` |
| `at` | Timestamp | |
| `byUserId` | string | |
| `payload` | object | shape varies by `type` |

### Prescription payload (inside a `prescription` Move)

```ts
{
  shape: 'atomic' | 'sequence' | 'experiment' | 'illustrated-story',
  body: string | OrderedStep[] | ExperimentRef | IllustratedStorySpec,
  forPersonId?: string,
  dueByHint?: string,
  executed: boolean,
  executionNote?: string,
}
```

### Milestone payload (inside a `milestone` Move)

```ts
{
  text: string,            // user-confirmed (AI-drafted, user-edited)
  aiDraft: string,         // original AI draft, retained for tuning
  draftedAt: Timestamp,
  confirmedAt: Timestamp,
}
```

### `personMilestones/{personId}/items/{milestoneId}` (chronicle index)

| Field | Type | Notes |
|---|---|---|
| `obstacleId` | string | back-reference |
| `clearedAt` | Timestamp | |
| `text` | string | denormalized milestone text |
| `visibleToUserIds` | string[] | denormalized; chronicle queries filter on this |
| `personIds` | string[] | the people this milestone is about (denormalized) |

### Session/user state (not Firestore — auth context + local UI)

- `kidHandoffMode: boolean` — user-level, persists across page loads
- `pinUnlocked: boolean` — session-scoped, gates sensitive content view

### Composition rule for existing Cloud Functions

When `synthesizeWeeklyFocus`, `synthesizeMirror`, or any future synthesis function
produces an output that should appear in the loop, it `upsert`s an Obstacle (or appends
a Move to an existing one). The Cloud Function sets `visibility` based on context:
ritual outputs → `shared-with: [partner]`; kid-related → `private + sensitive`;
journal-origin → `private`.

---

## 7. Clarity Session UX

### Entry & resumption

- **New obstacle:** the session opens to a blank input with the prompt *"What's getting
  in the way?"* — names the frame immediately. No AI text first.
- **Existing obstacle:** AI opens with a brief recap + ONE re-entry question (*"Last
  time we got to X. Where are you with it?"*).
- **Entry points:** tap from `/unspoken` dashboard, "Work this through" on a journal
  entry, "Open a clarity session" from a person's manual page, direct URL.

### Turn structure

- User types free-form, no length limit.
- AI replies: **brief reflection (1–2 short paragraphs)** + **exactly one question** at
  the end.
- User responds. Loop. Typically 3–7 exchanges before a prescription emerges. Some
  obstacles resolve in 1; some take 12.
- AI's response is always shorter than the user's. The user is doing the work; the AI
  clears the path.

### Mid-session shifts

AI can name when the obstacle's shape changes (*"this started about wrestling, but it
sounds like it's really about the verbal piece — does that land?"*). The obstacle's
title/summary updates.

### Prescription extraction & confirmation

When clarity surfaces (the user has named what they want / where the friction is / what
they don't know), AI proposes **one** prescription with explicit framing: *"Want to try
something concrete?"*

The AI picks the prescription shape:
- **Atomic** — one specific question or sentence to ask (the Iris example)
- **Sequence** — 2–4 ordered conditional moves
- **Experiment** — a week-long behavior change; links into existing `/experiments`
- **Illustrated-story** — kid recipient; generated for the parent to share

UI shows the prescription card with **Confirm / Refine / Not yet** options.

**Critical voice rule:** when the prescription IS something to say, AI phrases it as the
question the user should ask, **not as a script the user reads aloud**. *"Ask her: 'is
naming it out loud what shifts it?'"* — not *"Here's exactly what to say to your wife."*

### Closure

User confirms the prescription → stored as a Move. Obstacle status → `prescribed`. AI
does NOT auto-write to the manual at this point. The manual writeback happens only after
execution + reflection produces the Ascend beat (Section 8).

Session ends cleanly. AI doesn't extend.

---

## 8. The Ascend beat

This is the section that makes the app feel like reaching a destination.

### Trigger

After the user executes the prescription and returns to reflect (manually or prompted
on next dashboard visit), the AI reads the reflection and asks:

> *"Does this feel cleared, or is there more to it?"*

**If "more to it":** obstacle stays in `executed`, AI proposes a next move. Loop.

**If "cleared":** the Ascend moment fires. **The user decides this moment exists.** AI
proposes; user confirms. Agency stays with the human — critical to keeping this from
feeling gamified.

### UX of the Ascend moment

A full-screen, intentionally simple panel.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Iris and I now understand why the verbal           │
│  piece lands differently for us.                    │
│                                                     │
│  ──────────                                         │
│  An obstacle was cleared between you and Iris.      │
│  (was: "the wrestling thing")                       │
│                                                     │
│                                                     │
│        [ Edit the sentence ]                        │
│                                                     │
│        [ Save to our chronicle  →  ]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- One sentence at the top — AI-drafted milestone, user-editable.
- Subtitle naming the moment.
- Two actions: **Save to our chronicle** (primary), **Edit the sentence** (secondary).
- No confetti. No badges. No level-up animation. A photograph at the summit, not a
  fitness app celebration.

### What happens on save

1. Write the `milestone` Move on the obstacle.
2. Write the denormalized item to `personMilestones/{personId}/items` for each
   `subjectPersonId`, with `visibleToUserIds` set per the obstacle's visibility.
3. Obstacle status → `cleared`, `clearedAt` = now.
4. Return user to dashboard. The recently-cleared section reflects the new entry.

### Per-person Chronicle

- New section on `/people/[id]` manual page: **"Where we've gone"** or **"Our chronicle"**.
- Vertical list of milestone sentences, dates, most-recent first.
- Visually distinct from the existing multi-perspective synthesized content (the manual
  answers *who is Iris*; the chronicle answers *where have we gone together*).
- Privacy-aware: only shows entries whose `visibleToUserIds` includes the current viewer.

### Anti-gamification guardrails

- No numbers, no levels, no streaks, no leaderboard.
- Each milestone is a sentence in the user's own voice (after editing AI draft).
- The chronicle is descriptive, not prescriptive. Records what was, not what to do next.
- "Open obstacles" count exists but is information, not a score.

---

## 9. The Dashboard (rescoped `/unspoken`)

Three zones, top to bottom:

```
┌─────────────────────────────────────────────────────┐
│  Open obstacles · A private holding space          │
│                              [ Kid mode  ⌐ ]        │
├─────────────────────────────────────────────────────┤
│  Top of mind                                        │
│  ──────────                                         │
│  ▶ Iris · the verbal piece               🔒         │
│      ready to reflect — you asked her 2 days ago    │
│                                                     │
│  ▶ Kaleb · bedtime 8:15                             │
│      ready to clarify — last touched yesterday      │
├─────────────────────────────────────────────────────┤
│  Iris · 2 open                                      │
│   · the verbal piece     🔒  ready to reflect       │
│   · weekly focus (us)        prescribed             │
│                                                     │
│  Kaleb · 1 open                                     │
│   · bedtime 8:15             ready to clarify       │
│                                                     │
│  Held entries · 3                                   │
│   · "I haven't said anything about…"  3d ago        │
│   · "Why does Sam keep…"              1w ago        │
├─────────────────────────────────────────────────────┤
│  Recently cleared                                   │
│  ────────────────                                   │
│   · We don't fight about money the same way        │
│     anymore — Iris · 11 days ago                    │
│   · Mia and I have a Tuesday-night rhythm           │
│     now — Mia · 23 days ago                         │
│   → All chronicles live on each person's manual     │
└─────────────────────────────────────────────────────┘
```

### Behaviors

1. **Three zones:** *Top of mind* (1–3 AI-curated hero items) → *Open by person*
   (everything grouped, including held journal entries as their own subcategory) →
   *Recently cleared* (most recent 2–3 milestones across all people, link to per-person
   chronicles).
2. **Held journal entries remain themselves.** They sit as a grouped subcategory.
   "Work this through" action on each promotes them into an Obstacle.
3. **Status pills** tell the user what to do next: `ready to clarify` / `prescribed` /
   `waiting on action` / `ready to reflect` / `paused`.
4. **Privacy display:**
   - Sensitive obstacles show **🔒** glyph + obfuscated title (*"A private thread"*).
   - Tap → PIN gate → reveals real title and opens session.
   - In **Kid mode**, sensitive items disappear entirely from view.
5. **Empty state.** Zero open obstacles renders: *"Nothing pressing right now. Be
   present with the people you love."* Recently cleared section remains visible — the
   dashboard never feels empty for a long-time user.
6. **Visible momentum without numbers.** No counters. *Recently cleared* IS the momentum
   signal — written milestones accumulate visibly over time.

---

## 10. Composition with existing systems

The obstacle loop is the central nervous system. Every existing surface plays one of
four roles: **Source** (raises obstacles), **Scheduled instance** (runs the loop on a
cadence), **Prescription shape** (gives form to the unblock), or **Destination**
(receives milestones/writebacks).

### Journal (`/`) — Source + Destination

- **Source:** AI pass on entry creation can offer *"This feels like something between
  you and Iris that's getting in the way. Want to name it as an obstacle?"* One tap
  creates an Obstacle with the entry as `origin`. Offer, never interruption.
- The existing "Hold this for later" continues to flow entries to `/unspoken` as held
  entries. They sit as their own dashboard section until promoted.
- **Destination:** Cleared milestones surface back in the journal as a quiet
  *"what we cleared this month"* view.

### Children's evening activities — `/check-in` and `/mirror` — Source + Scheduled instance

- **`/mirror`** (bedtime dyadic ritual) is already a scheduled mini-instance of the loop.
  Two upstream pipes from it into the parent's loop:
  1. **Per-session reflection (parent-side, next morning):** parent sees the synthesis
     line on dashboard with *"Was anything underneath this worth working through?"* If
     yes → creates an Obstacle (subject = the kid, origin = mirror).
  2. **Pattern detection (across multiple mirror entries):** AI notices recurring shapes
     (*"You and Kaleb have mirrored conflict three nights running. Want to work through
     what's underneath?"*).
- **`/check-in`** (12-tile kid check-in) — similar: parent reviews after, dashboard
  offers obstacle if anything surfaced.
- **The kid is never the user of the parent's loop.** Their activity informs the
  parent's. Kid mode protects this boundary.
- **Per-kid chronicle:** mirror entries + cleared kid-obstacles accumulate on the kid's
  manual page.

### Rituals (`/rituals`, couple ritual) — Scheduled instance

- The couple ritual IS the obstacle loop on a weekly cadence, dyadic, scheduled.
- Weekly Focus = Obstacle in `prescribed` status, `subjectPersonIds: [partner]`,
  `visibility: shared-with: [partner]`, `origin: ritual-focus`.
- The ritual's revisit gate IS the reflection step. If cleared → ascend beat fires
  inside the ritual (ceremonious mutual closure). If not → obstacle stays open, next
  move proposed.
- **No new code path needed for the ritual loop** — extend `synthesizeWeeklyFocus` to
  write an Obstacle on output; revisit reads obstacle status.

### Experiments (`/experiments`) — Prescription shape

- `experiment` prescription shape creates an experiment via the existing system.
- Obstacle stays `executed` until the user reflects on the experiment's outcome.
- Existing free-standing experiments not tied to an obstacle continue unchanged.

### Therapy (`/therapy`) — Destination (opt-in)

- Per-obstacle `bringToTherapy: true` surfaces it (clarity transcript + prescription +
  reflection) in the next therapy compile.
- Cleared milestones can be included as narrative context.
- Respects all existing PIN gates and sensitivity flags.

### Manuals (`/people/[id]`) — Source + Destination (central)

- **Source:** Existing manual synth has alignment gaps and divergences. AI proposes
  obstacles from these (*"You and Iris diverge on stress sharing. Want to work through
  it?"*).
- **Destination:** The per-person Chronicle (Section 8) lives on the manual page.

### Unspoken (`/unspoken`) — IS the dashboard

Already covered — Section 9.

### Composition rule, restated

> Anywhere on the platform you encounter friction, ambiguity, or a thing-not-yet-said,
> you can promote it into an obstacle with one tap. Anywhere the loop closes, the
> milestone writes back into the manuals and chronicles. Journal, rituals, mirror,
> experiments, therapy are all pipes feeding the same central river.

---

## 11. Privacy (load-bearing)

Two orthogonal axes, one global mode, one synthesis-layer constraint.

### Axis 1 — Visibility (who can see content)

- `private` — only `authorId`. **Default for all new obstacles.**
- `shared-with: [userId, …]` — explicit list. Used for couple-shared obstacles (ritual
  outputs default to `shared-with: [partner]`).
- `family` — all linked family members. Almost never the right default; opt in per
  obstacle.

### Axis 2 — Sensitivity (controls kid-mode + PIN-gate)

`sensitive: true` is **orthogonal to visibility**. Hides in kid mode regardless of
visibility. Forces PIN gate even when otherwise readable.

AI auto-classifies on creation and every clarity session update. Auto-sensitive
categories:
- Sexual or intimate content
- Family conflict (anything about a child; marital tension)
- Third-party private information (named confidences)

User can override AI classification either direction.

### Global Kid Mode toggle

- Lives in TopChrome (top-right).
- **Activated:** sensitive obstacles disappear from every surface — dashboard, journal
  feed, manual chronicles, search, everywhere. *Gone*, not locked-and-visible.
- **Deactivated:** requires PIN OR auto-deactivates on idle (default 5 minutes since
  last interaction). Prevents accidental "left it off" exposure.
- Visual indicator when active: sage-colored ring on chrome + banner.

### PIN gate (same mechanism as existing Therapy)

- Gates **content** of sensitive obstacles (title, transcript, prescription, milestone).
- Does NOT gate **existence** — locked tiles appear in lists with obfuscated titles.
- After unlock, access persists until tab close OR explicit lock action.

### Multi-party shared obstacles

- A ritual-originated obstacle is `shared-with: [partner]`. Both can view, both can
  append moves, both can propose milestones (one proposes, both confirm before ascend).
- **Reflection notes are private-per-user by default** — even on a shared obstacle.
  Each can privately reflect; only AI sees both for synthesis. "We share this work"
  doesn't mean "I share my interior."
- If either party marks the obstacle sensitive, both see the gate.

### Edge case — an obstacle ABOUT someone the someone shouldn't see

The default `private` handles this naturally. An obstacle with
`subjectPersonIds: [iris]` and `visibility: private` does NOT grant Iris access just
because she's the subject. She'd only see it if explicitly shared. The chronicle on
Iris's manual page filters by viewer — Scott's private milestones about Iris show on
Scott's view of her page, not on Iris's view.

Same applies to kids: any obstacle subject=kid is always `private + sensitive` by
default.

### Synthesis-layer privacy (critical addition)

The AI is a trusted listener whose written outputs are intentionally less specific than
its understanding. **Specific in, general out.**

| Surface | Specificity allowed |
|---|---|
| Inside clarity session (you ↔ AI) | Full detail |
| AI internal context for follow-up turns | Full detail |
| AI-drafted milestone sentence | **Generalized** — about the dynamic, not the specifics |
| AI-drafted manual chronicle entry | **Generalized** — about the relationship's shift |
| AI-suggested obstacle blurb on dashboard | **Generalized**; obfuscated if sensitive |
| AI output visible to another linked user | **Doubly generalized** — assume read by the named other person |
| Therapy compile content | Generalized by default; user explicitly chooses inclusions |

#### Enforcement

1. Every synthesis prompt to the LLM includes an explicit generalization instruction:
   *"Synthesize at the level of the dynamic, not the specific. Do not include sexual
   acts, third-party names, financial figures, medical details, or quoted private words
   unless the user has opted to surface them."*
2. Per-obstacle `allowSpecificsInOutput` flag, default `false`. User can opt in per
   obstacle.
3. **Cross-obstacle pattern detection must generalize further.** Patterns surface at
   the level of dynamics, never at the level of which obstacles. Acceptable: *"You've
   cleared several obstacles around indirect communication."* Not acceptable: *"The
   wrestling thing + the in-laws thing + the money thing all involve…"*
4. User-edits-before-confirm is the last guardrail. AI never writes to the manual
   without the user's review.
5. The "uncomfortable test" is built into the synthesis prompt: *"Would the user be
   uncomfortable if this exact sentence were read by someone they share this obstacle
   with? If yes, generalize further."*

### Firestore rules + Cloud Function implications

- New `obstacles` collection rules: read only if `authorId == request.auth.uid` OR
  `request.auth.uid in resource.data.visibility.sharedWith` OR (family visibility +
  same `familyId`).
- Subcollections (`moves`, `milestones`) inherit parent visibility.
- `personMilestones/{personId}/items` queries must filter by **denormalized**
  `visibleToUserIds` — required by Firestore query constraints, not just security.
- Cloud Functions (`synthesizeWeeklyFocus`, future `claritySessionTurn`,
  `draftMilestone`) must set visibility based on context.
- AI prompts to LLMs **must filter to the requester's view only.** No cross-user
  content leakage.

### Cross-system propagation

- Search across surfaces respects visibility per result.
- Therapy compile filters by `bringToTherapy: true` PLUS viewer visibility.
- Mirror and weekly-focus outputs inherit their source's visibility/sensitivity
  defaults; they don't relax to more permissive.

---

## 12. Voice & AI behavior

The Clarity Session AI has a wider voice budget than Mirror or Weekly Focus (which are
strictly bounded). It can ask multiple questions across turns, name dynamics, propose
prescriptions. Inside firm constraints.

### Register

- **Warm, specific, slightly dry.** The example coach transcript Scott shared is the
  canonical tone. *"That's clarifying and also a little lonely, isn't it?"* —
  observation, not therapy-speak.
- **Not** generic UX-researcher openers. **Not** therapy-bot. **Not** coach-jargon.
- **Not** performative neutrality.

### Turn structure

- One question per turn, always at the end.
- Reflection before question: 1–2 short paragraphs.
- AI response shorter than user's.
- Average session: 3–7 exchanges before prescription emerges.

### What the AI never does

- Never asks more than one question per turn.
- Never moralizes or instructs.
- Never writes the user's exact words for a prescription. Offers the move, not the
  script.
- Never advances to prescription without checking (*"Want to try something concrete?"*).
- Never advice-dumps mid-session.
- Never breaks user confidence — including across other obstacles (cross-obstacle
  pattern guardrail).

### Per-context voice variance

Register stays consistent; emphasis shifts by context:

- **Partner / spouse:** example tone — warm, willing to name discomfort, intimate
  territory allowed.
- **Kid obstacles (parent processing about their child):** softer reflections, more
  attention to the parent's emotional load. Prescriptions skew toward *observe* /
  *create-a-moment* / *low-stakes-opening*. Illustrated-story shape unique here.
- **Older parent / sibling / estranged-adult:** longer fuses; prescriptions skew to
  sequences with explicit wait-states.
- **Friend / work:** more practical; less "what's underneath" mining.

### Mid-session shifts & breaks

- AI can name when the obstacle's shape changes; the obstacle's title/summary updates.
- AI can pause for safety (see below).
- AI can decline to probe another adult's confidence (*"This sounds more like Sarah's
  story than yours — I'd rather stay on what's yours"*).

### Safety / crisis

- Self-harm, severe distress → break form, name what was noticed, offer Therapy compile
  + real-world hotline.
- Suicidal ideation → do not continue the loop; reference real resources clearly.
- Domestic violence indicators in a partner obstacle → do not prescribe a
  confrontational move; suggest safer paths + external resources.
- These are deliberate breaks of form, not graceful transitions. Mediating clarity is
  not the right frame in crisis.

### Closure behavior

- AI doesn't close the session unilaterally. User closes by confirming prescription or
  walking away.
- If the user goes quiet mid-session for >2 weeks, AI sends ONE gentle re-engagement
  prompt on next dashboard visit (*"Want to pick up the Iris thread, or let it rest?"*).
  Then it rests.

### Model & technical

- **Model:** latest Sonnet (currently `claude-sonnet-4-6`). Pin to current ID per
  existing convention.
- Each turn = stateless call with full obstacle context + session transcript in prompt.
- Streaming responses (token-by-token) for conversational feel.
- Synthesis-layer privacy rule (Section 11) baked into every prompt.
- Same extracted-handler + thin onCall pattern as `synthesizeMirror.handler.js` and
  `synthesizeWeeklyFocus.handler.js`.

### Comparison to existing AI surfaces

| Surface | Voice budget | Output bound |
|---|---|---|
| Mirror synth (existing) | Minimal — observational | ≤2 sentences, NO advice |
| Weekly Focus (existing) | Slightly wider — concrete shared action | ≤2 sentences, one prescription |
| **Clarity Session turn (new)** | Wider — reflective + questioning + reframing | No strict sentence cap; conversational |
| **Milestone draft (new)** | Bound — generalized, single sentence | One sentence, generalized per §11 |
| **Manual chronicle entry draft (new)** | Bound — generalized | 1–3 sentences |
| Dispatches (existing) | Quiet observational | Editorial-newspaper tone |

The Clarity Session is the only multi-turn AI surface. Everywhere else: single bounded
artifact.

---

## 13. Kid version scope (deferred to v2)

The user picked "both adults and kids, structurally different UIs." Adult version ships
v1; kid version designed-but-deferred.

### Who the kid version is for

- **Ages ~8–12.** Younger: existing `/check-in` and `/mirror` cover them.
- **Teens (13+):** likely use adult interface with light copy adjustments.

### Structural differences

- Launched only via parent handoff (same model as `/check-in`).
- Emoji-led, illustrated tiles, short answers. No free-text dumps.
- Register: kind older sibling, not coach. Short sentences, concrete, gentle.
- Vocab adjusted ("what's bugging you"); internally still `Obstacle`.
- Prescription shapes available: *observe*, *express*, *draw*, *illustrated-story*.
  Never confrontational adult-style.
- Chronicle on kid's view of someone: smaller, more visual.

### Kid privacy

- **Kid session content is private FROM the parent by default.** A kid working on
  "the thing that's hard with mom" doesn't surface to mom's dashboard.
- Parent gets aggregate signal, not content (*"Kaleb completed a clarity session about
  Mom — 3 days ago"*). Milestone visible only if kid chose to share.
- **AI cannot identify abuse and auto-route to parent.** If safeguarding-relevant
  content surfaces, AI suggests talking to a safe adult and offers resources. Does not
  silently inform parents — they could be the issue.
- Any obstacle a kid creates is `sensitive: true` by default.

### What v1 does about kids

- **Builds nothing kid-facing in v1.** Existing `/check-in` and `/mirror` continue.
- Kid mode toggle (Section 11) protects parent content during existing kid activities.
- **Kid integration in v1 is upstream only:** parent reviews mirror/check-in outputs
  the next day and can promote into an Obstacle on their own dashboard. The kid never
  sees that promotion.

### When v2 lands

Earliest: after v1 ships and 3+ months of real use. Shape depends on patterns from the
parent loop.

---

## 14. Phased roadmap

Six subsystems, six phases. Each phase ships something usable; next phase doesn't break
previous; user can stop at any phase if priorities shift.

### Phase 0 — Foundation (no user-visible behavior)

- `obstacles/` + `obstacles/{id}/moves/` collections
- `personMilestones/{personId}/items/` index
- Firestore rules + denormalized `visibleToUserIds`
- `kidHandoffMode` user state + `pinUnlocked` session state
- PIN gate component (extract or mirror from Therapy)
- Synthesis-layer privacy prompt templates + unit tests

Merged with Phase 1 for first PR.

### Phase 1 — Clarity Session MVP (adult, manual creation)

- Route `/clarity/[obstacleId]` — full-screen chat
- `claritySessionTurn` Cloud Function (streaming Sonnet, full system prompt)
- New-obstacle flow: "What's getting in the way?"
- Turn UI: reflection + question
- Prescription extraction + Confirm/Refine/Not-yet card
- Status transitions: `fresh` → `clarifying` → `prescribed`

**Ships:** end-to-end clarity session reachable by direct URL. Internal test only.

### Phase 2 — Dashboard (rescope `/unspoken`)

- `/unspoken` rewrite: three-zone layout
- Status pills + tap-to-resume
- Privacy display (locked tiles, kid mode hides)
- Kid Mode toggle in TopChrome (functional)
- Held-entry preservation (zero migration)

**Ships:** dashboard is real. Sessions are discoverable. Working loop minus the ascend.

### Phase 3 — Ascend beat + Manual chronicle

- Reflection-after-execution prompt
- `draftMilestone` Cloud Function (generalized per §11)
- Ascend ceremony panel
- Milestone doc + `personMilestones` indexing
- Chronicle section on `/people/[id]` manual page

**Ships:** the magic moment. The destination feel.

### Phase 4 — Composition wiring (independent sub-PRs)

- **4a** Journal entry → obstacle offer
- **4b** Weekly Focus → auto-create Obstacle
- **4c** Mirror → next-morning parent review with promotion offer
- **4d** Manual synth gaps → obstacle proposals
- **4e** Experiment prescription shape → existing experiments system

**Ships:** existing surfaces feed the loop.

### Phase 5 — Therapy + Pattern detection

- Per-obstacle `bringToTherapy` flag + therapy compile inclusion
- Cross-obstacle pattern detection (strict §11 guardrails)
- "Pattern noticed" dashboard surface

### Phase 6 — Kid version (v2, deferred indefinitely)

Per §13. Revisit after 3+ months of v1 use.

### Sequencing notes

- Each phase gets its own implementation plan via writing-plans skill. Not all at once.
- Phases 1+2 = minimum shippable unit (loop without destination).
- Phase 3 = highest leverage; this is what the user *feels*.
- Phase 4 = multiplier; existing surfaces reborn.

---

## 15. Testing strategy

### Pure-function unit tests

- Obstacle status state-machine (valid + invalid transitions)
- Visibility resolution
- Sensitivity classifier wrapper (test the prompt, not the AI)
- Synthesis-layer privacy prompt builder
- Milestone doc builder
- Dashboard data shaper

### Firestore rules tests (emulator)

Pattern: same as `firestore-rules/weeklyFocus.rules.test.ts`. Cover:
- Own private read; non-author cannot
- `shared-with` access
- `family` scoped to `familyId`
- Subcollection inheritance
- Cross-family isolation
- Chronicle query requires `visibleToUserIds`

### Cloud Function tests (mocked LLM)

Extracted-handler pattern. Cover:
- `claritySessionTurn`: prompt structure; no cross-user private content in input
- `draftMilestone`: generalized output even with specific input
- `crossObstaclePatternDetect`: never names obstacles in output
- Parent-gated kid endpoints (Phase 6+)

### Hook tests (RTL + mock Firestore)

- `useObstacle`, `useClaritySession`, `useChronicle`, `useDashboard`
- Loading / error / empty / loaded states
- Optimistic updates
- Privacy filtering on read

### Integration / E2E

**Blocked on auth fixture** (see `project_e2e_auth_fixture_needed` memory). When
ready:
- Full clarity loop end-to-end
- Kid mode + PIN unlock round-trip
- Each Phase 4 composition pipe

### AI behavior evals (semi-automated)

Curated scenario set with expected properties:
- Voice rules (reflection + one question)
- Generalization (specific inputs → general output)
- Safety (distress signals → break-form)
- Per-context register shifts

Release-gate eval set; not on every commit.

### Privacy red-team checklist (manual, per phase)

- Can a kid see any sensitive obstacle? (no)
- Does another adult see this user's private obstacles about them? (no)
- Does any milestone draft expose specifics not opted in? (no)
- Does cross-obstacle pattern detection name specific obstacles? (no)
- Does search return out-of-visibility results? (no)
- Does a Cloud Function ever receive cross-user private content in its prompt? (no)

### Baseline preservation

3 pre-existing test failures (`EditPersonSheet` ×2, `SurfaceLayout` ×1) — pre-existing,
unrelated. Must not regress further.

---

## 16. Open questions (for the implementation phases to resolve)

These are deliberately not resolved here. They'll surface in the per-phase plans.

1. **AI's pattern-detection cadence** — how often does the AI scan journal/mirror entries
   to surface new obstacle offers? Daily on-write? Weekly digest? Real-time on every
   entry? Affects Phase 4a/4c/4d.
2. **Dashboard ordering of hero items** — what makes an obstacle "top of mind"?
   Recency + readiness + AI relevance score? Need to define the algorithm in Phase 2.
3. **Re-engagement cadence for stale obstacles** — Section 12 specifies "one gentle
   prompt after 2 weeks quiet," but what about obstacles in `executed` state waiting on
   reflection for a long time? Phase 3 question.
4. **Chronicle visual treatment on the manual page** — Section 8 mentions "visually
   distinct" but the actual design (typography, separator, ordering) is a Phase 3 design
   call.
5. **Kid mode auto-deactivation idle threshold** — Section 11 defaults to 5 minutes;
   confirm this is the right number for real usage. Phase 2 question.
6. **Therapy compile integration depth** — Section 10 says "surfaces obstacle context";
   exact format is a Phase 5 design call.

---

## 17. Out of scope (explicitly NOT this design)

- The kid-facing UI (deferred to v2 per §13).
- A unified-search across all surfaces (the loop respects existing search per surface
  but a true cross-surface search is not part of this design).
- Multi-tenant team/coach features (e.g., a therapist user account that views a
  client's chronicle). The visibility model is built so this could come later, but it's
  not designed here.
- Mobile-native apps. This design assumes the existing Next.js web app and follows the
  existing responsive patterns.
- Migration tools for users who want to "convert" existing journal entries into
  obstacles in bulk. Held entries continue to work; one-by-one promotion is the only
  flow.
- An "import from another product" pipeline (e.g., importing journal data from
  elsewhere into Obstacles).

---

## Appendix A — Glossary cross-reference

- **Obstacle** = the persistent unit. See §4, §6.
- **Move** = append-only log entry on an obstacle. See §6.
- **Prescription** = the unblock move (shape: atomic/sequence/experiment/illustrated-story). See §6, §7.
- **Ascend beat** = the user-confirmed clearing moment. See §8.
- **Milestone** = the sentence written at ascend. See §6, §8.
- **Chronicle** = per-person accumulated milestones, on manual page. See §8, §10.
- **Clarity Session** = the chat surface where dialogue happens. See §7.
- **Dashboard** = rescoped `/unspoken` view. See §9.
- **Kid Mode** = global toggle hiding sensitive content. See §11.
- **Sensitive flag** = orthogonal to visibility; controls kid-mode + PIN gate. See §11.
- **Synthesis-layer privacy** = AI generalizes its written outputs even when it knows
  specifics. See §11.

---
*End of spec.*
