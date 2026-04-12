'use client';

import { spellNumber } from './helpers';

interface AllKeptProps {
  keptCount: number;
}

// Ceremonial "all done" panel that replaces the featured hero when
// activeItems is empty but the user kept things this week. The voice of
// the press, acknowledging the work.
export default function AllKept({ keptCount }: AllKeptProps) {
  const keptWord =
    keptCount === 1 ? 'one practice' : `${spellNumber(keptCount)} practices`;
  return (
    <div className="all-kept">
      <span className="all-kept-eyebrow">This week</span>
      <div className="all-kept-ornament" aria-hidden="true">
        ❦
      </div>
      <h2 className="all-kept-title">All kept.</h2>
      <p className="all-kept-body">
        The week&rsquo;s practices are behind you. {keptWord} set down,
        each with its own weight. Rest, or open an ongoing arc on the
        right.
      </p>
      <div
        className="all-kept-ornament all-kept-ornament-bottom"
        aria-hidden="true"
      >
        ❦
      </div>

      <style jsx>{`
        .all-kept {
          padding: 24px 0 16px;
          max-width: 620px;
        }
        .all-kept-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 20px;
        }
        .all-kept-ornament {
          font-family: var(--font-parent-display);
          font-size: 26px;
          color: #8a7b5f;
          line-height: 1;
          margin-bottom: 18px;
        }
        .all-kept-ornament-bottom {
          margin-top: 32px;
          margin-bottom: 0;
        }
        .all-kept-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(40px, 5vw, 58px);
          color: #3a3530;
          margin: 0 0 22px;
          line-height: 1.05;
          letter-spacing: -0.012em;
        }
        .all-kept-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 20px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0;
          max-width: 540px;
        }
      `}</style>
    </div>
  );
}
