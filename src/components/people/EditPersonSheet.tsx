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
