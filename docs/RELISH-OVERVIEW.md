# Relish — A Comprehensive Overview for New Users

*Source document for NotebookLM audio and video overviews. Written as
prose, organized for a two-host conversation, grounded in what the
product actually does today.*

---

## The one-line version

Relish is a private, long-running family journal that gives something
back. You (and your partner, and eventually your kids) write about the
people in your life — children, spouse, parents, friends — and the
book *writes back*. Once a week, it returns a synthesis of what it
noticed, a brief for the hardest conversation waiting on you, an echo
from a year ago, a rhythm in your week. Once a day, it surfaces
practices and memories. Once a ritual, it helps you close the loops
you opened.

The magic is in the **synthesis of perspectives** — what becomes
visible when two or more views of the same person, moment, or
relationship are held together. Sometimes the views agree (and that's
information). Sometimes they diverge (and that's information).
Sometimes the combined picture reveals something neither view alone
could name.

## Why it exists

Most family apps are calendars or task-trackers. They organize what
you're *doing*. Relish is trying to do something different: help you
*pay attention* to the people you love, over time, as they change and
you change. Paying attention is hard because it's invisible — you
don't notice what you stopped noticing. Relish is the instrument that
makes attention visible. You write what you notice, and the book
builds up a record that can be reflected back to you in ways you'd
never see by scrolling your own entries.

There are three kinds of work the app does:

1. **Capture** — the low-friction act of writing something down.
2. **Synthesis** — the AI reading across what you've written and
   noticing patterns.
3. **Return** — the weekly surfacing of those patterns back to you in
   a form you can act on.

The capture is cheap. The synthesis runs in the background. The
return is what makes the whole thing feel alive.

## The three rooms

When you sign in, the top of every page has three room names: **The
Workbook**, **The Family Manual**, **The Archive**. These aren't
features — they're places.

- **The Workbook** is today. It's your daily entry point. What's
  open, what's kept, what's waiting. The weekly dispatches live here.
  The Pen (capture) is here. Your next ritual is here. If you're
  opening Relish at all, this is where you land.

- **The Family Manual** is the people view. Each member of your
  family — spouse, kids, parents, friends you've added — has a page
  with a hero portrait, a dossier of what you've written about them,
  and threads you've started. A manual is not written *about* a
  person; it's co-authored with them. Your spouse contributes their
  own perspective. Kids (8+) contribute in supervised emoji-heavy
  sessions. The AI synthesizes the perspectives and shows you
  alignments and gaps.

- **The Archive** is the searchable river of everything that's been
  written. Every entry the book has kept. Readable, searchable,
  yours.

Three rooms, one book.

## The Pen — capture

Writing in Relish is meant to be a 30-second act, not a discipline.
The Pen is a floating black circle in the lower-right of every page.
Click it and a paper sheet slides up on a dark cinematic stage. You
write on it. There's a big serif field with an ember-colored caret,
chips for tagging people, a visibility selector ("Me" for private,
"Iris and me" for partner-shared, "Everyone" for family), a
microphone button for voice dictation that transcribes right into the
text, and an attachment row for photos or songs (paste a Spotify /
Apple Music link and it resolves to cover art).

You can also start a **chat with an entry** — a private AI coach
grounded in that specific entry. The AI has access to your entry's
text, the people you mentioned, and prior related writing. You ask it
what you can't quite name yourself; it asks you back. The
conversation stays tied to the entry.

## What Relish returns

This is the heart of the product. At the top of the Workbook there's
a section headed *"What Relish is returning to you."* Four kinds of
return live there.

### The Weekly Lead

Once a week (Sunday 9pm by default), a background pipeline reads
everything the family wrote in the past Monday-to-Sunday window and
asks the AI to surface **one pattern worth naming**. The output is a
magazine-style dispatch: a one-sentence headline, a short paragraph
unpacking it, up to three *verbatim evidence quotes* pulled directly
from entries (not paraphrased — Relish quotes you), and often an
"emergent line" — a sentence naming what the week said together that
no single entry said alone.

The headline is written in the book's voice — literary, specific,
warm. It never says "keep up the great work." If one parent wrote
four entries this week about impatience with a kid and insecurity
about their partner, the lead might read: *"Scott is writing himself
notes this week — about his impatience with Kaleb, his insecurity
about Iris, his body next to hers."* That's a real dispatch Relish
produced.

Each evidence quote deep-links back to the source entry, so the card
isn't a dead-end summary — it's an entry point back into the material
the book noticed.

### The Weekly Brief

A forward-looking counterpart to the lead. Where the lead names a
pattern, the brief names **1–3 topics worth bringing to your next
hard conversation**. Each topic gets a title ("Bedtime with Kaleb"),
a framing question ("What would it look like to see Kaleb's bids for
attention as connection attempts rather than annoyances?"), two or
three concrete talking points (what to say, what to ask, what to
listen for), a verbatim source quote from an entry, and "days open"
— how long this thread has been waiting.

The brief is scoped differently from the lead. The lead is about
*seeing*. The brief is about *doing*. And crucially, the brief flows
directly into the next ritual — when you open a scheduled
conversation, the brief's topics appear as "this week's brief —
topics worth bringing here" with one-tap "bring this in" buttons that
seed your response textarea.

### The Pattern

Below the lead and brief, Relish watches the *shape* of the week.
A six-week rolling window of entry timestamps gets crunched into a
day-of-week histogram. When one day stands out (you wrote on Sundays
three times more than the average non-Sunday), the pattern card
surfaces it: *"Sundays carry more of the book than the rest."* When
the week is even, it says so honestly.

### The Echo

The fourth return is memory. The echo looks for an entry from roughly
a year ago that touches the same person or theme as something you
wrote this week. "This week you wrote about Kaleb's sleep. A year ago
you wrote this." It surfaces the old entry verbatim with a deep link
to open it. When the chat with that old entry had distilled insights,
those themes also count for matching — so a chat a year ago about
bedtime frustrations can resurface even if the entry text itself
didn't use those words.

## Moments — the multi-perspective object

Any entry can be attached to a **moment**. A moment is a single lived
event that two or more people wrote about. Scott writes about the
Friday night argument from his view; Iris writes about it from hers.
They attach both entries to the same moment. When the moment has two
or more views, a Cloud Function called `synthesizeMoment` reads them
and produces three one-sentence lines — **agreement**, **divergence**,
and **emergent**. The divergence line is the most valuable: *"Iris
names exhaustion, Scott names distraction."* That sentence becomes an
open thread waiting to be closed.

If your partner hasn't written their view yet, you can send a
**moment invite**. You choose blind (they see only the prompt, not
your view) or anchored (they see your view as context). Until they
submit, the moment stays half-seen. When they submit, the synthesis
re-runs.

## Rituals — the scheduled pulse

Writing alone doesn't build attention — you need a rhythm where you
stop and look. Rituals are scheduled check-ins: solo weekly, partner
biweekly, family monthly, or ad-hoc repair. Each has a kind, a
cadence, a day and time, a duration, participants, and an optional
intention ("What's working between us?").

The ritual runner walks you through three steps — **read, respond,
close**. Read surfaces entries since the last ritual. Respond is
where the week's divergent moments appear *and* where the weekly
brief topics appear, both with one-tap "bring this in" that seeds
the response textarea. Close asks for the single act to carry
forward — which becomes a new entry, and kicks off the next
scheduled run. If the ritual misses a window, it becomes an open
thread on the Workbook titled "Due N days ago."

## Practices — turning writing into action

Some entries don't just describe. They suggest something worth
practicing. A Cloud Function called `spawnActivityFromRecentJournal`
runs at the end of each synthesis cycle. It picks the most
dimension-rich entry from the past seven days — one that touches at
least two of the twenty research-backed relationship dimensions —
and asks the AI to generate a single targeted practice. A
micro-activity, a reflection prompt, a conversation guide. Concrete,
named, short.

Chat with the entry also feeds this. Every two user turns in the
chat, a second distillation pipeline runs (a cheap Haiku call) and
extracts *what the chat surfaced that the entry alone didn't* —
dimensions, themes, a one-line "what emerged." These get stored on
the entry as `chatInsights`, separate from the original enrichment
so text edits can't wipe them. When the practice generator runs, it
merges entry enrichment + chat insights, scoring chats as stronger
signal (a topic worth practicing is one you actually talked through,
not one you wrote once and forgot). Practices shaped by chat are
tagged `journal_plus_chat` and the practice detail page shows a
"Shaped by your chat" block with the emergent sentence — so your
conversation isn't a dead end, it visibly moved a practice to you.

## Open threads — nothing stays lost

The left column of the Workbook has an "Open threads" strip.
It's the app's memory of what you started but haven't closed.
Four reasons something appears there:

1. **Pending invite** — someone asked you for your view on a
   moment, and you haven't answered.
2. **Unclosed divergence** — a moment has a divergence line and
   you haven't responded to it in a ritual or entry.
3. **Incomplete practice** — a growth item was spawned but never
   reflected on.
4. **Overdue ritual** — a scheduled ritual's time has passed.

Each open thread carries a **closing action** — a specific CTA
label and a deep link to the page where the matching affordance is
rendered above the fold. "Answer blind →" goes to the moment page
with the blind recipient textarea primed. "Respond to the
divergence →" goes to the moment page with the response field.
The Workbook cover doesn't just list reasons — every row knows how
to close itself.

## How the signals connect

The system has more feedback loops than any single screen makes
obvious. Here's the flow:

- You **write an entry**. The `enrichJournalEntry` trigger
  immediately extracts dimensions, people, themes, and a one-line
  summary via Claude.
- If the entry has a **momentId**, the `onMomentViewAdded` trigger
  updates the moment's view count. When it crosses two views,
  `synthesizeMoment` runs and writes agreement/divergence/emergent
  lines. Any divergence becomes an open thread.
- You may **chat with the entry**. Every two user turns,
  `distillChatToInsights` writes a second set of tags to the
  entry's `chatInsights` field.
- Once a day, `spawnActivityFromRecentJournal` picks the richest
  entry and generates a practice, incorporating both enrichment
  and chat insights.
- Once a week, `generateWeeklyLead` and `generateWeeklyBrief` run
  against the week's family-shared entries (plus any divergent
  moments for the brief). They write dispatches the Workbook reads.
- **Rituals** pull together the week's divergent moments AND the
  current brief's topics into the Respond step, so the one-on-one
  conversation runs on the rails the book built.
- The **echo dispatch** looks at what you're writing *right now*
  and resurfaces an entry from a year ago that touches the same
  people or themes (via both `enrichment.themes` and
  `chatInsights.themes`, so chats also count for matching).

That last sentence captures the whole design ethos: **every piece
of AI output feeds back into another one**. Enrichment feeds
practices. Chat feeds practices. Chat also feeds echoes. Moments
feed rituals. Rituals produce entries. Briefs feed rituals.

## What Relish returns — evaluation

Honest assessment of how tight the current wiring is, because the
product's whole premise depends on the return feeling *connected*:

**Strong connections that work today:**
- Weekly lead evidence → deep links to source entries ✓
- Weekly brief source quote → deep links to source entries ✓
- Weekly brief topics → surface in ritual Respond step ✓
- Weekly brief "+N more" → expandable card showing every topic ✓
- Echo dispatch → deep links to resurfaced entry ✓
- Open threads → closing-action deep links ✓
- Chat insights → feed both practice generation and Echo matching ✓
- Divergent moments → appear in ritual Respond step ✓
- Ritual close → produces a reflection entry + moment ✓
- Practice completion → reflection entry + moment ✓
- Memory of the day → deep links to the year-ago entry ✓

**Connections still thin or missing:**
- Pattern dispatch's "Look closer" link doesn't go anywhere yet —
  should probably route to the Archive filtered by the peak
  day-of-week.
- Chat insights don't currently feed the **weekly lead's** source
  material. The lead reads entry text verbatim, but doesn't get
  the chat's "what emerged" line fed in. Practices do; the lead
  should too.
- Brief topics with `daysOpen > 10` should probably appear as
  open threads on their own, not just inside the brief card.
  Currently a topic can age without nagging.
- The weekly brief doesn't yet link *forward* to the ritual page
  — you have to find the ritual yourself. A "bring this to
  Saturday's ritual" micro-CTA would close the loop.
- There's no weekly dispatch for "unresolved practices" —
  practices that were spawned but never closed. That'd be a
  natural fifth return.
- Ritual close doesn't yet fold what was said back into the next
  week's lead. It's a journal entry, so it'll be *seen* — but the
  lead could specifically flag "from last ritual's close" when it
  quotes such an entry.

**The bigger gap:** there's no *browsable history of past
dispatches*. Each week overwrites the card. If you want to read
last month's leads, you can't. That should be a section in the
Archive.

## What "done" feels like in a week

A good week in Relish looks like this:

**Monday.** You open the Workbook. The lead says something specific
and true about your Sunday. You read it. It's short. You nod. One
of the three evidence quotes is from an entry you half-remember
writing — you click it, reread, close.

**Tuesday night.** You capture two lines about dinner with your
kid. 20 seconds. Voice-to-text.

**Wednesday morning.** The echo card says: a year ago today, you
wrote *this*. You open it and stand in the doorway of a memory.

**Thursday.** You start a chat with an entry from earlier in the
week. Four turns. The AI reflects something you hadn't named. You
leave.

**Friday.** The practice card has a new item: *"Tonight, when the
bedtime stall starts, try 'What's on your mind, bud?' instead of
hurrying him."* It's specific. It's from what you wrote.

**Saturday evening.** Your weekly ritual fires. You open it. The
respond step shows three brief topics you haven't addressed yet —
and one divergent moment between you and your partner. You bring
one in. You write a paragraph. You close the ritual. It becomes a
new entry.

**Sunday 9pm.** The lead regenerates. The cycle begins again.

That's Relish.
