# Relish — A Reader's Guide

*A living manual for the people you love.*

---

## What Relish is

Relish is a place to build **operating manuals** for the people who matter to you — your partner, your kids, yourself, your closest friends. Not manuals you write *about* someone in isolation, but shared, living documents that both you and they can contribute to. The app watches what gets added, synthesizes it into something coherent, and gently turns that understanding into small practices you can try.

It is not a productivity app. It is not a diary. It is not a parenting tool. It is, to use its own language, *a library of volumes kept on behalf of the people under your roof*.

The app looks like a finely-bound book because it is trying to be one.

---

## The architecture — three rooms in the library

Relish has only three places you'll ever navigate to. Everything else happens through the floating pen in the corner. Learn these three and you know the whole app.

### 📖 The Workbook *(opens when you launch the app)*

This is home. It answers one question the moment you arrive: **what am I working on?**

You'll find it structured like a pair of open pages:
- **Chapters in progress** on the left — the longer practices you and yours are walking through, each one formatted like a chapter entry with a Roman numeral, an italic title, and a quiet note about which week you're in (*"Week ii of iv · Awareness"*).
- **Today** on the right — a single featured practice, the one thing the app thinks you should do right now, set in large italic display type with a drop cap like the opening of a story. At the bottom: *"Begin this practice ⟶"*.
- **Also this week** — a short footnote-style list of other practices waiting their turn.
- **A running count** across the bottom: *"two chapters in progress · five practices this week · about twenty-five minutes total"*.

That running count is the whole answer to "how much work is there?" The app will never let you wonder whether this is a five-minute thing or a five-week thing — the numbers are always at the bottom of the page.

**The minimal-effort promise**: open the app, look at *Today*, do the one thing, close the app. Three minutes. You don't need to read the chapters, or scroll, or click anything else. The one thing on the right page is the entire job most days.

### 📚 The Family Manual

This is the library. You come here to **know** things, not to do things.

It's organized as another two-page spread:
- **The Atlas** on the left — a visual constellation of your family. Each person is a circle connected to the others by thin lines. Tap a circle to open their volume. Below it, a small section marked *"Of note"* lists whatever the synthesis engine has noticed lately: gaps between perspectives, recurring strengths, things that deserve attention.
- **The Volumes** on the right — a catalog of every person's individual manual, listed like a rare-book index:

```
VOL. I        Iris Kaufman
              Partner · updated iii days ago
              ccxiv entries · holding steady        ●

VOL. II       Kaleb Kaufman
              Child (age viii) · updated xii days ago
              clxxxvii entries · some distance      ●
```

Tap a volume to open that person's manual — their overview, their triggers, what works, what doesn't, and a chat window at the bottom for asking the manual anything.

Below the spread, a quiet band labeled *"Since you were last here"* lists recent additions — who contributed what, when. And underneath everything, a small italic link: *"Resynthesize the manual ⟶"*. Tap it and the AI re-reads every perspective in every volume and refreshes the synthesized overviews. You rarely need to press it — syntheses mostly happen on their own — but it's there for when you want a fresh look.

### 📇 The Archive

This is the reports room. You come here occasionally, not daily. It looks like a single open page of a binder:

- A title set in large italic Cormorant: *"The Archive"*
- Subtitle: *"a record of what has been said and what has shifted"*
- One action high on the page: *"Compose a new report ⟶"*
- Below, a catalog of past reports organized by year and month, formatted as a classical index with dotted leader lines:

```
MMXXVI
      APRIL
            I.   Therapist report, thirty days    apr 5
            II.  Monthly summary                   apr 1
      MARCH
            I.   Synthesis of Iris's volume        mar 28
```

That's it. No metrics grids, no "health score" widgets, no per-person cards — those details all live *inside* the generated reports, not on the index page. This page is deliberately quiet.

The Archive is where you go when you want to bring something to a therapist, or share a monthly summary with a partner, or look back across time.

---

## The floating pen — the capture surface

In the bottom-right corner of every authenticated page, you'll see a small dark circle with a pen icon. It is the most important button in the app.

Tap it and a sheet slides up from the bottom, asking a simple question: **"What's on your mind?"**

You'll see a text area, a row of category pills (*moment*, *reflection*, *win*, *challenge*, *question*, *gratitude*), an optional row of family member tags, and a privacy toggle. Write what you want. Tag who it's about if it's about someone. Then choose one of two actions at the bottom:

- **Save note** — for when you just want to get a thought down. One tap, the sheet closes, the note joins the journal. No reply. Fire and forget. Used for: observations, moments, wins, questions you're sitting with, things you don't want to lose.
- **Ask about this** — for when you want to think it through with the AI. The sheet expands into a conversation view. If you tagged someone, the AI reads their volume first — so its replies are grounded in what you already know about them. Used for: *"What should I do when…"*, *"Why does Kaleb keep…"*, *"Help me think through…"*.

Both actions feed the same living library. Whether you save a note or ask a question, your own words end up shaping the manual — either as raw material for the coach to reference later, or as observations the synthesis engine extracts and writes back into the relevant volumes.

A third trick: **if you explicitly ask for workbook activities in the conversation** (e.g. *"Can you give me some practices for this?"*), the AI will acknowledge briefly, then actually create 3-6 concrete practices in your Workbook in the background. No punting, no clarifying questions. You close the sheet, open the Workbook, and the new practices are there — carrying a small note that says they came from a conversation with the manual.

---

## The synthesis — how the AI reads and writes

Relish does a lot of quiet work behind the scenes. You don't need to understand any of it to use the app, but it helps to know what's happening when you're wondering *"is the AI going to remember what I just said?"*

### Your own words become the manual
Everything you write — in a note, in a conversation with a volume, in an onboarding answer — gets read by the AI and (where appropriate) turned into structured content in the relevant volume: a new trigger, a new strategy, a new pattern, a new observation. **The AI only mines your own words, never its own responses.** This is a deliberate guardrail: the manual is built from what humans have actually said and seen, not from AI speculation.

### Four layers of synthesis
1. **Per-turn extraction.** After every message you send to a volume's chat, the AI reads your message and quietly updates the volume if you shared something new.
2. **Whole-session synthesis.** When a conversation ends (either because you close it or because it gets long), the AI re-reads the whole arc and looks for themes the turn-by-turn reading might have missed. A short narrative summary is saved with the session so you can find conversations later by what they were *about*, not just when they happened.
3. **Individual volume synthesis.** When contributions to a person's manual accumulate enough new material, the AI re-reads everything and refreshes the volume's overview, the gaps between perspectives, and the "what we've learned" summary.
4. **Family-wide synthesis.** On demand — via the *"Resynthesize the manual ⟶"* link at the bottom of the Family Manual — the AI reads every perspective in every volume and refreshes everything together. This is the nuclear option for when you want a fresh look across the whole family.

### Privacy
Any note or answer you mark **private** is only visible to you. Private content is never included in family-wide synthesis and never shared in reports. Use it for things you need to think about without pulling your partner or anyone else in.

---

## How to actually use the app

### The thirty-second capture
Something just happened — a moment with a kid, a hard exchange with your partner, a thought you don't want to lose. Here's the whole ritual:

1. Tap the pen in the corner.
2. Type two sentences.
3. Tap *Save note*.
4. Close the sheet.

That's it. Don't categorize, don't agonize over privacy, don't try to make it profound. If it mattered enough to notice, it matters enough to capture. The synthesis engine will find the signal later.

### The three-minute check-in
You have a few minutes free and want to "use the app." Here's the whole ritual:

1. Open Relish (lands on the Workbook).
2. Read the *Today* card on the right page.
3. If it feels doable, tap *Begin this practice ⟶* and do it.
4. When you're done, pick a single word for how it landed (*something small · something shifted · a real moment*).
5. Close the app.

That's the entire loop. Three minutes, one practice, one reflection. You do not need to look at the chapters on the left page, or scroll, or make decisions. The right page is the entire job.

### The five-minute conversation
You're trying to understand something specific — why a kid keeps doing a certain thing, what to try next with your partner, what's underneath a recurring fight. Here's the whole ritual:

1. Tap the pen.
2. Write your question. Tag the person it's about.
3. Tap *Ask about this*.
4. Talk with the AI, back and forth. Share specifics. Use real examples from this week.
5. When you have what you need, close the sheet. If you want practices made from the conversation, ask for them explicitly (*"Give me some things to try"*).

The conversation saves automatically. You can reopen it later from that person's volume inside the Family Manual.

### The weekly rhythm
Once a week, open the Family Manual instead of the Workbook. Look at the Atlas — has a thread between two people changed? Scroll through "Of note" — is there a pattern the AI surfaced that surprises you? Tap into a volume — is there new material from a perspective other than your own? This is less a routine and more a quiet reading practice. The app is trying to help you *notice*, not measure.

---

## Quick reference

| You want to… | Go here |
|---|---|
| See what to do today | **The Workbook** (the home screen) |
| Understand someone in particular | **The Family Manual** → open their volume |
| Capture a thought or moment | **Pen button** → *Save note* |
| Think something through with the AI | **Pen button** → *Ask about this* |
| Get practices from a specific situation | **Pen button** → *Ask about this* → request activities |
| Review a past conversation | **Family Manual** → their volume → chat at the bottom |
| Generate a report for a therapist | **The Archive** → *Compose a new report* |
| Refresh the whole manual's AI synthesis | **Family Manual** → *Resynthesize the manual ⟶* (bottom of page) |
| Add a new person | **Family Manual** → *Begin a new volume ⟶* |

---

## What Relish is not

- **Not a task manager.** The practices in your Workbook are invitations, not assignments. Skipping one is fine. The system learns from what you skip as much as from what you do. There are no streaks, no badges, no guilt.
- **Not a replacement for therapy.** The AI inside Relish is a thoughtful companion, not a clinician. Use it to think, not for diagnosis or crisis support. If something is heavy, talk to a human who's trained for that.
- **Not a quantified-self tool.** You will not find a score of how good a parent or partner you are. The app deliberately avoids those kinds of metrics. Progress shows up as *"holding steady"* and *"in the writing"*, not as numbers.
- **Not a gotcha tool.** Private content stays private. Nothing here is designed to be used as evidence in an argument. It's designed to help you understand.

---

## A promise

Relish asks for three to five minutes a day, most days. In exchange, it tries to give you three things that compound over weeks and months:

1. **A clearer, growing picture** of the people you love — not a snapshot, but an understanding that accumulates through their own words, your observations, and quiet AI synthesis across the two.
2. **Concrete things to try** — grounded in what actually works for *your* specific people, not generic advice written for anyone.
3. **A record of your noticing** — so the small moments of insight that come and go through a busy life don't vanish.

That's the whole app. Open it, look at *Today*, do the one thing. Tap the pen when something comes up. The rest takes care of itself.

— *end of the reader's guide*
