# Flag-for-Partner — Design

**Date:** 2026-05-12
**Status:** Approved — ready for implementation plan

## The problem

Scott has an AI conversation about something that happened with one of the kids. There's a particular point — a single line the AI said, or one of his own — that he wants to call Iris's attention to. He wants to know she's seen it. Sometimes he wants to know she's *responded* to it. Today there's no mechanism: the conversation is private, there's no per-message flag, and the only inbox she has ("Waiting on you") only surfaces journal entries that *mention* her.

## What we're building

A "Flag for [person]" affordance on AI chat messages (coach + AskAboutEntry). The author selects a message, optionally adds a note, optionally sets a "see by" deadline, and optionally marks the flag as needing a real reply. The recipient discovers it via her Cover ("Waiting on you") plus a subtle ⚑ + dot in top chrome. She closes the loop with an emoji or note reply — or a real written reply if the flag was marked as such.

## Scope

In:
- Coach chat (`/coach`)
- AskAboutEntry sub-chats (per-entry AI chats inside the journal spread)

Out (deliberately):
- Flagging journal entries (already covered by `mention_for_me` open-thread reason)
- Flagging manual passages
- Group / broadcast flagging (one recipient per flag)
- Kid-authored chats (kid check-in flow has its own share mechanic)

## Decisions made during brainstorming

| # | Question | Decision |
|---|---|---|
| 1 | What gets flagged? | A single AI or user message, captured as a quote snapshot |
| 2 | What does the recipient see? | The quote + optional note. Full conversation only if the chat itself was separately marked shared with that person |
| 3 | What counts as closure? | Graduated — default is emoji or short note; sender can opt-in "Needs a real reply" per flag |
| 4 | Where does it appear for the recipient? | Cover row (new `flagged_for_me` open-thread reason) plus a small ⚑ + dot in top chrome |
| 5 | When does it interrupt? | Silent by default; optional natural-language "see by" deadline triggers exactly one nudge if she hasn't opened by then |
| 6 | How broad is the scope? | Both AI chats (coach + AskAboutEntry); no other surfaces yet |

## Data model

### New collection: `message_flags`

```ts
interface MessageFlag {
  flagId: string;
  fromUserId: string;
  toUserId: string;
  chatKind: 'coach' | 'entry_chat';
  chatId: string;                    // chat_conversations id, or entry_chat composite id
  messageId: string;                 // stable id of the source message
  senderRole: 'user' | 'assistant';  // who said the quoted line
  quoteText: string;                 // snapshot, ~280 chars max, truncated with ellipsis
  note?: string;                     // sender's editorial framing, optional
  seeBy?: Timestamp;                 // optional soft deadline
  needsRealReply: boolean;           // toggle from the composer
  status: 'open' | 'seen' | 'closed' | 'retracted';
  seenAt?: Timestamp;                // first time recipient opens the row
  closedAt?: Timestamp;
  response?: {
    kind: 'emoji' | 'note' | 'reply';  // 'reply' = text reply when needsRealReply is true
    value: string;                      // emoji glyph or text
    at: Timestamp;
  };
  nudgedAt?: Timestamp;              // set when the seeBy nudge fires
  createdAt: Timestamp;
}
```

### Extension: `chat_conversations` (coach)

Add `sharedWithUserIds: string[]` so a coach conversation can be marked shared with one or more people. Default empty (= "Just me").

### Extension: AskAboutEntry chats

Inherit visibility from the parent journal entry's `sharedWithUserIds`. The chat-level pill exists but is grayed out if the parent entry is private — you can't make a sub-chat more open than the entry it's about.

### Extension: `open-threads.ts`

Add a new reason and a new kind:

```ts
export type OpenThreadReason =
  | 'pending_invite'
  | 'unclosed_divergence'
  | 'incomplete_practice'
  | 'overdue_ritual'
  | 'mention_for_me'
  | 'flagged_for_me';   // NEW

export type OpenThreadKind =
  | 'moment' | 'entry' | 'ritual' | 'practice'
  | 'flag';             // NEW
```

`listOpenThreads` gains a new source: `flagsForMe: MessageFlag[]`. For each flag where `status` is `open` or `seen`, emit an OpenThread row with `kind: 'flag'`, `subtitle` = truncated quoteText, and `closingAction` whose href opens the Cover with the flag row auto-expanded. The exact href pattern is an implementation detail of the Cover surface.

Reason precedence inserts `flagged_for_me` at position 2 (between `pending_invite` and `incomplete_practice`) — it's more direct than a divergence but less time-critical than a pending invite.

## UX — sender side

**Affordance.** Long-press / hover any AI chat message → action pill appears with `⚑ Flag for…` as a primary action.

**Composer sheet.** Triggered by the action pill. Contains:
- Quote preview (uneditable snapshot of the selected message)
- Recipient chip — defaults to the connected partner if there's exactly one; otherwise requires explicit selection
- Note field — optional, single-line or short multi-line
- "See by" field — optional, natural-language text ("Before Friday's ritual", "tomorrow 9am"), parsed at submit using existing date-parse utility
- "Needs a real reply" toggle — off by default
- Visibility hint under the recipient chip:
  - If chat is not shared: *"Iris will see your note and the quoted line. The rest of the conversation stays just yours."*
  - If chat is shared: *"Iris can already see this conversation. Flagging just points her at this part."*
- Buttons: Cancel · Flag for [name]

**Sent flags list.** A small "Sent" surface for Scott showing his own outbound flags + their status (waiting / seen / closed / retracted), with a Retract action on any flag where `response` is not yet set. Placement (Cover sub-tab vs. Settings sub-page) is an open question for the implementation plan.

## UX — recipient side

**Chrome.** A subtle ⚑ in top chrome with a clay dot when at least one open flag exists. No numeric count until count ≥ 2.

**Cover row.** New row type in the "Waiting on you" section. Distinguishing features:
- 3px clay left border
- ⚑ avatar (clay → gold gradient)
- Title: "Scott flagged a moment for you" + (if needsRealReply) "Needs reply" pill
- Sub: quote excerpt in italic
- Meta: relative time

**Expanded state (in-place accordion).** Tapping the row reveals, inside the same row container:
- Sender's note in plain prose
- The quote in editorial display face (Cormorant), with a clay left border
- "Open the full conversation" link — only rendered if she has read access to the parent chat
- Reply row: text input + emoji trigger + Send button
- For needsRealReply variant: emoji trigger removed, with a small italic line "Scott asked for a written reply, not just a tap."

Tap the row header again → collapses.

**Counter.** When she has ≥ 1 needs-reply flags open, the Cover section header shows a quiet sub-line: *"3 things from Scott need a real reply."*

## Notifications

Three states only:

1. **No `seeBy`** → pure silence. Found on next Cover visit.
2. **`seeBy` set, opened in time** → silence. Deadline is a soft target.
3. **`seeBy` set, not opened by `seeBy − N`** → exactly one nudge.

`N` is computed from the window length:
- Window < 6h: N = 2h
- Window 6–24h: N = 6h
- Window ≥ 24h: N = end of prior day

**Cloud Function `nudgeOverdueFlags`.** Runs hourly. Scans `message_flags` where `status === 'open' && seeBy != null && nudgedAt == null && now >= seeBy - N`. Fires one nudge per matching flag. Writes `nudgedAt`. Idempotent.

**Nudge content.**
- Channel: email if recipient has email notifications enabled; else push if enabled; else no nudge.
- Subject: "Scott flagged something for you"
- Body: sender's note (first ~140 chars) + a link to the Cover (`/cover?flag={flagId}`)
- The quote is NOT in the email body — that content lives only in Relish.

**No second nudge ever.** If the first is missed, that's information, not a reason to escalate.

## Closure semantics

- **Recipient opens the row** → `seenAt` set, status becomes `seen`. The Cover row shifts visually (clay border softens) but remains visible.
- **Recipient sends an emoji** (only allowed when `needsRealReply` is false) → `response` written, status becomes `closed`, row removed from Cover.
- **Recipient sends a note** → same as above; works on both variants.
- **Recipient closes the row without replying** → status stays `seen`. Because `seen` flags are still emitted as open-threads, the row will naturally appear in the next ritual's prep list — no separate "Save for ritual" action needed.
- **Sender retracts** (allowed only before `response` is set) → status `retracted`. Row disappears from recipient's Cover. Sender sees "Retracted" in their Sent list.

## Soft cap on "Needs a real reply"

When the sender opens the composer and toggles "Needs a real reply," the toggle row checks: does the recipient currently have ≥ 3 open `needsRealReply` flags from this sender? If yes, render a quiet warning below the toggle: *"Iris has 3 things from you waiting for a written reply. Consider leaving this one as a tap-reply."* Not blocked. The threshold (3) is initial; tune from telemetry.

## Edge cases

- **Re-flag of same (chatId, messageId) to same recipient while first is open.** No-op. Composer Send button surfaces "Already flagged for Iris."
- **After closure, re-flag of same message.** Allowed — creates a new doc.
- **Deleted source message.** Flag still works (quote is snapshotted). "Open the full conversation" target shows a *Conversation no longer available* state.
- **Recipient access revoked to chat after flagging.** The flag remains valid — recipient can still see the quote + note, but the "Open the full conversation" link disappears. No retroactive redaction of the quote.
- **Recipient is not yet onboarded to Relish.** Flags are blocked at compose time — recipient picker only shows connected adults with `linkedUserId`.

## Firestore rules

```
match /message_flags/{flagId} {
  allow read: if request.auth != null
                && (resource.data.fromUserId == request.auth.uid
                 || resource.data.toUserId == request.auth.uid);
  allow create: if request.auth != null
                && request.resource.data.fromUserId == request.auth.uid
                && request.resource.data.status == 'open';
  // Updates are restricted by intent — Cloud-Function-only for nudgedAt;
  // recipient may set seenAt/closedAt/response; sender may set status='retracted'.
  // (Detailed rule shape lives in the implementation plan.)
}
```

## Telemetry

Counters per flag lifecycle: created, seen, closed, retracted, nudged. Time-to-open and time-to-close histograms. Closure-kind distribution (emoji vs. note vs. reply). No content logging — only the metadata.

## What this deliberately does not do

- No flagging on journal entries, manual passages, or kid check-ins
- No group flagging or broadcast
- No editing the quoted text after the fact
- No "you flagged this for Iris on Mar 4" feed/history surface beyond the Sent tab
- No second nudge
- No retroactive redaction when access changes
- No telemetry on flag content

## Open questions for implementation plan

- Composer's recipient default: auto-fill with the single connected partner, or always require an explicit tap? (Lean: auto-fill for one partner, require tap if more.)
- "See by" natural-language parsing: reuse existing utility or introduce a small picker fallback for unparseable input? (Lean: reuse + show a chip with the parsed date so the user can confirm before sending.)
- Sent list location: tab on the Cover, or a small subsection in Settings? (Lean: subtle tab on the Cover so retraction is reachable from where flags live.)
- Threshold for the soft cap on "Needs reply." Start at 3; revisit after first usage.

## Brainstorming companion artifacts

Mockups live in `.superpowers/brainstorm/57979-1778579743/content/`:
- `composer-side.html` — sender flow (message action pill + flag composer)
- `cover-row-restored.html` — recipient Cover row (collapsed) + chrome badge
- `cover-row-expanded.html` — recipient detail (in-place accordion)
