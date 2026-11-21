# Relish design guidelines

Design and implementation handoff · November 20, 2026 · navigation revised November 21, 2026

## What Relish is for

Relish helps a family choose one thing they would like to be different in their life together, try something small, and notice what happens. A conversation, a private reflection, a game in the car, and a saved memory can each make for a complete visit.

Working tagline: **Small ways to talk, listen, and feel closer.** Use “The journal your family keeps together” to describe Our family journal.

People read **journal**, never “book”: *My journal*, *Our family journal*, *Ella’s journal*, “Kept in your journal.” Code identifiers can keep their older names (2026-11-21).

When designing a screen, finish this sentence first: *Someone opens this because ____. When they leave, they can ____.* “I have words for an apology I want to make” is a clear outcome. “I completed an exercise” still needs an explanation.

## The product has a memory

Home should feel different on the second visit because the first visit mattered. Design around three moments:

### Family Home across three visits

Build each state around the sentence the family should remember. Set that sentence in large moss-colored book type on warm paper. Place controls in the order someone needs them. The boards follow one family trying to hear each other out at dinner. In the app, use the family's own intention, timing, and shared words.

| Moment | What gets the space | What happens next |
| --- | --- | --- |
| First visit | Open with a suggested intention already previewed: *Hearing each other out* in a compact, editable selector under “What would you like a little more of in your family?”, and the invitation, “At dinner, let someone finish a story. Then ask one question about it,” in the largest type, with the dinner watercolor beside it. Changing the selector previews a different invitation; nothing is chosen until **Try this tonight**. (Scott, 2026-11-20: a page of six equal choices read as a setup form.) | State the commitment in a single line, “Try it tonight. Look back together in two weeks.” **Try this tonight** is the filled action. **Adjust the plan** reveals timing and optional details. **Maybe later** leaves room to write or play. |
| Coming back | Put “Hearing each other out · Day 4 of 14” in quiet type above “You wanted everyone to get a turn at dinner.” Give “How did it go?” a line of its own. | Offer **It helped**, **A bit mixed**, and **We didn’t get to it** as equally weighted choices. After an answer, offer a relevant next step, such as keeping a line or trying the idea somewhere else. A previously shared remark can sit below a fine rule with an **Open family journal** link. |
| Looking back | Introduce the elapsed time with a quiet date line. Recall the original intention and ask “Does dinner feel any different?” Give the most space to one actual family passage, such as “Dad asked what happened next.” Set it in large italic serif on pale butter paper, with “Ella · at dinner” directly beneath. | Place any other kept remarks in a quieter list. Below them, offer **Keep trying this**, **Choose something new**, and **Finish for now**. Let the family choose whether to keep the reflection in Our family journal. If they kept no lines, let their own answer lead the page. |

**Illustration and layout.** In the dinner example, mismatched soup bowls, two spoons, and a striped napkin place the invitation at an ordinary family table. On desktop, let the watercolor sit beside the words and fade into the paper, leaving clear space behind the text. The returning screen can echo a single detail. A different intention can use a different scene or typography alone. Keep the check-in on the cream page. Use the pale-yellow passage treatment only for words the family has shared.

**Across devices.** On a phone or closed Duo, stack the same sentence, response, and next step in reading order. Shrink or move the illustration before it pushes the main action out of reach. On an open Duo, give the current invitation more room. The three panels on the Duo board depict successive visits. Show the family's current visit on its own. Folding or unfolding preserves the intention, check-in response, and any partially written reflection.

Progress belongs to the people experiencing it. “Dad asked what happened next” tells a family something a completion count cannot. A game may show whose turn it is. A ten-day activity may show which days were marked. Keep those indicators local to the activity. An enjoyable game can end with a laugh and **Done**.

## Navigation and audience

**Revised 2026-11-21 (Scott's decision): Home · Journal ▾ · Activities.** The Book tab, the **Just me / Our family** switch and the bookshelf of colored covers are gone. Book and Journal merged into one Journal place, and which journal is open now answers “Whose pages am I in?” The top bar is the wordmark, the three places and the avatar. Signed-in loads go straight to Home. Approved mockups (Scott’s design canvas, not in this repo): NavHome, NavJournalMine (menu open), NavJournalFamily, NavActivities, NavPhoneJournal.

| Destination | Design behavior |
| --- | --- |
| Home | One page for both journals. A welcome and its painting, then **Lately**, which mixes both journals and labels every item **Only me** or **Family journal** (family items come only from the family journal; drafts and unfinished activities are Only me). One check-back leads at a time, including the family plan's **Say how it went**. Four painted choices: **Write in my journal**, **Write in our family journal**, **Do an activity**, **Read about our family**. |
| Journal ▾ | On desktop a menu: **My journal** (Only me), **Our family journal** (Everyone in the family), then **Kids’ journals**, one per child's journal the parent can open (older copies that need a passphrase under **Earlier copies**). It is keyboard accessible: arrows move, Escape closes and returns focus. On phones (≤720px) there is no menu: Journal opens the last journal with a **Mine / Family** switch at the top (remembered on the device) and kids' journals linked below. |
| My journal | An **Only me** label, the title, the entry count and **Write today’s entry**. People chips and search, then the entries with any draft first (dashed). Opening an entry reads it; writing opens the editor. **Still going** and **What you’ve learned** follow the entries. |
| Our family journal | The green cloth cover with its gold line and leaf carries **Add to our family journal**. Chips for Everyone, each person and Me, plus search. The newest passage leads on butter paper; game play notes read “Played Spot it! with …”. **Who’s in our family** (members, add a child, invite a partner) is a link at the foot and in the avatar menu. |
| A child's journal | Opens the child's own view with a **Back to my journal** bar under the top bar (it asks for the parent password). |
| Activities | One page. One **Featured** (the family plan when the account has a family, taking turns week by week with one to do on your own), a segmented **Everything / On my own / Together** filter with an inline **Pick up:** line, then situation shelves such as “At dinner” or “Something felt hard” that mix both kinds. Every card says **On your own** or **Together**, what people will do, with whom and roughly how long. A child's journal shows only what fits their age. |
| Avatar menu | Who’s in our family, Add a child, Invite a partner, then settings, sound, help, account and Sign out: what the bookshelf used to offer. |

**Audience comes from the journal, never from navigation.** A draft is written for the journal it was started in and keeps that audience after its first save. A private draft can never end up in Our family journal by switching journals; only **Add to our family journal** or **Share a passage** sends words there. Every writing surface names its audience by the date (**Only me** or **Our family journal**) and on the save button (**Save to my journal** or **Add to our family journal**). Home and Activities don't depend on which journal was open last.

## Visual language

Use the family book and private journal boards below as paired desktop and phone references. Reuse existing Relish fonts, tokens, controls, and spacing before introducing equivalents. The colors below are working values from the design direction. Existing project tokens with the same roles take precedence.

| Element | Treatment |
| --- | --- |
| Surfaces | Warm ivory canvas `#F7F4EC`, cream paper `#FFFDF6`, dark moss ink `#303B2E`, deep olive action `#45583E`. Use thin warm-gray rules. Reserve pale butter for a quoted passage. |
| Type | Use the lowercase serif *relish* wordmark. Journal titles, writing, and quoted words use a readable book serif. Navigation, controls, dates in cards, and status text use a humanist sans. An italic serif date on a journal page is an established exception. |
| Buttons and selection | Use one filled olive primary action per decision, an outlined secondary action, and a text link for an occasional action. The active tab has an underline. Give selected space and keyboard focus clearly visible treatments. |
| Material and illustration | A cloth cover and fine gold binding line identify Our family journal. A botanical sprig marks a quiet writing surface. A watercolor can anchor a particular memory, such as the red truck on the drive to Grandma’s. Plain entries work with words alone. |
| Composition | Let one element lead: a memory in a journal, the writing in the editor, a prompt in a game. Put related controls near the content they affect. Use whitespace and rules before adding another framed card. |

**Desktop.** Give writing one comfortable column. The previous entry opens on request. Family members uses a popover anchored to its trigger. Sharing opens a focused dialog over the existing editor.

**Phone.** Put the wordmark and avatar on the first row, the three places on the second. Journal opens the journal page with **Mine / Family** at the top. Show a single column of memories. At about 382 px wide, a reader should encounter an actual memory in the first viewport. Use a bottom sheet for members or passage sharing. Keep the confirm action reachable with enlarged text and the keyboard open. Closing an overlay returns the reader to the same place.

### iPhone Duo

Treat the closed outer display and open inner display as two views of the same visit. For the web app, respond to the space the browser actually provides. Keep the same document and controls mounted where practical so a resize preserves the person’s place.

| Situation | Relish behavior |
| --- | --- |
| Closed, outer display | Use the compact phone arrangement. Lead with one invitation, one page, or one game turn. Place search and secondary tools on a second row if necessary. Keep the audience label and main action visible or easy to reach. |
| Open, inner display | Keep the header on one row. Give a journal another column of memories when cards remain readable. Journal keeps a centered writing column. Home still leads with one invitation. A game keeps the current player and prompt together. Use the extra width for comfortable reading and touch targets. |
| Opening or closing mid-task | Preserve the selected place and journal, unsaved words, cursor or passage selection, active person filter, and current game turn. A sharing sheet can become a dialog while retaining the exact preview and audience. Resizing alone must never submit or share anything. |

**Duo acceptance check.** Start a private entry on the outer display. Open the device, select a sentence, and bring up the sharing preview. Close it again with the preview open. Check that the sentence and audience match, that the confirmation is reachable, and that dismissing returns to the intact draft. Repeat the resize with the keyboard visible. Use a Duo device or simulator for posture verification; a resized browser can check layout and state continuity.

Platform reference: Apple’s guidance for designing for iPhone Duo.

## Writing, sharing, and trust

A tag helps the writer find a page. Sharing is a separate, deliberate action. Our family journal is one collection visible to its members.

- On a private page, show **Only me** and **Save to my journal**. A secondary **Share a passage** opens a preview.
- Let the writer select the exact words. Show them on the same pale-yellow card the family will see, with attribution and **Change passage**. Name the audience in ordinary language.
- Offer **Whole page** as an explicit choice. Update the preview, confirmation label, and privacy copy when that choice changes.
- Confirm a passage with **Add passage to family journal**. Only the previewed content and attribution appear there. A later private edit cannot silently reveal more text.
- A direct family entry starts from **Add to our family journal** in Our family journal (or **Write in our family journal** on Home) and is saved with **Add to our family journal**; a copy stays in My journal. Returning to private writing restores the private draft. Member actions say exactly where they lead, such as **Open Kaleb’s journal** or **See what they shared**, according to actual access.

## Content and AI

Use language someone might say at the table. A game prompt such as “The best part of bedtime is…” invites a child to take a turn. An activity such as “Ten real hellos” gives the adult a small action to try at the door. Give permission to pass, pause, or finish when the person has what they came for.

For each activity, ask what it helps someone notice, say, hear, or enjoy. Write the action label accordingly. **Play Spot it!** starts the game. **Browse games** opens the collection.

**Help me find the words** is a proposed, opt-in AI interaction. The writer chooses the passage and says what they want the other person to hear. Offer an editable opening in their voice. They decide whether to use it. Likewise, AI could suggest an existing activity for “five minutes in the car.” Treat these as product proposals until an implementation task calls for them.

## Reference boards and review

Use the three paired Home boards as the primary visual references for this journey. The Duo board shows how the same moments adapt to the open display. The Book and Journal boards define the journals' base screens and overlays. The older activity references are useful for the content and interaction inside a screen. Carry the current header (Home · Journal ▾ · Activities, 2026-11-21) across those designs; boards that show a Book tab or the Just me / Our family switch predate it.

| Visual reference | Detail to carry forward |
| --- | --- |
| First visit · desktop and phone | Invitation, integrated dinner illustration, one primary action |
| Coming back · desktop and phone | Unboxed question, three equal responses, earlier shared remark |
| Looking back · desktop and phone | Featured passage and attribution, then the next decision |
| Three Home moments · open iPhone Duo | Width adaptation and reading order for each state |
| Family book, desktop and phone | Compact green cover, illustrated memory, quotation card, search, and people filters (now Our family journal) |
| Private journal entry | Audience beside the date, writing first, quiet tools below |
| Family members | Compact member rows over the same collection (now Who’s in our family) |
| Share a journal passage | Exact preview, named audience, desktop dialog and mobile sheet |
| Activities · Ten real hellos · Same page? | Resume actions in the catalog, a concrete invitation in the exercise, one person’s turn in the game |

Resolve known differences deliberately. Writing starts from a journal (**Write today’s entry**, **Add to our family journal**) or from Home's choices. Omit the **+ Write** shown on some boards. Use the corrected overlay boards above. On Home, use a quiet elapsed-time line in place of the dark look-back banner pictured on the board. Keep the cloth-cover treatment for Our family journal. In a Home review, read the most prominent line in each state in sequence: the thing to try, the question on return, and the family's own observation.

**Review a change by walking it.** On desktop, a standard phone, and both iPhone Duo displays, go from family Home to a suggested activity and back. Open My journal, write about a family member, share one sentence, and find it in Our family journal. Return to the private draft or saved entry. Check the active place, audience, actual words shared, and whether the next action makes sense. For a visual-only task, review the affected part of this walk and stay within the requested scope.

### Reusable instruction for Claude

Read RELISH-DESIGN.md and look at the reference boards for the screens in this task. Reuse the existing Relish components. Keep the navigation, audience, and writing or sharing behavior consistent with the guide. Work within the requested scope. Review the result on desktop, a standard phone, and iPhone Duo open and closed and call out any deliberate departure from the references.

## Local copies of the reference boards

The original boards live in Scott's ChatGPT library, which only he can open. The same images are in `boards/`:

| Board | File |
| --- | --- |
| Home · first visit, desktop and phone | `boards/home-first-visit.jpg` |
| Home · coming back, desktop and phone | `boards/home-coming-back.jpg` |
| Home · looking back, desktop and phone | `boards/home-looking-back.jpg` (shows the dark banner; use a quiet date line instead) |
| Three Home moments · open iPhone Duo | `boards/home-duo-open.jpg` |
| Family book, desktop and phone | `boards/family-book.jpg` |
| Private journal entry | `boards/private-journal.jpg` |
| Family members (popover / sheet) | `boards/family-members.jpg` |
| Share a journal passage | `boards/share-passage.jpg` (an alternate pass: `boards/share-passage-alt.jpg`) |
| Earlier family page with person cards | `boards/family-cards-earlier.jpg` (Scott kept the colored person cards on Family, 2026-11-19) |

The Activities, Ten real hellos and Same page? boards were not in the handoff folder. A clickable version of the Home boards in Relish's real fonts is at https://claude.ai/artifact/TXDYsZJ89jnoJBAKW3uqjQ (private to Scott).

## Paintings for the dinner example

Full-size watercolors (1200×800, cream background) for the Home boards are in `art/`: `dinner-bowls.png` (first visit), `dinner-spoons.png` (coming back) and `striped-bowl.png` (looking back, behind Ella's line). Scott made them in ChatGPT on 2026-11-20.
