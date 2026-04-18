'use client';

import type { JournalEntry } from '@/types/journal';

interface ResponseBlockProps {
  response: JournalEntry;
  authorName: string;
  currentUserId?: string;
}

/**
 * A single companion-entry panel. Offset from the parent with a
 * left rule so it reads as "another voice" rather than a comment
 * thread. Serif italic header names the author; body is prose.
 */
export function ResponseBlock({ response, authorName, currentUserId }: ResponseBlockProps) {
  const isPrivate =
    currentUserId !== undefined &&
    response.visibleToUserIds.length === 1 &&
    response.visibleToUserIds[0] === currentUserId;

  const created = response.createdAt?.toDate?.();
  const dateLabel = created
    ? created.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <article className="response-block" aria-label={`Response from ${authorName}`}>
      <header className="response-header">
        <span className="author-name">{authorName}</span>
        <span className="separator" aria-hidden="true">·</span>
        <span className="date-label">{dateLabel}</span>
        {isPrivate && <span className="private-lock" aria-label="Private">🔒</span>}
      </header>
      <p className="response-text">{response.text}</p>

      <style jsx>{`
        .response-block {
          border-left: 2px solid #d0d0c8;
          padding: 16px 0 16px 20px;
          margin-top: 24px;
        }
        .response-header {
          display: flex;
          align-items: baseline;
          gap: 12px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a89373;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }
        .author-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 17px;
          text-transform: none;
          letter-spacing: 0;
          color: #2d2418;
        }
        .separator {
          opacity: 0.6;
        }
        .date-label {
          flex-shrink: 0;
        }
        .private-lock {
          font-size: 10px;
          opacity: 0.55;
          margin-left: 4px;
        }
        .response-text {
          margin: 8px 0 0 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.6;
          color: #3d3a34;
          white-space: pre-wrap;
        }
      `}</style>
    </article>
  );
}
