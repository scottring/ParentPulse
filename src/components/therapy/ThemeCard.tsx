'use client';

import { useState } from 'react';
import type { TherapyTheme } from '@/types/therapy';
import styles from './therapy.module.css';

interface ThemeCardProps {
  theme: TherapyTheme;
  onStar: (id: string, current: boolean) => Promise<void>;
  onDismiss: (id: string, current: boolean) => Promise<void>;
  onNote: (id: string, note: string) => Promise<void>;
}

/**
 * A single therapy theme card.
 *
 * Shows title, summary, expandable source refs, and three action
 * buttons (star / dismiss / note). A "carried" pip appears when
 * the theme has been carried forward from a previous session.
 */
export function ThemeCard({ theme, onStar, onDismiss, onNote }: ThemeCardProps) {
  const [refsOpen, setRefsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(theme.userState.note ?? '');
  const [saving, setSaving] = useState(false);

  const carried = theme.lifecycle.carriedForwardCount > 0;

  async function handleNoteBlur() {
    if (noteText.trim() === (theme.userState.note ?? '')) return;
    setSaving(true);
    try {
      await onNote(theme.id, noteText);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`${styles.themeCard} ${theme.userState.starred ? styles.themeCardStarred : ''}`}>
      <div className={styles.themeCardTop}>
        <div className={styles.themeCardMeta}>
          {carried && (
            <span className={styles.carriedPip} title={`Carried forward ${theme.lifecycle.carriedForwardCount}×`}>
              ↻ carried
            </span>
          )}
        </div>
        <div className={styles.themeCardActions}>
          <button
            type="button"
            className={`${styles.themeActionBtn} ${theme.userState.starred ? styles.themeActionActive : ''}`}
            onClick={() => onStar(theme.id, theme.userState.starred)}
            aria-label={theme.userState.starred ? 'Unstar theme' : 'Star theme'}
            title={theme.userState.starred ? 'Remove star' : 'Star this theme'}
          >
            {theme.userState.starred ? '★' : '☆'}
          </button>
          <button
            type="button"
            className={`${styles.themeActionBtn} ${noteOpen ? styles.themeActionActive : ''}`}
            onClick={() => setNoteOpen((o) => !o)}
            aria-label="Add a note"
            title="Add a note"
          >
            ✎
          </button>
          <button
            type="button"
            className={`${styles.themeActionBtn} ${theme.userState.dismissed ? styles.themeActionDim : ''}`}
            onClick={() => onDismiss(theme.id, theme.userState.dismissed)}
            aria-label={theme.userState.dismissed ? 'Restore theme' : 'Dismiss theme'}
            title={theme.userState.dismissed ? 'Restore' : 'Dismiss'}
          >
            ✕
          </button>
        </div>
      </div>

      <h3 className={styles.themeTitle}>{theme.title}</h3>
      <p className={styles.themeSummary}>{theme.summary}</p>

      {theme.sourceRefs.length > 0 && (
        <div className={styles.themeRefs}>
          <button
            type="button"
            className={styles.themeRefsToggle}
            onClick={() => setRefsOpen((o) => !o)}
            aria-expanded={refsOpen}
          >
            {refsOpen ? '▾' : '▸'}{' '}
            {theme.sourceRefs.length} source{theme.sourceRefs.length !== 1 ? 's' : ''}
          </button>

          {refsOpen && (
            <ul className={styles.themeRefsList}>
              {theme.sourceRefs.map((ref) => (
                <li key={ref.id} className={styles.themeRefsItem}>
                  <span className={styles.themeRefKind}>{ref.kind}</span>
                  <span className={styles.themeRefSnippet}>{ref.snippet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {noteOpen && (
        <div className={styles.themeNoteWrap}>
          <textarea
            className={styles.themeNoteArea}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Your private note on this theme…"
            rows={3}
            disabled={saving}
            aria-label="Note on this theme"
          />
          {saving && <span className={styles.themeNoteSaving}>Saving…</span>}
        </div>
      )}

      {theme.userState.note && !noteOpen && (
        <button
          type="button"
          className={styles.themeNotePreview}
          onClick={() => setNoteOpen(true)}
          aria-label="Edit note"
        >
          ✎ {theme.userState.note}
        </button>
      )}
    </article>
  );
}
