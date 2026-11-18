# Relish design guide & build plan

**Design handoff · November 18, 2026**  
For the current four-place Relish app and the team working on `relish/revamp`.

## What to fix first

Make it easy to move from **doing something** to **finding what you kept**. The four destinations already exist, and the revamp has the shared paper components, kids’ Home, and watercolor assets. The next change I would build is small enough to try in one sitting. Open an empty child’s book, make its first page, keep it, and return to that same page. Then follow the same path with an exercise in an adult book.

| Finding in the reviewed build | Design decision | Where to change it |
|---|---|---|
| The **+ Add a page** button in Your book calls `navigate("do")`. A writer who has decided to make a page is asked to choose an activity. | Open the existing journal composer directly. Use **Give me an idea** for a separate trip to the age-appropriate catalog or prompt. | `LivingBook.tsx` → `YourBook.onAddPage`. Reuse `quickEntry()`. |
| Exercise completion says “Your pages.” **Read your pages** opens the whole book. | Say **Kept in your book**. Offer **Open this page** when the saved ID is available. Keep **Back to Do something** as the return route. | `Tools.tsx` currently passes a title into its kept state. Carry the stable saved page ID to `openPage`. Two identically titled exercises must open their own results. |
| Opening and returning from a kept page remounts Your book. The person filter and search live inside that component. | Restore the writer’s person filter, search, position and focus on return. Explicitly choosing the Your book tab can start a fresh browse. | `LivingBook.navigate`, `YourBook.tsx`, `Journal.tsx`. Keep browse state scoped to the active book. |
| Your book renders sections for learning, work in progress and pages even when all are empty. Its suggestions entry is in the shared component. | For a child’s first visit, use the personalized opening spread. A child’s populated book leads with their work. In adult books, bring forward actual learning and resumable work. | `YourBook.tsx`. Gate AI affordances at the point of display as well as the existing capability checks. |
| The local creation screen displays **Create a local book** twice, each as a top-level heading. | Give the form ownership of its title and instructions. Keep the shelf return visible. | `RelishApp.tsx` + `BookForms.VaultForm`. Observed in the local browser preview. |

## The four places

| Place | What belongs here | What should happen next |
|---|---|---|
| **Home** | A personal greeting, immediate capture, one hand-written age-appropriate invitation. Adult Home can also bring back a person or recent page. Kids’ Home uses the named cover and three capture choices. | Start the offered activity directly, capture a moment, or reopen a known page. **Show me another** changes only the invitation. |
| **Do something** | One mixed catalog with the existing time and situation filters. Cards show a recognizable illustration, activity name, type and time. | Choose an activity first. Ask for a person or players once the choice gives the question meaning. Back restores the catalog filter. |
| **Your book** | The current author's keepsakes, reflections, exercises, game records and learned cards. Person chips answer “Who is this about?” | Open the exact item, resume unfinished work, or add a page. A parent filtering by Kaleb is browsing the parent’s book. |
| **Family** | Entries into managed kids’ books, invitations for adult partners, approved family pages, and passages passed between adults. | Label the destination explicitly. **Open Kaleb’s book**, **Invite a partner** and **Read shared passage** have different outcomes. |

The wordmark returns to the active book’s Home. The initials menu owns settings, account/library access, sound, help and lock. The family library is an account-level bookshelf. Keep **Family** available for everyday family activities and sharing. A partner has a separate adult account. A person tag, a game participant and a book owner can have the same name and different permissions.

## Visual language

| Element | Direction for implementation |
|---|---|
| Paper and type | Use the existing `ui.css` tokens. Desk #f6f4ed, writing leaf #f8f5ec, facing leaf #eceee5, ink #30382c, olive action #43513a. Literata for titles and reading, IBM Plex Sans for instructions, controls and status. Use the existing responsive title scale of 34–58 px and 17 px instruction style. |
| Shell and hierarchy | One page title and one prominent next action per decision. The slim global **+ Write** remains available where navigation is safe. Use the same active-tab treatment across the four places. Keep navigation visibly distinct from the action on the current sheet. |
| Open spread | Use for authored content, reading and a child’s first book. The facing leaf provides real context. In the composer the active leaf gets the title, caret and uninterrupted writing space. Voice sits near writing. Photos, tags, color and sound belong in secondary controls. |
| Activity sheet | Use one lightly edged paper card, a short instruction, a compact choice group, and a clear verb. Put the watercolor beside setup on wide screens. During play or writing, give those pixels to the task. Reserve a torn edge for the wash or featured sheet. |
| Lists and dialogs | Kept items use a consistent row with title, type, people and date when available. Dialogs use a readable single column, a visible close control and an action next to its prerequisites. Give irreversible choices their own confirmation. |
| Activity colors | Write = butter #f2d58a. Exercise = sage #cfdcc4. Game = peach #e9b9a0. Think it through = sky #c9d9e3. Multi-day habit = lilac #e4d6ea. Show the written type beside the color. In Your book use `pageKind` for saved-item classification, including older entries. A lilac habit can produce a kept Exercise page. |
| Artwork | Use `Illustration` and `illustrations.ts`. The delivered PNGs are masters. The revamp already has WebP derivatives, transparent foil emblems and age-specific pencil banners. Source the child’s name as live text. The current emblem comes from `emblemFor(name)`; a persistent chooser would be a later product change. |
| Interaction | Primary button height 48 px. Give small controls a 44 px target. Use visible focus, pressed states, a written status beside icons, and body text contrast of at least 4.5:1. Respect reduced motion. Update the status in place and return focus to the invoking control on dialog close. |

## Screen-by-screen direction

### Arrival, accounts and bookshelves

| Surface | Design and primary action | States and return |
|---|---|---|
| Opening, welcome and sign-in | Wordmark and a quiet opening status, then the signed-out form. Use the welcome still life once. Show email, password and existing adult confirmation together. Primary **Sign in**. | Account creation and password reset are in-context alternatives. Put errors beside the field or action. Offer local-only or sample access where available. |
| Registration, verification and reset | Reuse the same form shell. Give each state its own title. Verification names the destination email and the action **I’ve verified**. | Resend is secondary. Give reset confirmation its own message. Preserve the entered email. |
| Account library and parent gate | Owner’s book first, child books identifiable by name and emblem. Primary **Open [name]’s book**. Offer **Add my book** only when appropriate. | Empty library leads to creation. Returning from a child edition follows the existing parent gate. Label account password and local parent passphrase according to the actual flow. |
| Create book, add child and profile | Name and age band precede the main action. Explain who manages a child’s book. Keep parent authorization beside the protected choice. | Support under 6 with a grown-up, 6–8, 9–12, 13–17 and adult using existing profile rules. Cancel returns to the shelf or Family that launched setup. |
| Local shelf, earlier book, closed cover and lock | Choose a named cover on the shelf. Unlock asks for the existing book passphrase. **Open book** on a closed cover and **Unlock book** on a locked vault must describe the actual state. | Restore takes an encrypted file and its passphrase. Keep failed attempts recoverable. Distinguish closing the reading view from locking the edition. |
| Sample, storage and device conflict | Show **Fictional sample · changes last until reload** consistently. A real account can distinguish locally saved changes from an account save. | With unavailable storage, explain the available sample path. For two-device conflict, preserve **Keep both versions** and the destination of both copies. |

### Home, catalog and activity setup

| Surface | Design and primary action | States and return |
|---|---|---|
| Adult Home | Use the approved four-place composition. Jot field with adjacent save and voice entry, one featured suggestion, time/situation shortcuts below. | Empty jot keeps Save inactive. Preserve the input on a failed save. When there are pages, “Lately in your book” opens the selected one. |
| Kids’ Home | Cloth cover and name, one concrete question, **Write**, **Record**, **Add a photo**, then one pencil-illustrated suggestion. Give the three capture methods equal weight. | Each opens the appropriate editor mode. Record respects existing age, account and permission gates. A first book gets **Open my book**. On return, feature the latest eligible kept page when space allows. |
| Do something | Keep Everything, 1 minute, 5 minutes, With the kids, Something’s hard. Filter the age-appropriate mixed catalog. The whole card is one accessible action. | If a filter is empty, offer **Show everything**. A paused game has a clear resume entry. Returning from an activity restores the selected chip. |
| Exercise setup and fallback list | Scope, title, one instruction, optional **Who is this with?**, then **Start**. Show a stable neutral default. Short lists use visible chips. | Long name lists wrap or use an accessible compact picker. The participant tag follows the exercise into its saved page. Back returns to selection. |
| Game setup sheet | The chosen title and game premise come before player selection. Prefill eligible known players, show how many are needed, let the group edit the list. | Cancel restores the launching place. **Start game** becomes available when the underlying game rules are satisfied. |
| Guided start and topics | Offer the existing three topics with the ear, hand and balloon illustrations. Follow stored age-specific prompt text. Choose a topic, then one moment to write about. | Intro, paused and completed states get different next actions. Keep pause/resume attached to the original session. |

### Writing, reading and returning

| Surface | Design and primary action | States and return |
|---|---|---|
| Journal editor | The previous page sits alongside a clean writing leaf. Title is optional. A previous entry can still be renamed. Use **Save entry** for a writer committing their own page. | Support first entry, long titles, voice insertion, photo-only entry, drafts and failed saves. Keep **Save draft and close** available. Await autosave before navigating. |
| Voice writing | A single sheet progresses through permission, recording, transcription and editable review. Use an explicit **Add words to page** action. | Preserve cancel, permission denied, unavailable service, retry and length-limit handling. Keep the reviewed transcript as page text. A playback control would require a separate audio-attachment feature. |
| Photos and page options | **Photo** opens add/take choices. Show thumbnails, count, limits and removal beside the active page. Tags, page color and keyboard sound remain discoverable. | Camera or file cancellation returns to the same draft. Errors keep its text. Share only photos supported by the selected sharing flow. |
| Reader and rename | Title, date and content first. Earlier/later controls belong together. Put rename, private tags and sharing in a quiet tool row. | At the edge of a book show the available direction. Returning to a filtered list restores the selected row. A failed rename keeps the proposed title editable. |
| Adult Your book | Preserve the approved order when populated: **What you’ve learned**, **Still going**, **Every page**. Group relevant person lessons and kept suggestions. Keep page type, author/participants and date legible. | A genuinely empty book gets one invitation. A filtered empty result gets **Clear filter** or **Clear search**. Retain an entry point to add/edit people and reach eligible manual settings. |
| Child Your book | First visit shows the child’s name and emblem on the left and **Make a page** on the right. **Give me an idea** is a quiet authored prompt. A draft gets **Keep going**. A returning child sees their latest kept work and can browse entries. | Derive empty, draft and kept states from that child’s book. Keep all entries reachable when a draft and kept pages coexist. Exclude AI suggestions and adult sharing controls from the child design. |
| Manual, people and AI | In the adult book, manual review uses the existing scope controls, explicit opt-in, source count and Keep/Dismiss decision. People forms label who the page is about. AI excerpt review shows the exact material before sending. | Distinguish a person’s lesson from an AI proposal and an accepted card. Keep child restrictions and existing permission checks. Automatic observations, a weekly recap, new input scopes and a saved emblem picker are separate feature work. |

### Activities in progress and outcomes

| Surface | Design and primary action | States and return |
|---|---|---|
| Card sort | One current card, readable pile buttons, and the current selections. Use tap or keyboard for every placement. | Preserve optional custom cards and the existing review step. Finish with an editable preview and **Keep this page**. |
| Writing exercise | Group prompts in reading order on one sheet. Put the assembled sentence or proposed note underneath. | Preserve choices and existing completion requirements. Allow edits before Keep. For sorts and builders, distinguish current editing from a persisted tracker or journal draft. |
| Daily habit and bingo | Daily mark or bingo grid is the focus. Pair selected state with a check and accessible pressed state. Use a quieter action for **Finish and keep a page** until appropriate. | Mark/unmark, leave and resume, finish early when permitted, or explicitly confirm stopping and discarding progress. Keep one active tracker per existing rules. |
| Guided visit, plan and review | Show the current question on the active leaf. A plan names an ordinary opportunity. Later review recalls the plan and offers **I have tried it** when applicable. | Preserve pause, resume, finish and the resulting reflection. An untried plan can stay in **Still going** without implying an outcome. |
| Game turns and handoff | Ready screen shows players and the promise of one round. Handoff identifies the next person. Show the choice only after they are ready. Keep **Pass** and **Pause** reachable. | A game is a shared-device context. Exclude private pages and snippets from the handoff or reveal. Pausing returns to Do something. A completed round returns to Family. |
| Reveal, shared keep and game record | Offer the reveal, then **Finish for now**. The optional shared page previews the exact words and collects each participant’s approval. | A finished game can leave who/when in Your book. Answers enter a shared page only through the approval flow. Handle all-pass and finish-without-sharing distinctly. |
| Kept exercise and reflection | Confirm the actual saved title and its location. Prefer **Open this page** for a newly kept exercise. A finished reflection can offer the next relevant plan or return. | Repeated taps or a retry must produce one result. Do not present a success state before the write succeeds. |

**Activity coverage.** Reuse the three existing exercise runners. Sort covers What helps when I’m upset, Drains and fills, What’s under the behavior? and Who carries what. Builder covers Rewrite the opener, Put a thought on trial, Notice the unseen work and Plan a repair. Tracker covers Ten real hellos, A week of specific thanks, Repair bingo and Kindness spotting. The shared game flow covers Guess my small joy, One story, many voices and Same page? Writing and voice share the journal editor. Guided topics share the visit editor.

### Family, sharing and utilities

| Surface | Design and primary action | States and return |
|---|---|---|
| Family and album | Give book switching, **Invite a partner** and **Add a child** clear labels. Separate “Passed between you” from approved family album pages. | Empty sections offer the next relevant action. Pending invitations and an active game each identify their state. Dismissed game completion returns to Family. |
| Connected books and invite | Lead with the adult edition and account. State what connecting publishes. Keep the 18+ checkbox beside **Connect this edition**. Group create/join, invite code and membership in the same dialog family. | Keep copy-code, one-use/24-hour expiry, invalid/expired invite feedback and membership confirmation. An invitation creates a connection. Sending a passage is a later action. |
| Select passage, send and receive | Show the source title, exact excerpt and destination. Distinguish **Keep in family album** from **Send to [recipient]**. Incoming passages retain the author and offer a deliberate keep action. | Preserve private tag exclusion, text-only online passage behavior, optional album photos where supported, sent/received status and retries. Return to the specific page or inbox. |
| Settings, sound, help and privacy | Initials menu leads to settings. Group book/account, age/parent settings, sound and backup by purpose. The public privacy page at `/privacy/` gets a readable text column, section links and Back to Relish. | Use storage-specific wording. Account-managed books can sync and be opened through the parent account. Local-only books use their passphrase. Kids’ entries stay out of adult feeds. Avoid claiming that nobody with parent-account access can open them. |
| Backup, disconnect, remove and delete | Label the object affected: encrypted backup, connection, local copy or online account. Keep destructive actions collapsed until requested. State consequences before the existing confirmation. | Preserve typed confirmation for removing an edition, reauthentication where required, error recovery and the return to the appropriate shelf or sign-in screen. |
| Application errors | Put recoverable status beside the affected operation with a specific action. Example: “Your words are still here. Try saving again.” Use this only when the draft is actually retained. | Cover failed saves, sync pending, conflicting copies, missing media, no permissions and an application-level failure. Preserve recoverable input, focus and the current edition. |

## How it fits on a phone

| Viewport to review | Navigation and surfaces | What to prove |
|---|---|---|
| **382 px · folded** | Keep the same four named places. A compact bottom bar is the proposed folded treatment. Show the active leaf first. Collapse prior-entry context, wrap chips, and move art below primary inputs or omit it during a task. | Typing, recording, passing and saving fit above the keyboard or remain reachable by scrolling. Safe areas and sticky bars clear the focused control. |
| **669 px · unfolded** | Use the existing 640 px spread breakpoint where both leaves stay readable. Put context or selection on the left and writing or reading on the right. Single-column forms and game handoffs can use the full width. | Folding while typing preserves the same mounted editor, draft, selection and active page. Long names and large text can reflow to one column. |
| **1280 px · desktop** | Use the four-place header and a centered reading width. Give art and supporting context a facing column. Keep form dialogs narrow and avoid stretching short labels across the screen. | Check keyboard-only travel, focus return, mouse and touch activation, status announcements, 200% zoom and reduced motion. |

## Build order for the revamp agent

1. **Close the book loop.** In `LivingBook.tsx`, `YourBook.tsx`, `Journal.tsx` and `Tools.tsx`, implement direct creation, child book states, open-by-ID after keep, and restoration of list context. Reuse `bookPages`, `pageKind`, `KidCover`, `quickEntry` and `openPage`. Keep the existing journal navigation guard.
2. **Finish the activity families.** Align `DoSomething`, `Tools`, `VisitEditor` and `GroupPlay` around selection, action, pause and outcome. Use the existing runners, age gates, game stages, illustration mappings and persistence semantics. Review current working changes before picking up an area.
3. **Align Family and account surfaces.** Follow `Family`, `ConnectedEditions`, `PassagePicker`, `BookForms`, `AccountLibrary`, `EditionSetup` and `RelishApp` through both account and local modes. Remove duplicate headings. Keep the consent, backup and recovery steps explicit.
4. **Review the complete experience.** Use the journeys below at 382, 669 and 1280 px. Start with fictional data. Use mocked signed-in, conflict, invite and permission states for the flows the sample book cannot expose. Run the repository’s Relish Vitest configuration, TypeScript check and scoped lint on implementation changes.
5. **Schedule future features separately.** The AI brief defines manual Ask, optional Notice and an optional weekly look-back. Ship new analysis only with its own consent, source selection and testing. A preferred emblem also needs a persistence decision. The visual revamp can proceed independently.

### Acceptance journeys

| Walkthrough | Expected result |
|---|---|
| Kaleb opens an empty book → Make a page → writes → Save entry → opens Your book again | One creation action reaches the editor. His saved content is visible on return. An unfinished second page can be resumed without hiding the first. |
| Scott filters for Kaleb → searches → reads a kept item → Back | Same filter, query, row and position. The parent’s tagged page never appears in the child’s own book because of the tag. |
| Scott starts Repair bingo with a person → marks two squares → leaves → resumes → finishes | Marks and person survive. The resulting Exercise row identifies the activity and opens the exact kept item, even when an older entry has the same title. |
| Family starts Same page? → passes device → one player passes → reveal → finish | Prior private answers stay covered between turns. A practical play record is available. The approval path controls whether any shared answer text is retained. |
| Adult selects an excerpt → reviews → sends to a connected partner → recipient decides | The selected excerpt and recipient are visible before send. Keeping files the received passage with its author. Canceling sends nothing. |
| Start a draft → fold/unfold → open a tool sheet → cancel → simulate failed save → retry | Same draft and focus survive. Failure is legible. A successful retry produces one page. |
| Open parent-managed child book → visit Family and Your book → return through parent gate | Child-facing capture and authored activities stay usable. Adult AI and partner-sharing affordances are absent. The correct parent protection is invoked. |
| Explore sample → local creation → restore or unlock → return to account shelf | Mode and book owner stay identifiable. Each form has one title. Sample copy, local passphrase and account password describe the actual action. |

## Review basis

Component and navigation review of the working `relish/revamp` branch on November 18, including foundation commit `267b1b7`, watercolor integration `c51a7af`, and edits in progress. The local preview check covered welcome, the local shelf and local creation. Other findings come from source inspection, existing mockups and repository design records. The visual targets and acceptance journeys above describe implementation work and subsequent verification.

Engineering references: `docs/design/2026-11-18-screen-inventory.md`, `docs/plans/2026-11-18-whole-app-revamp.md`, `docs/design/2026-11-18-four-places/`, `src/components/relish/ui.tsx`, `ui.css`, `duo.css`, `illustrations.ts`, `src/lib/relish/catalog.ts`, `tools.ts` and `pages.ts`. The current app is served at `/relish/`. `next.config.ts` redirects the older product routes there. The public privacy page is included above.
