# Person Profile Edit Sheet

**Date:** 2026-04-20
**Status:** Spec — awaiting implementation plan

## Problem

Today there is no UI for editing a person's profile. `Person.avatarUrl` exists in the type but is unreachable from the app, and nothing displays a per-person banner on `/people/[personId]` (the hero falls back to `stockImagery.personHeroFallback`, currently `null`, then to a cream-warm gradient). The only ways to change a person's photo are the Firestore console or a one-off script.

## Goal

Give the user a minimal, editorial way to edit a person's profile fields — including a per-person banner image — directly from their person page. URL-paste only; no uploads. Layout-preserving; no redesign of the hero.

## Non-goals

- Firebase Storage / drag-drop upload
- Image cropping or preview
- Global stock imagery editing (landing, workbook masthead, ritual hero)
- Rendering `avatarUrl` on the person hero (it stays the banner/gradient composition)
- Editing from the `/people` list page
- Permissions beyond the existing family-scoped Firestore rules for `people/*`

## Architecture

### Data model change

Add one optional field to `Person` in `src/types/person-manual.ts`:

```ts
bannerUrl?: string;
```

No migration needed — existing docs without the field fall through the same fallback chain already in place.

### New component

`src/components/people/EditPersonSheet.tsx` — a modal dialog.

**Props:**

```ts
interface EditPersonSheetProps {
  person: Person;
  onClose: () => void;
  onSaved?: () => void;
}
```

**Behavior:**

- Opens centered with a soft dark scrim.
- Pre-fills all fields from `person`.
- Calls `updatePerson(person.personId, updates)` from `usePerson` on Save.
- Before writing, converts DOB `YYYY-MM-DD` → Firestore `Timestamp` and prunes empty-string fields to `undefined` so Firestore does not persist blanks.
- On success, calls `onSaved?.()` and `onClose()`.
- On error, shows an inline error line; does not close.
- Cancel closes without saving. Escape key and scrim click both cancel.

### Page change

`src/app/people/[personId]/page.tsx`:

1. Add `useState` for `isEditing`.
2. Render a small pencil icon button in the `.crumbs` row, right-aligned. Clicking sets `isEditing = true`. ARIA label: `"Edit {firstName}'s page"`.
3. Conditionally render `<EditPersonSheet person={person} onClose={() => setIsEditing(false)} />`.
4. Change the `.person-portrait` `background` rule so that `person.bannerUrl`, when present, wins over the existing `heroBg` fallback chain. Implementation: add an inline `style` prop to the portrait `<div>` that sets `backgroundImage` to a `url(...)` template literal when `person.bannerUrl` is set, otherwise `undefined`. The existing CSS `background` rule then acts as the fallback.

### Fields and validation

| Field | Input type | Required | Notes |
|---|---|---|---|
| Name | `text` | yes | Trimmed. Blank name blocks Save. |
| Pronouns | `text` | no | Free form (e.g., "she/her"). |
| Date of birth | `date` | no | `YYYY-MM-DD` → `Timestamp.fromDate(new Date(value))`. |
| Avatar URL | `url` | no | Pasted; basic URL validity check via the input's native `type="url"`. |
| Banner URL | `url` | no | Same. |

Empty strings on save → `updatePerson` receives the field as `undefined` (which the existing hook writes directly; Firestore `updateDoc` with `undefined` is a no-op, so blank fields do not clear existing values). To explicitly clear a field, we will pass `deleteField()` from `firebase/firestore`. Exact mapping:

- Input emptied for an existing field → write `deleteField()` for that key.
- Input untouched or identical → omit from the update payload.
- Input changed to a new value → write the new value.

### Visual tone

- Sheet chrome: cream paper background (`var(--r-paper)`), 1px `var(--r-rule-5)` borders, 3px radius.
- Title: serif italic, `var(--r-ink)`, matches `.h2-serif`.
- Field labels: sans-caps uppercase with 0.22em tracking, matches `.dossier-facts dt`.
- Save button: reuses `pillDarkStyle` from the page.
- Cancel button: reuses `pillStyle`.
- Scrim: `rgba(20, 16, 12, 0.5)` with a gentle fade-in (`opacity` transition, 120ms, `var(--r-ease-ink)`).
- Mobile: sheet becomes full-height with a top drag handle; fields stack.

### Data flow

```
User clicks pencil
  → isEditing = true
    → <EditPersonSheet person={person} …/>
      → user edits fields, clicks Save
        → build updates payload (Timestamps, deleteField() for clears)
        → updatePerson(personId, updates)  // Firestore updateDoc + local state
          → onSaved?.()  → onClose()
            → PersonPage re-renders from hook's updated state
```

## Testing

**Unit (Vitest + React Testing Library):**

- Sheet renders with existing values populated.
- Submitting with name cleared shows validation error; no call to `updatePerson`.
- Submitting a changed avatarUrl calls `updatePerson` with `{ avatarUrl: "<new>" }`.
- Submitting with an emptied banner URL calls `updatePerson` with `{ bannerUrl: deleteField() }`.
- DOB `YYYY-MM-DD` converts to a Timestamp whose `.toDate()` matches the same calendar date.
- Escape key closes without saving.

**Manual:**

- Open `/people/{id}`, click pencil, paste a banner URL, Save. Hero updates without a refresh.
- Refresh the page — banner persists.
- Open the sheet again, clear the banner URL, Save. Hero falls back to gradient.
- Edit a person without a linked manual — sheet still works, no errors.

## File changes

- `src/types/person-manual.ts` — add `bannerUrl?: string` to `Person`.
- `src/components/people/EditPersonSheet.tsx` — new.
- `src/app/people/[personId]/page.tsx` — pencil button in breadcrumbs, sheet state, banner wired into hero.
- `src/components/people/EditPersonSheet.test.tsx` — new (unit tests above).

No changes to Firestore rules, hooks, or any other page.

## Risks and mitigations

- **Broken image URLs** — if user pastes a bad URL, the hero shows an empty background; CSS gradient fallback does not kick in because the bad URL is still set. Mitigation: accept as user error for v1; a future upload flow will eliminate this.
- **Firestore `undefined` vs. field clearing** — covered above with `deleteField()`.
- **Name uniqueness / collisions** — out of scope; the system already tolerates duplicates via the `archived` flag.
