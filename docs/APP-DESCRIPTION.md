# Relish — App Description

Two versions of "what this app does": an honest **as-built today** snapshot, and a **fully-shipped vision** that shows what completes the loop. Keep them separate — the gap between them is the current punch list.

Last updated: 2026-04-12

---

## As-built today

A user signs up and either creates a new family or accepts an invitation to join an existing one. The home screen is a library table with three books: the **Family Manual**, the **Journal**, and the **Workbook**.

To seed the Family Manual, each member writes a self-manual — sectioned questions about their triggers, what works for them, what doesn't, boundaries, sensory needs, and so on — and observer manuals for every other person in the family. Spouses contribute through their own login; children participate in a parent-supervised session with emoji-heavy age-appropriate questions, no login required. As perspectives accumulate on a given person, a Cloud Function merges them with Claude and renders a three-mode manual: *Synthesized* (unified narrative), *By Perspective* (side-by-side contributions), and *Gaps & Insights* — the distance between how someone sees themselves and how others see them, which is the app's core magic. The manual is always rolling; nothing is gated on completing it.

At any time, a floating pen icon opens a capture sheet. A journal entry is a short text with optional photo or audio attachments (optionally categorized as a moment, reflection, win, challenge, question, or gratitude), tagged with the family members it's about — including a "Whole family" toggle and the ability to write on behalf of a child in a parent-supervised session. Entries can be *saved as a note* or used to *open an AI conversation* grounded in the tagged people's manuals — useful for working a problem out in real time. The AI conversation is saved as a persistent per-entry chat thread (stored as a subcollection), visible whenever the entry is reopened. Either way, the entry lands in the Journal: a single-column, day-grouped chronological stream with a dedicated detail page for reading and editing in place. Category and person tags are editable inline on the detail page. Entries are private to the author by default; the author can explicitly share individual entries with specific family members (or everyone at once) via a padlock toggle. The journal stream supports three filters — All entries, Mine, and Shared with me — providing a family journal view when members share entries.

On save, a Cloud Function embeds the entry text (OpenAI text-embedding-3-small, 1536 dimensions), extracts referenced people, touched dimensions, and emergent themes, generates a summary, and auto-fills a title when blank. When entry text is edited, a re-enrichment trigger re-runs the full pipeline with loop protection. Embeddings power a vector-search "AI echo" featured hero on the Journal home — a resurfaced older semantically similar entry that gives the journal a feeling of memory. The echo prefers entries at least one day old for maximum temporal distance.

Journal entries automatically feed the Family Manual: a scheduled Cloud Function (every 5 minutes) watches for entries that mention a person and, after a 30-minute debounce, re-synthesizes that person's manual with the new journal context included alongside onboarding contributions. The manual is never hand-edited — it grows as the journal grows.

Journal entries also seed Workbook activities: a Cloud Function picks the most dimension-rich un-spawned entry and generates a practice with provenance links in both directions — entries show "This led to a practice in the Workbook" and Workbook items show "from your journal."

The Workbook is a magazine-style weekly "issue" of AI-generated practices, conversation guides, readings, and multi-week growth arcs drawn from 15 research-backed relationship dimensions and a library of 71 exercises. Growth items surface a featured focus and a sidebar of ongoing arcs, with a "kept this week" trail of completed items.

The journal stream paginates at 20 entries per page with a "load more" button for older entries. The first page is a real-time Firestore listener; older pages are fetched on demand.

---

## Fully-shipped vision

The as-built description above covers the complete three-book loop. Remaining items are polish and extensions, not core architecture:

- **Voice note transcription** — audio attachments are uploadable but not yet auto-transcribed. A Cloud Function to run speech-to-text on audio media and write the transcription back to the entry's `media[].transcription` field.
- **Link previews** — link-type media support exists in the type system but no UI for adding URLs or rendering previews.
- **Contribution history versioning** — snapshot answers before re-assessment so revision history is preserved.
- **Journal infinite scroll** — replace the "load more" button with intersection-observer-based infinite scroll.

---

## What changed since Apr 11

| Feature | Before | After |
|---|---|---|
| Entry enrichment on edit | Not re-enriched | `reEnrichJournalEntry` re-runs full pipeline with text-change guard |
| Embeddings | None | OpenAI text-embedding-3-small (1536-dim) via `FieldValue.vector()` |
| AI echo | Empty-state only | Vector-search featured hero from semantically similar older entry |
| Entry AI chat | Global coaching session | Per-entry persistent chat subcollection |
| AI titles | Manual only | Auto-filled by enrichment Cloud Function when blank |
| Category/people editing | Display-only on detail page | Inline editable with immediate save |
| Pagination | All entries loaded at once | 20-entry pages with cursor-based load-more |
| Workbook provenance | `spawnedFromEntryIds` written but not rendered | "from your journal" markers on all card types + detail page |
| Media | Text only | Photos and audio attachments via Firebase Storage |
| Journal layout | Two-column with sidebar | Single-column centered stream |
| Family journal | Private-only view | Filter toggle: All / Mine / Shared with me |
| Sharing shortcuts | Per-person only | "Everyone" toggle + "Whole family" person tag |
| Child entries | Not supported | Parent-supervised child_proxy mode in capture sheet |
| Entry provenance | Not shown in cards | "Led to a practice in the Workbook" pill-link on entry cards |
