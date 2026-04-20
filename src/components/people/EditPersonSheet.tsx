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
    </>
  );
}
