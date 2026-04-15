'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEntries } from '@/hooks/useEntries';
import type { Entry } from '@/types/entry';

const PEEK_LIMIT = 3;

function kickerFor(entry: Entry): string {
  switch (entry.type) {
    case 'synthesis':   return 'Synthesis';
    case 'nudge':       return 'Nudge';
    case 'activity':    return 'Activity';
    case 'prompt':      return 'Question';
    case 'reflection':  return 'Reflection';
    case 'observation': return 'Observation';
    case 'conversation':return 'Conversation';
    default:            return 'Written';
  }
}

function firstSentence(text: string, max = 180): string {
  const dot = text.indexOf('. ');
  const first = dot === -1 ? text : text.slice(0, dot + 1);
  return first.length > max ? first.slice(0, max).trim() + '…' : first;
}

function formatDate(entry: Entry): string {
  try {
    return entry.createdAt.toDate().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Three-entry peek into the journal, rendered on the Surface.
 * Compact compared to the full EntryBlock treatment — kicker, first
 * sentence, date — so the peek reads as a glance rather than a
 * second copy of the book.
 */
export function InlineJournalPeek() {
  const { user } = useAuth();
  const familyId = user?.familyId ?? null;

  const { entries, loading } = useEntries({
    familyId,
    filter: {},
  });

  const latest = useMemo(
    () => entries.slice(0, PEEK_LIMIT),
    [entries]
  );

  if (loading && latest.length === 0) return null;
  if (latest.length === 0) return null;

  return (
    <section className="peek" aria-label="Recent journal entries">
      <header className="peek-head">
        <p className="peek-kicker">Lately in the journal</p>
      </header>
      <ul className="peek-list">
        {latest.map((e) => (
          <li key={e.id} className="peek-item">
            <div className="meta">
              <span className="date">{formatDate(e)}</span>
              <span className="sep" aria-hidden="true">·</span>
              <span className="kicker">{kickerFor(e)}</span>
            </div>
            <p className="body">{firstSentence(e.content)}</p>
          </li>
        ))}
      </ul>
      <Link href="/journal" className="open">
        <BookOpen size={13} strokeWidth={1.5} />
        <span>Open the journal</span>
      </Link>

      <style jsx>{`
        .peek {
          max-width: 560px;
          width: 100%;
          margin: 28px auto 0;
          padding: 18px 20px 14px;
          border-top: 1px dotted rgba(138, 111, 74, 0.4);
          text-align: left;
        }
        .peek-head {
          margin-bottom: 10px;
        }
        .peek-kicker {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
          margin: 0;
        }
        .peek-list {
          list-style: none;
          padding: 0;
          margin: 0 0 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .peek-item {
          padding: 10px 0;
          border-bottom: 1px dotted rgba(138, 111, 74, 0.18);
        }
        .peek-item:last-child {
          border-bottom: none;
        }
        .meta {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #a89373;
          margin-bottom: 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sep {
          opacity: 0.55;
        }
        .body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.5;
          color: #3d2f1f;
          margin: 0;
        }
        .open {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #8a6f4a;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 6px 0;
          transition: color 140ms ease;
        }
        .open:hover {
          color: #5a4628;
        }
      `}</style>
    </section>
  );
}
