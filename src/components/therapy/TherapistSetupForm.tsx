'use client';

import { useState } from 'react';
import styles from './therapy.module.css';

interface TherapistSetupFormProps {
  onCreate: (displayName: string) => Promise<void>;
}

/**
 * First-time setup form — collects the therapist's display name and
 * calls onCreate. Rendered by TherapyBookShell when no therapist
 * exists for this user yet.
 */
export function TherapistSetupForm({ onCreate }: TherapistSetupFormProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className={styles.setupWrap}>
      <div className={styles.setupCard}>
        <span className={styles.setupEyebrow}>Therapy Prep</span>
        <h1 className={styles.setupTitle}>Set up your prep space</h1>
        <p className={styles.setupBody}>
          Who is your therapist? This stays private — it just helps
          Relish label your session windows.
        </p>

        <form onSubmit={handleSubmit} className={styles.setupForm}>
          <label htmlFor="therapist-name" className={styles.setupLabel}>
            Therapist&apos;s name
          </label>
          <input
            id="therapist-name"
            type="text"
            className={styles.setupInput}
            placeholder="e.g. Dr. Park"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={saving}
            maxLength={80}
          />

          {error && <p className={styles.setupError}>{error}</p>}

          <button
            type="submit"
            className={styles.setupSubmit}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Setting up…' : 'Start prep space →'}
          </button>
        </form>
      </div>
    </div>
  );
}
