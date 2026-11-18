# Relish: one look, every screen

Scott, 2026-11-18: "Revamp all of the pages… All of the different screens should
be of the same stuff. We want this to seem like a contiguous, beautifully
designed, cohesive website/app."

## The look (from Scott's own mockups; view them)

- Journal editor as an open book:
  /private/tmp/claude-501/-Users-scottkaufman-Documents-scotts-world/fd88a882-7111-4e53-b218-383b3207ba22/images/5.png
  (already built: `relish/book-editor`, now on main)
- Exercise start screen (Repair bingo): …/images/6.png (built on `relish/compendium`)
- Connected books dialog: …/images/7.png (built on `relish/compendium`)
- **Kids' book Home** (Kaleb): …/images/8.png (NOT built yet)
- The four places approved earlier: docs/design/2026-11-18-four-places/*.dc.html

Shared language: warm cream paper (#f6f4ed / #f8f5ec), paper cards with soft
shadow (some torn-edge), open-book spreads for anything written or read;
Literata serif headings (big, 600), italic serif for dates and quiet notes, IBM
Plex for instructions; olive #43513a for the main action (rounded rectangle) and
pills for choices; accents sage #cfdcc4, butter #f2d58a, peach #e9b9a0, sky
#c9d9e3, lilac #e4d6ea; "← Back to …" top-left and a lock "Your private pages"
top-right on sub-screens; one clear main action per screen; choices as chips; a
quiet tool row at the bottom; gentle, playful, slightly tilted cards; a small
illustration on most screens.

## Steps

1. **Inventory.** List every screen, dialog and state a person can reach
   (adult book, child book, signed out, locked/local book, shelf, new book,
   restore backup, sample book, settings, edition & parent settings, help,
   manual + AI opt-in, guided reflection steps, practice plan, game setup →
   turns → reveal → keep → finished, exercise run + kept, journal reader,
   voice recorder, photo picker, connected books, family library, invite,
   add a child, verify email, parent password, errors/empty states). Write it
   to `docs/design/2026-11-18-screen-inventory.md` with a note of what each
   needs. Commit.
2. **One design system.** Put the tokens and shared pieces in one place
   (e.g. `src/components/relish/ui.css` + small components such as
   `PaperCard`, `BackLink`, `PrivateNote`, `Chips`, `PrimaryButton`,
   `BookSpread`, `Illustration`). Replace the older blue-grey palette
   (`living-book.css`, `journal.css` `--rj-*`, `relish.css`) at the source so
   leftovers can't show through. Commit.
3. **Illustrations.** An `Illustration name="…"` component: renders
   `/illustrations/relish/<name>.png` when that file is listed in a small
   manifest, otherwise a simple inline SVG sketch in the same palette
   (aria-hidden). Names and subjects: Scott's list in
   `/Users/scottkaufman/Documents/scotts-world/outputs/relish-watercolor-list.md`
   (read it; use exactly those file names). No images fetched from the web.
4. **Kids' Home** per image 8: the child's cloth-cover book (name drawn in
   code over the cover, emblem from a small set; default by first letter or a
   stored choice only if the model already has a place for it; otherwise
   pick deterministically and note it), "Hi, <name>. What did you notice
   today?", Write / Record / Add a photo, "Open my book", one kid suggestion on
   a sage banner with Start / Show me another (use the existing age-banded kid
   nudges; add "Kindness spotting" for 6–12 if missing), and a "More to try"
   row (exercise, game, think it through). Adult Home unchanged in structure.
5. **Restyle every screen** from the inventory, one commit per area. Keep all
   behavior, copy meaning, privacy safeguards, consent steps and confirmations.
6. **Check** each area at 1280, 669 (iPhone Duo unfolded) and 382 (folded)
   widths with the sample book; no horizontal scroll; contrast ≥ 4.5:1; touch
   targets ≥ 44px; prefers-reduced-motion respected.

## Rules

- Branch `relish/revamp`, created from `relish/compendium` (unmerged work that
  must be kept). Commit often. Do not push, PR or deploy.
- No storage-schema, encryption, sync, Firestore-rule or AI-behavior changes.
  Children's private pages never appear in a parent's views.
- Read AGENTS.md. Tests: `npx vitest run --config vitest.relish.config.ts`,
  `npx tsc --noEmit`, `npx eslint src/components/relish src/lib/relish`. Update
  tests that assert old copy/markup; add tests for Illustration fallback and the
  kids' Home.
- Browser: `npm run dev:local` (http://127.0.0.1:3210/relish/), sample book only,
  never real credentials. Headless Playwright from the project is fine for
  screenshots. Signed-in-only screens: render with mocks as done before.
