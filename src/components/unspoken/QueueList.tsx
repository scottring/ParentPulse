'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { JournalEntry } from '@/types/journal';

export function QueueList({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <p style={emptyStyle}>
        <em>Nothing held here yet.</em> When you write something you're not ready
        to share, tap "Move to Unspoken" on the entry to keep it in this sanctuary
        until the right moment.
      </p>
    );
  }
  return (
    <section style={sectionStyle} aria-label="The queue">
      <div style={headerRowStyle}>
        <h2 style={headingStyle}>The Queue</h2>
        <span style={countStyle}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <ul style={listStyle}>
        {entries.map((e) => {
          const when = e.createdAt?.toDate?.();
          const headline = (e.text ?? '').split(/\n/)[0].slice(0, 120) || 'Untitled entry';
          return (
            <li key={e.entryId} style={rowStyle}>
              <Link href={`/journal/${e.entryId}`} style={rowLinkStyle}>
                <p style={dateStyle}>{when ? dateLabel(when) : ''}</p>
                <p style={titleStyle}>{headline}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

const sectionStyle: CSSProperties = { padding: '32px 0' };
const headerRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 };
const headingStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--r-ink, #2B2620)', margin: 0 };
const countStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)' };
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const rowStyle: CSSProperties = { borderTop: '1px solid rgba(120, 100, 70, 0.10)' };
const rowLinkStyle: CSSProperties = { display: 'block', padding: '18px 0', textDecoration: 'none', color: 'inherit' };
const dateStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-5, #8A7B5F)', margin: '0 0 6px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 18, lineHeight: 1.45, color: 'var(--r-ink, #2B2620)', margin: 0 };
const emptyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--r-text-3, #5C5347)', margin: '32px 0', maxWidth: '56ch' };
