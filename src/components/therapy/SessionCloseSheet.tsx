'use client';

import { useState } from 'react';
import type { TherapyTheme } from '@/types/therapy';
import type { CloseSessionInput } from '@/hooks/useTherapyActions';
import styles from './therapy.module.css';

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface SessionCloseSheetProps {
  windowId: string;
  themes: TherapyTheme[];
  onClose: (input: CloseSessionInput) => Promise<void> | void;
  onCancel: () => void;
}

export function SessionCloseSheet({
  windowId,
  themes,
  onClose,
  onCancel,
}: SessionCloseSheetProps) {
  const undismissed = themes.filter((t) => !t.userState.dismissed);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dateStr, setDateStr] = useState(todayString());
  const [transcript, setTranscript] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(undismissed.map((t) => t.id)));
  }

  function selectNone() {
    setChecked(new Set());
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const sessionDate = new Date(dateStr + 'T12:00:00');
      await onClose({
        windowId,
        sessionDate,
        discussedThemeIds: Array.from(checked),
        transcript: transcript.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  const noneChecked = checked.size === 0;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className={styles.modalBody}
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="close-modal-title" className={styles.modalTitle}>I had a session</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.closeControls}>
          <span className={styles.modalHint} style={{ flex: 1 }}>Check what you discussed</span>
          <button type="button" className={styles.miniBtn} onClick={selectAll}>Select all</button>
          <button type="button" className={styles.miniBtn} onClick={selectNone}>Select none</button>
        </div>

        <ul className={styles.closeThemeList}>
          {undismissed.map((theme) => (
            <li key={theme.id}>
              <label className={styles.closeThemeItem}>
                <input
                  type="checkbox"
                  checked={checked.has(theme.id)}
                  onChange={() => toggle(theme.id)}
                  disabled={saving}
                />
                <span className={styles.closeThemeTitle}>{theme.title}</span>
                {theme.userState.starred && (
                  <span className={styles.closeStarPip} aria-label="Starred">★</span>
                )}
              </label>
            </li>
          ))}
          {undismissed.length === 0 && (
            <li className={styles.modalHint} style={{ padding: '8px 0' }}>
              No active themes in this window.
            </li>
          )}
        </ul>

        {noneChecked && (
          <p className={styles.modalHint}>
            Nothing discussed? That&apos;s fine — everything carries forward.
          </p>
        )}

        <div className={styles.closeField}>
          <label htmlFor="session-date">Session date</label>
          <input
            id="session-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className={styles.closeField}>
          <label htmlFor="session-transcript">Notes / transcript (optional)</label>
          <textarea
            id="session-transcript"
            rows={5}
            placeholder="Paste notes or a transcript from this session…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={saving}
          />
        </div>

        {error && <p className={styles.modalError}>{error}</p>}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.windowBtn}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.windowBtn} ${styles.windowBtnPrimary}`}
            onClick={() => void handleConfirm()}
            disabled={saving || !dateStr}
          >
            {saving ? 'Closing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
