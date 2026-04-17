'use client';

import Link from 'next/link';
import type { PersonManual } from '@/types/person-manual';

interface SpotlightHeroProps {
  manual: PersonManual;
}

export function SpotlightHero({ manual }: SpotlightHeroProps) {
  const overview = manual.synthesizedContent?.overview ?? '';

  return (
    <div className="spotlight-hero">
      <div className="hero-inner">
        <span className="eyebrow">✦ {manual.personName}</span>

        <p className="overview">{overview}</p>

        <Link href={`/people/${manual.personId}/manual`} className="view-link">
          Open manual →
        </Link>
      </div>

      <style jsx>{`
        .spotlight-hero {
          height: 100%;
          min-height: 100%;
          background: linear-gradient(160deg, #3a3530 0%, #4a4540 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 40px;
        }
        .hero-inner {
          max-width: 440px;
        }
        .eyebrow {
          display: block;
          font-family: var(--font-parent-body, sans-serif);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8baf8e;
          margin-bottom: 28px;
        }
        .overview {
          font-family: var(--font-cormorant, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(22px, 2.8vw, 32px);
          line-height: 1.5;
          color: #f5f0e8;
          margin: 0 0 36px;
        }
        .view-link {
          display: inline-block;
          font-family: var(--font-parent-body, sans-serif);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8baf8e;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .view-link:hover {
          color: #f5f0e8;
        }
        @media (max-width: 768px) {
          .spotlight-hero {
            padding: 40px 24px;
            min-height: 360px;
          }
          .hero-inner {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
