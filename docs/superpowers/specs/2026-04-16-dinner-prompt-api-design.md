# Dinner Prompt API — Design Spec

**Date:** 2026-04-16
**Status:** Draft, approved for planning

## Summary

A small Relish-hosted API that returns one "thing to talk about at dinner" prompt per day for a given household, blending a curated prompt library with occasional AI synthesis from the household's manual + journal data. Symphony hosts a thin wall-kiosk renderer that calls the API directly. Kiosk shows one calm card with one swap button; long-press reports the prompt as inappropriate.

This is the first integration point between Symphony and Relish. It is intentionally small to validate the cross-app contract before larger features.

## Goals

- Surface family context (manual + journal) in a low-effort, ambient way that doesn't require opening Relish
- Give the kiosk something fresh to say each day without being noisy or demanding
- Establish a clean Relish ↔ Symphony API pattern that future features (assessments, growth items, etc.) can follow
- Stay calm: no notifications, no streaks, no "did you talk about this?" follow-ups

## Non-goals

- Real-time multi-user interaction at the kiosk (no voting, no reactions)
- External RSS / news / current-events sources (rejected during brainstorm — moderation cost too high, family voice is more important than topicality)
- A full prompt-authoring UI in Relish (post-MVP — see Future Work)
- Per-person prompts (prompts are household-level)

## Audience and cadence

- **Mon–Thu, Sat–Sun:** kid-friendly prompts, accessible to a 7-year-old, geared for whole-family conversation
- **Fri:** adult prompts (date-night), reflective and sometimes vulnerable
- **One prompt per day**, refreshed at 5pm in the household's local timezone
- Library prompts dominate. AI-synthesized prompts fire **at most twice per week**, only when a "juicy signal" exists in recent journal/manual data (see *Synthesis trigger* below).

## Architecture

```
                                          ┌─────────────────────┐
                                          │   Relish Firestore  │
                                          │  - manuals/journals │
                                          │  - dinner_prompts/  │
                                          └─────────▲───────────┘
                                                    │
┌──────────────┐    HTTPS + bearer token   ┌────────┴───────────┐
│  Symphony    │ ────────────────────────▶ │  Relish Functions  │
│  wall kiosk  │ ◀──────────────────────── │  - getDinnerPrompt │
└──────────────┘                           │  - reportDinner... │
                                           └─────────┬──────────┘
                                                     │
                                              ┌──────▼──────┐
                                              │  Claude     │
                                              │  (synthesis │
                                              │   only)     │
                                              └─────────────┘
```

Symphony has no backend involvement in phase 1 — its role is just hosting the kiosk app and the long-press handler. The kiosk calls Relish directly. This keeps the integration boundary as small as possible.

## API contract

All endpoints are Relish HTTPS Cloud Functions. Auth is `Authorization: Bearer <RELISH_API_KEY>` (phase 1 — see *Auth*).

### `GET /getDinnerPrompt`

Query params: `householdId`, `date` (YYYY-MM-DD, household timezone), optional `include=refs`.

Behavior: returns today's prompt. If none has been generated yet, generates one and persists it before returning.

Response:
```json
{
  "text": "When's the last time you tried something that felt a little scary?",
  "audience": "kid",
  "theme": "courage",
  "source": "synthesized",
  "servedAt": "2026-04-16T22:00:00Z",
  "sourceRefs": {                    // only when ?include=refs
    "journalEntryIds": ["..."],
    "manualAnswerIds": ["..."]
  }
}
```

### `POST /getDinnerPrompt`

Body: `{ householdId, date, swap: true }`.

Behavior: marks the current day-doc's status as `swapped`, picks a new prompt (excluding the previous one), persists, returns. Same response shape.

### `POST /reportDinnerPrompt`

Body: `{ householdId, date, reason?: string }`.

Behavior: writes a `library_overlay` doc flagging the prompt's template (if it was a library pick) so it's excluded from future picks for that household. Triggers a swap. Notifies the user via the existing Relish notification mechanism (see *Open questions* — exact mechanism to be confirmed during planning).

## Synthesis trigger

The default is a library pick. AI synthesis fires only when *all* of the following are true:

1. Fewer than 2 synthesized prompts have been served in the last 7 days
2. At least one journal entry or manual answer in the last 7 days is either:
   - Tagged with a keyword matching the current week's theme (case-insensitive substring match across theme name + 3-5 synonyms per theme), or
   - Flagged emotionally salient by the existing synthesis pipeline (`SynthesizedContent` records with high-salience markers)
3. The signal is from a household member, not from a friend/external observer (avoid surfacing other people's contributions as "your" dinner topic)

When synthesis fires, Claude is given:
- The week's theme and the day's audience
- 1–3 short excerpts from the qualifying journal entries / manual answers (anonymized to first names)
- A system prompt instructing it to write **one** dinner-table question (max 25 words), age-appropriate to the audience, that connects the theme to the family signal without quoting the source verbatim

Claude call is made via Anthropic SDK with prompt caching on the system prompt. Model: `claude-haiku-4-5` (cheap, fast, more than capable for a 25-word generation). Falls back to library pick on any error.

## Data model

### Static library — `src/data/dinner-prompts.json`

```ts
{
  id: string,            // stable, e.g. 'courage-001'
  text: string,
  themes: string[],      // e.g. ['courage', 'trying-new-things']
  audiences: ('kid' | 'adult')[],
}[]
```

Bootstrapped to ~50 prompts via Claude, then hand-edited for voice. Checked into the Relish repo. Themes form a small fixed vocabulary (~8–10): gratitude, courage, silliness, kindness, curiosity, family-history, dreams, etc.

### Firestore — `dinner_prompts/{householdId}/days/{YYYY-MM-DD}`

```ts
{
  text: string,
  audience: 'kid' | 'adult',
  theme: string,
  source: 'library' | 'synthesized',
  sourceRefs: {
    libraryId?: string,
    journalEntryIds?: string[],
    manualAnswerIds?: string[],
  },
  status: 'served' | 'swapped' | 'reported',
  swapHistory: Array<{
    at: Timestamp,
    previousText: string,
    previousLibraryId?: string,
  }>,
  reportedAt?: Timestamp,
  reportedReason?: string,
  servedAt: Timestamp,
}
```

### Firestore — `dinner_prompts/{householdId}/library_overlay/{libraryId}`

```ts
{
  flagged: boolean,
  flaggedAt: Timestamp,
  flaggedReason?: string,
}
```

Per-household overlay rather than a global flag because what's "no-go" varies by family.

### Firestore (future, post-MVP) — `dinner_prompts/{householdId}/saved_prompts/{id}`

For Phase-2 "save AI synth back to library" affordance. Schema mirrors the static library entry plus `savedFromDate` and `savedFromSourceRefs`. Not implemented in MVP.

## Theme rotation

One theme per ISO week, deterministic (hash of `householdId + ISO-week-number` modulo theme list length). Deterministic so the same household sees a stable theme even if the day-doc gets recomputed; varied across households so different families don't all hit "courage" the same week. Adult-Friday theme can differ from the week's kid theme — picked the same way, separate hash with a salt.

## Kiosk UX (Symphony)

Single calm card on the wall display. Almost no chrome.

```
┌──────────────────────────────────────────┐
│                                          │
│   Tonight at dinner                      │  ← small label
│                                          │
│   When's the last time you tried         │  ← prompt, large serif
│   something that felt a little scary?    │
│                                          │
│                                          │
│                                  ↻       │  ← swap button, bottom-right
│                                          │
└──────────────────────────────────────────┘
```

Interactions:
- **Tap ↻** → swap. Brief fade, new prompt appears. No confirmation.
- **Long-press ↻ (1.5s)** → small overlay: "Report this prompt as inappropriate?" with Cancel / Report. On Report: prompt fades out, swap fires, flag is recorded.
- **No accept button.** Implicit accept = it sits on the wall.
- **No source attribution shown on the kiosk.** A separate Symphony settings view can fetch with `?include=refs` for the curious.
- Adult-Friday gets a slightly different accent color so the family feels the shift.
- Refresh: kiosk re-fetches at 5pm local + on every app foreground.

Visual treatment defers to the `kiosk-design` skill when the kiosk component is built — warm/calm palette, large readable type at arm's length, no animation that competes for attention.

## Auth

**Phase 1: shared secret.** Symphony stores `RELISH_API_KEY` as an env var, sends as `Authorization: Bearer <key>`. Cloud Function validates against a secret in Firebase Functions config. Per-household scoping: an `allowed_households` list is associated with the API key in a Firestore `api_keys` collection; requests with a `householdId` not in that list are rejected.

**Phase 2 (defer until phase 1 hurts): Firebase service account.** Symphony gets a service account, signs requests with a Firebase ID token, function uses Admin SDK to verify and look up authorized households. Cleaner, but more setup. Migrate when we add a second Symphony→Relish endpoint.

## Error handling

- **Synthesis Claude call fails / times out** → fall back to library pick, log to Cloud Function logs, no user-facing error
- **No library prompts match audience+theme after exclusions** → relax the 30-day exclusion window first, then drop the theme constraint, last-resort pick any audience-matching prompt
- **Symphony cannot reach Relish** → kiosk shows the *previous day's* cached prompt, with no error UI (calm degradation). On regaining connectivity, kiosk silently refreshes.
- **Invalid API key / unauthorized household** → 401/403, kiosk shows a one-time setup-help message ("Relish connection needs attention — check Symphony settings"). Not a user-facing crash.

## Testing

- Unit: synthesis trigger logic (the "juicy signal" predicate), theme rotation determinism, library-overlay exclusion
- Integration: full `getDinnerPrompt` flow against Firestore emulator, with seeded journal entries that should/shouldn't trigger synthesis
- Manual: end-to-end on a real household with the kiosk hitting the deployed function

No need to mock Claude in integration tests — use a fake `synthesize()` that returns a canned string when a flag is set.

## Future work (explicitly out of scope for MVP)

- "Save AI synth back to library" affordance — once we see what kinds of synthesized prompts are good, build a one-tap save (probably from the Relish side, not the kiosk)
- Phase 2 auth (Firebase service account)
- Seasonal themes (Thanksgiving week → gratitude; school-year-start → courage)
- Per-kid or per-adult prompts (vs household-level)
- Letting the user edit the static library through Relish UI
- Letting the user pick "tonight feels like a [theme] night" override from the kiosk

## Open questions

None blocking. The notification mechanism for the inappropriate-report path is "whatever Relish already does for synthesis events" — to be confirmed during planning.
