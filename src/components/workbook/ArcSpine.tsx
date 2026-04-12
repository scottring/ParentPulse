'use client';

import Link from 'next/link';
import type { ArcGroup } from '@/hooks/useGrowthFeed';
import { PHASE_LABELS, spellNumber } from './helpers';

interface ArcSpineProps {
  group: ArcGroup;
  index: number;
}

// A single arc as a "chapter spine" inside the SideColumn list. Roman
// numeral eyebrow, italic title, participants line, a dot-rule spine
// showing kept/open days, then a meta line ("Day three of ten · Practice").
// Links to the next-up active item (arcs themselves live in a separate
// Firestore collection with no dedicated page).
export default function ArcSpine({ group, index }: ArcSpineProps) {
  const { arc, activeItems, completedItems } = group;
  const phase = PHASE_LABELS[arc.currentPhase] || arc.currentPhase;
  const completed = arc.completedItemCount || completedItems.length || 0;
  const total =
    arc.totalItemCount || activeItems.length + completedItems.length || 0;
  const participants = (arc.participantNames || []).join(' & ');
  const romanIndex =
    ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][index - 1] ||
    String(index);

  const nextItem = activeItems[0] || completedItems[0] || null;
  const href = nextItem ? `/growth/${nextItem.growthItemId}` : null;

  const content = (
    <>
      <div className="chapter-head">
        <span className="chapter-roman">Arc {romanIndex}</span>
      </div>
      <h3 className="chapter-title">{arc.title}</h3>
      {participants && (
        <p className="chapter-sub">
          with <span className="press-sc">{participants}</span>
        </p>
      )}

      {total > 0 && (
        <div
          className="chapter-spine"
          role="img"
          aria-label={`${completed} of ${total} days kept`}
        >
          <span className="chapter-spine-rule" aria-hidden="true" />
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`chapter-spine-dot${
                i < completed ? ' chapter-spine-dot--filled' : ''
              }`}
              aria-hidden="true"
            >
              {i < completed ? '●' : '○'}
            </span>
          ))}
          <span className="chapter-spine-rule" aria-hidden="true" />
        </div>
      )}

      <p className="chapter-meta">
        {total > 0 ? (
          <>
            Day {spellNumber(Math.min(completed + 1, total))} of{' '}
            {spellNumber(total)}
            <span className="sep">·</span>
            <em>{phase}</em>
          </>
        ) : (
          <>
            <em>{phase}</em>
            <span className="sep">·</span>
            Practices being prepared
          </>
        )}
      </p>
    </>
  );

  return (
    <>
      {href ? (
        <Link href={href} className="chapter">
          {content}
        </Link>
      ) : (
        <div className="chapter chapter--disabled">{content}</div>
      )}

      <style jsx>{`
        :global(.chapter) {
          display: block;
          padding: 20px 0;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid rgba(200, 190, 172, 0.38);
          transition: opacity 0.2s ease;
        }
        :global(.chapter:last-child) {
          border-bottom: 0;
        }
        :global(.chapter:hover) {
          opacity: 0.8;
        }
        :global(.chapter--disabled) {
          cursor: default;
        }
        :global(.chapter--disabled:hover) {
          opacity: 1;
        }
        :global(.chapter-head) {
          margin-bottom: 4px;
        }
        :global(.chapter-roman) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        :global(.chapter-title) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #3a3530;
          margin: 0 0 4px;
          line-height: 1.22;
          letter-spacing: -0.005em;
        }
        :global(.chapter-sub) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 14px;
          color: #6b6254;
          margin: 0 0 10px;
        }
        :global(.chapter-sub .press-sc) {
          font-style: normal;
        }
        :global(.chapter-spine) {
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 8px 0 6px;
          flex-wrap: wrap;
        }
        :global(.chapter-spine-rule) {
          display: inline-block;
          width: 14px;
          border-top: 1px solid #a8997d;
          margin: 0 3px;
        }
        :global(.chapter-spine-dot) {
          display: inline-block;
          font-size: 12px;
          color: #c5b799;
          line-height: 1;
        }
        :global(.chapter-spine-dot--filled) {
          color: #5c8064;
          font-size: 14px;
        }
        :global(.chapter-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
          margin: 8px 0 0;
          line-height: 1.55;
        }
        :global(.chapter-meta .sep) {
          display: inline-block;
          margin: 0 8px;
          color: #a8997d;
        }
      `}</style>
    </>
  );
}
