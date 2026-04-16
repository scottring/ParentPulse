'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { MARGIN_NOTE_MAX_LENGTH } from '@/types/marginNote';

export interface MarginNoteComposerProps {
  /** Which margin side we're rendering in — controls text alignment. */
  side: 'left' | 'right';
  /** Pre-filled value when editing an existing note. */
  initialValue: string;
  /** Called with the trimmed, non-empty content when the user commits. */
  onCommit: (content: string) => void;
  /** Called when the user cancels (Escape, or blur with empty value). */
  onCancel: () => void;
  /** Optional auto-focus — default true. */
  autoFocus?: boolean;
  /**
   * When provided (edit mode), renders a small delete affordance.
   * Clicking it calls onDelete instead of committing the edit.
   */
  onDelete?: () => void;
}

const COUNTER_SHOW_AT = 60;
const COUNTER_AMBER_AT = 75;

/**
 * Inline 80-char composer for margin notes. Behaves like a one-line
 * text input with hard length cap, Enter-to-commit, Escape-to-cancel.
 */
export function MarginNoteComposer({
  side,
  initialValue,
  onCommit,
  onCancel,
  autoFocus = true,
  onDelete,
}: MarginNoteComposerProps) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleCommitOrCancel = () => {
    if (handledRef.current) return;
    handledRef.current = true;

    const trimmed = value.trim();
    if (trimmed.length === 0) onCancel();
    else onCommit(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommitOrCancel();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (handledRef.current) return;
      handledRef.current = true;
      onCancel();
    }
  };

  const length = value.length;
  const showCounter = length >= COUNTER_SHOW_AT;
  const counterClass = length >= COUNTER_AMBER_AT ? 'counter-amber' : 'counter';

  return (
    <div className={`composer align-${side}`}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MARGIN_NOTE_MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        onBlur={handleCommitOrCancel}
        maxLength={MARGIN_NOTE_MAX_LENGTH}
        aria-label="Margin note"
        className="input"
      />
      {showCounter && (
        <div className={counterClass} aria-live="polite" aria-atomic="true">
          {length} / {MARGIN_NOTE_MAX_LENGTH}
        </div>
      )}
      {onDelete && (
        <button
          type="button"
          className="delete-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (handledRef.current) return;
            handledRef.current = true;
            onDelete();
          }}
          aria-label="Delete margin note"
        >
          delete
        </button>
      )}
      <style jsx>{`
        .composer {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 34px;
        }
        .align-left { text-align: right; }
        .align-right { text-align: left; }
        .input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px dotted #c8b89a;
          font: inherit;
          color: inherit;
          text-align: inherit;
          padding: 2px 0;
          outline: none;
        }
        .input:focus {
          border-bottom-color: #8a6f4a;
        }
        .counter,
        .counter-amber {
          font-size: 9px;
          letter-spacing: 0.08em;
          margin-top: 2px;
          opacity: 0.7;
        }
        .counter-amber { color: #b07a28; }
        .delete-btn {
          appearance: none;
          background: transparent;
          border: none;
          font: inherit;
          font-size: 9px;
          color: #a66;
          cursor: pointer;
          opacity: 0.5;
          letter-spacing: 0.08em;
          padding: 2px 0;
          margin-top: 2px;
        }
        .delete-btn:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
