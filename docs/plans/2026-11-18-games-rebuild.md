# Rebuild the games (and the first check-backs) so each has a real ending

Source: `docs/design/2026-11-18-activity-audit.md` (read it first: verdict,
scorecard and redesign cards). Scott, 2026-11-18: "yes remember answers, but for
all games we need a place for reflection from each 'player' who wants to reflect."

## Decisions (locked)

1. **Remember game answers across rounds.** Today answers are only kept when
   every player approves a shared page. Now each finished round stores its
   answers with the play record in the book the game was played in, so Relish
   can show patterns over time (e.g. Same page? "you matched more often this
   month", "you differ most on weekend plans"). Say so plainly at game start:
   "Relish remembers this round's answers in <owner>'s book so you can see how
   you match over time." Answers are never sent to AI. The existing approval
   flow for a **shared page with everyone's words** stays as is.
2. **Every game ends with an optional reflection from each player.** After the
   reveal: "Anything to remember about this round?" Each player can write a
   line (or pass); passing is easy and the default. Reflections are saved with
   that round under each player's name in the book the game was played in and
   are visible to everyone who played (Your book → the game's row; Family album
   when a shared page exists). A player only ever writes their own.
3. **Finish for now stays a complete ending.** Reflections and keeping a page
   are offers, not steps you must do.

## Build, in this order (commit after each)

1. **Same page?** per the audit card: a round of 5 questions (age-fitted, from
   the existing content plus new ones), everyone answers in private per
   question, reveal shows matches per question and a total ("You matched on 3
   of 5"), then where you differ. Uses remembered answers to add a light trend
   line when there are earlier rounds with the same players.
2. **Guess my small joy** per the audit card: players take turns being the one
   guessed about, the reveal shows who guessed right, a simple tally across the
   round, more age-fitted choices.
3. **One story, many voices**: give it an ending: a short read-back of the whole
   story and a title the group picks.
4. **Player reflections** for all three games (decision 2).
5. **Check-back** for Plan a repair, Rewrite the opener and What's under the
   behavior?: reuse Think it through's recall ("You planned to … Did you get a
   chance?" with Yes / Not yet / Let it go), shown a few days later on Home or in
   Still going.

## Rules

- Storage: all new fields optional; validators accept old and new shapes and
  reject malformed data; bounded sizes (cap stored rounds, e.g. the newest 100);
  tests for old/new shapes and an encrypt/decrypt round trip; no rewrite
  migrations. Children's private pages never appear in a parent's views.
  Remembered answers live only in the hosting book.
- Follow Scott's editorial rule (docs/plans/2026-11-18-editorial-pass.md) and
  the existing look (ui.css/ui.tsx, watercolors). Keep passing easy, previous
  answers covered between turns on a shared device, and the tabletop mockup in
  mind (top half faces the room, bottom half private).
- Tests: `npx vitest run --config vitest.relish.config.ts`, `npx tsc --noEmit`,
  `npx eslint src/components/relish src/lib/relish`. Browser check with the
  sample book at 1280 and 382 px. No real credentials. Do not push or deploy.
