'use client';

import Link from 'next/link';
import type { OpenThread } from '@/lib/open-threads';

interface ClosingActionCardProps {
  thread: OpenThread;
  // When false, render the CTA as a link to the detail surface.
  // When true, render a button instead (the detail surface uses
  // `inline` to attach its own handler rather than re-navigate).
  inline?: boolean;
  onAction?: () => void;
}

const REASON_KICKER: Record<OpenThread['reason'], string> = {
  overdue_ritual: 'Ritual is due',
  pending_invite: 'A view is waiting',
  incomplete_practice: 'Practice unfinished',
  unclosed_divergence: 'Divergence to respond to',
};

/**
 * A single card that names the open-thread reason and offers the
 * closing action. Shared between the Cover list and the detail
 * page above-the-fold affordance, so the copy a user reads on the
 * list matches what they see when they arrive.
 */
export function ClosingActionCard({ thread, inline, onAction }: ClosingActionCardProps) {
  const kicker = REASON_KICKER[thread.reason];
  const { label, href } = thread.closingAction;

  const cta = inline ? (
    <button type="button" className="cta" onClick={onAction}>
      {label} →
    </button>
  ) : (
    <Link href={href} className="cta-link">
      {label} →
    </Link>
  );

  return (
    <section className={`closing-card closing-${thread.reason}`} aria-label={kicker}>
      <p className="kicker">{kicker}</p>
      <p className="subtitle">{thread.subtitle}</p>
      {cta}

      <style jsx>{`
        .closing-card {
          background: #fff8ea;
          border: 1px solid #e6d59a;
          border-left: 3px solid #c89b3b;
          border-radius: 4px;
          padding: 16px 20px;
          margin: 0 0 24px 0;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .closing-overdue_ritual {
          border-left-color: #b94a3b;
        }
        .closing-unclosed_divergence {
          border-left-color: #8a6a9a;
        }
        .closing-pending_invite {
          border-left-color: #6a8a6a;
        }
        .closing-incomplete_practice {
          border-left-color: #c89b3b;
        }
        .kicker {
          margin: 0 0 4px 0;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a89373;
        }
        .subtitle {
          margin: 0 0 12px 0;
          font-size: 15px;
          line-height: 1.55;
          color: #2d2418;
        }
        :global(.cta-link) {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          letter-spacing: 0.05em;
          color: #2d2418;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        :global(.cta-link:hover) {
          color: #1a1610;
        }
        .cta {
          all: unset;
          cursor: pointer;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          letter-spacing: 0.05em;
          color: #2d2418;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </section>
  );
}
