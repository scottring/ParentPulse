# Relish design guidelines

Design and implementation handoff · November 20, 2026

## What Relish is for

Relish helps a family choose one thing they would like to be different in their life together, try something small, and notice what happens. A conversation, a private reflection, a game in the car, and a saved memory can each make for a complete visit.

Working tagline: **Small ways to talk, listen, and feel closer.** Use “The journal your family keeps together” to describe the family book.

When designing a screen, finish this sentence first: *Someone opens this because ____. When they leave, they can ____.* “I have words for an apology I want to make” is a clear outcome. “I completed an exercise” still needs an explanation.

## The product has a memory

Home should feel different on the second visit because the first visit mattered. Design around three moments:

### Family Home across three visits

Build each state around the sentence the family should remember. Set that sentence in large moss-colored book type on warm paper. Place controls in the order someone needs them. The boards follow one family trying to hear each other out at dinner. In the app, use the family's own intention, timing, and shared words.

| Moment | What gets the space | What happens next |
| --- | --- | --- |
| First visit | Before a choice, lead with “What would you like a little more of in your family?” Once the family chooses *Hearing each other out*, keep that choice in a compact, editable selector. Give the largest type to the invitation, “At dinner, let someone finish a story. Then ask one question about it.” | State the commitment in a single line, “Try it tonight. Look back together in two weeks.” **Try this tonight** is the filled action. **Adjust the plan** reveals timing and optional details. **Maybe later** leaves room to write or play. |
| Coming back | Put “Hearing each other out · Day 4 of 14” in quiet type above “You wanted everyone to get a turn at dinner.” Give “How did it go?” a line of its own. | Offer **It helped**, **A bit mixed**, and **We didn’t get to it** as equally weighted choices. After an answer, offer a relevant next step, such as keeping a line or trying the idea somewhere else. A previously shared remark can sit below a fine rule with an **Open family book** link. |
| Looking back | Introduce the elapsed time with a quiet date line. Recall the original intention and ask “Does dinner feel any different?” Give the most space to one actual family passage, such as “Dad asked what happened next.” Set it in large italic serif on pale butter paper, with “Ella · at dinner” directly beneath. | Place any other kept remarks in a quieter list. Below them, offer **Keep trying this**, **Choose something new**, and **Finish for now**. Let the family choose whether to keep the reflection in their book. If they kept no lines, let their own answer lead the page. |

**Illustration and layout.** In the dinner example, mismatched soup bowls, two spoons, and a striped napkin place the invitation at an ordinary family table. On desktop, let the watercolor sit beside the words and fade into the paper, leaving clear space behind the text. The returning screen can echo a single detail. A different intention can use a different scene or typography alone. Keep the check-in on the cream page. Use the pale-yellow passage treatment only for words the family has shared.

**Across devices.** On a phone or closed Duo, stack the same sentence, response, and next step in reading order. Shrink or move the illustration before it pushes the main action out of reach. On an open Duo, give the current invitation more room. The three panels on the Duo board depict successive visits. Show the family's current visit on its own. Folding or unfolding preserves the intention, check-in response, and any partially written reflection.

Progress belongs to the people experiencing it. “Dad asked what happened next” tells a family something a completion count cannot. A game may show whose turn it is. A ten-day activity may show which days were marked. Keep those indicators local to the activity. An enjoyable game can end with a laugh and **Done**.

## Navigation and audience

Use **Home · Book · Journal · Activities**, in that order. Keep **Just me / Our family** in a consistent header position. The tabs answer “What am I here to do?” The switch answers “Whose space am I in?” Sign-in establishes the individual’s identity. Moving between spaces keeps the current tab where possible. A private draft stays attached to its original space.

| Destination | Design behavior |
| --- | --- |
| Home | Lead with the current intention or one relevant invitation. Keep quick writing and play reachable. Recent pages belong farther down. Family Home draws only on family-visible material. |
| Book | Gather what has been kept. Use *My book* or *Our family book* as the heading. Search and people filters support retrieval. Give a recent story or quotation prominence. Keep member management behind **Family members**. |
| Journal | One click opens an editable page or resumes this space’s draft. On a fresh page, the writer can start with the body. Title, voice, photo, and tags are optional. Show the audience by the date and the destination on the save button. |
| Activities | Put specific actions first, such as **Resume Same page?** or **Play Spot it!**. Below them, offer the collection by recognizable situations such as “In the car” or “Something felt hard.” Each card says what people will do, with whom, and roughly how long it takes. |

## Visual language

Use the family book and private journal boards below as paired desktop and phone references. Reuse existing Relish fonts, tokens, controls, and spacing before introducing equivalents. The colors below are working values from the design direction. Existing project tokens with the same roles take precedence.

| Element | Treatment |
| --- | --- |
| Surfaces | Warm ivory canvas `#F7F4EC`, cream paper `#FFFDF6`, dark moss ink `#303B2E`, deep olive action `#45583E`. Use thin warm-gray rules. Reserve pale butter for a quoted passage. |
| Type | Use the lowercase serif *relish* wordmark. Book titles, writing, and quoted words use a readable book serif. Navigation, controls, dates in cards, and status text use a humanist sans. An italic serif date on a journal page is an established exception. |
| Buttons and selection | Use one filled olive primary action per decision, an outlined secondary action, and a text link for an occasional action. The active tab has an underline. Give selected space and keyboard focus clearly visible treatments. |
| Material and illustration | A cloth cover and fine gold binding line identify the book. A botanical sprig marks a quiet writing surface. A watercolor can anchor a particular memory, such as the red truck on the drive to Grandma’s. Plain entries work with words alone. |
| Composition | Let one element lead: a memory in Book, the writing in Journal, a prompt in a game. Put related controls near the content they affect. Use whitespace and rules before adding another framed card. |

**Desktop.** Give writing one comfortable column. The previous entry opens on request. Family members uses a popover anchored to its trigger. Sharing opens a focused dialog over the existing editor.

**Phone.** Put wordmark and space switch on the first row, the four tabs on the second. Show a single column of memories. At about 382 px wide, a reader should encounter an actual memory in the first viewport. Use a bottom sheet for members or passage sharing. Keep the confirm action reachable with enlarged text and the keyboard open. Closing an overlay returns the reader to the same place.

### iPhone Duo

Treat the closed outer display and open inner display as two views of the same visit. For the web app, respond to the space the browser actually provides. Keep the same document and controls mounted where practical so a resize preserves the person’s place.

| Situation | Relish behavior |
| --- | --- |
| Closed, outer display | Use the compact phone arrangement. Lead with one invitation, one page, or one game turn. Place search and secondary tools on a second row if necessary. Keep the audience label and main action visible or easy to reach. |
| Open, inner display | Give Book another column of memories when cards remain readable. Journal keeps a centered writing column. Home still leads with one invitation. A game keeps the current player and prompt together. Use the extra width for comfortable reading and touch targets. |
| Opening or closing mid-task | Preserve the selected tab and space, unsaved words, cursor or passage selection, active person filter, and current game turn. A sharing sheet can become a dialog while retaining the exact preview and audience. Resizing alone must never submit or share anything. |

**Duo acceptance check.** Start a private entry on the outer display. Open the device, select a sentence, and bring up the sharing preview. Close it again with the preview open. Check that the sentence and audience match, that the confirmation is reachable, and that dismissing returns to the intact draft. Repeat the resize with the keyboard visible. Use a Duo device or simulator for posture verification; a resized browser can check layout and state continuity.

Platform reference: Apple’s guidance for designing for iPhone Duo.

## Writing, sharing, and trust

A tag helps the writer find a page. Sharing is a separate, deliberate action. The family book is one collection visible to its members.

- On a private page, show **Only me** and **Save to my book**. A secondary **Share a passage** opens a preview.
- Let the writer select the exact words. Show them on the same pale-yellow card the family will see, with attribution and **Change passage**. Name the audience in ordinary language.
- Offer **Whole page** as an explicit choice. Update the preview, confirmation label, and privacy copy when that choice changes.
- Confirm a passage with **Add passage to family book**. Only the previewed content and attribution appear there. A later private edit cannot silently reveal more text.
- A direct family entry uses **Add to our family book**. Returning to private writing restores the private draft. Member actions say exactly where they lead, such as **Open Kaleb’s book** or **See shared pages**, according to actual access.

## Content and AI

Use language someone might say at the table. A game prompt such as “The best part of bedtime is…” invites a child to take a turn. An activity such as “Ten real hellos” gives the adult a small action to try at the door. Give permission to pass, pause, or finish when the person has what they came for.

For each activity, ask what it helps someone notice, say, hear, or enjoy. Write the action label accordingly. **Play Spot it!** starts the game. **Browse games** opens the collection.

**Help me find the words** is a proposed, opt-in AI interaction. The writer chooses the passage and says what they want the other person to hear. Offer an editable opening in their voice. They decide whether to use it. Likewise, AI could suggest an existing activity for “five minutes in the car.” Treat these as product proposals until an implementation task calls for them.

## Reference boards and review

Use the three paired Home boards as the primary visual references for this journey. The Duo board shows how the same moments adapt to the open display. The Book and Journal boards define their base screens and overlays. The older activity references are useful for the content and interaction inside a screen. Carry the current four-tab header across those designs.

| Visual reference | Detail to carry forward |
| --- | --- |
| First visit · desktop and phone | Invitation, integrated dinner illustration, one primary action |
| Coming back · desktop and phone | Unboxed question, three equal responses, earlier shared remark |
| Looking back · desktop and phone | Featured passage and attribution, then the next decision |
| Three Home moments · open iPhone Duo | Width adaptation and reading order for each state |
| Family book, desktop and phone | Compact green cover, illustrated memory, quotation card, search, and people filters |
| Private journal entry | Audience beside the date, writing first, quiet tools below |
| Family members | Compact member rows over the same collection |
| Share a journal passage | Exact preview, named audience, desktop dialog and mobile sheet |
| Activities · Ten real hellos · Same page? | Resume actions in the catalog, a concrete invitation in the exercise, one person’s turn in the game |

Resolve known differences deliberately. Journal is the one-click writing route. Omit the duplicate **+ Write** shown on some boards. Use the corrected overlay boards above. On Home, use a quiet elapsed-time line in place of the dark look-back banner pictured on the board. Keep the cloth-cover treatment for Book. In a Home review, read the most prominent line in each state in sequence: the thing to try, the question on return, and the family's own observation.

**Review a change by walking it.** On desktop, a standard phone, and both iPhone Duo displays, go from family Home to a suggested activity and back. Open Journal privately, write about a family member, share one sentence, and find it in the family book. Return to the private draft or saved entry. Check the active tab, audience, actual words shared, and whether the next action makes sense. For a visual-only task, review the affected part of this walk and stay within the requested scope.

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
