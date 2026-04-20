# Person Profile Edit Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, URL-paste modal on `/people/[personId]` that lets the user edit a person's name, pronouns, date of birth, avatar URL, and a new per-person banner URL — with the banner wired into the hero image.

**Architecture:** One new presentational component (`EditPersonSheet`) receives `person` + `onClose` + `onSave` as props and builds a Firestore-ready updates payload. The page owns state, renders a pencil button in the breadcrumbs row, wires `onSave` to `updatePerson`, and uses the new `bannerUrl` field as an inline `backgroundImage` that wins over the existing gradient fallback chain on `.person-portrait`. One new field (`bannerUrl?: string`) on `Person`. No Firebase Storage. No schema/rules changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Firestore, Vitest + @testing-library/react + @testing-library/user-event (happy-dom environment).

**Spec:** `docs/superpowers/specs/2026-04-20-person-profile-edit-sheet-design.md`

**Design note vs spec:** The spec said the sheet calls `updatePerson` directly. The plan passes it as an `onSave` prop instead so the component is testable without mocking the hook. `updatePerson` is called at the page level, which is still the "one hook, one write path" the spec intended.

---

## Task 1: Add `bannerUrl` field to `Person`

**Files:**
- Modify: `src/types/person-manual.ts:35-67`

- [ ] **Step 1: Open the Person interface and add `bannerUrl`**

In `src/types/person-manual.ts`, find the `Person` interface (line 35). Under `avatarUrl?: string;` add:

```ts
  bannerUrl?: string;
```

The resulting block should look like:

```ts
  // Basic identity
  name: string;
  dateOfBirth?: Timestamp;
  avatarUrl?: string;
  bannerUrl?: string;
  pronouns?: string;
  age?: number;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this change. (Pre-existing errors elsewhere can be ignored for this step; the key is that nothing breaks *because of* the new field.)

- [ ] **Step 3: Commit**

```bash
git add src/types/person-manual.ts
git commit -m "feat(person): add optional bannerUrl to Person type"
```

---

## Task 2: Scaffold `EditPersonSheet` with a render test

**Files:**
- Create: `src/components/people/EditPersonSheet.tsx`
- Create: `__tests__/components/people/EditPersonSheet.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create `__tests__/components/people/EditPersonSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { EditPersonSheet } from '@/components/people/EditPersonSheet';
import type { Person } from '@/types/person-manual';

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    personId: 'p-1',
    familyId: 'f-1',
    name: 'Mia',
    pronouns: 'she/her',
    dateOfBirth: Timestamp.fromDate(new Date(2018, 5, 14)), // June 14, 2018 local
    avatarUrl: 'https://img/avatar.jpg',
    bannerUrl: 'https://img/banner.jpg',
    hasManual: false,
    canSelfContribute: false,
    addedAt: Timestamp.now(),
    addedByUserId: 'u-1',
    ...overrides,
  };
}

describe('EditPersonSheet', () => {
  it('renders existing values in the form', () => {
    render(
      <EditPersonSheet
        person={makePerson()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Mia');
    expect(screen.getByLabelText(/pronouns/i)).toHaveValue('she/her');
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('2018-06-14');
    expect(screen.getByLabelText(/avatar url/i)).toHaveValue('https://img/avatar.jpg');
    expect(screen.getByLabelText(/banner url/i)).toHaveValue('https://img/banner.jpg');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: FAIL with "Cannot find module '@/components/people/EditPersonSheet'".

- [ ] **Step 3: Create the minimal component**

Create `src/components/people/EditPersonSheet.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { Person } from '@/types/person-manual';

export interface EditPersonSheetProps {
  person: Person;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

function toDateInputValue(ts?: Timestamp): string {
  if (!ts) return '';
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function EditPersonSheet({ person, onClose, onSave }: EditPersonSheetProps) {
  const [name, setName] = useState(person.name ?? '');
  const [pronouns, setPronouns] = useState(person.pronouns ?? '');
  const [dob, setDob] = useState(toDateInputValue(person.dateOfBirth));
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(person.bannerUrl ?? '');

  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${person.name}`}>
      <div className="scrim" onClick={onClose} />
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <h2>Edit {person.name}</h2>

        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Pronouns
          <input
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
          />
        </label>

        <label>
          Date of birth
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>

        <label>
          Avatar URL
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </label>

        <label>
          Banner URL
          <input
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
          />
        </label>

        <div className="actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
```

(Styling is deferred to Task 8 so the TDD loop focuses on behavior, not visuals.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): scaffold EditPersonSheet with render test"
```

---

## Task 3: Save builds a correct updates payload for changed values

**Files:**
- Modify: `__tests__/components/people/EditPersonSheet.test.tsx`
- Modify: `src/components/people/EditPersonSheet.tsx`

- [ ] **Step 1: Add the failing save test**

Append inside the `describe('EditPersonSheet', …)` block in `__tests__/components/people/EditPersonSheet.test.tsx`:

```tsx
  it('calls onSave with only the changed fields on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({ name: 'Mia', avatarUrl: 'https://img/old.jpg' })}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const avatar = screen.getByLabelText(/avatar url/i);
    await user.clear(avatar);
    await user.type(avatar, 'https://img/new.jpg');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      avatarUrl: 'https://img/new.jpg',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx -t "only the changed fields"`
Expected: FAIL — `onSave` is not called on submit (the form's `onSubmit` is a no-op).

- [ ] **Step 3: Implement the save handler**

Replace the `<form … onSubmit>` in `src/components/people/EditPersonSheet.tsx` with a working submit path. Add a `buildUpdates` helper and a submit handler:

```tsx
import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { Person } from '@/types/person-manual';

// … (toDateInputValue stays as defined in Task 2) …

export function EditPersonSheet({ person, onClose, onSave }: EditPersonSheetProps) {
  const [name, setName] = useState(person.name ?? '');
  const [pronouns, setPronouns] = useState(person.pronouns ?? '');
  const [dob, setDob] = useState(toDateInputValue(person.dateOfBirth));
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(person.bannerUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updates: Record<string, unknown> = {};

    const trimmedName = name.trim();
    if (trimmedName !== (person.name ?? '')) {
      updates.name = trimmedName;
    }

    if (pronouns !== (person.pronouns ?? '')) {
      updates.pronouns = pronouns;
    }

    if (avatarUrl !== (person.avatarUrl ?? '')) {
      updates.avatarUrl = avatarUrl;
    }

    if (bannerUrl !== (person.bannerUrl ?? '')) {
      updates.bannerUrl = bannerUrl;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${person.name}`}>
      <div className="scrim" onClick={onClose} />
      <form className="sheet" onSubmit={handleSubmit}>
        <h2>Edit {person.name}</h2>

        {/* fields unchanged from Task 2 */}

        {error && <p role="alert">{error}</p>}

        <div className="actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify both pass**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): save path emits only changed fields"
```

---

## Task 4: DOB round-trips through Firestore `Timestamp`

**Files:**
- Modify: `__tests__/components/people/EditPersonSheet.test.tsx`
- Modify: `src/components/people/EditPersonSheet.tsx`

- [ ] **Step 1: Add the failing DOB conversion test**

Inside the `describe` block, append:

```tsx
  it('converts a changed date of birth into a Firestore Timestamp for that calendar date', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({
          dateOfBirth: Timestamp.fromDate(new Date(2018, 5, 14)), // June 14, 2018
        })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const dob = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
    await user.clear(dob);
    await user.type(dob, '2019-07-04');

    await user.click(screen.getByRole('button', { name: /save/i }));

    const call = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(call.dateOfBirth).toBeInstanceOf(Timestamp);
    const d = (call.dateOfBirth as Timestamp).toDate();
    expect(d.getFullYear()).toBe(2019);
    expect(d.getMonth()).toBe(6); // July (0-indexed)
    expect(d.getDate()).toBe(4);
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx -t "Timestamp for that calendar date"`
Expected: FAIL — `call.dateOfBirth` is undefined (DOB isn't in the updates payload yet).

- [ ] **Step 3: Add DOB diffing + conversion**

In `src/components/people/EditPersonSheet.tsx`, add a helper above the component:

```tsx
function fromDateInputValue(value: string): Timestamp | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return Timestamp.fromDate(new Date(y, m - 1, d));
}
```

Inside `handleSubmit`, after the `bannerUrl` diff and before the empty check, add:

```tsx
    const currentDob = toDateInputValue(person.dateOfBirth);
    if (dob !== currentDob) {
      const next = fromDateInputValue(dob);
      if (next) updates.dateOfBirth = next;
    }
```

- [ ] **Step 4: Run the full file and confirm all tests pass**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): round-trip DOB through Firestore Timestamp"
```

---

## Task 5: Clearing a field emits `deleteField()`

**Files:**
- Modify: `__tests__/components/people/EditPersonSheet.test.tsx`
- Modify: `src/components/people/EditPersonSheet.tsx`

- [ ] **Step 1: Add the failing clear test**

Inside the `describe` block, append:

```tsx
  it('emits a FieldValue sentinel for a field the user cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = (await import('@testing-library/user-event')).default.setup();
    const { deleteField } = await import('firebase/firestore');

    render(
      <EditPersonSheet
        person={makePerson({ bannerUrl: 'https://img/old-banner.jpg' })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.clear(screen.getByLabelText(/banner url/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    const call = onSave.mock.calls[0][0] as Record<string, unknown>;
    // deleteField() returns a FieldValue; compare by shape (constructor name).
    expect(call.bannerUrl).toBeDefined();
    expect((call.bannerUrl as { _methodName?: string })._methodName ??
      (call.bannerUrl as object).constructor.name).toMatch(/deleteField|FieldValue/i);
    // Also confirm it's the same shape Firestore would return:
    expect(call.bannerUrl).toEqual(deleteField());
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx -t "FieldValue sentinel"`
Expected: FAIL — `bannerUrl` is currently sent as the empty string `""`, not `deleteField()`.

- [ ] **Step 3: Replace empty-string writes with `deleteField()`**

In `src/components/people/EditPersonSheet.tsx`, change the import line:

```tsx
import { Timestamp, deleteField } from 'firebase/firestore';
```

Add a helper above the component:

```tsx
function diffString(
  next: string,
  prev: string | undefined,
): string | ReturnType<typeof deleteField> | undefined {
  const normalizedPrev = prev ?? '';
  if (next === normalizedPrev) return undefined;
  if (next === '' && normalizedPrev !== '') return deleteField();
  return next;
}
```

Replace the per-field diff blocks in `handleSubmit` (except `name` — name is required; see Task 6) with calls to `diffString`:

```tsx
    const pronounsDiff = diffString(pronouns, person.pronouns);
    if (pronounsDiff !== undefined) updates.pronouns = pronounsDiff;

    const avatarDiff = diffString(avatarUrl, person.avatarUrl);
    if (avatarDiff !== undefined) updates.avatarUrl = avatarDiff;

    const bannerDiff = diffString(bannerUrl, person.bannerUrl);
    if (bannerDiff !== undefined) updates.bannerUrl = bannerDiff;
```

Also update the DOB branch to clear via `deleteField()` when the user empties it:

```tsx
    const currentDob = toDateInputValue(person.dateOfBirth);
    if (dob !== currentDob) {
      if (dob === '') {
        updates.dateOfBirth = deleteField();
      } else {
        const next = fromDateInputValue(dob);
        if (next) updates.dateOfBirth = next;
      }
    }
```

- [ ] **Step 4: Run the full file and confirm all tests pass**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): clear cleared fields with deleteField sentinel"
```

---

## Task 6: Required-name validation blocks save

**Files:**
- Modify: `__tests__/components/people/EditPersonSheet.test.tsx`
- Modify: `src/components/people/EditPersonSheet.tsx`

- [ ] **Step 1: Add the failing validation test**

Inside the `describe` block, append:

```tsx
  it('blocks save when name is blank', async () => {
    const onSave = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson({ name: 'Mia' })}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.clear(screen.getByLabelText(/name/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i);
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx -t "blocks save when name is blank"`
Expected: FAIL — `onSave` is called with `{ name: '' }`, no alert appears.

- [ ] **Step 3: Add the blank-name guard**

In `handleSubmit`, at the very top (after `e.preventDefault();`):

```tsx
    const trimmedName = name.trim();
    if (trimmedName === '') {
      setError('Name is required.');
      return;
    }
```

Remove the duplicate `trimmedName` declaration further down in the function (Task 3 introduced it); use the one from the top.

The name diff becomes:

```tsx
    if (trimmedName !== (person.name ?? '')) {
      updates.name = trimmedName;
    }
```

- [ ] **Step 4: Run the full file and confirm all tests pass**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): require non-blank name before save"
```

---

## Task 7: Escape key and scrim click both close without saving

**Files:**
- Modify: `__tests__/components/people/EditPersonSheet.test.tsx`
- Modify: `src/components/people/EditPersonSheet.tsx`

- [ ] **Step 1: Add the failing close tests**

Inside the `describe` block, append:

```tsx
  it('closes on Escape without calling onSave', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <EditPersonSheet
        person={makePerson()}
        onClose={onClose}
        onSave={onSave}
      />
    );

    screen.getByLabelText(/name/i).focus();
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on scrim click', async () => {
    const onClose = vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();

    const { container } = render(
      <EditPersonSheet
        person={makePerson()}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );

    const scrim = container.querySelector('.scrim') as HTMLElement;
    expect(scrim).not.toBeNull();
    await user.click(scrim);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run the tests and confirm the Escape test fails**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx -t "closes on"`
Expected: the scrim test already passes (wired in Task 2). The Escape test FAILS because no keydown handler exists yet.

- [ ] **Step 3: Add Escape handling**

In `src/components/people/EditPersonSheet.tsx`, add a `useEffect` near the top of the component body:

```tsx
import { useEffect, useState } from 'react';

// …

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
```

- [ ] **Step 4: Run the full file and confirm all tests pass**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx __tests__/components/people/EditPersonSheet.test.tsx
git commit -m "feat(people): close sheet on Escape and scrim click"
```

---

## Task 8: Style the sheet to match the editorial page tone

**Files:**
- Modify: `src/components/people/EditPersonSheet.tsx`

No new tests in this task — pure visual polish. The behavioral contract is already locked in by Tasks 2–7.

- [ ] **Step 1: Add inline styles and CSS for the sheet**

At the bottom of `src/components/people/EditPersonSheet.tsx`, add a `styles` template string and render it inside a styled-jsx `<style jsx>` block (the person page uses the same pattern). Wrap the existing JSX to use the class names below.

Replace the component's return with:

```tsx
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${person.name}`}
        className="eps-root"
      >
        <div className="eps-scrim scrim" onClick={onClose} />
        <form className="eps-sheet sheet" onSubmit={handleSubmit}>
          <h2 className="eps-title">Edit <em>{person.name}</em></h2>

          <label className="eps-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="eps-field">
            <span>Pronouns</span>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="she/her, he/him, they/them…"
            />
          </label>

          <label className="eps-field">
            <span>Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>

          <label className="eps-field">
            <span>Avatar URL</span>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className="eps-field">
            <span>Banner URL</span>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>

          {error && <p className="eps-error" role="alert">{error}</p>}

          <div className="eps-actions actions">
            <button type="button" onClick={onClose} disabled={saving} className="eps-cancel">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="eps-save">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{styles}</style>
    </>
  );
}

const styles = `
  .eps-root {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .eps-scrim {
    position: absolute;
    inset: 0;
    background: rgba(20, 16, 12, 0.5);
    animation: eps-fade 120ms var(--r-ease-ink, ease-out);
  }
  @keyframes eps-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .eps-sheet {
    position: relative;
    width: min(480px, 100%);
    background: var(--r-paper);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: 0 20px 60px rgba(20, 16, 12, 0.25);
  }
  .eps-title {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 30px;
    line-height: 1.05;
    letter-spacing: -0.015em;
    color: var(--r-ink);
    margin: 0 0 6px;
  }
  .eps-title em { font-style: italic; }
  .eps-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .eps-field > span {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .eps-field input {
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.4;
    color: var(--r-ink);
    background: var(--r-cream);
    border: 1px solid var(--r-rule-5);
    border-radius: 3px;
    padding: 10px 12px;
    outline: none;
  }
  .eps-field input:focus {
    border-color: var(--r-text-4);
  }
  .eps-error {
    margin: 0;
    font-family: var(--r-serif);
    font-size: 14px;
    color: var(--r-ember, #b44a2b);
  }
  .eps-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
  .eps-cancel, .eps-save {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 999px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .eps-cancel {
    color: var(--r-ink);
    background: var(--r-paper);
    border: 1px solid var(--r-rule-3);
  }
  .eps-save {
    color: var(--r-paper);
    background: var(--r-leather);
    border: 1px solid var(--r-leather);
  }
  .eps-cancel:disabled, .eps-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 640px) {
    .eps-root { padding: 0; align-items: flex-end; }
    .eps-sheet { width: 100%; border-radius: 16px 16px 0 0; padding: 24px 20px 28px; }
  }
`;
```

Note: the existing `.scrim` and `.actions` class names are preserved on the elements so the Task 7 scrim test (which queries `.scrim`) keeps passing.

- [ ] **Step 2: Run the full test file and confirm nothing regressed**

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/people/EditPersonSheet.tsx
git commit -m "style(people): editorial chrome for EditPersonSheet"
```

---

## Task 9: Wire the pencil button, sheet state, and `bannerUrl` into `/people/[personId]`

**Files:**
- Modify: `src/app/people/[personId]/page.tsx`

- [ ] **Step 1: Import the sheet and add editing state**

At the top of `src/app/people/[personId]/page.tsx`, alongside the existing imports:

```tsx
import { useState } from 'react';
import { EditPersonSheet } from '@/components/people/EditPersonSheet';
```

(`use` is already imported from 'react' in the file. Add `useState` to that existing import if the line already pulls other names from 'react'.)

In `PersonPage`, near the other hooks (after `const { entries } = useJournalEntries();`):

```tsx
  const [isEditing, setIsEditing] = useState(false);
```

- [ ] **Step 2: Add the pencil button to the breadcrumbs row**

Find the breadcrumbs block around line 83–88:

```tsx
        <div className="crumbs">
          <Link href="/manual">The Family Manual</Link>
          <span className="sep">/</span>
          <span>{firstName}</span>
        </div>
```

Replace with:

```tsx
        <div className="crumbs">
          <Link href="/manual">The Family Manual</Link>
          <span className="sep">/</span>
          <span>{firstName}</span>
          <button
            type="button"
            className="crumbs-edit"
            aria-label={`Edit ${firstName}'s page`}
            onClick={() => setIsEditing(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
            </svg>
          </button>
        </div>
```

- [ ] **Step 3: Style the pencil button**

In the same file, inside the `styles` template string, find the existing `.crumbs .sep { opacity: 0.5; }` rule and add right after it:

```css
  .crumbs-edit {
    all: unset;
    margin-left: auto;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    color: var(--r-text-4);
    transition: color 120ms var(--r-ease-ink), background 120ms var(--r-ease-ink);
  }
  .crumbs-edit:hover { color: var(--r-ink); background: var(--r-cream-warm); }
  .crumbs-edit:focus-visible { outline: 1px solid var(--r-text-4); outline-offset: 2px; }
```

- [ ] **Step 4: Render the sheet when editing**

Find the closing `</main>` near the end of the component's return. Immediately *before* `<style jsx global>{styles}</style>`, add:

```tsx
      {isEditing && person && (
        <EditPersonSheet
          person={person}
          onClose={() => setIsEditing(false)}
          onSave={async (updates) => {
            await updatePerson(updates as Partial<Person>);
          }}
        />
      )}
```

This needs `updatePerson` from the hook. Change the hook destructure at the top of `PersonPage`:

```tsx
  const { person, loading: personLoading, updatePerson } = usePersonById(personId);
```

- [ ] **Step 5: Wire `bannerUrl` into the hero portrait**

Find the `.person-portrait` JSX around line 91–100:

```tsx
          <div className="person-portrait">
            <div className="person-plate">
              …
            </div>
          </div>
```

Replace with:

```tsx
          <div
            className="person-portrait"
            style={
              person.bannerUrl
                ? { backgroundImage: `url('${person.bannerUrl}')` }
                : undefined
            }
          >
            <div className="person-plate">
              …
            </div>
          </div>
```

Inline `backgroundImage` will override the CSS `background: ${heroBg}` shorthand only for the image layer. To keep the CSS fallback working when `bannerUrl` is unset, no other changes are needed — the existing rule still applies because the inline style is conditional.

- [ ] **Step 6: Typecheck and smoke-run the unit tests**

Run: `npx tsc --noEmit`
Expected: no new errors from these edits.

Run: `npx vitest run __tests__/components/people/EditPersonSheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/people/[personId]/page.tsx
git commit -m "feat(people): pencil button opens edit sheet; bannerUrl drives hero"
```

---

## Task 10: Manual verification

**Files:** none (pure QA pass)

- [ ] **Step 1: Start the dev server**

Run (in a terminal that inherits the project's Node via `.nvmrc` / the shell PATH noted in memory):

```bash
npm run dev
```

- [ ] **Step 2: Exercise the golden path**

In the browser, at `/people/{some-person-id}`:
1. Click the pencil icon in the breadcrumbs row. Sheet opens.
2. Paste a valid image URL into **Banner URL**, click Save. Sheet closes, hero updates without a page refresh.
3. Hard-refresh the page. Banner still present.
4. Open the sheet again; clear **Banner URL**; click Save. Hero returns to the gradient fallback.
5. Edit the name to an empty string; click Save. See the "Name is required" alert; sheet stays open.
6. Edit pronouns; click Save. Sheet closes; pronouns line in the dossier reflects the new value.
7. Press the pencil again, press Escape. Sheet closes without saving.
8. Press the pencil again, click the dark scrim outside the card. Sheet closes.

- [ ] **Step 3: Check a few edge cases**

1. Person with no prior `avatarUrl`, `bannerUrl`, or DOB — open sheet; all inputs are empty; Save with no changes closes silently.
2. Paste an obviously bad URL into Banner URL (e.g., `not a url`). HTML5 `type="url"` validation blocks Save with a tooltip.
3. Narrow window (< 640px). Sheet slides up from the bottom, full width.

- [ ] **Step 4: Kill the dev server and commit any CSS tweaks that came out of QA**

If no changes were needed, skip this step. Otherwise:

```bash
git add -p
git commit -m "polish(people): tweaks from manual QA pass"
```

---

## Self-Review Notes

- **Spec coverage:** Data model change (Task 1), modal component (Tasks 2–8), page integration (Task 9), testing (inline per task), manual verification (Task 10). All spec sections accounted for.
- **Placeholder scan:** None. Every code step shows complete code.
- **Type consistency:** `EditPersonSheetProps.onSave` takes `Record<string, unknown>` everywhere. `buildUpdates` is not a named export — inlined in `handleSubmit`. Helper names: `toDateInputValue`, `fromDateInputValue`, `diffString` — used consistently across Tasks 2, 4, 5.
- **Deviation from spec (logged):** Sheet calls a passed-in `onSave` rather than importing `usePerson` directly. Rationale in the header.
