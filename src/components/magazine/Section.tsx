'use client';

import type { ReactNode } from 'react';

export type SectionTone = 'default' | 'readings' | 'kept';

interface SectionProps {
  eyebrow: string;
  title: string;
  tone?: SectionTone;
  // Divided sections add a top rule and margin, separating them from
  // the section above. The first section after the primary row is
  // usually divided; a top-of-body section can opt out.
  divided?: boolean;
  children: ReactNode;
}

// A full-bleed divided section below the primary row. Header on top,
// content (usually a ContentGrid) below. Tone is a light visual cue for
// different content personalities — the base press aesthetic stays the
// same.
export default function Section({
  eyebrow,
  title,
  tone = 'default',
  divided = true,
  children,
}: SectionProps) {
  const titleColor = tone === 'kept' ? '#6b6254' : '#3a3530';
  return (
    <section className={`magazine-section${divided ? ' magazine-section--divided' : ''}`}>
      <div className="section-header">
        <span className="section-eyebrow">{eyebrow}</span>
        <h2 className="section-title" style={{ color: titleColor }}>
          {title}
        </h2>
      </div>
      {children}

      <style jsx>{`
        .magazine-section {
          margin-top: 0;
        }
        .magazine-section--divided {
          margin-top: 56px;
          padding-top: 40px;
          border-top: 1px solid rgba(200, 190, 172, 0.45);
        }
        .section-header {
          margin-bottom: 22px;
        }
        .section-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 6px;
        }
        .section-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(26px, 3vw, 32px);
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.008em;
        }
        @media (max-width: 720px) {
          .magazine-section--divided {
            margin-top: 40px;
            padding-top: 32px;
          }
        }
      `}</style>
    </section>
  );
}
