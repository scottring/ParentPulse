# Flag for Partner — Manual Smoke

Run this end-to-end before shipping the MVP. Requires two test accounts with a spouse relationship between them (User A = sender, User B = recipient, both adults with linkedUserId on each other's Person doc).

## Setup
- [ ] Deploy current `flags/mvp` branch to a preview env (or run locally with `npm run dev`)
- [ ] Deploy updated firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy updated firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Deploy updated Cloud Functions: `firebase deploy --only functions` (T7 added `messageId` to coach chat persistence + return)
- [ ] Confirm User A and User B are in the same family with a spouse relationship marked between them, and both Person docs have `linkedUserId`

## Sender flow (as User A — "Scott")

### Coach chat
- [ ] Open `/coach`, start a new conversation
- [ ] Send one message; wait for AI response
- [ ] Hover over the assistant message — the dark **⚑ Flag for…** pill appears at the top of the bubble; disappears on mouse-out
- [ ] Click "Flag for…" — the composer sheet opens, showing:
  - [ ] The exact quoted text from the assistant message
  - [ ] Recipient chip with User B's name + first-letter avatar
  - [ ] Empty note textarea
  - [ ] "Needs a real reply" toggle (off by default)
- [ ] Type a note; click **Flag for [Name]**; sheet closes
- [ ] In Firestore console (or via emulator UI), verify a new `message_flags/{flagId}` doc exists with:
  - [ ] `fromUserId == A`
  - [ ] `toUserId == B`
  - [ ] `chatKind == 'coach'`
  - [ ] `chatId == conversationId` (the current coach conversation)
  - [ ] `messageId == the actual assistant message's messageId` (Task 7 wired this through the callable response, Task 9 hydrated it client-side)
  - [ ] `quoteText` matches what you flagged (truncated to 280 chars if longer)
  - [ ] `status == 'open'`
  - [ ] `needsRealReply == false`
  - [ ] `note` matches what you typed
  - [ ] `createdAt` is a server timestamp

### Coach chat — needs-reply variant
- [ ] Flag a different message with **Needs a real reply** toggled on
- [ ] Verify the doc has `needsRealReply == true`

### Entry chat (Ask About This Entry)
- [ ] Open any persisted (journal-backed) entry on `/journal/{entryId}`; open the Ask About This Entry sheet
- [ ] Exchange a couple of turns
- [ ] Hover a turn — Flag pill appears
- [ ] Click Flag for… → composer opens
- [ ] Submit a flag; verify doc has:
  - [ ] `chatKind == 'entry_chat'`
  - [ ] `chatId == entryId`
  - [ ] `messageId == turnId` (the Firestore doc id from the entry's `chat` subcollection)

### Ephemeral (AI-authored) entry guard
- [ ] Open an AI-authored entry that falls back to the coach API (ephemeral, no chat subcollection)
- [ ] Hover a turn — **no Flag pill appears** (T20 deliberately suppresses flagging on ephemeral turns since their ids aren't stable)

## Recipient flow (as User B — "Iris")

- [ ] Sign in as User B, navigate to Home (`/`)
- [ ] Top chrome (right side) shows the **⚑ + clay dot** indicator
- [ ] If 2+ flags exist, the indicator shows a count
- [ ] The Home page renders a **"Waiting on you"** section near the top with each `FlaggedForMeCard` row
- [ ] For an open default flag, the card shows:
  - [ ] "Scott flagged a moment for you" title
  - [ ] No "Needs reply" pill
  - [ ] Quote excerpt in italic
- [ ] For a needs-reply flag, the title shows the orange **Needs reply** pill

### Open + reply (default flag)
- [ ] Tap the row header — the row accordions open in place
- [ ] Within ~1s, in Firestore: `status` flips to `'seen'`, `seenAt` is set
- [ ] Expanded card shows:
  - [ ] Sender's note in plain prose
  - [ ] Quote in display-face italic with clay left-border
  - [ ] Reply input with placeholder "Write Scott back…"
  - [ ] Emoji row: 🫶 😬 🤔 👀 👍
  - [ ] Send button (disabled until text)
- [ ] Click 🫶 → button disables briefly → row disappears from Cover
- [ ] In Firestore: `status == 'closed'`, `response.kind == 'emoji'`, `response.value == '🫶'`, `closedAt` set

### Open + reply (needs-reply flag)
- [ ] Open a needs-reply flag
- [ ] No emoji row appears
- [ ] Italic line at the bottom: "Scott asked for a written reply, not just a tap."
- [ ] Send disabled with empty input
- [ ] Type a reply, press Enter (or click Send) — row disappears
- [ ] In Firestore: `response.kind == 'reply'`, `response.value` matches text, `status == 'closed'`

### Cover badge after closure
- [ ] After closing all flags, the ⚑ indicator in TopChrome disappears
- [ ] If new flag arrives via realtime, indicator returns within ~1s

## Negative cases (rules)
- [ ] As User B, attempt (via Firestore console or a custom client) to update a flag's `quoteText` → write rejected
- [ ] As User C (non-participant), attempt to read a flag where C is neither from nor to → read rejected
- [ ] As User A, attempt to retract a flag (set status='retracted') AFTER User B has replied → write rejected
- [ ] Attempt to delete a flag doc → deny

## Type / build
- [ ] `npm run test:run` → all unit + component tests pass
- [ ] `npm run test:rules` → all rules tests pass (should be 130)
- [ ] `npx tsc --noEmit` → no NEW errors (3 pre-existing errors in `__tests__/lib/surface-recipes.test.ts` are unrelated)
- [ ] `npm run build` → production build completes

## Known gaps (deferred to follow-on plans)
- "Open the full conversation" link is NOT rendered (chat-level sharing not yet shipped)
- Sender's "Sent" list + retract UI is not in MVP — retraction only possible via direct Firestore mutation
- `seeBy` deadline + email/push nudge are not in MVP — flags wait silently until opened
- Soft-cap warning on "needs real reply" when recipient already has ≥3 pending — not yet implemented
- No telemetry counters yet
