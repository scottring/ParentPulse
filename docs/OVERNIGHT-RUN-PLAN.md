# Overnight clarity run — 2026-04-22 → 04-23

**Mission:** complete eight clarity/cleanup tasks autonomously while Scott sleeps. Each task gets its own commit. When the run finishes (or the type-check fails repeatedly), this file gets updated with a final status summary and deleted in the morning.

**Scope discipline:** nothing on this list is a new feature. Every task is either jargon/copy, routing, empty-state, dead-code removal, or surfacing data the app already computes. Full-feature builds (couple session, weekly-lead auto-generation, growth hub) are deferred per Scott's explicit instruction.

## Methodology reminders

- `docs/RAISON-D-ETRE.md` is the reference for intent-per-surface.
- `docs/FLOWS-AUDIT.md` is the scoring reference.
- Memory folder has the full set of feedback rules — especially:
  - `feedback_plain_language_ctas.md` — no "library/volume/kept/ember pip/dossier"
  - `feedback_preserve_editorial_look.md` — never touch the visual language
  - `feedback_flow_cleanup_methodology.md` — the page-by-page cleanup steps
- Default rule when uncertain: **don't delete**. Surface it in the summary instead.
- Italic serif is for display only. Body/input text is DM Sans.
- Book voice for atmosphere; plain language for decisions.
- After every file change: run `npx tsc --noEmit -p .` (excluding test files) — clean or skip the task.
- Commit per-task, clear message, push to main after every commit.
- If any single task fails type-check or hits something ambiguous, mark it `[SKIP]` with a one-line reason and move on. Do not block.

## Task order (lowest risk → highest)

### 1. [DONE] Delete SpreadHome orphan + fix "← The Journal" back-links
_Also caught 3 other "/journal" back-links in moments, settings, growth. Commit 1e008bf._
- Confirm `SpreadHome` isn't imported anywhere with a grep (exclude `__tests__`).
- Delete `src/components/spread-home/` directory.
- Find every "← The Journal" back-link (grep for the literal string and for `href="/journal"` in contexts where it reads as a back link). In `src/app/journal/[entryId]/page.tsx` and anywhere else, change to "← Back" linking to `/workbook`.
- Commit: `chore(journal): remove SpreadHome orphan; fix back-links to /workbook`.

### 2. [TODO] Third-book nav — add Therapy link
- In `src/design/shell/TopNav.tsx`, add a "Therapy" link after "The Archive" when user is signed in.
- Link target: `/therapy` (stub page will exist after task 8).
- Mirror the existing nav styling exactly.
- Commit: `feat(nav): surface /therapy as a third destination alongside Workbook/Family/Archive`.

### 3. [DONE] Pen picker density — collapse advanced pickers by default for first-time users
_Toolbar hides until entries.length > 0; "+ more options" button reveals. Commit 68ec23f._
- In `src/components/capture/CaptureSheet.tsx`, find the four pickers above the textarea (category, visibility chips, person mentions, media/voice — verify exact structure first).
- Add an `expanded` local state that defaults to `false` when `entries.length === 0` (first-time user), `true` otherwise.
- Add a small "+ more options" button that toggles `expanded`.
- When collapsed, show only the textarea + save button.
- Check: existing tests shouldn't break. If they do, mark SKIP.
- Commit: `feat(capture): collapse Pen pickers by default for first-time users`.

### 4. [DONE] Journal entry detail — surface chat-distilled insights
_Surface was already shipped in commit 1065632 (raison audit was wrong). Added "See the conversation →" link for discoverability. Commit f58c3da._
- `src/app/journal/[entryId]/page.tsx` already receives `entry.chatInsights` from the entry.
- Verify the field exists on `JournalEntry` type; if not, find where it's written (`distillChatToInsights` callable or similar) and match that shape.
- Render insights as small "Claude noticed" chips below the entry body (above the chat section).
- Each chip: a short italic phrase with a subtle border. If a source turn is known, link "(why?)" to open the chat panel scrolled to that turn (best-effort — if not trivially wireable, just render the chip without the source link).
- Empty state: if `chatInsights` is null/empty, render nothing.
- Commit: `feat(journal): surface chat-distilled insights as "Claude noticed" chips`.

### 5. [DONE] Archive clarity pass
_Volumes bookshelf wired, "kept" stripped, empty-state hides stats. Entry-card enhancement deferred. Commit 1918811._
- `src/app/archive/page.tsx` — strip any remaining jargon in the masthead and hero. "The Archive · everything kept" → "The Archive · read back through it." "kept" → remove.
- Wire up the existing `Volumes.tsx` bookshelf component if it exists. Import from `src/design/manual/Volumes.tsx` (or wherever it lives — confirm via grep). Add it above the year/month groupings with a heading like "By year." Pass the grouped entries in.
- Entry cards: verify they show at minimum title + date + mentioned people. If missing any, add.
- Empty state: if zero entries, show a warm "Your archive fills up as you write. The first entry becomes page one." without the masthead stats (hide the 4-cell strip when `entries.length === 0`).
- Commit: `feat(archive): clarity pass — wire Volumes bookshelf, strip "kept" jargon, warm first-run`.

### 6. [DONE] Mention discovery on workbook
_Persistent "X things written about you in the last two weeks" dispatch in hero, fallback when sinceSummary is absent. Commit 0d808fd._
- Currently `sinceSummary` only appears when the user re-enters the app and there are new mentions since last visit. That's good for returning users but weak for the "3 new things written about you" dispatch the audit calls out.
- Compute a persistent `mentionsAboutMe` count: entries written by others that mention the user, regardless of last-visit timestamp, in the last 14 days.
- Add a new dispatch card in the workbook (above the feature row): "Written about you · {count} this week". Link to the oldest unread one. Only rendered when count > 0.
- Commit: `feat(workbook): persistent "written about you" dispatch card`.

### 7. [DONE] Invited-spouse welcome variant
_user.invitedBy persisted during invite-claim; /welcome renders tailored hero. Commit 8ef6511._
- Detect when a newly-registered user arrived via invite: their `familyId` was pre-existing (i.e., `createUserOwnManual` claimed an unclaimed Person instead of creating a new family), OR check the `pendingInvites` history for the email.
- The cleanest signal: on register, we know if `existingFamilyId && pendingInvite` was true (see `AuthContext.register`). Persist an `invitedBy: { userId, name }` detail on the user document during this branch.
- In `src/app/welcome/page.tsx`, when `user.invitedBy` is set, render a different hero:
  - "Welcome, [FirstName]. [InviterFirstName] invited you."
  - "You've been added to the [FamilyName] library. [InviterFirstName] has already started writing — their own words are here, and they've shared a few pages with you."
  - Button: "See what's already here ⟶" → `/workbook`.
  - Smaller: "Start my own page ⟶" → `/people/[selfPersonId]/manual/self-onboard`.
- Commit: `feat(welcome): dedicated arrival for invited spouses/partners`.

### 8. [TODO] Simpler `/therapy` — brief model
This is the biggest task; saved for last.

**Collection:** `therapy_briefs` — `{ briefId, userId, generatedAt, daysBack, themes: [{ id, label, summary, quotes: [{ entryId, snippet }] }], sessionNotes?: string, createdAt }`.

**Firestore rules:** owner-only read/write on `therapy_briefs` by `userId`. Append to `firestore.rules`, don't wholesale rewrite. Match the pattern used for other owner-scoped collections.

**Cloud Function:** `generateTherapyBrief({ daysBack = 14 })` in `functions/index.js`:
1. Read the caller's journal entries, synthesis updates, and open threads from the last `daysBack` days.
2. Build a prompt asking Claude (use Sonnet 4.6) to return 3–5 themed clusters with verbatim quotes. Response schema documented in the prompt.
3. Write the brief doc to `therapy_briefs/{briefId}` with `userId: context.auth.uid`.
4. Return the `briefId`.

**Frontend:**
- `src/hooks/useTherapyBriefs.ts` — list recent briefs for the user.
- `src/hooks/useTherapyBrief.ts` — load a single brief.
- `/therapy/page.tsx` — PIN-gated index: "Prepare a brief" button + list of past briefs.
- `/therapy/[briefId]/page.tsx` — brief detail: themed clusters rendered as cards (reuse CSS from `therapy-prep` branch where feasible — `git show therapy-prep:src/components/therapy/therapy.module.css` and port the relevant classes).
- PIN gate: wrap the therapy pages in the existing `usePrivacyGate` / `PinSetupModal` if that infra exists on main; otherwise mark the PIN piece as `[SKIP]` and leave the page open — a follow-up can add the gate.

**Keep this task modular** — if the Cloud Function portion hits a real issue (API key missing, prompt failing, etc.), commit the frontend scaffolding separately and mark the function piece `[PARTIAL]` with a clear note.

- Commits (multiple OK):
  - `feat(therapy): types + rules + indexes for therapy_briefs collection`
  - `feat(therapy): generateTherapyBrief cloud function`
  - `feat(therapy): /therapy route with PIN gate and brief list`
  - `feat(therapy): /therapy/[briefId] brief detail view with themed clusters`

## Stopping conditions

Stop when:
- All 8 tasks are marked `[DONE]` or `[SKIP]`, OR
- Three consecutive commits fail type-check (something's wrong, wake up), OR
- Any destructive operation would be required (DO NOT force-push, DO NOT delete untracked work).

## Final action

When the last task is handled, write a one-screen summary to this file replacing the task list — per-task status, what was skipped and why, any regressions noticed. Commit the summary (`docs(overnight): run summary for 2026-04-22`), push, and stop the loop.
