'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface FeaturedHeroProps {
  // "Today in the Journal" / "This week in the Workbook" — the tiny
  // all-caps line above everything.
  eyebrow: string;
  // Optional kind row with a glyph and a label, framed top and bottom
  // by horizontal rules. Pass kindLabel='' to hide entirely.
  kindLabel?: string;
  glyph?: string;
  glyphColor?: string;
  // The large italic title.
  title: string;
  // Italic body excerpt under the title. Caller trims length.
  body?: string;
  // Small-caps meta line rendered below the body. Pass ReactNode so
  // callers can drop in press-sc <span>s for names.
  meta?: ReactNode;
  // Optional CTA. Rendered as a press-link with a framed ❦ ornament
  // above it. Omit both to suppress the CTA block.
  ctaHref?: string;
  ctaLabel?: string;
}

// Generic magazine featured article. Each consumer passes their own
// copy and link — this component owns only the typography treatment.
export default function FeaturedHero({
  eyebrow,
  kindLabel,
  glyph = '◆',
  glyphColor = '#5C8064',
  title,
  body,
  meta,
  ctaHref,
  ctaLabel,
}: FeaturedHeroProps) {
  const showCta = Boolean(ctaHref && ctaLabel);
  return (
    <div className="featured">
      <div className="featured-eyebrow">
        <span className="featured-eyebrow-small">{eyebrow}</span>
      </div>

      {kindLabel && (
        <div className="featured-kind">
          <span
            className="featured-glyph"
            aria-hidden="true"
            style={{ color: glyphColor }}
          >
            {glyph}
          </span>
          <span className="featured-kind-label">{kindLabel}</span>
        </div>
      )}

      <h2 className="featured-title">{title}</h2>

      {body && <p className="featured-body">{body}</p>}

      {meta && <p className="featured-meta">{meta}</p>}

      {showCta && (
        <>
          <div className="featured-cta-frame" aria-hidden="true">
            <span className="featured-cta-rule" />
            <span className="featured-cta-ornament">❦</span>
            <span className="featured-cta-rule" />
          </div>
          <div className="featured-cta">
            <Link href={ctaHref!} className="press-link featured-cta-link">
              {ctaLabel}
              <span className="arrow">⟶</span>
            </Link>
          </div>
        </>
      )}

      <style jsx>{`
        .featured {
          position: relative;
          padding: 4px 0 8px;
        }
        .featured-eyebrow {
          margin-bottom: 16px;
        }
        .featured-eyebrow-small {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
        }
        .featured-kind {
          display: inline-flex;
          align-items: baseline;
          gap: 12px;
          padding: 6px 0;
          margin-bottom: 14px;
          border-top: 1px solid rgba(200, 190, 172, 0.6);
          border-bottom: 1px solid rgba(200, 190, 172, 0.6);
          padding-left: 2px;
          padding-right: 16px;
        }
        .featured-glyph {
          font-size: 15px;
          line-height: 1;
          transform: translateY(1px);
          display: inline-block;
        }
        .featured-kind-label {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #5a4f3b;
        }
        .featured-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(36px, 4.6vw, 54px);
          color: #3a3530;
          margin: 12px 0 20px;
          line-height: 1.08;
          letter-spacing: -0.012em;
          max-width: 720px;
        }
        .featured-body {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 19px;
          line-height: 1.55;
          color: #4a4238;
          margin: 0 0 22px;
          max-width: 640px;
        }
        .featured-meta {
          font-family: var(--font-parent-body);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #7c6e54;
          line-height: 1.55;
          margin: 0 0 36px;
        }
        .featured-cta-frame {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
          max-width: 480px;
        }
        .featured-cta-rule {
          flex: 1;
          height: 1px;
          background: rgba(200, 190, 172, 0.6);
        }
        .featured-cta-ornament {
          font-family: var(--font-parent-display);
          font-size: 20px;
          color: #8a7b5f;
          line-height: 1;
        }
        .featured-cta {
          padding-left: 4px;
        }
        :global(.featured-cta-link) {
          font-size: 28px !important;
          border-bottom-width: 2px !important;
          padding-bottom: 4px !important;
        }

        @media (max-width: 720px) {
          .featured-title {
            font-size: 34px;
          }
          .featured-body {
            font-size: 17px;
          }
          :global(.featured-cta-link) {
            font-size: 22px !important;
          }
        }
      `}</style>
    </div>
  );
}
