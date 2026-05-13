# Bedtime Check-in Cards — Design

**Date:** 2026-05-13
**Status:** Approved — ready for implementation plan
**Route:** `/check-in/[personId]`

## The problem

The kid check-in (shipped in Plan 3) is not drawing out depth of voice. Kids hand the screen back after tapping one or two emojis — they almost never use the mic or the textarea. The flow's lowest-effort path looks complete: tap an emoji, hit Done.

Diagnostic: the opening question is direct interrogation ("How are you feeling?"). Eight-year-olds disclose poorly to that question, even with adults present. The clinical literature on child emotional disclosure (CBT, play therapy, narrative therapy, family systems) is unanimous: 8-year-olds need **side doors** — metaphor, structure, projection, externalization — and **repetition + predictability + reciprocity** matter more than a perfect question on any given night.

The check-ins happen at bedtime, with both parents present and one kid at a time. Bedtime is the highest-yield disclosure window for kids — clinicians explicitly recommend it. We're not building a new ritual; we're deepening one that already works.

## What we're building

Replace the 12-emoji opener with a single **card** — a concrete, indirect prompt presented in editorial type. Two cards rotate per kid:

1. **Parent Reflection** — the parent enters one specific thing they noticed about the kid today. Kid responds to that observation.
2. **High / Low / Buffalo** — best part of today, hardest part, weirdest random part. Parent goes first with their own three; kid follows.

The flow is **parent-first, kid-second**: the parent's turn is the first visible step and gates the kid's turn behind a Pass button. The kid is responding to a concrete moment or a modeled answer, not generating from nothing.

The 12-emoji grid, the body map, and the per-person relationship feelings stay in the page — demoted to **optional sprinkles** below the card. They're additive, not the entry point.

## Scope

**In:**
- `/check-in/[personId]` page redesign
- Two cards (Parent Reflection + High/Low/Buffalo)
- Card rotation logic
- Parent-first / Pass-to-kid mechanic
- New structured `checkIn.parentTurn` and `checkIn.kidTurn` fields on the journal entry
- Bedtime / low-light visual variant
- Dynamic "[Parent name]'s turn" label from authenticated user
- Existing sprinkles (emoji, body, share, ritual chip, sibling picker) kept in place

**Out (deliberately):**
- Async parent ↔ kid notes (the "what I noticed about you today" thread over hours). Filed as a Phase 2 idea — see Out of Scope.
- Daytime / non-bedtime check-in variants. `/check-in` is bedtime-only for v1.
- Additional cards beyond the two named above. Add more in a later iteration once we have signal.
- Capturing both parents' observations the same night. Parents alternate which one leads; the leading parent's userId is captured.
- AI-driven follow-up prompts.
- Rose / Thorn / Bud as a card — already in use as a separate dinner ritual.

## Decisions made during brainstorming

| # | Question | Decision |
|---|---|---|
| 1 | What does "draw out true feelings" mean? | Depth of voice — actual sentences in the kid's own words. Emoji density is not the metric. |
| 2 | Use scenario | Paired ritual at bedtime, both parents physically present, one kid at a time. |
| 3 | Approach | Approach 2 — reframe opener as today's card; keep emojis/body/share as optional sprinkles. |
| 4 | First cards to ship | Parent Reflection + High/Low/Buffalo, shipped together. |
| 5 | Card rotation | Strict alternation per kid, defaulting to Parent Reflection on first-ever check-in. Override link available. |
| 6 | Data model | Single journal entry per check-in; both turns embedded as structured fields under `checkIn`. Empty `kidTurn` is a valid save. |
| 7 | Buffalo naming | Keep "Buffalo" as the card title (iconic name). Subtitle explains it. |
| 8 | Parent text editability for kid | Read-only to the kid. Kid responds in their own slot, doesn't overwrite parent's words. |
| 9 | Two parents present | Parents alternate which one leads. The leading parent's `userId` is the captured `parentTurn.userId`. The other parent's verbal contributions land organically in the leading parent's transcript. |
| 10 | Daytime mode | Out of scope for v1. `/check-in` is bedtime-only. |

## Cross-cutting principles

These apply regardless of which card is showing:

- **Parent goes first, on the same prompt.** Single most powerful intervention. Models depth, reduces performance pressure, captures the parent's perspective (which the synthesis layer wants downstream).
- **Feelings welcomed but not demanded.** A one-line answer is a win. No streaks, no completion meters.
- **Same shape every time, different content.** Predictable scaffolding, rotating prompt content. Predictability is how repetition becomes safety.
- **Side doors over interrogation.** Metaphor, projection, structured triples — never "how do you feel?"

## Page flow

```
─────────────────────────────────────────────────────
 [✕ Exit to parent journal]                          ← top bar (dim at bedtime)
─────────────────────────────────────────────────────

             BEDTIME CHECK-IN
             Liam · Tuesday
                  ❦

   ╭───────────────────────────────────────────╮
   │ TONIGHT'S CARD              [change card] │
   │                                           │
   │ Something I noticed about you today.      │
   │                                           │
   │ Parent goes first. Pick one specific      │
   │ moment — quiet at dinner, the laugh on    │
   │ the swing, the way they hugged the dog.   │
   ╰───────────────────────────────────────────╯

   MAMA'S TURN                ← dynamic name from auth
   [🎙] [ One thing I noticed about Liam… ]
                  [ ↓ Pass to Liam ]

   ────────  (divider)

   LIAM'S TURN     ← appears after Pass; faded before
   "Mama said: you got really quiet after soccer."
   [🎙] [ What about it? ]

   ────────  (divider)

   Want to add? (skip if you want)
   [+ a feeling]  [+ where in your body]
   [+ about someone]  [Share with…]

           [ Done — Goodnight ]
```

Same skeleton runs the H/L/B card. The card body and inputs change; everything else (masthead, Pass mechanic, sprinkles, Done) stays.

## The cards

### Card A — Parent Reflection (default first card)

| Slot | Content |
|---|---|
| Label | TONIGHT'S CARD |
| Title | *"Something I noticed about you today."* |
| Subtitle | "Parent goes first. Pick one specific moment — quiet at dinner, the laugh on the swing, the way they hugged the dog." |
| Parent input | Single mic + textarea. Placeholder: *"One thing I noticed about [Kid] today…"* |
| Kid quoted-back | "[Parent name] said: [observation]" — rendered as an italic blockquote, read-only |
| Kid input | Single mic + textarea. Placeholder: *"What about it?"* |

### Card B — High / Low / Buffalo

| Slot | Content |
|---|---|
| Label | TONIGHT'S CARD |
| Title | *"High, Low, and Buffalo."* |
| Subtitle | "Best part, hardest part, weirdest random part. Parent goes first." |
| Parent input | Three stacked short inputs (textarea, ~2 rows each). One shared mic captures into whichever slot is focused; if none is focused, mic targets the first empty slot. Placeholders: *"The best part of today was…"* / *"The hardest part was…"* / *"Something weird or random…"* |
| Kid input | Same three slots. Above each kid slot, the parent's matching answer renders as a quoted italic ref (parent's High sits above kid's High input) so modeling is visible at the moment of answering. |

Mic is primary input, textarea is secondary and editable so the parent can trim transcripts before passing.

## Card rotation

```ts
function pickCard(kid: Person, override?: CardKind): CardKind {
  if (override) return override;
  const lastCard = mostRecentBedtimeCard(kid.personId);
  if (!lastCard) return 'parent-reflection';
  return lastCard === 'parent-reflection' ? 'high-low-buffalo' : 'parent-reflection';
}
```

- Strict alternation per kid based on the most recent `checkIn.card` value.
- First-ever check-in defaults to Parent Reflection (strongest single intervention; sets the tone).
- Small "change card" link at the top of the card swaps the choice. Confirmation: *"Switch to H/L/B? You'll start over."* Clears any in-progress parent/kid inputs so we don't end up with half-filled inputs from the other card.
- Per-kid — Liam's history doesn't affect Mia's.
- Cost: one Firestore query at page load (most recent entry for this kid with `checkIn.kind === 'child-bedtime'`).

## Data model

Single journal entry per check-in. Kid stays the subject (existing `child_proxy` author signal preserved). New structured fields under `checkIn`:

```ts
interface BedtimeCheckIn {
  kind: 'child-bedtime';
  card: 'parent-reflection' | 'high-low-buffalo';
  parentTurn: {
    userId: string;          // captured from useAuth() at save
    observation?: string;    // parent-reflection card
    high?: string;           // h/l/b card
    low?: string;
    buffalo?: string;
    voiceText?: string;      // raw mic transcript if used
  };
  kidTurn: {
    response?: string;       // parent-reflection card
    high?: string;           // h/l/b card
    low?: string;
    buffalo?: string;
    voiceText?: string;
  };
  selfFeelings?: string[];   // existing optional sprinkle
  bodySpots?: string[];      // existing optional sprinkle
  relTargets?: Array<{       // existing optional sprinkle
    personId: string;
    feelings: string[];
    voice: string;
  }>;
  timeOfDay: 'night';
}
```

The entry `body` text is composed from both turns so it reads as one coherent moment in the feed:

```
[Parent Reflection] Mama: "You got really quiet after soccer today."
Liam: "I was sad because Coach yelled at Mateo and I didn't say anything."
```

For H/L/B:

```
[High / Low / Buffalo]
Mama — High: walking the dog at sunset. Low: the email from work.
  Buffalo: a hawk landed on our deck.
Liam — High: gym class. Low: spelling test. Buffalo: my pencil broke
  in half by itself.
```

**No migration required.** Existing kid check-ins keep their current shape (`kind === 'child'`); new ones are `kind === 'child-bedtime'`. Both render fine in the journal feed.

**No Firestore rules changes required.** `parentTurn` / `kidTurn` sit under `checkIn` on the existing `entries` collection. Existing `sharedWithUserIds` rule continues to govern read access.

## What changes in existing flow elements

| Element | New role | Why |
|---|---|---|
| 12-emoji self-feelings grid | Optional sprinkle below the card — collapsed chip "+ a feeling" that expands the grid | Kept for the kid who wants to sprinkle an emoji *after* talking. Not deleted — just demoted. |
| Body map | Optional sprinkle — collapsed chip "+ where in your body" | Some nights a body location is the kid's primary signal; keep accessible. |
| Per-person "about someone" multi-target | Optional sprinkle — collapsed chip "+ about someone" | Different reflection mode (relational, not retrospective). Keep accessible but not primary. |
| Voice/textarea on "How are you feeling?" | Replaced by the card's parent-turn + kid-turn inputs | The card's inputs are the new primary mic. The old "tell me something" textarea isn't needed when there's a concrete prompt. |
| Share picker (avatars + Everyone) | Kept as-is, position unchanged | Already works, ships with Plan 3. |
| "Anyone else right now?" sibling picker | Kept as-is | Lets parents batch sibling check-ins. Each sibling gets its own card per rotation. |
| ritualId chip (from couple_rituals) | Kept as-is | Surfaces which scheduled ritual this is, when applicable. |
| Morning/night sun glyph | Removed — replaced with a small fleuron in the masthead | Bedtime is the only mode now. If we add daytime variants later, the glyph returns. |

## Two-parent dynamic

Both parents are physically present at bedtime, but only one leads the formal capture per night. Parents alternate organically — different nights, different lead parent. The leading parent is whoever opens the check-in on their device; their `userId` is captured as `parentTurn.userId`.

Implications:
- The UI label is dynamic — "Mama's turn" / "Papa's turn" / whoever's first name maps to `useAuth().user`.
- The other parent's verbal contributions land in the leading parent's transcript (mic captures whoever's speaking, textarea is editable to clean up).
- No app-side state about "whose night it is." Parents self-organize.

**Emergent benefit** (not engineered, just noted for downstream synthesis): alternating means you'll get both parents' lenses accumulated over time as parallel streams on the same kid. The synthesis layer can later surface "Mama tends to notice X, Papa tends to notice Y" without us designing for it now.

## Bedtime tone / low-light treatment

The check-in is the only page that runs in bedtime mode for v1. Visual differences from the standard cream/ink palette:

- Background shifts from `T.cream` to a deeper, warmer parchment (≈ `#ECE6DE`)
- Card surface uses `T.paper` over the deeper background for the editorial "card on a tabletop" feel
- Lower contrast for body type (text-3/text-4 range instead of ink)
- Pass / Done buttons unchanged in shape, sized slightly smaller (this is a quiet moment)
- Animations: keep transition durations as-is (140–240ms) but avoid scale-bounces on tap; subtle background/border-color shifts only
- One small fleuron (`❦`) in the masthead in place of the sun/moon glyph

Existing design tokens (T.cream, T.paper, T.ink, T.sage, T.ember, T.ruleSoft, T.serif, T.sans) cover all of this; we don't need new tokens for v1. A `--bedtime` variant could be added later if other pages adopt this treatment.

## Edge cases

| Case | Behavior |
|---|---|
| Kid won't respond | Save with empty `kidTurn`. Parent's observation alone is a valid entry. Done button is enabled regardless of `kidTurn` state. |
| Parent skips their turn | Pass-to-Kid is enabled even with empty `parentTurn`. Soft-confirm copy near Done: *"Mama hasn't said anything yet — okay to save?"* No hard block. |
| Multiple kids in sequence | Existing "anyone else right now?" flow works. Each kid hits its own rotation independently — Liam's last card doesn't affect Mia's. |
| Daytime use | Out of scope. `/check-in` is bedtime-only for v1. If daytime variants come later, that's a separate route or a `tone` query param. |
| First-ever check-in for a kid | Defaults to Parent Reflection. No previous `checkIn.card` to read. |
| Change card mid-session | Small link at top of card swaps the choice; confirmation dialog before clearing in-progress inputs. |
| Sync conflicts (two devices) | Last-write-wins (existing pattern, no change). Vanishingly rare at bedtime. |
| ritualId from couple_rituals | Chip renders as today. Doesn't affect card choice. |

## Testing strategy

| Layer | What to cover |
|---|---|
| Unit | `pickCard(kid, override?)` — first-ever path, alternation path, override path |
| Unit | Entry-body composer — both turns → readable body string for both cards |
| Unit | Card switch confirmation behavior — clearing in-progress inputs |
| Integration | Full check-in: parent enters observation → Pass → kid responds → save → entry written with correct `parentTurn`, `kidTurn`, `subjectType: 'child_proxy'`, `sharedWithUserIds`, `checkIn.kind === 'child-bedtime'` |
| Integration | Save with empty `kidTurn` (parent-only) writes successfully and renders in the feed |
| Integration | Soft-confirm dialog appears on empty `parentTurn` at save |
| Manual smoke | Bedtime low-light variant looks right; dynamic parent-name label populates from auth; sibling picker after save still works; ritualId chip when launched from a scheduled ritual |
| E2E (Playwright) | Skipped — blocked by the auth-fixture gap from Plan 2 carryover. Manual smoke covers it for now. |

## Out of scope (Phase 2 ideas)

- **Async parent ↔ kid notes.** Parent writes a short reflection at night, kid sees it in the morning and writes/voices back. Multi-turn over hours/days. Matches the strongest clinical insight (asynchronous + parent reflection removes performance pressure). Bigger surface, separate brainstorm.
- **Additional cards.** Externalized feeling ("Did Worry visit today?"), Story Completion ("There's a kid who…"), Body Check ("Where is today living in you?"). Add once we see signal on the first two.
- **Captured contributions from both parents the same night.** Data model is already `parentTurn` singular; could be widened to `parentTurns: ParentTurn[]` if we want dual-parent same-night capture. Not needed for v1 because parents alternate.
- **Card preferences per kid.** A particular kid might do better with H/L/B than Parent Reflection; allow parents to weight rotation by kid. Wait for usage data.
- **Daytime / non-bedtime variants.** Morning, after-school, weekend. Separate route or `tone` param.

## Open questions

None blocking. The two pieces I want to call out for awareness, not approval:

1. **First-card default vs. random.** Parent Reflection is the default first card because it's the strongest single clinical intervention. If first-night reception is poor for a particular kid, parents can use the change-card link. Not engineering for that case yet.
2. **The change-card link visibility.** Implemented small and quiet at the top of the card. If usage shows parents never change, we can remove it. If they change every night, we should expose card choice more prominently.
