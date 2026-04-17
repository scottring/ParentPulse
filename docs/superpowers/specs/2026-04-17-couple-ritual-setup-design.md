# Couple Ritual Setup — Design

**Date:** 2026-04-17
**Status:** Draft, approved for planning
**Scope:** Single feature — let two partners in a family schedule a recurring couple check-in together on one device, with calendar-invite delivery and an in-app reminder cue when the ritual window opens.

---

## Motivation

The "Relish is a journal that other people help you write" product only works if both partners actually engage. Memory research and the user's own framing ([feedback_ritual_and_intensity.md](../../../../.claude/projects/-Users-scottkaufman-Developer-Developer-parentpulse-web/memory/feedback_ritual_and_intensity.md)) landed on a hard conclusion: **without a scheduled ritual, engagement runs on motivation, and motivation for relational reflection inside a marriage is unreliable fuel.** One partner will be the power user; the other will be sparse. A weekly scheduled couple moment is the one time both are reliably in the room.

This spec covers only the **setup + reminder** slice. What the Surface actually renders *during* a ritual is a separate spec (Plan 4: The Surface already sketched this). Here we build the mechanism that causes the moment to exist in the first place.

## Scope

**In scope**
- A "set up your couple check-in" flow, executed on one device with both partners physically present.
- New data model (`couple_rituals` collection) for storing the recurring schedule.
- Spouse detection: find the other parent in the current user's family.
- A dedicated `/rituals` route for viewing, rescheduling, pausing, or ending the ritual.
- Calendar-invite delivery via downloadable `.ics` file (phase 1 — no push notifications).
- In-app cue on the ritual day ("Your check-in with Iris is tonight at 8pm") and during the ritual window ("Start together now →").
- Re-scheduling and cancellation (either partner can change; the other sees it on next open).

**Out of scope (deferred)**
- **Push notifications / FCM.** No token storage, service worker, or cloud-function push sender in v1. Calendar invites carry the scheduled-reminder weight.
- **Ritual occurrence history.** V1 does not track per-instance "was this completed / skipped / rolled over." Missed rituals silently advance to the next occurrence. Occurrence storage arrives in v2 when we need completion analytics.
- **The Surface during the ritual.** Tapping the "start together now" cue opens a placeholder page. The composed shared Surface is covered by the existing Plan 4: The Surface spec.
- **Kid rituals and household rituals.** Both follow the same mental model but have different participants and setup flows. Separate specs.
- **Intensity/proactivity slider.** Covered by a later spec; v1 uses a fixed default.
- **Between-ritual "one targeted question" pull mechanic for the sparse partner.** Separate spec.
- **Couple ritual over multiple devices** (each partner on their phone). V1 is one-device-only as confirmed by the user.

## Decisions locked with the user

1. **Ritual is scheduled, not ad-hoc.** Both partners committed to a recurring time. Reminders fire across channels.
2. **Setup is collaborative — both present on one device.** Not async propose/confirm.
3. **Rituals are rescheduleable in 2 taps.** Missed rituals roll over gracefully. **No streaks, no guilt, no red counters.**
4. **Solo mode is distinct.** If Iris isn't available, Scott does lightweight solo "notes between check-ins" — explicitly not a degraded couple-ritual session. (Solo mode is an adjacent surface; not built here.)
5. **V1 notifications = calendar invite + in-app cue.** Push deferred.
6. **Dedicated `/rituals` route, not a settings page.** Rituals are a daily concept, discoverable outside Settings.
7. **New `CoupleRitual` data object, separate from the existing prose `RelationshipRitual` struct.** Keeps scheduled-instance semantics distinct from descriptive "we have a Sunday coffee routine" metadata.

## Architecture

### Data model — new top-level `couple_rituals` collection

Chosen over embedding on `Family` or extending `RelationshipManual.rituals[]` because:
- Family-level embedding mixes schedule metadata with domain data (bad cohesion).
- `RelationshipManual.rituals` is prose-only and part of the synthesized manual surface; scheduled rituals need query-by-date semantics, indexes, and security rules distinct from manual content.
- A dedicated collection mirrors the shape of `journal_entries` and `dinner_prompts` — familiar pattern for this codebase.

```ts
// src/types/couple-ritual.ts (new file)
import { Timestamp } from 'firebase/firestore';

export type RitualCadence = 'weekly' | 'biweekly' | 'monthly';
export type RitualStatus = 'active' | 'paused' | 'ended';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat, matches JS Date.getDay()

export interface CoupleRitual {
  id: string;
  familyId: string;

  // Both partners' Firebase Auth UIDs. Order-insensitive.
  participantUserIds: [string, string];

  // When it fires.
  cadence: RitualCadence;                // default 'weekly'
  dayOfWeek: DayOfWeek;                   // e.g. 0 for Sunday
  startTimeLocal: string;                 // 'HH:mm' in 24h, e.g. '20:00'
  durationMinutes: number;                // e.g. 15
  timezone: string;                       // IANA, e.g. 'America/New_York'

  // State.
  status: RitualStatus;                   // 'active' by default
  startsOn: Timestamp;                    // first occurrence date (>= createdAt date)

  // Audit.
  createdAt: Timestamp;
  createdByUserId: string;                // which partner drove the creation UI
  updatedAt: Timestamp;
  updatedByUserId: string;

  // Human-friendly note shown on both partners' confirmations, optional.
  intention?: string;                     // <=140 chars, e.g. "Our weekly check-in"
}
```

No occurrence sub-collection in v1. Next-occurrence is computed client-side from the schedule + the current time (pure function; see `src/lib/rituals/nextOccurrence.ts` below).

### File structure

```
src/
  types/
    couple-ritual.ts                 // type definitions (above)
  lib/
    rituals/
      nextOccurrence.ts              // pure fn: schedule → next fire time
      isInWindow.ts                  // pure fn: is now within [start, start+duration]?
      icsExport.ts                   // pure fn: schedule → ICS string with RRULE
      spouseDetection.ts             // helper: find other parent user in family
  hooks/
    useCoupleRitual.ts               // subscribe + CRUD for the family's ritual
    useSpouse.ts                     // resolve current user's spouse
  app/
    rituals/
      page.tsx                       // /rituals — list/overview
      couple/
        setup/
          page.tsx                   // /rituals/couple/setup — 6-step flow
          ClientPage.tsx
        manage/
          page.tsx                   // /rituals/couple/manage — edit/pause/end
          ClientPage.tsx
        session/
          page.tsx                   // /rituals/couple/session — placeholder; redirects to the Surface once built
  components/
    rituals/
      RitualSetupStepper.tsx         // step UI
      RitualDayPicker.tsx            // day-of-week buttons
      RitualTimePicker.tsx           // time dropdown
      RitualCadencePicker.tsx        // weekly/biweekly/monthly
      RitualSummaryCard.tsx          // "Sundays at 8pm with Iris"
      RitualBanner.tsx               // in-app cue, shown inside AppShell on ritual day
functions/
  // no new functions in v1 — all logic is client-side
firestore.rules
  // new matcher for couple_rituals (see Security rules)
```

### Spouse detection

Per the code audit, partners in a family are not yet connected by `linkedUserId`; they share only a `familyId`. For v1, spouse detection uses the simplest safe rule:

```ts
// src/lib/rituals/spouseDetection.ts
// Returns the other parent-role user in the family, or null.
// Defensive: returns null (and the UI shows a "you don't have a partner linked yet" state)
// if the family has 0 or >1 other parent-role users — we do not silently pick one.
export async function findSpouseUserId(
  familyId: string,
  currentUserId: string,
): Promise<string | null>;
```

This lets the setup flow gate on "you and one other parent exist" without depending on `Person.linkedUserId` (which is defined in the type but not wired through the invite flow). Updating the invite flow to populate `linkedUserId` is out of scope here; noted as future work.

### The setup flow (`/rituals/couple/setup`)

Six linear steps. One device, both partners present. The flow is text-heavy and deliberately ceremonial — this is the moment of commitment, so it is not rushed.

1. **"Is [spouse name] here with you?"** — single confirmation button ("Yes, we're together"). If Scott taps this alone, the social contract is already violated — but we don't enforce it. A small line reads: "This works best when you're both in the room."
2. **"How often?"** — three options: Weekly (default, highlighted) / Every two weeks / Monthly. Explanatory copy: "Weekly is the default most couples land on — it keeps synthesis fresh without becoming a chore."
3. **"What day?"** — seven day-of-week buttons. Default highlight on Sunday.
4. **"What time?"** — dropdown with 30-min increments from 6:00 PM to 10:00 PM (wider range accessible via "show more"). Default 8:00 PM.
5. **"How long?"** — three options: 10 min / 15 min (default) / 30 min.
6. **"Your check-in: Sundays at 8:00 PM, 15 minutes."** — a confirmation screen that shows the summary, offers an optional "Intention" text field ("Our weekly check-in" pre-filled, editable to 140 chars), a "Download calendar invite" button, and a prominent "Confirm" button.

On Confirm:
- Create the `couple_rituals` document with status `active`.
- Trigger the ICS file download (handled client-side).
- Navigate to `/rituals` (the list/overview) with a one-shot success toast.
- Do nothing else: no email, no push, no notification to Iris's device. She'll see the ritual next time she opens her app.

### Calendar invite delivery

Pure client-side ICS generation. No server call, no email sending.

```ts
// src/lib/rituals/icsExport.ts
// Returns a well-formed ICS string with RRULE matching the cadence.
// Includes both partners' UIDs in ATTENDEE lines (future use).
export function coupleRitualToIcs(
  ritual: CoupleRitual,
  selfName: string,
  spouseName: string,
): string;
```

RRULE matrix:
- `weekly` → `RRULE:FREQ=WEEKLY;BYDAY={SU|MO|...}`
- `biweekly` → `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=...`
- `monthly` → `RRULE:FREQ=MONTHLY;BYDAY=1SU` (first Sunday, etc. — we compute the nth-weekday from `startsOn`)

The confirmation step offers a "Download for my calendar" button that triggers the download. The ICS has a recurrence rule so one file seeds all future occurrences. Each partner downloads the invite on their own device later (they are both present on one device during setup — each taps the button on their phone using the QR code or a "send to my device" link in a follow-up pass; v1 ships with "download to this device" only and the partner-two flow lands next).

### In-app cue (`RitualBanner`)

Rendered inside `AppShell` on every route once a user has an active ritual. Three states:

- **Day-of, pre-window:** "Your check-in with Iris is tonight at 8:00 PM." (muted, dismissible for today)
- **In-window** (from `startTime - 10 min` to `startTime + 30 min`): "Your check-in is starting. Start together →" (prominent, calls to `/rituals/couple/session`)
- **Otherwise:** hidden. No banner on off-days. No "you missed it" banner afterward. Silence is the design.

The banner reads from `useCoupleRitual()` + `isInWindow()` + local time. No server dependency.

### The session placeholder (`/rituals/couple/session`)

V1 renders a simple "Your check-in with Iris has begun. (Shared Surface coming soon.)" page. This is the integration seam for the Plan 4: The Surface build — when that ships, this route either redirects to `/` with a ritual-mode flag or is replaced by the composed Surface. Leaving it as a placeholder now means the ritual *mechanism* is shippable and testable without waiting for the Surface.

### Management page (`/rituals/couple/manage`)

Read-only summary at the top ("Sundays at 8:00 PM, 15 minutes"), then three actions:
- **Change time / day / cadence** — opens the setup flow pre-filled with current values.
- **Pause** — sets `status: 'paused'`. Banner stops showing. Can resume later.
- **End** — sets `status: 'ended'`. Confirmation modal: "Are you sure? You and Iris can always set up a new one."

Either partner can take any of these actions. The other sees the change next time they open the app.

### Rescheduling and "missed" handling

- **Reschedule:** updating the schedule is a single document write. The ICS invite from the old version becomes stale on both partners' calendars; the management screen offers a "re-download calendar invite" button so each partner can replace the stale event. (Yes, this is manual. Automated CalDAV push is out of scope.)
- **Missed:** the app does nothing. No "you missed your check-in" cue, no rollover UI. When the next scheduled time rolls around, the banner returns. This is the single most important behavior in the spec, because every engagement-retention instinct fights it — and those instincts are what the product explicitly rejects.

## Security rules

```
// firestore.rules additions
match /couple_rituals/{ritualId} {
  allow read: if isSignedIn() && belongsToFamily(resource.data.familyId);
  allow create: if isSignedIn()
    && belongsToFamily(request.resource.data.familyId)
    && request.auth.uid in request.resource.data.participantUserIds
    && request.resource.data.participantUserIds.size() == 2;
  allow update, delete: if isSignedIn()
    && belongsToFamily(resource.data.familyId)
    && request.auth.uid in resource.data.participantUserIds;
}
```

Both partners are in `participantUserIds`, so either can update or delete. Nobody outside the family can read. Create requires the creator to be one of the two listed participants.

## User flows (walkthroughs)

### Flow A: Scott and Iris set up their first ritual (happy path)

1. Scott opens the app on his phone. Iris is next to him on the couch.
2. Scott taps a "Set up your couple ritual" card that appears on `/rituals` (which he navigated to from the main nav).
3. Six-step flow. At each step, Scott reads the option aloud; they pick together. Sundays, 8:00 PM, 15 minutes, default intention.
4. Scott taps Confirm. Toast: "Your Sunday check-in is set." Ritual is now in Firestore. ICS file downloads to Scott's phone.
5. Scott saves the ICS to his calendar.
6. (Later) Iris opens her app from her own phone. She sees the `RitualBanner` showing the ritual and a "Download for my calendar" button on `/rituals/couple/manage`. She downloads.

### Flow B: Iris wants a different time

1. Iris opens `/rituals/couple/manage` from her own phone on Wednesday.
2. She taps "Change time." Pre-filled setup flow opens.
3. She changes Sunday to Saturday and confirms.
4. Firestore document updates. Scott's banner and management page reflect the change next time he opens the app.
5. The old Sunday ICS is now stale on Scott's calendar. He sees a "your ritual changed — re-download your calendar invite" hint on `/rituals/couple/manage`.

### Flow C: Life gets busy

1. Sunday 8:00 PM arrives. Both Scott and Iris are with their kids.
2. Banner appears on whoever's app is open: "Your check-in is starting. Start together →"
3. Nobody taps it. The window closes at 8:30 PM. Banner disappears.
4. Monday through Friday: no banners, no prompts. The app is silent.
5. Next Sunday: banner reappears as if the previous week didn't happen. No streak loss. No guilt copy. No history view.

## Future work (out of spec, noted for continuity)

- **Push notifications.** FCM tokens per user, service worker registration, ritual-day push at `startTime - 15 min`. Replaces/augments the ICS-only v1 reminder.
- **Ritual occurrence collection.** `ritual_occurrences/{id}` to track completion, skip reason, rollover chain. Enables "you've done 8 weeks in a row" gentle acknowledgment (optional, opt-in) and analytics.
- **`linkedUserId` backfill.** When spouses accept invites, populate `Person.linkedUserId` so spouse detection is O(1) by `Person` lookup instead of "other parent user in family."
- **Partner-2 calendar delivery.** Rather than both partners tapping download on their own phones, generate a one-time "send to your phone" link the driver can hand off.
- **Kid rituals.** Same mental model (scheduled cadence), different participants (one parent + one child), different content shape. Separate spec.
- **Solo "notes between check-ins".** Adjacent surface for the power user; needs its own entry point and tone.
- **Intensity/proactivity slider.** Global setting that governs what the ritual session renders and how densely.

## Open questions for the planner

1. **Navigation entry point.** `/rituals` needs to appear in the main nav. Does it replace an existing nav item (e.g. "Reports") or get added? Recommendation in the plan: add as a new nav item next to "Family manual."
2. **Empty-state for families with 0 or >1 spouses.** Flow gates on exactly one spouse. The plan should include a clear empty-state screen ("We couldn't find your partner — invite them first") with a deep link to the existing invite flow.
3. **Timezone choice on setup.** Do we default to the browser's IANA TZ silently, or ask? Recommendation: default silently; surface in the confirmation step ("Sundays at 8:00 PM Eastern") and make it editable on `/manage`.
4. **ICS UID stability.** Calendar apps dedupe by UID. We must use a stable UID per ritual (`relish-couple-ritual-{ritualId}@parentpulse-d68ba`) so rescheduling updates the existing calendar event, not creates a duplicate.
