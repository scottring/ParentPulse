# Next session — simplify Relish so a first-time user gets it in 30 seconds

Copy everything below into a new Claude Code session.

---

Hi Claude. Starting a new session. Orient, then we'll work.

## Context on Relish

Relish is a family journal webapp at **relish.my** (codebase at
`/Users/scottkaufman/Developer/Developer/parentpulse-web`). Stack:
Next.js 16 App Router + React 19 + Firebase (Auth, Firestore, Cloud
Functions, Storage). Firebase project `parentpulse-d68ba`. Deployed
to Vercel auto-on-push-to-main.

The product is structurally ambitious: multi-perspective entries,
scheduled rituals, weekly AI dispatches, per-entry coaching chats,
auto-generated practices, 20-dimension assessment framework, three
rooms, etc. Behind the scenes it works. The UX loop is mostly
wired. But:

**The problem we're solving this session: Relish is too jargon-y
and too complicated on the surface.** A first-time user is bombarded
with terms: *Workbook, Family Manual, Archive, Pen, Moment, Open
thread, Weekly Lead, Weekly Brief, Echo, Pattern, Dispatch, Ritual,
Practice, Growth Item, Arc, Keep, Synthesis, Divergence, Emergent,
Ring, Dimension, Domain.* Even when you read a careful written
overview, the vocabulary is exhausting. An independent user opening
the app will bounce.

The backend complexity is fine — it's what makes the magic work.
The **front** must be stupid easy or the product is doomed before
it starts.

## Required reading before we begin

Read these in order. They're the ground truth for what's actually
shipped:

1. `/docs/RELISH-OVERVIEW.md` — comprehensive product description
   written for NotebookLM. It's the overview that *revealed* the
   jargon problem. Use it as the map, but treat every term in it as
   a candidate for renaming or deletion.
2. `/docs/DESIGN-VISION.md` — if it exists, the editorial / book /
   paper aesthetic is important context.
3. `/src/app/workbook/page.tsx` — the Workbook home page. Most of
   the user-facing terminology surfaces here.
4. `/src/app/manual/page.tsx` — the Family Manual.
5. `/src/app/archive/page.tsx` — the Archive.
6. `/src/components/capture/CaptureSheet.tsx` — the Pen (capture).
7. `/src/components/layout/GlobalNav.tsx` — top nav naming.
8. `/src/lib/open-threads.ts` — how "open threads" are defined.

Look at the app in a browser too. `npm run dev` runs on
`localhost:3000`. Sign in as `smkaufman@gmail.com` (Scott). The
Workbook page is the canonical first-impression surface.

## What "done" means

By the end of this session, every term a user sees in the app should
pass this test:

> Could my mother (non-technical, not a journal-app person) read
> this word once and know what it means?

Secondary test:

> Does the app's explanatory copy use more than 40 distinct nouns
> the user has to learn? If yes, collapse or delete.

We will produce:

1. **A terminology audit document** listing every user-facing term,
   its current definition, and a proposed plain-English replacement
   (or a vote to delete the feature). Format: a table.
2. **A prioritized change list** — the 5-10 most-impactful renames /
   removals / flow simplifications.
3. **The first batch of changes, actually implemented and deployed**,
   against the highest-priority items.

## How to approach it

Go **screen by screen** as a first-time user would. For each screen:

1. Open it in a browser. Screenshot or describe what a user sees.
2. List every term on the screen that requires prior knowledge.
3. For each term, propose a plain-English alternative.
4. Identify any flows on that screen that are not self-evident.
5. Note where two things that look similar might be collapsible
   into one.

Start with the Workbook (logged-in home page) — it's the single
most important surface. Then landing page for signed-out. Then the
Pen. Then Family Manual. Then Archive. Then the detail pages
(entry, moment, ritual run, practice).

## Known jargon problems (user-reported)

These are terms the user has explicitly flagged as causing cognitive
load:

- **Arc** — multi-phase growth work. The word signals nothing.
- **Keep** — action button / filter label. Meaning unclear.
- **Weekly Brief** vs **Weekly Lead** — two near-synonyms both live
  on the Workbook. Are they actually distinct enough to warrant
  separate names, or should they collapse?
- **Echo dispatch** — a year-ago entry resurfaced. The word
  "dispatch" is doing a lot of unexplained work.
- **Open threads** — unclosed items. Fine as a concept, but the
  plural noun phrase feels abstract.
- **Moment** — a multi-view event. Probably OK as a word but needs
  to teach itself.
- **Ritual** — scheduled check-in. OK but could be "check-in".

Also problematic but not explicitly called out:

- "The Pen" for capture (precious)
- "Synthesis" / "Enrichment" appearing in user-facing copy
- "Dispatch" as an umbrella term
- "Growth Item" in any user-facing surface
- "Dimension" / "Domain" / "Ring" — research-backed scoring
  framework that probably shouldn't surface at all to a new user

## Stance

- **Prefer renaming over re-explaining.** If a word needs a glossary,
  it's the wrong word.
- **Prefer deleting over hiding.** If a feature can't be named
  simply, maybe it shouldn't be in the first-run experience.
- **Keep the aesthetic.** The paper/serif/ember editorial voice is
  part of the brand — we're not gutting that, we're pruning
  vocabulary within it.
- **Don't destabilize backend code.** Data model field names can
  stay; we're renaming *user-facing* strings, headings, labels,
  button copy, and occasionally restructuring which surfaces show
  what. Firestore collections and function names don't need to
  change.
- **Test by reading aloud.** If the three rooms nav bar is called
  "Workbook · Family Manual · Archive" — read that aloud to someone
  who's never heard of Relish. If their face blanks, rename.

## Commit + deploy discipline

- Push to `main` frequently. Vercel auto-deploys. Firebase rules
  and Cloud Functions deploy via `firebase deploy --only <target>`.
- Keep commits small and specifically scoped. "Rename X → Y" is a
  commit. "Collapse Brief and Lead into one card" is a commit.
- If a change affects Firestore rules or indexes, deploy those
  separately and verify.

## Start here

Your first move: read the files above, then open `/workbook` in a
browser. Report back with:

1. A count of distinct user-facing terms on the Workbook alone.
2. The three that most immediately trip a first-time reader.
3. Your proposed renames for those three.

We'll iterate from there.
