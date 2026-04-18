'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import type { JournalEntry } from '@/types/journal';

interface CompanionComposerProps {
  parent: JournalEntry;
  onPosted?: (newEntryId: string) => void;
}

type Visibility = 'just-me' | 'match-parent';

/**
 * Inline composer for writing a companion/response entry beneath a parent entry.
 * Handles visibility resolution so the response is shared with the same people
 * who saw the parent (minus the current user, plus the parent's author if different).
 */
export function CompanionComposer({ parent, onPosted }: CompanionComposerProps) {
  const { user } = useAuth();
  const { createEntry, saving, error } = useJournal();
  const { people } = usePerson();

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('match-parent');

  // Safety: no auth context → render nothing
  if (!user?.userId) return null;

  const currentUserId = user.userId;

  // Derive author name for the pill label
  const authorPerson = people.find((p) => p.linkedUserId === parent.authorId);
  const authorName = authorPerson?.name ?? 'the author';

  // Resolve sharedWithUserIds per visibility mode
  function resolveSharedWith(): string[] {
    if (visibility === 'just-me') return [];

    // "match-parent":
    //   (parent.sharedWithUserIds \ {currentUser}) ∪ ({parent.authorId} if ≠ currentUser)
    const base = new Set(
      parent.sharedWithUserIds.filter((id) => id !== currentUserId),
    );
    if (parent.authorId !== currentUserId) {
      base.add(parent.authorId);
    }
    return Array.from(base);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving) return;

    const sharedWithUserIds = resolveSharedWith();
    const newId = await createEntry({
      text: text.trim(),
      category: 'moment',
      personMentions: [],
      sharedWithUserIds,
      respondsToEntryId: parent.entryId,
    });

    setText('');
    onPosted?.(newId);
  }

  const canSubmit = text.trim().length > 0 && !saving;

  return (
    <div className="composer-wrap">
      <form onSubmit={handleSubmit}>
        <div className="eyebrow">Your perspective</div>

        <textarea
          className="composer-textarea"
          rows={4}
          placeholder="How did you experience this?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={saving}
        />

        <div className="composer-footer">
          <span className="for-label">For</span>
          <div className="pill-group">
            <button
              type="button"
              className={`pill${visibility === 'match-parent' ? ' pill--active' : ''}`}
              onClick={() => setVisibility('match-parent')}
            >
              Everyone who saw {authorName}&apos;s entry
            </button>
            <button
              type="button"
              className={`pill${visibility === 'just-me' ? ' pill--active' : ''}`}
              onClick={() => setVisibility('just-me')}
            >
              Just me
            </button>
          </div>

          <div className="flex-filler" />

          <button
            type="submit"
            className="post-btn"
            disabled={!canSubmit}
          >
            {saving ? 'Posting…' : 'Post response'}
          </button>
        </div>

        {error && <p className="error-line">{error}</p>}
      </form>

      <style jsx>{`
        .composer-wrap {
          margin-top: 32px;
          padding: 20px;
          background: #fafaf5;
          border: 1px solid #e8e4d8;
          border-radius: 6px;
        }

        .eyebrow {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #a89373;
          margin-bottom: 10px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }

        .composer-textarea {
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          padding: 10px 0;
          background: transparent;
          border: none;
          border-bottom: 1px solid #d0d0c8;
          outline: none;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          line-height: 1.6;
          color: #2d2418;
          margin-bottom: 14px;
        }

        .composer-textarea::placeholder {
          color: #c4b89e;
          font-style: italic;
        }

        .composer-textarea:disabled {
          opacity: 0.6;
        }

        .composer-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .for-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a89373;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          flex-shrink: 0;
        }

        .pill-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .pill {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid #d0d0c8;
          background: transparent;
          color: #5f564b;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
        }

        .pill:hover {
          border-color: #b8a98a;
          color: #3d3020;
        }

        .pill--active {
          background: #e8ddc8;
          border-color: #c8b898;
          color: #2d2418;
        }

        .flex-filler {
          flex: 1;
        }

        .post-btn {
          padding: 8px 18px;
          background: #2d2418;
          color: #f5ecd8;
          border: none;
          border-radius: 6px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 120ms ease;
          flex-shrink: 0;
        }

        .post-btn:hover:not(:disabled) {
          opacity: 0.85;
        }

        .post-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .error-line {
          margin: 10px 0 0;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          color: #b94a3b;
        }
      `}</style>
    </div>
  );
}
