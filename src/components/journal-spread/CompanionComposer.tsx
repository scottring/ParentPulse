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
 *
 * After a successful post, the form is replaced by a ReturnPanel — a
 * book-voice paragraph that names what just happened and offers two
 * ways to close the moment. This is the "response posture" in action:
 * the book speaking back when the user does something consequential.
 * See docs/NOTEBOOKLM-SOURCE.md "return" discussion for the broader
 * architecture this lives inside.
 */
export function CompanionComposer({ parent, onPosted }: CompanionComposerProps) {
  const { user } = useAuth();
  const { createEntry, saving, error } = useJournal();
  const { people } = usePerson();

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('match-parent');
  const [posted, setPosted] = useState<{
    responseEntryId: string;
    responseText: string;
  } | null>(null);

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
    // Include parent author explicitly — they aren't in their own
    // `sharedWithUserIds` by convention, but we want them to see the reply.
    if (parent.authorId !== currentUserId) {
      base.add(parent.authorId);
    }
    return Array.from(base);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving) return;

    const sharedWithUserIds = resolveSharedWith();
    const responseText = text.trim();
    const newId = await createEntry({
      text: responseText,
      category: 'moment',
      personMentions: [],
      sharedWithUserIds,
      respondsToEntryId: parent.entryId,
    });

    setText('');
    setPosted({ responseEntryId: newId, responseText });
    onPosted?.(newId);
  }

  const canSubmit = text.trim().length > 0 && !saving;

  // Post-response return panel: replaces the composer once the
  // response is saved. Book-voice paragraph + two closes.
  if (posted) {
    return (
      <ReturnPanel
        parent={parent}
        authorName={authorName}
        responseText={posted.responseText}
        onCarryForward={() => {
          // For now, dismissing carry-forward sets the panel back to
          // the empty composer so the user can write another line.
          // A later pass will wire this to a dedicated single-line
          // "what did I take from this" capture that attaches to the
          // same thread and can be quoted by the next Weekly Lead.
          setPosted(null);
        }}
        onSettle={() => setPosted(null)}
      />
    );
  }

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

/* ================================================================
   ReturnPanel — the book speaking back after a response is saved.
   Not a toast, not a notification. A few lines in the book's voice
   (italic serif, same cadence as the Weekly Lead), naming what just
   happened, with two ways to close the moment — carry one more line
   forward, or let it settle.
   ================================================================ */

function ReturnPanel({
  parent,
  authorName,
  responseText,
  onCarryForward,
  onSettle,
}: {
  parent: JournalEntry;
  authorName: string;
  responseText: string;
  onCarryForward: () => void;
  onSettle: () => void;
}) {
  const parentDate = parent.createdAt?.toDate?.();
  const whenLabel = parentDate
    ? parentDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : 'earlier';
  const firstName = authorName.split(' ')[0];
  const parentExcerpt = excerpt(parent.text, 130);
  const myExcerpt = excerpt(responseText, 130);
  // A parent entry is almost certainly an open "Waiting on you" thread
  // if it was written by someone else within the last 7 days — that's
  // the same window mention_for_me uses. Responding closes that loop;
  // the closure line acknowledges it so the user feels the drop.
  const isRecent = parentDate
    ? Date.now() - parentDate.getTime() < 7 * 24 * 60 * 60 * 1000
    : false;
  const closedThread = isRecent;

  return (
    <div className="return-wrap" role="status" aria-live="polite">
      <div className="return-fleuron" aria-hidden="true">❦</div>

      <h3 className="return-lede">
        <em>Two views now.</em>
      </h3>

      <p className="return-body">
        {firstName} wrote on {whenLabel}. You wrote back just now. Relish is
        reading both — side by side, looking for what the two of you agree on,
        where you see it differently, and the third line that might surface
        between them.
      </p>

      {closedThread && (
        <p className="return-close-line">
          <em>One less thing waiting on you.</em> This thread is off your list.
        </p>
      )}

      <div className="return-quotes">
        <blockquote className="return-quote">
          <span className="return-attr">{firstName}</span>
          <span className="return-line">&ldquo;{parentExcerpt}&rdquo;</span>
        </blockquote>
        <blockquote className="return-quote">
          <span className="return-attr">You, just now</span>
          <span className="return-line">&ldquo;{myExcerpt}&rdquo;</span>
        </blockquote>
      </div>

      <div className="return-actions">
        <button type="button" className="return-soft" onClick={onCarryForward}>
          Carry one more line forward
        </button>
        <button type="button" className="return-primary" onClick={onSettle}>
          Let it settle
        </button>
      </div>

      <style jsx>{`
        .return-wrap {
          margin-top: 32px;
          padding: 28px 28px 22px;
          background: var(--r-paper, #fbf8f2);
          border: 1px solid var(--r-rule-4, #d8d3ca);
          border-radius: 6px;
          position: relative;
        }
        .return-fleuron {
          position: absolute;
          top: 18px;
          right: 22px;
          font-family: var(--r-serif, Georgia, serif);
          font-size: 22px;
          color: var(--r-rule-2, #b5a99a);
          line-height: 1;
        }
        .return-lede {
          font-family: var(--r-serif, Georgia, serif);
          font-style: italic;
          font-weight: 300;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--r-ink, #3a3530);
          margin: 0 0 14px;
        }
        .return-body {
          font-family: var(--r-serif, Georgia, serif);
          font-size: 16.5px;
          line-height: 1.6;
          color: var(--r-text-2, #5c5347);
          margin: 0 0 22px;
          max-width: 58ch;
        }
        .return-close-line {
          font-family: var(--r-serif, Georgia, serif);
          font-size: 14.5px;
          line-height: 1.5;
          color: var(--r-text-3, #5f564b);
          margin: -10px 0 20px;
          padding: 8px 14px;
          background: rgba(124, 144, 130, 0.08);
          border-left: 2px solid var(--r-sage, #7c9082);
          border-radius: 2px;
          max-width: 58ch;
        }
        .return-close-line em {
          font-style: italic;
          color: var(--r-sage-deep, #4d6d55);
        }
        .return-quotes {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 18px 0 22px;
          border-top: 1px solid var(--r-rule-5, #e5e0d8);
          border-bottom: 1px solid var(--r-rule-5, #e5e0d8);
          margin: 0 0 20px;
        }
        .return-quote {
          margin: 0;
          padding: 0 0 0 14px;
          border-left: 2px solid var(--r-ember, #c9864c);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .return-attr {
          font-family: var(--r-sans, -apple-system, sans-serif);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--r-text-5, #887c68);
        }
        .return-line {
          font-family: var(--r-serif, Georgia, serif);
          font-style: italic;
          font-size: 16px;
          line-height: 1.5;
          color: var(--r-text-2, #5c5347);
        }
        .return-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .return-soft, .return-primary {
          all: unset;
          cursor: pointer;
          padding: 9px 18px;
          border-radius: 999px;
          font-family: var(--r-sans, -apple-system, sans-serif);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          transition: opacity 140ms ease, background 140ms ease;
        }
        .return-soft {
          color: var(--r-text-3, #5f564b);
          border: 1px solid var(--r-rule-3, #c0b49f);
          background: transparent;
        }
        .return-soft:hover {
          background: var(--r-cream, #f5f0e8);
          color: var(--r-ink, #3a3530);
        }
        .return-primary {
          color: var(--r-paper, #fbf8f2);
          background: var(--r-leather, #14100c);
          border: 1px solid var(--r-leather, #14100c);
        }
        .return-primary:hover { opacity: 0.92; }
      `}</style>
    </div>
  );
}

function excerpt(text: string, max: number): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length <= max) return t;
  const dot = t.slice(0, max).search(/[.!?]\s/);
  if (dot >= 60) return t.slice(0, dot + 1);
  return t.slice(0, max - 1).trimEnd() + '…';
}
