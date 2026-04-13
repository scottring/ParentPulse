'use client';

import Link from 'next/link';
import Section from '@/components/magazine/Section';
import type { ManualInsightItem } from '@/types/surface';

interface WhatTheManualSeesProps {
  insight: ManualInsightItem;
}

const INSIGHT_GLYPH = {
  gap: '—',
  alignment: '✦',
  blind_spot: '◆',
} as const;

const INSIGHT_LABEL = {
  gap: 'A gap between perspectives',
  alignment: 'Perspectives align',
  blind_spot: 'Something only others see',
} as const;

/**
 * 1-2 curated synthesis insights — the most surprising gap,
 * a newly confirmed alignment, or a recurring pattern.
 */
export default function WhatTheManualSees({ insight }: WhatTheManualSeesProps) {
  return (
    <Section eyebrow="From the manual" title="What the synthesis sees">
      <div className="insight-card">
        <div className="insight-header">
          <span className="insight-glyph" aria-hidden="true">
            {INSIGHT_GLYPH[insight.insightType]}
          </span>
          <span className="insight-label">
            {INSIGHT_LABEL[insight.insightType]}
          </span>
          <span className="insight-sep">·</span>
          <span className="insight-person">{insight.personName}</span>
        </div>

        <h3 className="insight-topic">{insight.insight.topic}</h3>
        <p className="insight-synthesis">{insight.insight.synthesis}</p>

        {insight.insight.selfPerspective && insight.insight.observerPerspective && (
          <div className="insight-perspectives">
            <div className="perspective">
              <span className="perspective-label">Self</span>
              <p className="perspective-text">{insight.insight.selfPerspective}</p>
            </div>
            <div className="perspective">
              <span className="perspective-label">Observer</span>
              <p className="perspective-text">{insight.insight.observerPerspective}</p>
            </div>
          </div>
        )}

        <Link
          href={`/people/${insight.personId}/manual`}
          className="press-link-sm"
          style={{ marginTop: 16, display: 'inline-block' }}
        >
          Open {insight.personName}&rsquo;s manual ⟶
        </Link>
      </div>

      <style jsx>{`
        .insight-card {
          max-width: 640px;
          margin: 0 auto;
        }
        .insight-header {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0;
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a7b5f;
          margin-bottom: 12px;
        }
        .insight-glyph {
          margin-right: 8px;
          font-size: 12px;
          color: #5c8064;
        }
        .insight-sep {
          margin: 0 8px;
          color: #b2a487;
        }
        .insight-person {
          color: #5a4f3b;
        }
        .insight-topic {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #3a3530;
          margin: 0 0 10px;
          line-height: 1.25;
        }
        .insight-synthesis {
          font-family: var(--font-parent-display);
          font-size: 16px;
          line-height: 1.6;
          color: #4a4238;
          margin: 0;
        }
        .insight-perspectives {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(200, 190, 172, 0.35);
        }
        .perspective-label {
          font-family: var(--font-parent-body);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 4px;
        }
        .perspective-text {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 14px;
          line-height: 1.5;
          color: #4a4238;
          margin: 0;
        }
        @media (max-width: 720px) {
          .insight-topic {
            font-size: 19px;
          }
          .insight-synthesis {
            font-size: 15px;
          }
          .insight-perspectives {
            grid-template-columns: 1fr;
            gap: 14px;
          }
        }
      `}</style>
    </Section>
  );
}
