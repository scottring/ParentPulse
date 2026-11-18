# Relish screen inventory (2026-11-18)

Every screen, dialog and state a person can reach, with what each needs for
the one-look revamp (`docs/plans/2026-11-18-whole-app-revamp.md`). "Shared
pieces" are the ones in `src/components/relish/ui.css` / `ui.tsx`: PaperCard,
BackLink, PrivateNote, SubHead, Chips, PrimaryButton, BookSpread, Illustration.

Legend: **ok** = already in the new look, only token clean-up · **restyle** =
old palette, square boxes or alpine art still showing · **new** = not built.

## Before a book is open (RelishApp, AccountLibrary, BookForms)

| Screen / state | Component | Status | Needs |
|---|---|---|---|
| Opening Relish… (loading) | RelishApp `lb-gate` | restyle | cream paper, wordmark, quiet status line |
| Signed out: Welcome / sign in | AccountLibrary inline | ok | `welcome` illustration in place of the doodle; olive rounded-rect Sign in |
| Create an account | AccountLibrary (same form) | ok | same card; 18+ consent checkbox kept |
| Forgot password | AccountLibrary | ok | same card |
| Verify email | AccountLibrary | restyle | PaperCard, one main action (I've verified), resend as quiet link |
| Parent password (child book open) | AccountLibrary gate form | restyle | PaperCard, lock PrivateNote, olive action |
| Family library (signed in) | AccountLibrary | restyle | book rows as paper cards with a small cloth-book mark, owner first |
| Library empty | AccountLibrary | restyle | `empty-pages` illustration |
| Add a child / Add my book | AccountLibrary form | restyle | chips for age band, consent copy kept |
| Changes from two devices | AccountLibrary | restyle | PaperCard with two clear choices |
| Open an earlier book (passphrase) | AccountLibrary | restyle | PaperCard |
| Local books shelf | RelishApp `lb-shelf` | restyle | book cards like the library |
| Create a local book | RelishApp + VaultForm | restyle | PaperCard form |
| Restore a backup (file) | VaultForm | restyle | same card; file pick as quiet tool row |
| Locked local book | RelishApp + VaultForm | restyle | `locked` illustration, PaperCard form |
| New book profile (adult/child age) | EditionSetup | restyle | age chips, parent passphrase field, consent kept |
| Sample book banner | LivingBook `lb-sample` | ok | quiet strip |

## The four places (LivingBook + places)

| Screen / state | Component | Status | Needs |
|---|---|---|---|
| Top bar + menu | TopBar | ok | — |
| Adult Home | Home | ok | `home` illustration slot for the sun doodle; structure unchanged |
| **Kids' Home** | Home (child book) | **new** | cloth-cover book with name + emblem, "Hi, name. What did you notice today?", Write / Record / Add a photo, Open my book, kid suggestion banner (Start / Show me another), More to try row |
| Do something + chips + grid | DoSomething | ok | illustration on the heading |
| Game sheet (pick players) | DoSomething sheet | ok | chips for players |
| Your book | YourBook | ok | `your-book` illustration; empty state `empty-pages` |
| Family | Family | ok | `family` illustration |
| Finished game card on Family | Family | ok | — |

## Sub-screens (open inside a place; "← Back to …" + "Your private pages")

| Screen / state | Component | Status | Needs |
|---|---|---|---|
| Exercise list (no initial id) | Tools | restyle | SubHead, paper cards per exercise |
| Exercise start | Tools ExerciseStart | ok | Illustration per exercise (falls back to sketch) |
| Exercise run: sort | Tools SortRunner | restyle | PaperCard, choices as chips, olive keep |
| Exercise run: builder (steps) | Tools BuilderRunner | restyle | PaperCard, chip choices, textareas on paper |
| Exercise run: tracker days / bingo | Tools TrackerRunner | restyle | PaperCard, bingo squares as paper tiles, stop confirmation kept |
| Exercise kept | Tools kept | restyle | `saved` illustration, one main action |
| Guided reflection intro / paused / complete | LivingBook book spread | restyle | BookSpread on cream (no alpine art), olive main action |
| Guided reflection steps | VisitEditor | restyle | right page of BookSpread, topic choices as chips/cards |
| Practice plan review | VisitEditor | restyle | same |
| AI help opt-in + review excerpt | VisitEditor Dialog + AIHelp | restyle | paper dialog, consent/excerpt review kept |
| Closed book cover | LivingBook `lb-cover` | restyle | olive cloth cover like the kid book |
| Game ready / handoff / choose / reveal / finished | GroupPlay in `lb-play-layout` | restyle | focused screen, PaperCard turn card, chips for answers, `do-something`/game illustration, keep approval kept |
| Journal reader (spread) | Journal | restyle | BookSpread on cream (rj-* tokens), no alpine art, BackLink + PrivateNote once |
| Journal editor | Journal | ok | (built 2026-11-18) remove duplicate notes |
| Voice recorder | VoiceWriter Dialog | restyle | paper dialog, olive record button |
| Photo picker / gallery | Photos | restyle | paper tiles |
| Choose a passage to share | PassagePicker Dialog | restyle | paper dialog, consent kept |
| Living manual (My / Family) | Manual | restyle | PaperCards, opt-in box on sage, chips for scope |
| Manual AI opt-in | Manual | restyle | sage "What gets shared" box like Connected books |

## Dialogs (BookForms `Dialog`)

| Dialog | Status | Needs |
|---|---|---|
| Privacy and settings | restyle | paper dialog, sections as soft cards, Lock as quiet tool row |
| Edition & parent settings | restyle | age chips, parent password kept |
| Help | restyle | paper dialog, one Close action |
| Create a private book (from sample) | restyle | VaultForm in paper dialog |
| Add someone / Edit person | restyle | paper dialog, relationship chips feel |
| Export a backup | restyle | paper dialog |
| Connected books (sign in, what gets shared, 18+ consent) | ok | (built 2026-11-18) |
| Connected books: invite partner, join, received passages, family group, child profile | restyle | same paper, sage info boxes, chips |
| Remove local edition (type name to confirm) | restyle | keep the typed confirmation |
| Delete online account | restyle | keep confirmation |

## Errors and empty states

| State | Needs |
|---|---|
| Save error (`lb-save-error`) | peach note card, plain words |
| Firebase / sign-in errors | peach note under the form |
| No pages yet | `empty-pages` illustration |
| No more entries / no previous entries (reader) | quiet italic note on the page, no art |
| Round is over | PaperCard + one main action |
| No suggestions yet (manual) | quiet note |
| Browser storage unavailable | peach note on the landing card |
