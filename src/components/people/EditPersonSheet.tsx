'use client';

import { useEffect, useRef, useState } from 'react';
import { Timestamp, deleteField } from 'firebase/firestore';
import type { Person } from '@/types/person-manual';
import { uploadPersonImage } from '@/lib/upload-person-image';

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Kept for back-compat with existing JSX references
  const uploading = uploadingAvatar || uploadingBanner;

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarProgress(0);
    setError(null);
    try {
      const url = await uploadPersonImage({
        familyId: person.familyId,
        personId: person.personId,
        kind: 'avatar',
        file,
        onProgress: setAvatarProgress,
      });
      setAvatarUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingBanner(true);
    setBannerProgress(0);
    setError(null);
    try {
      const url = await uploadPersonImage({
        familyId: person.familyId,
        personId: person.personId,
        kind: 'banner',
        file,
        onProgress: setBannerProgress,
      });
      setBannerUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingBanner(false);
    }
  }

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

          <div className="eps-field">
            <label htmlFor="eps-avatar-url">
              <span>Avatar</span>
            </label>
            <div className="eps-avatar-row">
              {avatarUrl ? (
                <img className="eps-avatar-preview" src={avatarUrl} alt="" />
              ) : (
                <div className="eps-avatar-preview eps-avatar-placeholder" aria-hidden="true" />
              )}
              <input
                id="eps-avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://… or upload"
              />
              <button
                type="button"
                className="eps-upload"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading || saving}
              >
                {uploadingAvatar ? `Uploading ${avatarProgress}%` : 'Upload'}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="eps-field">
            <label htmlFor="eps-banner-url">
              <span>Banner image</span>
            </label>
            <div className="eps-banner-row">
              {bannerUrl ? (
                <div
                  className="eps-banner-preview"
                  style={{ backgroundImage: `url('${bannerUrl}')` }}
                  aria-hidden="true"
                />
              ) : (
                <div
                  className="eps-banner-preview eps-banner-placeholder"
                  aria-hidden="true"
                />
              )}
              <input
                id="eps-banner-url"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://… or upload"
              />
              <button
                type="button"
                className="eps-upload"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploading || saving}
              >
                {uploadingBanner ? `Uploading ${bannerProgress}%` : 'Upload'}
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFile}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
            </div>
          </div>

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
