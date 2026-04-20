'use client';

import Link from 'next/link';
import Section from '@/components/magazine/Section';
import type { JournalEntry } from '@/types/journal';
import { JOURNAL_CATEGORIES } from '@/types/journal';
import { SeedlingGlyph } from '@/components/journal-spread/SeedlingGlyph';

// Inline wrapper so the glyph sits left of the title with a small
// margin and doesn't disturb baseline alignment.
function SeedlingGlyphInline() {
  return (
    <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: '-2px' }}>
      <SeedlingGlyph size={14} />
    </span>
  );
}

interface RecentCapturesProps {
  entries: JournalEntry[];
}

const CATEGORY_META = Object.fromEntries(
  JOURNAL_CATEGORIES.map((c) => [c.value, c]),
);

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

/**
 * Last 2-3 journal entries as compact cards.
 */
export default function RecentCaptures({ entries }: RecentCapturesProps) {
  if (entries.length === 0) return null;

  return (
    <Section eyebrow="The journal" title="Recent captures">
      <div className="captures-list">
        {entries.map((entry) => {
          const cat = CATEGORY_META[entry.category];
          const d = entry.createdAt?.toDate?.();
          const timeLabel = d ? formatTime(d) : '';
          const excerpt = entry.text.length > 140
            ? entry.text.slice(0, 140) + '\u2026'
            : entry.text;

          return (
            <Link
              key={entry.entryId}
              href={`/journal/${entry.entryId}`}
              className="capture-card"
            >
              <div className="capture-meta">
                <span className="capture-glyph" aria-hidden="true">
                  {cat?.emoji ?? '✦'}
                </span>
                <span className="capture-kind">{cat?.label ?? 'Entry'}</span>
                {timeLabel && (
                  <>
                    <span className="capture-sep">·</span>
                    <span>{timeLabel}</span>
                  </>
                )}
              </div>
              {entry.title && (
                <h3 className="capture-title">
                  {entry.category === 'reflection' &&
                    (entry.reflectsOnEntryIds?.length ?? 0) > 0 && (
                      <SeedlingGlyphInline />
                    )}
                  {entry.title}
                </h3>
              )}
              <p className="capture-excerpt">{excerpt}</p>
            </Link>
          );
        })}
      </div>
      <div className="captures-footer">
        <Link href="/journal" className="press-link-sm">
          Open the journal ⟶
        </Link>
      </div>

      <style jsx>{`
        .captures-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          max-width: 640px;
          margin: 0 auto;
        }
        :global(.capture-card) {
          display: block;
          padding: 18px 0;
          border-bottom: 1px solid rgba(200, 190, 172, 0.35);
          text-decoration: none;
          color: inherit;
          transition: opacity 0.15s ease;
        }
        :global(.capture-card:first-child) {
          padding-top: 0;
        }
        :global(.capture-card:hover) {
          opacity: 0.75;
        }
        .capture-meta {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin-bottom: 6px;
        }
        .capture-glyph {
          font-size: 11px;
          color: #5c8064;
          margin-right: 6px;
        }
        .capture-sep {
          margin: 0 8px;
          color: #b2a487;
        }
        .capture-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 18px;
          color: #3a3530;
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .capture-excerpt {
          font-family: var(--font-parent-display);
          font-size: 15px;
          line-height: 1.5;
          color: #4a4238;
          margin: 0;
        }
        .captures-footer {
          margin-top: 20px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 720px) {
          :global(.capture-card) {
            padding: 14px 0;
          }
          .capture-title {
            font-size: 16px;
          }
          .capture-excerpt {
            font-size: 14px;
          }
        }
      `}</style>
    </Section>
  );
}
