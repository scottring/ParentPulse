'use client';

import { useState } from 'react';
import type { TherapyNote } from '@/types/therapy';
import { THERAPY_NOTE_WARN_LENGTH, THERAPY_NOTE_MAX_LENGTH } from '@/types/therapy';
import type { ImportNoteInput } from '@/hooks/useTherapyActions';
import styles from './therapy.module.css';

interface ImportNotesModalProps {
  windowId: string;
  therapistId: string;
  notes: TherapyNote[];
  onImport: (input: ImportNoteInput) => Promise<string>;
  onClose: () => void;
}

export function ImportNotesModal({
  windowId,
  therapistId,
  notes: _notes,
  onImport,
  onClose,
}: ImportNotesModalProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const len = content.length;
  const tooLong = len > THERAPY_NOTE_MAX_LENGTH;
  const nearLimit = !tooLong && len > THERAPY_NOTE_WARN_LENGTH;
  const canSave = len > 0 && !tooLong && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onImport({ windowId, therapistId, content });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modalBody} role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
        <div className={styles.modalHeader}>
          <h2 id="import-modal-title" className={styles.modalTitle}>Import session notes</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <textarea
          className={styles.modalTextarea}
          rows={14}
          placeholder="Paste your notes or session transcript here…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
          aria-label="Session notes"
        />

        <div className={styles.modalMeta}>
          {tooLong && (
            <span className={styles.modalError}>
              Too long — {len.toLocaleString()} / {THERAPY_NOTE_MAX_LENGTH.toLocaleString()} characters. Please trim before saving.
            </span>
          )}
          {nearLimit && !tooLong && (
            <span className={styles.modalWarn}>
              {len.toLocaleString()} / {THERAPY_NOTE_MAX_LENGTH.toLocaleString()} characters — approaching limit.
            </span>
          )}
          {error && (
            <span className={styles.modalError}>{error}</span>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.windowBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.windowBtn} ${styles.windowBtnPrimary}`}
            onClick={() => void handleSave()}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
