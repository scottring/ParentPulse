# Relish: whole-app editorial and interaction pass

From Scott, 2026-11-18. Builds on `relish/revamp`.

## The rule

Before someone taps, they should recognize a moment from their own life.
After they tap, they should know what to do. When they stop, they should know
what they're taking with them. Writing down something Kaleb said at breakfast
can be the whole experience; good endings are allowed. Offer another step only
after the person has gotten something out of this one.

## Each place's job

| Place | Question it answers | Screen implication |
|---|---|---|
| Home | "Is there something I want to remember or try today?" | Immediate capture; one specific hand-written invitation to take or skip; reopen something familiar. |
| Do something | "What would fit the moment I'm in?" | Each activity: a recognizable occasion, an honest time estimate, a concrete payoff ("Have a hard conversation coming up? Find a first sentence you can use"). |
| Your book | "What have I kept or learned that I want to find again?" | Lead with the person's own material; an empty book gets one invitation to make a page. |
| Family | "Whose book am I opening, or what are we sharing?" | Name person, object and action: **Open Kaleb's book**, **See my pages about Kaleb**, **Send this passage to Iris** are different promises. |

Keep distinctive names that already work (Repair bingo, Same page?, Rewrite
the opener); the sentence underneath does the practical work. Don't rename
everything "I want to…".

## Inside each experience

- **Journal, voice, photos:** straight to the blank page, microphone or photo
  picker chosen; title can come later; explain transcription where recording;
  tags/options shown when opened; the saved page easy to reopen.
- **Guided reflections and exercises:** lead with the situation; one useful
  question at a time; a satisfying first-visit ending; follow-ups recall the
  actual plan in the writer's words ("You wanted to ask for a little quiet after
  dinner. Did you get a chance?"); multi-day activities distinguish time today
  from how long you might keep doing it.
- **Games:** what sounds fun before who's playing; explain the next turn at
  handoff; room to enjoy the reveal; **Finish for now** is a complete ending;
  saving words stays a separate choice with the existing approvals.
- **Kids' books:** same dignity and ownership; prompts answerable from
  experience ("What did you notice today?"); use the age bands; a nine-year-old
  and a grown-up helping a four-year-old need different invitations.
- **AI:** explicit at the moment it matters ("Get another perspective on these
  words"); show the excerpt before sending; label suggestions; the adult decides;
  everyday prompts hand-written; kids' books AI-free in the target experience.
  New AI features or permission changes are separate product decisions.
- **Accounts, privacy, settings:** precision over charm; say which book, which
  device or account, who can access it, what the button does; move repetitive
  reassurance out of writing screens; keep consequential information beside
  Send / Connect / Restore / Delete.
- **Everywhere:** each heading, sentence and button has a job; illustration
  carries warmth, copy stays short and ordinary; on a phone, question and action
  before supporting material; going back restores the draft, filter or place.

## The implementation brief (Scott's prompt, verbatim)

Apply a whole-app editorial and interaction pass to Relish. Implement the changes in the existing app and verify them. Scott has approved the four-place structure and the current visual direction. Build on the revamp already in progress.

Start by locating the active Relish revamp worktree. Read AGENTS.md, inspect the branch, current diff, screen inventory, four-place mockups, and shared components. Use the actual reachable UI and its handlers as the source of truth. Preserve work already completed by another agent. Work locally and leave deployment for Scott.

PRODUCT INTENT

Relish helps people remember moments and learn things about the people they love. For each screen, answer three questions in plain language:

1. What happened in someone's life that would bring them here?
2. What is the one thing they can do now?
3. If they stop here, what do they leave with, and where can they find it?

Use those questions to judge the design. Do not print them as a template on every screen. Preserve good existing copy, distinctive activity names, and the approved artwork. Change layout or navigation when copy alone cannot make the promise true.

COVER THE ENTIRE REACHABLE APP

• Home, adult and child. Make capture immediate. Offer one concrete, age-appropriate, hand-written invitation. Write, Record, and Add a photo should open the requested mode directly.
• Do something. Inspect every activity against its actual prompts, actions, timing, and saved result. Fix misleading promises. Keep prerequisites until the person knows what they are choosing. Returning from an activity should restore their catalog context.
• Guided reflection. Give this the deepest pass. The first adult visit takes about three minutes and saves one moment. The plan is an optional next step. Replace duplicate "Choose a topic" headings and user-facing session terminology. Put the current question on the active page. For adult topics, use situations such as "I jumped in with advice," "I wish I'd asked for what I needed," and "I'd like more moments like that one." Make each lead to a prompt and later practice that fulfill that choice. After saving, offer a clear stopping point. When the person returns, recall the plan and ask whether they had a chance to try it. Preserve age-specific child prompts, pause, resume, and existing entries. Give each child age band the same editorial attention.
• Exercises and habits. Review all sorts, builders, trackers, and bingo activities, including child-specific ones. Explain what the person will make, discover, or try. For a habit, distinguish today's effort from the overall duration. Check setup, in-progress, paused, stopped, completed, and kept states wherever each exists. Use persistence language that matches what the runner actually saves.
• Games. Show the premise before player setup. Keep turn instructions short, previous answers covered where required, and passing easy. Preserve the distinction between finishing a round, recording that it happened, and keeping a shared page containing approved words.
• Your book. Cover empty, draft-only, populated, filtered, and no-search-results states for adults and children. "Make a page" opens the editor. "Open this page" opens the exact item just kept, including when titles repeat. Back restores the person filter, search, scroll position, and focus within the active book. A parent's pages about a child and the child's own book must stay distinct.
• Writing and reading. Review the editor, reader, rename, autosave, draft close, voice permission and transcript review, photos, tags, page options, saved states, and errors. Keep the writing area and save action reachable when tools open. Preserve recoverable input. Show save status only when it conveys real information.
• Family and sharing. Review book switching, add child, invite partner, local family album, connected books, outgoing excerpts, and received passages. Name the actor, destination, material being shared, and effect of the action. Keep recipient choice and all existing consent steps.
• AI. Review existing adult entry points, excerpt preview, opt-in, suggestions, Keep and Dismiss. Make clear what the person is allowing and what will be saved. Keep general writing and activities usable without AI. The target child experience has hand-written prompts and no AI reflection invitations. Preserve existing authorization and voice-transcription rules. Flag any behavior or policy change needed to reconcile the implementation with that target. Leave new automated observations and weekly look-backs for their own feature work.
• Account and utility flows. Cover welcome, sign-in, registration, verification, reset, account and local shelves, create, unlock, parent gate, backup, restore, sync conflicts, settings, help, privacy, disconnect, remove, and delete. Use one heading per task. Check privacy and storage claims against the actual account, local-only, or fictional-sample mode. Retain warnings and confirmations wherever a consequential choice is made.

VOICE AND INTERACTION

Use words a person might say at the kitchen table. Prefer concrete verbs and specific moments. Remove repeated instructions, generic encouragement, and internal terms such as "session" where they add no meaning. Keep important distinctions among Save draft, Save entry, Keep this page, Finish for now, and Send. A person can finish an activity without accepting another one.

Use existing tokens, components, watercolor mappings, and age-aware prompts. Keep the four destinations recognizable at 382, 669, and 1280 px. On narrow screens, show the active question or task first. Preserve keyboard access, focus return, touch targets, and drafts across folding or resizing.

VERIFY AND HAND BACK

Walk through complete journeys using fictional data: a child makes and reopens a first page; an adult saves a reflection and later reviews a plan; a tracker resumes and opens the exact kept result; a game finishes both with and without a shared page; an adult previews and sends an excerpt using a mock recipient; and a failed save or denied microphone leaves a usable next step. Use mocked account states where needed. Run the relevant existing tests, typecheck, and lint.

Give Scott a short handoff with the most meaningful before/after examples, screens and viewport sizes actually checked, tests run, and any remaining product decisions. Distinguish browser-verified behavior from source-only review.
