'use client';

import Link from 'next/link';

interface StageCTAProps {
  eyebrow?: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  ornament?: string;
}

/**
 * Shared literary empty-state pattern for onboarding stages.
 * Ornament + italic title + body + press-link CTA.
 */
export default function StageCTA({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  ornament = '❦',
}: StageCTAProps) {
  return (
    <div className="stage-cta">
      {eyebrow && <span className="stage-eyebrow">{eyebrow}</span>}
      <div className="stage-ornament" aria-hidden="true">{ornament}</div>
      <h2 className="stage-title">{title}</h2>
      <p className="stage-body">{body}</p>
      <Link href={ctaHref} className="press-link stage-link">
        {ctaLabel} <span className="arrow">⟶</span>
      </Link>

      <style jsx>{`
        .stage-cta {
          padding: 48px 0 24px;
          max-width: 560px;
          margin: 0 auto;
          text-align: center;
        }
        .stage-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 20px;
        }
        .stage-ornament {
          font-family: var(--font-parent-display);
          font-size: 24px;
          color: #8a7b5f;
          line-height: 1;
          margin-bottom: 16px;
        }
        .stage-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(30px, 4vw, 44px);
          color: #3a3530;
          margin: 0 0 20px;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .stage-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 18px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0 0 32px;
        }
        :global(.stage-link) {
          font-size: 22px !important;
        }
        @media (max-width: 720px) {
          .stage-cta {
            padding: 32px 0 16px;
          }
          .stage-title {
            font-size: 28px;
          }
          .stage-body {
            font-size: 16px;
          }
          :global(.stage-link) {
            font-size: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}
