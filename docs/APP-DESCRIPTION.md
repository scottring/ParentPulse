# Relish — App Description

Two versions of "what this app does": an honest **as-built today** snapshot, and a **fully-shipped vision** that shows what completes the loop. Keep them separate — the gap between them is the current punch list.

Last updated: 2026-04-11 (after Journal Phase B shipped)

---

## As-built today

A user signs up and either creates a new family or accepts an invitation to join an existing one. The home screen is a library table with three books: the **Family Manual**, the **Journal**, and the **Workbook**.

To seed the Family Manual, each member writes a self-manual — sectioned questions about their triggers, what works for them, what doesn't, boundaries, sensory needs, and so on — and observer manuals for every other person in the family. Spouses contribute through their own login; children participate in a parent-supervised session with emoji-heavy age-appropriate questions, no login required. As perspectives accumulate on a given person, a Cloud Function merges them with Claude and renders a three-mode manual: *Synthesized* (unified narrative), *By Perspective* (side-by-side contributions), and *Gaps & Insights* — the distance between how someone sees themselves and how others see them, which is the app's core magic. The manual is always rolling; nothing is gated on completing it.

At any time, a floating pen icon opens a capture sheet. A journal entry is a short text (optionally categorized as a moment, reflection, win, challenge, question, or gratitude), tagged with the family members it's about, and either *saved as a note* or used to *open an AI conversation* grounded in the tagged people's manuals — useful for working a problem out in real time. Either way, the entry lands in the Journal: a day-grouped chronological stream with a dedicated detail page for reading and editing in place. Entries are private to the author by default; the author can explicitly share individual entries with specific family members via a padlock toggle.

The Workbook is a magazine-style weekly "issue" of AI-generated practices, conversation guides, readings, and multi-week growth arcs drawn from 15 research-backed relationship dimensions and a library of 71 exercises. Growth items surface a featured focus and a sidebar of ongoing arcs, with a "kept this week" trail of completed items.

---

## Fully-shipped vision

Everything in the "as-built" description above, plus three things that finish the loop and tie the books together. Infrastructure is in place for each; the seams aren't stitched yet.

1. **AI reads every journal entry.** On save, a Cloud Function embeds the entry, extracts people / dimensions / themes, and writes the summary back. Used to surface an older related entry as a "featured echo" on the Journal home, and to thread the entry into the right places in the Manual and Workbook.

2. **Journal entries feed the Family Manual.** As observations accumulate about a person, the manual synthesis pulls from journal entries alongside onboarding contributions. The manual is never hand-edited — it grows as the journal grows.

3. **Workbook activities are seeded from journal entries.** A weekly Cloud Function reviews recent entries and spawns practices with provenance links back to the source. Users can also request a practice from any single entry. Each Workbook activity shows "this came from" its source entries, and entries show "this led to" their spawned activities.

Also on the punch list but not load-bearing for the core loop:

- **Media in entries** — photos, voice notes (auto-transcribed), links. Today entries are text-only.
- **Per-entry AI chat threads** — inline conversation attached to a specific entry, saved as a subcollection. Today the "Ask about this" flow uses a global coaching session.
- **AI-filled titles** — the detail page accepts an optional title; when blank, AI fills it on save.
- **Navigation reconciliation finish** — bookshelf and header nav match, the only misaligned route (`/journal/[personId]` → `/workbook/[personId]`) has been moved.

---

## What changes between the two

| Dimension | As-built today | Fully shipped |
|---|---|---|
| Family Manual source | Onboarding contributions only | Onboarding + journal entries |
| Journal AI involvement | None (the "Ask about this" chat is a separate surface) | Every entry is embedded, tagged, and summarized on save |
| Workbook growth feed | Runs on its own cadence, decoupled from journal | Seeded by journal activity, with provenance links in both directions |
| Journal featured slot | Empty-state capture invitation | AI echo from older related entries when one exists; capture invitation as fallback |
| Entry media | Text only | Photos, voice (transcribed), links |
| Entry AI chat | Global coaching session grounded in tagged manuals | Per-entry subcollection |
