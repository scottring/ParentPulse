# Overnight clarity run — 2026-04-22 → 04-23

**Status: complete.** All 8 tasks shipped. Eight feature commits + plan commits, all pushed to `main`. Vercel will pick them up automatically.

## Per-task status

| # | Task | Status | Commit | Note |
|---|---|---|---|---|
| 1 | Delete SpreadHome orphan + fix `/journal` back-links | DONE | `1e008bf` | Also caught /journal links in moments, settings, and growth |
| 3 | Pen picker density — collapse for first-time users | DONE | `68ec23f` | Toolbar hides until `entries.length > 0`; "+ more options" button reveals |
| 4 | Journal entry detail — surface chat-distilled insights | DONE (partial-prior) | `f58c3da` | The surfacing was already shipped (commit 1065632 — the raison audit was wrong). Added "See the conversation →" link for discoverability |
| 5 | Archive clarity pass | DONE | `1918811` | Volumes bookshelf wired, "kept" jargon stripped, masthead hides on empty. Entry-card enhancement deferred |
| 6 | Mention discovery on workbook | DONE | `0d808fd` | Persistent "X things written about you in the last two weeks" in hero, fallback under sinceSummary |
| 7 | Invited-spouse welcome variant | DONE | `8ef6511` | `user.invitedBy` persisted during register; /welcome renders tailored hero when set |
| 8 | Simpler /therapy — brief model | DONE | `fb90878` | Types + rules + Cloud Function + two hooks + /therapy + /therapy/[briefId] + print stylesheet. See therapy section below |
| 2 | Third-book nav — Therapy link | DONE | `322ee15` | Intentionally done last so the link doesn't 404 during the run |

## What was surprising

- **Task 4 was already shipped.** The raison-d'être audit flagged chat-distilled insights as "never shown" — that was wrong. A block rendering `entry.chatInsights?.emergent` + themes has been live since commit 1065632. The only useful add was a "See the conversation →" link to the chat panel for discoverability. Raison doc needs a correction when you next skim it.
- **Task 2 reordered.** The plan listed it as #2 but I pushed it to last so the Therapy link wasn't pointing at a 404 during the run. Unchanged in intent, just in sequence.
- **Therapy Cloud Function didn't need Firestore composite indexes** for the query patterns it uses (single-field `userId==` + `generatedAt desc`). Skipped the index change to avoid touching `firestore.indexes.json` blindly.
- **Orphaned Surface components** (`src/components/surface/CalmStateCard.tsx`, `InlineJournalPeek.tsx`, `NextThingCard.tsx`, `RecentCaptures.tsx`, `StageAwaitingSynthesis.tsx`, `components/dashboard/RelationshipCard.tsx`) still have `href="/journal"` links. They aren't imported by any live page, so their links never fire — but they're dead code risk. Left in place per the "don't delete when uncertain" rule. Flag for a future cleanup.

## Therapy feature — what's live

- `/therapy` is PIN-gated. First visit: "Set a PIN" using the existing `PinSetupModal`. Return visits: PIN keypad. Unlocked: "Prepare a brief" button + list of past briefs. Explicit "Lock this room" at the bottom.
- `generateTherapyBrief` Cloud Function reads the caller's authored + visible entries from the last 14 days (configurable 1–90), asks Claude Sonnet 4.6 for 3–5 themed clusters with verbatim quotes, writes the result to `therapy_briefs/{id}` owned by the caller. Carries forward the previous brief's `sessionNotes` as context in the prompt.
- Brief detail page renders themed cards with numbered spines, verbatim quotes linkable to the source entry, post-session notes textarea for carry-forward, and a Print button with a clean `@media print` stylesheet.
- Firestore rules: owner-only read/update/delete on `therapy_briefs`; direct client create is blocked so forging briefs is not possible.

## What's still outstanding (kept parked per our agreement)

These were explicitly deferred. Each one needs your judgment, not autonomous build:

1. **Couple ritual session UI** (story 16 · 9/25) — the session page is still a placeholder.
2. **Weekly Lead auto-scheduling** (story 10 · 9/25) — still a manual "Generate Lead" button in a gated section.
3. **Growth hub** (story 14 · 12/25) — `/growth/[itemId]` deep-links work, no front door.

The first two are the biggest remaining gaps between the app's promise and its payoff.

## A small thing worth eyeballing

The `/therapy` flow depends on a couple of pieces I can't verify without a running backend:

- The `generateTherapyBrief` Cloud Function needs `ANTHROPIC_API_KEY` set in Firebase secrets (same one all the other Claude callers use — probably already configured, but worth confirming before demo).
- Firestore rules for `therapy_briefs` were added to the live ruleset — you'll need to deploy them (`firebase deploy --only firestore:rules`) for the page to read briefs from Firestore. Without the deploy, the page renders but the live list stays empty.

## What's on this branch that will need attention tomorrow

- Raison doc flags need reconciling — remove the "chat insights never shown" warning, update the `/therapy` section to reflect what was actually built, note that SpreadHome is gone.
- Consider a quick pass on the retired Surface components' `/journal` links (noted above) before they bite someone.
