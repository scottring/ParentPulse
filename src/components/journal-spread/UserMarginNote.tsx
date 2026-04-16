'use client';

import type { MarginNote } from '@/types/marginNote';

export interface UserMarginNoteProps {
  note: MarginNote;
  /** userId of the parent journal entry's author. */
  entryAuthorUserId: string;
  /** Current viewer. */
  currentUserId: string;
  /** Which margin side — matches existing MarginColumn props. */
  side: 'left' | 'right';
  /**
   * Pre-resolved display name for the note's author. Callers do the
   * userId → name lookup (e.g., via the people map) — this component
   * stays purely presentational.
   */
  authorName: string;
  /** Invoked when the author clicks their own note to edit it. */
  onStartEdit?: () => void;
}

/**
 * A single rendered margin note. Author-only interactivity: non-authors
 * can only read. Attribution is shown only when the note's author is
 * different from the entry's author — self-notes stay quiet.
 */
export function UserMarginNote({
  note,
  entryAuthorUserId,
  currentUserId,
  side,
  authorName,
  onStartEdit,
}: UserMarginNoteProps) {
  const isAuthor = note.authorUserId === currentUserId;
  const isObserverNote = note.authorUserId !== entryAuthorUserId;
  const initial = authorName?.trim().charAt(0).toUpperCase() ?? '?';

  const handleClick = () => {
    if (isAuthor && onStartEdit) onStartEdit();
  };

  return (
    <div className={`note align-${side} ${isAuthor ? 'editable' : ''}`}>
      <div className="body" onClick={handleClick}>{note.content}</div>
      {isObserverNote && (
        <div className="attribution">— {initial}.</div>
      )}
      <style jsx>{`
        .note {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 34px;
          opacity: 0.85;
        }
        .align-left  { text-align: right; }
        .align-right { text-align: left; }
        .body { cursor: default; }
        .editable .body { cursor: text; }
        .attribution {
          font-size: 10px;
          margin-top: 2px;
          opacity: 0.75;
        }
      `}</style>
    </div>
  );
}
