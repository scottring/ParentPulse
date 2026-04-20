'use client';

import { useEffect, useState } from 'react';
import { Timestamp, deleteField } from 'firebase/firestore';
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

function diffString(
  next: string,
  prev: string | undefined,
): string | ReturnType<typeof deleteField> | undefined {
  const normalizedPrev = prev ?? '';
  if (next === normalizedPrev) return undefined;
  if (next === '' && normalizedPrev !== '') return deleteField();
  return next;
}

function fromDateInputValue(value: string): Timestamp | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return Timestamp.fromDate(new Date(y, m - 1, d));
}

export function EditPersonSheet({ person, onClose, onSave }: EditPersonSheetProps) {
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

  const [name, setName] = useState(person.name ?? '');
  const [pronouns, setPronouns] = useState(person.pronouns ?? '');
  const [dob, setDob] = useState(toDateInputValue(person.dateOfBirth));
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(person.bannerUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === '') {
      setError('Name is required.');
      return;
    }
    const updates: Record<string, unknown> = {};

    if (trimmedName !== (person.name ?? '')) {
      updates.name = trimmedName;
    }

    const pronounsDiff = diffString(pronouns, person.pronouns);
    if (pronounsDiff !== undefined) updates.pronouns = pronounsDiff;

    const avatarDiff = diffString(avatarUrl, person.avatarUrl);
    if (avatarDiff !== undefined) updates.avatarUrl = avatarDiff;

    const bannerDiff = diffString(bannerUrl, person.bannerUrl);
    if (bannerDiff !== undefined) updates.bannerUrl = bannerDiff;

    const currentDob = toDateInputValue(person.dateOfBirth);
    if (dob !== currentDob) {
      if (dob === '') {
        updates.dateOfBirth = deleteField();
      } else {
        const next = fromDateInputValue(dob);
        if (next) updates.dateOfBirth = next;
      }
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
