# Relish: four places (Home, Do something, Your book, Family)

Approved by Scott 2026-11-18 after a screen-by-screen review. Goal: the app is
organized into **four places** and feels playful, with gentle guidance. Today a
book has 10 views and 6 modals plus the family library; that is the problem.

Approved mockups (static HTML+inline styles, the visual target, match them
closely in look, copy and behavior): `docs/design/2026-11-18-four-places/`
- `Main.dc.html`: top bar + Home
- `DoSomething.dc.html`: Do something
- `YourBook.dc.html`: Your book
- `Family.dc.html`: Family

(They are "Design Component" files: markup in `<x-dc>`, logic in the
`<script type="text/x-dc">` class. Read them for layout, copy, colors and
interactions; do not ship that format.)

## Decisions (locked)

1. **Top bar**: `relish` wordmark (goes to Home) · Home · Do something · Your
   book · Family · one round "initial" button opening a small menu with
   Settings, Sound, Help, Lock. Remove Activities / Your pages / Play together /
   Editions / Connect editions / gear / separate Lock / the "Family library"
   sync-status link / chapter nav + chapter footer. Sub-screens (an open
   exercise, the journal editor, a guided-reflection session, the manual, a game
   in progress) still exist but highlight their parent place in the top bar.
2. **Home** (new default view): greeting, one "Try this today" suggestion with
   "Show me another", four time/mood tiles (1 minute, 5 minutes, With the kids,
   Something's hard) that open Do something pre-filtered, "Your people"
   (children's books + "Invite a partner"), "Lately in your book" (3 latest kept
   pages; links to Your book).
   - Suggestions come from a **hand-written rotating list** fitted to the book's
     audience/age (no AI). New module `src/lib/relish/nudges.ts` + tests. Each
     nudge has text, why, time, and an action that maps to an existing flow
     (journal entry, a specific exercise id, a game kind, guided reflection).
3. **Do something**: one screen merging Activities + the Tools catalog + game
   choice. Filter chips: Everything, 1 minute, 5 minutes, With the kids,
   Something's hard. One color-coded grid (Write / Exercise / Game / Think /
   Habit). Journal → existing quick entry. Exercise → open that exercise in the
   existing Tools flow (add an initial-exercise prop). Think it through →
   existing guided reflection `start()`. Game → a bottom sheet: game first,
   players pre-filled from the family (the adult + children's names known to the
   account/book), tap to leave someone out, "+ Someone visiting", Start. Tags
   for filtering live next to the catalog data (`tools.ts` / play content), not
   hard-coded in the component.
4. **Your book**: one screen. Person chips (Everyone, Me, each person, Our
   family) filter it. Sections: "What you've learned" (kept manual cards, with
   ONE pending AI suggestion at a time: "Yes, keep it" / "Not quite" using the
   existing manual review functions; the AI opt-in flow stays reachable from
   here when not enabled), "Still going" (journal drafts + pending practice
   plan), "Every page" (all kept pages, color-coded by kind, search; opening one
   uses the existing Journal reader). The old People and Practice-plans views
   fold into this; the Family album moves to Family.
5. **Family**: big person cards for each child book (open that book), "Invite a
   partner" (opens the existing ConnectedEditions invite flow, presented as the
   3-step sheet from the mockup), "+ Add a child" (existing library flow).
   "Passed between you" = received + sent passages from ConnectedEditions.
   "Family album" = `book.album` + `l.sharedPages` (+ resume an unfinished
   game). Leave-family and delete-account move behind Settings.
6. **No lock for play/album**: opening a game or the album no longer puts the
   private book away or requires the password to return. While a round is in
   progress the game screen is focused (no top bar) with an "End game" control
   back to Do something. Lock stays available in the menu, and auto-lock (30 min
   idle / 15 min hidden, already committed) still applies.
7. **Landing + library**: after sign-in Relish opens the account owner's own
   adult book (Home), not the family library. In the family library: owner's
   book first, hide "Sign in once…" copy when signed in, remove "Refresh
   library", hide "Add my book" when the owner already has one.

Out of scope now: iPhone Duo-specific layouts (next project; keep everything
responsive and safe-area aware so it works at 382px outer and ~670px inner
widths), any storage schema change, AI behavior changes, Firestore rules,
production deploy.

## Phases (commit after each, tests green)

1. Shell: views `home | do | book | family` + sub-screens; new top bar + menu;
   Home as default; remove the dead nav. Keep every existing flow reachable.
2. `nudges.ts` + Home.
3. Do something (+ game sheet, + Tools initial-exercise prop, + catalog tags).
4. Your book.
5. Family (needs the account's child books from `useBookSync().books` passed
   down from `RelishApp`; reuse AccountLibrary's open-a-book logic, don't
   duplicate auth/crypto).
6. No-lock play/album; landing on own book; library fixes.
7. Clean-up: delete now-unused views/CSS, update the help text, update
   `docs/RELISH-REBUILD.md` with the new structure.

## Constraints

- Read `AGENTS.md` (this Next.js version differs from training data).
- Don't change the storage schema, encryption, sync protocol, or privacy rules
  beyond decision 6. Children's private pages must never show in a parent's
  Your book; a parent sees a child's book only by opening it as today.
- Tests: `npx vitest run --config vitest.relish.config.ts`, `npx tsc --noEmit`,
  `npx eslint src/components/relish src/lib/relish`. Update tests that assert
  the old nav/copy; add tests for nudges, filtering and the new views.
- Browser check locally: `npm run dev:local` (http://127.0.0.1:3210/relish/),
  using the built-in **sample book** (fictional people, no password). Check
  widths 1280, 670 and 382. Never use real account credentials.
- Fonts/colors: use the app's existing tokens (`relish.css`: --paper, --ink,
  --muted, --line, --olive, --serif, --sans) and add the mockup's accent colors
  as tokens. Text contrast ≥ 4.5:1. Touch targets ≥ 44px. No emoji.
- Commit on branch `relish/four-places`. Do not push, open a PR, or deploy.
