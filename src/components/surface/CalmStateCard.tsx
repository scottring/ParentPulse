'use client';

import Link from 'next/link';
import { Leaf, Feather } from 'lucide-react';

interface CalmStateCardProps {
  /** Optional greeting tailored to the user's first name. */
  firstName?: string;
}

/**
 * Shown when the priority hierarchy finds nothing pressing. The
 * calm state is a feature, not an empty state — it tells the user
 * they've been attentive and invites a quiet drop-in instead of
 * nagging them.
 */
export function CalmStateCard({ firstName }: CalmStateCardProps) {
  const greeting = firstName
    ? `All quiet, ${firstName}.`
    : 'All quiet.';

  const openCapture = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('relish:open-capture'));
    }
  };

  return (
    <article className="calm-card">
      <div className="leaf" aria-hidden="true">
        <Leaf size={22} strokeWidth={1.25} />
      </div>
      <h2 className="headline">{greeting}</h2>
      <p className="body">
        You've been listening well. When something small comes up, drop
        it here — the app reads the spaces between entries.
      </p>
      <div className="actions">
        <button type="button" className="primary" onClick={openCapture}>
          <Feather size={14} strokeWidth={1.5} />
          Drop a thought
        </button>
        <Link href="/journal" className="secondary">
          Revisit the journal
        </Link>
      </div>

      <style jsx>{`
        .calm-card {
          max-width: 560px;
          width: 100%;
          margin: 24px auto 0;
          padding: 32px 32px 26px;
          background: rgba(255, 250, 240, 0.55);
          border: 1px dashed rgba(138, 111, 74, 0.35);
          border-radius: 10px;
          text-align: center;
        }
        .leaf {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(106, 138, 106, 0.15);
          color: #6a8a6a;
          margin-bottom: 12px;
        }
        .headline {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          line-height: 1.3;
          color: #2a1f14;
          margin: 0 0 10px;
        }
        .body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.55;
          color: #5a4628;
          margin: 0 auto 20px;
          max-width: 420px;
        }
        .actions {
          display: inline-flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }
        .primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2a1f14;
          color: #f5ecd8;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 140ms ease, transform 140ms ease;
        }
        .primary:hover {
          background: #1a120a;
          transform: translateY(-1px);
        }
        .secondary {
          color: #8a6f4a;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 10px 6px;
          transition: color 140ms ease;
        }
        .secondary:hover {
          color: #5a4628;
        }
      `}</style>
    </article>
  );
}
