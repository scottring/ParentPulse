'use client';

import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';
import { TYPE_LABELS } from './helpers';

interface PracticeCardProps {
  item: GrowthItem;
}

// Compact grid cell for the "Other practices waiting" section. Green
// rail on the left, kind line, italic title, small meta. Sits flush
// against its neighbors inside ContentGrid variant="practices".
export default function PracticeCard({ item }: PracticeCardProps) {
  const typeLabel = TYPE_LABELS[item.type] || 'A practice';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  // P3.3 — the "from your journal" pill is gone. Provenance is now
  // the first screen of the practice (ProvenanceView), not a
  // duplicate pill on the card.

  return (
    <Link href={`/growth/${item.growthItemId}`} className="practice-card">
      <div className="practice-card-rail" aria-hidden="true" />
      <div className="practice-card-body">
        <div className="practice-card-kind">
          <span className="practice-card-glyph" aria-hidden="true">
            ◆
          </span>
          <span>
            {typeLabel} · {minutes} min
          </span>
        </div>
        <h3 className="practice-card-title">{item.title}</h3>
        <p className="practice-card-meta">
          {about && (
            <>
              about <span className="press-sc">{about}</span>
              <span className="sep">·</span>
            </>
          )}
          for <span className="press-sc">{forWhom}</span>
        </p>
      </div>

      <style jsx>{`
        :global(.practice-card) {
          display: flex;
          gap: 16px;
          padding: 24px 22px 26px;
          text-decoration: none;
          color: inherit;
          border-right: 1px solid rgba(200, 190, 172, 0.35);
          border-bottom: 1px solid rgba(200, 190, 172, 0.35);
          transition: background 0.25s ease;
          min-height: 160px;
        }
        :global(.practice-card:hover) {
          background: rgba(92, 128, 100, 0.035);
        }
        :global(.practice-card-rail) {
          flex: 0 0 3px;
          background: #5c8064;
          border-radius: 1px;
          align-self: stretch;
        }
        :global(.practice-card-body) {
          flex: 1;
          min-width: 0;
        }
        :global(.practice-card-kind) {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5a6e54;
          margin-bottom: 10px;
        }
        :global(.practice-card-glyph) {
          color: #5c8064;
          font-size: 12px;
          line-height: 1;
          transform: translateY(1px);
        }
        :global(.practice-card-title) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #3a3530;
          margin: 0 0 12px;
          line-height: 1.25;
          letter-spacing: -0.004em;
        }
        :global(.practice-card-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7c6e54;
          line-height: 1.55;
          margin: 0;
        }
        :global(.practice-card-meta .sep) {
          display: inline-block;
          margin: 0 6px;
          color: #a8997d;
        }
      `}</style>
    </Link>
  );
}
