# Your book = everything relevant to you

Scott, 2026-11-18: "Your book / your pages is really a compendium of all
activities relevant to you. Your journal entries for sure, but also games
you've played with your family, exercises you've gone through with family
members, insights about your interactions with different family members."

Today three things fall short. Fix all three. Base: `origin/main` (includes
the four places, the book-style editor, rename, keyboard sound).

## Gap 1: games leave no trace unless a page was kept

A game only produces a book page when every player approves keeping one.
Add a light **play record** when a round finishes (kept page or not): game
kind/title, player names (as already stored on the game), date, and whether a
page was kept. **No game answers or private text** in the record. Show it in
Your book's "Every page" (kind "Game", e.g. "Same page? with Ella and Kaleb")
and let the person filter pick it up (a record "involves" a person when that
person is among the players). If a kept page exists for that round, show the
kept page instead of a duplicate record.

## Gap 2: exercises are labelled "Journal entry" with no one attached

`keepToolPage` (src/lib/relish/tools.ts) writes the exercise result as a
journal page. Mark these pages as exercises (e.g. an optional
`source: { kind: "exercise", toolId }` on the journal entry) so `bookPages`
labels them "Exercise" (with the exercise's name) and Do something / Your book
color them as exercises. When keeping an exercise page, ask **"Who was this
with?"** using the same person chips as the journal's Tag people (optional;
"Just me" is fine). Store it in the entry's existing `people` tags.

## Gap 3: insights are only "Me" or "Our family", not per person

Manual cards (src/lib/relish/manual.ts) have scope personal|family and a list
of source pages. Attribute a card to a person **without changing AI
behavior**: a card belongs to person X when its source pages are tagged with
X (all sources, or a clear majority — pick a simple, tested rule). Your book's
person chips (Me / each person / Our family) then filter "What you've learned"
correctly, and a card shows the person's name. Do not change prompts, models,
or what is sent to AI.

## Rules

- **Storage compatibility is the hard constraint.** Every new field is
  optional; existing books must open unchanged; the validators (`isBook`,
  `isJournal`, living/manual validators) must accept both old and new shapes
  and still reject malformed data. Add tests for old-shape and new-shape books
  and an encrypt/decrypt round-trip. No migration that rewrites existing data.
- Children's private pages never appear in a parent's book; a play record in a
  parent's book holds only names, game kind, date.
- Read AGENTS.md. Tests: `npx vitest run --config vitest.relish.config.ts`,
  `npx tsc --noEmit`, `npx eslint src/components/relish src/lib/relish`.
- Browser check with the sample book (`npm run dev:local`,
  http://127.0.0.1:3210/relish/, "Explore a sample book"; never real
  credentials): finish a game without keeping a page → it shows in Your book;
  keep an exercise with a person → labelled Exercise, filtered under that person;
  person chips filter What you've learned. Extend the sample book data if it
  lacks examples.
- Commit on branch `relish/compendium` (created from origin/main). Do not push,
  open a PR, or deploy.
