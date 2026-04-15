# One-Journal Design — Relish UI Rearchitecture

**Date:** 2026-04-15
**Status:** Design approved by user; ready for implementation planning.

## The coherent story

> **Relish is a journal that other people help you write, and that writes you back.**

Not a manual *about* people. A journal *by* people, aggregated into a mirror. The "manual," "workbook," and "growth system" are outputs of the journal, not separate destinations. Writing is the primary act. Everything else is derived.

This design collapses the current four-surface home (library desk with Journal + Family Manual + Workbook + Relish) into a single stream rendered as a bound photographic journal with facing-page spreads. Other routes become filtered views on that stream or are retired.

## Load-bearing principles

These must not be violated by any downstream decision:

1. **The gap between perspectives is the product.** Self + spouse + kids + friends all contribute; AI holds the gap up to the light.
2. **The app initiates; the user responds minimally.** 2–3 touchpoints per week max. Silence is valid.
3. **One surface, not many features.** No duplicate chrome. No destinations-with-mastheads. Filters, not routes.
4. **Writing is upstream of everything.** Chat, synthesis, and nudges flow from writing — never the other way around.
5. **Real photographic warmth, never faked texture.** Rule holds across the whole app (prior memory: "no AI slop CSS").

---

## Section 1 — The Entry Model

One canonical collection: **`entries`**. Every user-visible piece of content in the app is an Entry.

### Fields

```ts
interface Entry {
  id: string;
  familyId: string;

  type:
    | 'written'       // user-authored free text
    | 'observation'   // user-authored, explicitly about another person
    | 'activity'      // completed practice / check-in / outing
    | 'synthesis'     // AI-authored, about a subject
    | 'nudge'         // AI-authored, "one thing to try"
    | 'prompt'        // AI-authored question to the user
    | 'reflection'    // user answer to a prompt
    | 'conversation'; // threaded Ask-about-this dialogue

  author:
    | { kind: 'person'; personId: string }
    | { kind: 'system' };

  subjects: Array<
    | { kind: 'person'; personId: string }
    | { kind: 'bond'; personIds: [string, string] }
    | { kind: 'family' }
  >;

  content: string;          // body; for conversations, this is a headline
  turns?: ConversationTurn[]; // only for type === 'conversation'

  anchorEntryId?: string;   // for conversations started from "Ask about this"
  sourceEntryIds?: string[]; // for syntheses/nudges: entries this was derived from

  tags: string[];           // dimension IDs, emotion tags — invisible to user
  visibleToUserIds: string[]; // denormalized visibility (see existing visibility model)
  sharedWithUserIds: string[];

  createdAt: Timestamp;
  archivedAt?: Timestamp;   // nudges decay after ~3 days
}

interface ConversationTurn {
  author: { kind: 'person'; personId: string } | { kind: 'system' };
  content: string;
  createdAt: Timestamp;
}
```

### Views are filters

- **Liam's "manual"** = `subjects.some(s => s.kind === 'person' && s.personId === liamId)`
- **Family Manual** = `subjects.some(s => s.kind === 'family')`
- **Workbook** = `type ∈ { 'nudge', 'prompt', 'reflection', 'activity' }`
- **Syntheses-only** = `type === 'synthesis'`
- **Today** = created within the current calendar day

No separate `PersonManual`, `SynthesizedContent`, or `GrowthItem` user-visible types. The backend can still hold those as internal state, but anything rendered to a user is an Entry.

---

## Section 2 — The Surface

**Single route: `/`**. The home is the journal, open to today.

### Layout

- **Facing-page spread.** Two pages visible; older on the left, newer on the right.
- **Bound-journal frame** rendered with real photographic assets (see Section 7).
- **Flip arrows** ‹ › on the outer edges move horizontally through time. Swipe gesture on mobile.
- **Masthead row** on every spread: family avatars (bottom-corner), "Vol IV · Spring, in progress," date range.
- **+ Add an entry** floats at the gutter, always visible.
- **Filter pills** above the book: Everyone · [each person] · Bonds · Syntheses. Multi-select where sensible; tapping a person shows entries with that subject.
- **Chapter rules** — auto-inserted title pages for weekly or monthly boundaries. "Chapter Seven · This week."

### Filter behavior

- Selecting a filter **restyles the current spread** rather than navigating. The book becomes "Liam's volume" — same book, filtered paper, pill row updated.
- Filter state lives in URL query params (`/?subject=liam&from=2026-04-01`) so deep links work.
- Deep links from `/people/[id]/manual` resolve to `/?subject=[id]`.

### Retired surfaces

All of the following redirect to `/` with an appropriate filter, or are deleted:

| Route | Disposition |
|---|---|
| `/family-manual` | `→ /?subject=family` then delete |
| `/workbook` | `→ /?types=nudge,prompt,reflection,activity` then delete |
| `/relish` | `→ /?subject=[self]` then delete |
| `/dashboard` | Already a redirect; delete |
| `/growth/[itemId]` | Entry detail opens in context at `/`; delete route |
| `/journal` | `→ /` then delete |
| `/people/[id]/manual` | Redirect to `/?subject=[id]`; keep for deep links or delete after link audit |
| Library-desk home at `src/app/page.tsx` | Retires; journal becomes `/` |

### Preserved surfaces

- `/people` (list) — unchanged.
- `/welcome`, `/login`, `/register`, `/settings` — unchanged.
- Onboarding routes: `/people/[id]/manual/self-onboard`, `/observer-onboard`, `/kid-session` — keep; these feed entries into the stream.
- Spouse invite flow — keep.

### Top-level navigation

Collapses to three items:

**The Journal (/) · People (/people) · Settings (/settings)**

The library-desk photograph at `/images/home-table.png` is retired; the journal IS the home.

---

## Section 3 — Capture

One entry point: **+ Add an entry** at the gutter. Opens a sheet that slides up over the current spread.

### The sheet (thin by design)

- **Text field** — required. The user writes anything.
- **Who is this about?** Chip row: each person · Us · Family. Multi-select. Pre-selected based on current filter context. Optional — blank is allowed and means "about the day."
- **Save** — closes the sheet; entry lands on today's right page with a gentle transition.

Everything else (type, dimension tags, emotion) is inferred by the existing enrichment pipeline (Phase C.1). The user never sees or sets tags.

### Type inference rules (backend)

- If `subjects` includes a non-self person → `type: observation`.
- If the text describes a completed practice (matches a pending nudge/prompt) → `type: reflection` with `anchorEntryId` set.
- Otherwise → `type: written`.

### Secondary capture paths

Same Entry schema:

- **Spouse** adds entries via their own login; their avatar signs the entry.
- **Kid session** (existing `/people/[id]/manual/kid-session`) writes entries authored by the kid with the parent as subject.
- **System/AI** writes `synthesis`, `nudge`, and `prompt` entries on its own cadence (Section 5).
- **Prompt response** — tapping a `prompt` entry opens the capture sheet with the prompt attached. Save writes a `reflection` entry anchored to the prompt.

---

## Section 4 — Conversations with the AI

Conversations exist and are first-class, but **only as a contextual affordance on existing entries** — never as a peer of writing.

### Rules

- **No floating "Ask" button. No "Ask instead" at capture.** If a user wants to ask the AI about something out of the blue, they write an entry first ("We fought about the school thing again"), then tap **Ask about this** on that entry. The small friction is intentional — it forces a trace into the journal before any chat.
- **Ask about this** is a small affordance on every entry. Tapping it opens a conversation view, sheet-style, anchored to that entry.
- **The AI sees:** the anchor entry + the full relevant journal context (synthesized views about the subjects involved, recent entries, dimension signal). The conversation is an amalgamation of the LLM and the journal, as the user described it.
- **The conversation is itself an Entry** with `type: 'conversation'` and a `turns` array. It persists on the spread as a taller thread-block with a headline + latest turn visible, and a "Continue" affordance to reopen it.
- **Multi-author conversations** are supported natively — both spouses authenticated in the same session contribute turns, each attributed to their `personId`. Visibility defaults to "Us" (both spouses, no kids, no observers).
- **The AI's posture is curious mirror, not arbiter.** Prompt discipline prohibits taking sides in multi-author conversations.
- **Reuse existing Ask-about-this scaffolding** from commit `8661962`.

---

## Section 5 — AI Cadence

The AI writes three kinds of entries on its own. Sparse by design.

### `synthesis` entries

- **Triggered by accumulation**, not time. Fires when N new entries about a subject land (default: 3+ since last synthesis for that subject).
- **Rate limit:** at most one synthesis per subject per week.
- **Family synthesis** runs weekly if there's been meaningful activity; **skipped if the week was quiet**.
- Carries a "based on N entries" signature with `sourceEntryIds` links.

### `nudge` entries

- **At most one nudge per day, family-wide.** Often zero.
- Only written when a recent synthesis or pattern makes a **specific, concrete** suggestion possible. Vague nudges are suppressed by the prompt.
- **Decay:** if unengaged within ~3 days, `archivedAt` is set and the entry fades from the top of the spread. No guilt pressure.

### `prompt` entries

- **At most 1–2 per week.** Only when the journal has a genuine gap ("We haven't heard anything about Mia in two weeks").
- Answered prompts become `reflection` entries anchored to the prompt.
- Ignored prompts archive silently after ~7 days.

### Universal AI cadence rules

- **Never more than one AI entry in a row at the top of the current spread.** If a synthesis just posted, no nudge posts until the user writes something.
- **Silent days are valid.** The app never posts "nothing happening today."
- **All AI output is visually distinct** — coral for synthesis, pink for nudge, muted cream-with-border for prompt. The user instantly reads "this is the mirror, not me."

### Pipeline migration

- `synthesizeManualContent` Cloud Function: keep triggers, change write target from `synthesizedContent` to `entries` with `type: 'synthesis'`.
- Workbook activity seeding (Phase C.5): becomes `nudge` entries.
- Family synthesis: becomes a family-subject `synthesis` entry.

---

## Section 6 — Implementation Order

The work is mostly **collapsing**, not building new. Each step ships independently behind a flag where possible.

1. **Entry model (backend, read-side).** Define `Entry` type. Build a thin read adapter that exposes existing `journal_entries`, `synthesizedContent`, and workbook activities as Entries. No data migration. No write changes.

2. **Spread surface at `/` (behind flag).** Build the facing-page bound-journal component reading from the Entry adapter. Render colored blocks by type. Filter pills, horizontal flip, + Add an entry → existing capture sheet. Library-desk home moves to `/old-home` temporarily; `/` becomes the spread when the flag is on. **Uses real photographic assets (Section 7) — does not ship without them.**

3. **Capture writes unified entries.** Capture sheet writes to the new `entries` collection directly. Backend reads both old and new during transition. New entries bypass `journal_entries`.

4. **AI pipeline writes entries.** `synthesizeManualContent`, workbook seeding, family synthesis all write `entries` with `type: 'synthesis' | 'nudge' | 'prompt'`. Stop writing to legacy collections. **Point of no return.**

5. **Ask-about-this on every entry.** Reuse existing scaffolding. Conversation renders as a thread block with "Continue." Multi-author sessions supported.

6. **Retire old surfaces.** Redirect `/family-manual`, `/workbook`, `/relish`, `/dashboard`, `/growth/*`, `/journal` to `/` with filters. Delete pages. Retire library-desk home. Update top nav to three items.

7. **Data migration (required — no data loss).** One-time backfill Cloud Function that preserves every piece of authored content:
   - **`journal_entries` → `entries`** with `type: 'written' | 'observation'` (determined by subjects). Timestamps, author, and content preserved verbatim.
   - **`contributions` → `entries` (prompt + reflection pairs).** For each question/answer in every contribution, emit a `prompt` entry (authored by `system`, content = question prose, timestamped to when asked) and a `reflection` entry (authored by the contributor, content = answer verbatim, `anchorEntryId` = the prompt, timestamped to when answered). Observer contributions and kid sessions migrate with the correct author attributions. Dimension tags ride along. **Hours of user-authored prose are fully preserved, visible in the journal when the user flips back to that period.**
   - **`synthesizedContent` → `entries`** with `type: 'synthesis'`, `sourceEntryIds` populated by resolving the original contribution references to their newly-migrated prompt/reflection entry IDs.
   - **`growthItems` → `entries`** with `type: 'nudge' | 'prompt' | 'reflection' | 'activity'` as appropriate.
   - Legacy collections become read-only archives after verification; the migration is not destructive.
   - A dry-run mode produces a report (counts per type, sample entries) before any writes.

Steps 1–3 ship behind a flag and are reversible. Step 4 commits the architecture. Steps 5–7 are cleanup.

---

## Section 7 — Visual Fidelity

Non-negotiable: the spread renders with **real photographic assets**, never CSS pretending to be leather or paper. This enforces the prior "no AI slop CSS" commitment.

### Required assets

Produced before Step 2 ships.

1. **Full open-book photograph** — shallow top-down angle, leather cover visible at edges, blank cream pages, soft daylight, neutral surface. This is the backdrop layer.
2. **Seamless leather texture** (tileable) — warm tan or oxblood, real grain, slight patina. Used on binding/spine.
3. **Aged paper texture** (tileable, two variants for left/right) — ivory/cream, subtle fiber, warm deckle.
4. **Page-edge gutter shadow strip** — photographed, not a CSS gradient.
5. **Gilt/thread binding detail** (optional) — photograph of the sewn binding at the gutter.

Sources: curated stock (Unsplash/Adobe Stock filtered for physical realism) or a half-day custom shoot.

### Composition rules

- **Base layer:** open-book photograph sized to viewport.
- **Content layer:** colored entry blocks + typography composited onto photographed paper using `mix-blend-mode: multiply` (or equivalent), so blocks pick up paper texture rather than sitting on top like stickers.
- **Shadow/lighting layer:** real gutter shadow and page curl, not synthesized.
- **Fallback:** if an asset is unavailable, component renders honest flat cream. **Never fake texture.**

### Typography

Serif (Georgia / Parent Display) for entry headlines and body. Helvetica / sans-serif only for kickers (labels, pills, dates). Font-smoothing tuned to the photographed paper; ink-bleed filter only if it reads as real against the actual asset.

### Mobile

The spread becomes a single page on narrow viewports (<640px) with the same photographic treatment — tap-edge flip still moves through time. Masthead and filter pills collapse to a sticky mini-bar above the page.

---

## Section 8 — Onboarding: Journal-Native

Onboarding is the first chapter of the journal, not a lobby you pass through to reach it. The research-backed question bank — representing hours of authoring work — is preserved in full and becomes the engine that posts prompts one at a time onto the spread. No multi-step wizards.

### The first-login experience

- A brand-new user signs up and lands at `/`. The journal opens with 3–5 `prompt` entries waiting on today's spread — the opening questions from the self-onboarding bank.
- The user taps a prompt, the capture sheet opens pre-filled with that question, and they write a `reflection` entry at their pace. Skip is allowed; prompts can be left for later.
- As reflections land, the backend posts follow-up prompts sparsely (Section 5 cadence). The user never sees "5 of 20" — they see a living book gradually inviting them deeper.
- After a few reflections exist about the self, the backend posts a prompt inviting the user to add another person. Adding a person posts its own opening prompt about that person.

### The question bank (preserved)

The existing research-backed question content — all variants (self, observer, adult-override, child-centric emoji) and all dimension tagging — moves unchanged into a **prompt bank** the backend reads. Zero prose is discarded.

- Backend selects the next question for a given subject + perspective + stage using the same selection logic the wizards currently encode.
- Variants are chosen by audience: parent reader vs. invited spouse vs. supervised kid session.
- Dimension tags ride along on the posted `prompt` entry and are inherited by the user's `reflection`.

### Observer contributions (spouse, future observers)

- When the user invites their spouse, the spouse's first-login experience is the same shape: the journal opens with prompt entries waiting, framed from their perspective ("What does Scott love most about being with you?"). They answer as reflections. Same surface, same rhythm.
- Visibility of observer reflections follows existing rules (`visibleToUserIds` / `sharedWithUserIds`) — the subject sees them once marked shared.

### Kid sessions

The parent-supervised kid session remains a separate UI (age-specific, emoji-heavy, designed not to look like a parent's journal). Internally it produces `prompt` / `reflection` entries attributed to the child, with the parent as subject. The UI is different; the data is the same.

### Adding a person

- `/people` lists people and supports adding one.
- Adding a person immediately posts a single `prompt` entry to the journal ("Tell me about [name] — what matters most to know?"). Backend picks a dimension-aware opening question.
- Follow-up prompts accumulate over days/weeks per Section 5 cadence.

### Teaching relationships (bonds)

Bonds are not onboarded via a dedicated questionnaire. They are taught two ways:

1. **Observer-framed questions already produce bond signal** ("What does Liam love about being with you?"). Reflections to these entries tag the bond as a subject; accumulation triggers a bond-subject `synthesis`.
2. **Normal writing fills in the rest.** Writing an entry and chipping both partners as subjects marks it as a bond entry; accumulation triggers synthesis (Section 5).

### What gets removed

The following routes and internal structures are retired at the end of the migration:

- `/people/[id]/manual/self-onboard` — deleted.
- `/people/[id]/manual/onboard` (observer wizard) — deleted.
- `/people/[id]/manual/kid-session` — replaced with a simplified kid-session UI that writes entries directly; the wizard form is deleted.
- `/people/[id]/create-manual` — replaced with a simple "add person" dialog on `/people`.
- Multi-step wizard React components, progress-bar UI, draft-persistence hooks for wizards — deleted.
- `Contribution` collection — deprecated after migration (Step 7). Existing docs become read-only archives; new writes go to `entries`.

### What's preserved

- **100% of authored content** (user prose answers) via the Step 7 migration.
- **100% of the research-backed question prose** as the prompt bank.
- **Dimension tagging and perspective variants** — carried forward unchanged.
- **Living-document principle** — any reflection can be edited or added to later; re-reflections create new reflection entries anchored to the same prompt, so the journal shows change over time.

### Stage expressed through content, not UI mode

There is no state machine (`new_user → self_complete → ...`) driving branching UI on `/`. The spread always renders what's in the stream. Stage is an **emergent property**: a brand-new user sees a spread of waiting prompts; a user mid-onboarding sees a mix of prompts, reflections, and the first syntheses; a seasoned user sees full journal activity. The UI is the same — only the contents differ.

A soft exception: if the journal has zero content for a brand-new user (pre-first-prompt-posted), the surface shows a single "Preparing your journal..." state for the seconds until the backend seeds the initial prompts.

## Out of scope

- **Share-an-Impression** (parked Apr 13) — remains parked. The one-journal architecture makes it trivially addable later (a shared conversation entry with an invited author), but it does not ship in this rearchitecture.
- **Kid-visible stream.** Kids continue to contribute via supervised sessions; they do not get a reading view yet.
- **Search.** Filter pills cover the common cases; free-text search is a follow-up.
- **Export / printing.** The "print the book at year-end" idea is deferred.

## Open questions (for the planning pass, not the design)

- Whether to keep legacy collections indefinitely or delete after N months post-migration.
- Which person-avatar color assignments should be stable vs. themed per chapter.
- Whether "chapter" auto-insertion is weekly, monthly, or event-driven.
- Mobile capture sheet interaction details (keyboard handling, chip row overflow).

## Success criteria

The rearchitecture is successful when:

1. A signed-in user opens the app and sees one bound journal, open to today.
2. Every piece of content the user writes, the AI writes, or a spouse writes lives in that journal.
3. A person's "manual" is a filter, not a page.
4. No route in the sitemap has its own masthead or chrome competing with the journal.
5. CSS files contain no gradients simulating leather, paper, or book texture.
6. The AI posts sparsely enough that a user can open the app on a quiet day and see yesterday's spread unchanged.
