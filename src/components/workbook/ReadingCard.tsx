'use client';

import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';
import { TYPE_LABELS } from './helpers';

interface ReadingCardProps {
  item: GrowthItem;
}

// Bookplate-style card for "things to read" — centered, ochre-accented,
// framed ❦ ornament on top. Materially different from PracticeCard so
// the eye knows "this opens something to read, not something to do."
export default function ReadingCard({ item }: ReadingCardProps) {
  const typeLabel = TYPE_LABELS[item.type] || 'A reading';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');

  const bodyExcerpt =
    item.body && item.body.length > 140
      ? item.body.slice(0, 140).trim() + '…'
      : item.body || '';

  return (
    <Link href={`/growth/${item.growthItemId}`} className="reading-card">
      <div className="reading-card-top" aria-hidden="true">
        <span className="reading-card-rule" />
        <span className="reading-card-fleuron">❦</span>
        <span className="reading-card-rule" />
      </div>

      <div className="reading-card-kind">
        {typeLabel} · {minutes} min read
      </div>

      <h3 className="reading-card-title">{item.title}</h3>

      {bodyExcerpt && <p className="reading-card-excerpt">{bodyExcerpt}</p>}

      <p className="reading-card-meta">
        {about ? (
          <>
            about <span className="press-sc">{about}</span>
          </>
        ) : (
          <>
            for <span className="press-sc">{forWhom}</span>
          </>
        )}
      </p>

      <style jsx>{`
        :global(.reading-card) {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: 26px 32px 32px;
          background: rgba(184, 142, 90, 0.04);
          border: 1px solid rgba(184, 142, 90, 0.22);
          border-radius: 2px;
          text-align: center;
          transition: background 0.25s ease;
        }
        :global(.reading-card:hover) {
          background: rgba(184, 142, 90, 0.08);
        }
        :global(.reading-card-top) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        :global(.reading-card-rule) {
          flex: 0 1 60px;
          height: 1px;
          background: rgba(184, 142, 90, 0.5);
        }
        :global(.reading-card-fleuron) {
          font-family: var(--font-parent-display);
          font-size: 16px;
          color: #b88e5a;
          line-height: 1;
        }
        :global(.reading-card-kind) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #7c5a2e;
          margin-bottom: 12px;
        }
        :global(.reading-card-title) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 26px;
          color: #3a3530;
          margin: 0 0 14px;
          line-height: 1.2;
          letter-spacing: -0.008em;
        }
        :global(.reading-card-excerpt) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          line-height: 1.55;
          color: #5a4f3b;
          margin: 0 auto 16px;
          max-width: 360px;
        }
        :global(.reading-card-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a6f42;
          margin: 0;
        }
      `}</style>
    </Link>
  );
}
