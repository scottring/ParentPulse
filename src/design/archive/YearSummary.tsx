'use client';
/* ================================================================
   Relish · Archive — YearSummary
   The epigraph that opens a year: a pull quote or a short line
   that characterises it. Editable by the user; shows a prompt
   to write one if empty.
   ================================================================ */

import { Eyebrow } from '../type';

export interface YearSummaryProps {
  year: number;
  summary?: string;
  entryCount?: number;
  onEdit?: () => void;
}

export function YearSummary({ year, summary, entryCount, onEdit }: YearSummaryProps) {
  return (
    <section style={{ padding: '48px 0 32px' }}>
      <Eyebrow>Volume {year}{typeof entryCount === 'number' ? ` · ${entryCount} entries` : ''}</Eyebrow>
      {summary ? (
        <blockquote
          style={{
            margin: '20px 0 0',
            padding: 0,
            fontFamily: 'var(--r-serif)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(32px, 4vw, 52px)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--r-ink)',
            maxWidth: '22ch',
          }}
        >
          &ldquo;{summary}&rdquo;
        </blockquote>
      ) : (
        <button
          onClick={onEdit}
          style={{
            all: 'unset', cursor: 'pointer',
            marginTop: 20,
            fontFamily: 'var(--r-serif)', fontStyle: 'italic',
            fontSize: 24, color: 'var(--r-text-4)',
          }}
        >
          Write a line for this year ⟶
        </button>
      )}
    </section>
  );
}
