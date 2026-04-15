'use client';

import type { Entry } from '@/types/entry';

export interface MarginColumnProps {
  /** Entries shown on this page; marginalia derive from their tags/source refs. */
  entries: Entry[];
  /** Which side the margin sits on — affects text alignment. */
  side: 'left' | 'right';
}

/**
 * The margin column. For each entry on the page, emits 0+ small italic
 * notes derived ONLY from data already present on the entry:
 *
 *  - Synthesis entries with sourceEntryIds → "↑ from N entries"
 *  - Entries with non-internal tags → small "#tag" lines
 *
 * Intentionally minimal. Plan 3 will add real marginalia (AI annotations,
 * spouse reactions, user notes). This component reserves the visual
 * space and proves the layout with real data.
 */
export function MarginColumn({ entries, side }: MarginColumnProps) {
  return (
    <div className={`margin-col margin-${side}`}>
      {entries.map((e) => (
        <MarginItem key={e.id} entry={e} />
      ))}
      <style jsx>{`
        .margin-col {
          font-family: Georgia, 'Times New Roman', serif;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
        }
        .margin-left  { text-align: right; }
        .margin-right { text-align: left; }
      `}</style>
    </div>
  );
}

const SYNTHESIS_BUCKET_TAGS = new Set(['overview', 'alignments', 'gaps', 'blindSpots']);

function MarginItem({ entry }: { entry: Entry }) {
  const externalTags = entry.tags.filter(
    (t) => !t.startsWith('_') && !t.includes(':') && !SYNTHESIS_BUCKET_TAGS.has(t)
  );
  const hasSynthesisSource =
    entry.type === 'synthesis' &&
    Array.isArray(entry.sourceEntryIds) &&
    entry.sourceEntryIds.length > 0;
  const hasSynthesisDate =
    entry.type === 'synthesis' && typeof entry.createdAt?.toDate === 'function';
  const synthDate = hasSynthesisDate
    ? entry.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  if (!hasSynthesisSource && externalTags.length === 0 && !hasSynthesisDate) {
    // Keep space reserved so items align with their anchor entries,
    // but render nothing visible. Height approximates an entry row.
    return <div className="item item-empty" />;
  }

  return (
    <div className="item">
      {hasSynthesisSource && (
        <div className="source">↑ from {entry.sourceEntryIds!.length} entries</div>
      )}
      {externalTags.map((t) => (
        <div key={t} className="tag">#{t}</div>
      ))}
      {hasSynthesisDate && (
        <div className="date">synthesized {synthDate}</div>
      )}
      <style jsx>{`
        .item {
          margin-bottom: 26px;
          font-style: italic;
          opacity: 0.85;
        }
        .item-empty {
          margin-bottom: 26px;
          min-height: 18px;
          opacity: 0;
        }
        .source { color: #b94a3b; }
        .tag {
          color: #5a4628;
          font-style: normal;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: lowercase;
        }
        .date {
          color: #8a6f4a;
          font-size: 10px;
          font-style: italic;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
