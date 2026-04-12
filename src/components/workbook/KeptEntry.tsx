'use client';

import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';
import { isReading } from './helpers';

interface KeptEntryProps {
  item: GrowthItem;
}

// A retired item in the "kept this week" list. Dimmed, small fleuron
// prefix, title + kept-day meta. Clickable so the user can go back and
// see what they wrote.
export default function KeptEntry({ item }: KeptEntryProps) {
  const keptDate = item.statusUpdatedAt?.toDate?.();
  const keptDay = keptDate
    ? keptDate.toLocaleDateString('en-US', { weekday: 'long' })
    : '';
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const fromJournal = Boolean(item.spawnedFromEntryIds?.length);
  const reading = isReading(item);
  const fleuronColor = reading ? '#B88E5A' : '#5C8064';

  return (
    <Link href={`/growth/${item.growthItemId}`} className="kept-entry">
      <span
        className="kept-fleuron"
        aria-hidden="true"
        style={{ color: fleuronColor }}
      >
        ❦
      </span>
      <div className="kept-body">
        <h4 className="kept-title">{item.title}</h4>
        <p className="kept-meta">
          {keptDay && <>Kept {keptDay}</>}
          {about && (
            <>
              <span className="sep">·</span>
              about <span className="press-sc">{about}</span>
            </>
          )}
          <span className="sep">·</span>
          for <span className="press-sc">{forWhom}</span>
          {fromJournal && (
            <>
              <span className="sep">·</span>
              from your journal
            </>
          )}
        </p>
      </div>

      <style jsx>{`
        :global(.kept-entry) {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 14px 4px 14px;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid rgba(200, 190, 172, 0.3);
          transition: opacity 0.2s ease;
        }
        :global(.kept-entry:last-child) {
          border-bottom: 0;
        }
        :global(.kept-entry:hover) {
          opacity: 1;
        }
        :global(.kept-fleuron) {
          font-family: var(--font-parent-display);
          font-size: 18px;
          line-height: 1;
          opacity: 0.55;
          padding-top: 4px;
          flex-shrink: 0;
        }
        :global(.kept-body) {
          flex: 1;
          min-width: 0;
        }
        :global(.kept-title) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 18px;
          color: #6b6254;
          margin: 0 0 4px;
          line-height: 1.3;
          letter-spacing: -0.003em;
        }
        :global(.kept-entry:hover .kept-title) {
          color: #3a3530;
        }
        :global(.kept-meta) {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin: 0;
          line-height: 1.55;
        }
        :global(.kept-meta .sep) {
          display: inline-block;
          margin: 0 7px;
          color: #b2a487;
        }
      `}</style>
    </Link>
  );
}
