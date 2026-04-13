'use client';

import Link from 'next/link';
import Section from '@/components/magazine/Section';
import type { EchoMatch } from '@/hooks/useJournalEcho';

interface TheEchoProps {
  echo: EchoMatch;
}

/**
 * Quiet callback to an older semantically similar entry.
 * Adapted from the journal page's EchoHero.
 */
export default function TheEcho({ echo }: TheEchoProps) {
  const createdDate = echo.createdAt?._seconds
    ? new Date(echo.createdAt._seconds * 1000)
    : null;
  const dateLabel = createdDate
    ? createdDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year:
          createdDate.getFullYear() === new Date().getFullYear()
            ? undefined
            : 'numeric',
      })
    : '';

  const body = echo.summary || echo.text.slice(0, 180) + (echo.text.length > 180 ? '\u2026' : '');
  const title = echo.title || 'A familiar thread';

  return (
    <Section eyebrow="An echo" title="You wrote something like this before" tone="readings">
      <div className="echo-card">
        <h3 className="echo-title">{title}</h3>
        <p className="echo-body">{body}</p>
        <div className="echo-meta">
          <span>{dateLabel}</span>
          {echo.themes.length > 0 && (
            <>
              <span className="echo-sep">·</span>
              <span>{echo.themes.slice(0, 2).join(' · ')}</span>
            </>
          )}
        </div>
        <Link
          href={`/journal/${echo.entryId}`}
          className="press-link-sm"
          style={{ marginTop: 14, display: 'inline-block' }}
        >
          Revisit this entry ⟶
        </Link>
      </div>

      <style jsx>{`
        .echo-card {
          max-width: 580px;
          margin: 0 auto;
        }
        .echo-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 20px;
          color: #3a3530;
          margin: 0 0 8px;
          line-height: 1.25;
        }
        .echo-body {
          font-family: var(--font-parent-display);
          font-size: 15px;
          line-height: 1.6;
          color: #4a4238;
          margin: 0 0 10px;
        }
        .echo-meta {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: #8a7b5f;
        }
        .echo-sep {
          margin: 0 6px;
          color: #b2a487;
        }
      `}</style>
    </Section>
  );
}
