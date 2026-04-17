'use client';

import Link from 'next/link';
import type { PersonManual, SynthesizedInsight } from '@/types/person-manual';

interface SynthesisHeroProps {
  manual: PersonManual;
}

type InsightType = 'blindSpot' | 'gap' | 'alignment';

interface PickedInsight {
  insight: SynthesizedInsight;
  type: InsightType;
}

function pickBestInsight(manual: PersonManual): PickedInsight | null {
  const sc = manual.synthesizedContent;
  if (!sc) return null;

  if (sc.blindSpots?.length > 0) {
    return { insight: sc.blindSpots[0], type: 'blindSpot' };
  }
  if (sc.gaps?.length > 0) {
    return { insight: sc.gaps[0], type: 'gap' };
  }
  if (sc.alignments?.length > 0) {
    return { insight: sc.alignments[0], type: 'alignment' };
  }
  return null;
}

const typeLabels: Record<InsightType, string> = {
  blindSpot: 'Blind spot',
  gap: 'Perspective gap',
  alignment: 'Alignment',
};

export function SynthesisHero({ manual }: SynthesisHeroProps) {
  const picked = pickBestInsight(manual);

  // Fall back to overview if no insights available
  const highlightText = picked?.insight.synthesis ?? manual.synthesizedContent?.overview ?? '';
  const label = picked
    ? `${typeLabels[picked.type]} · ${manual.personName}`
    : `Overview · ${manual.personName}`;

  return (
    <div className="synthesis-hero">
      <div className="hero-inner">
        <span className="eyebrow">✦ Something new about {manual.personName}</span>

        <blockquote className="highlight">
          <span className="open-quote">"</span>
          {highlightText}
          <span className="close-quote">"</span>
        </blockquote>

        {picked?.insight.topic && (
          <div className="topic-tag">{picked.insight.topic}</div>
        )}

        <div className="meta-row">
          <span className="label">{label}</span>
          <Link href={`/people/${manual.personId}/manual`} className="view-link">
            Read the manual →
          </Link>
        </div>
      </div>

      <style jsx>{`
        .synthesis-hero {
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
        .highlight {
          margin: 0 0 20px;
          padding: 0;
          border: none;
          font-family: var(--font-cormorant, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(22px, 2.8vw, 32px);
          line-height: 1.45;
          color: #f5f0e8;
          position: relative;
        }
        .open-quote,
        .close-quote {
          font-size: 1.4em;
          line-height: 0;
          vertical-align: -0.25em;
          color: #6b8f71;
          font-style: normal;
        }
        .open-quote {
          margin-right: 2px;
        }
        .close-quote {
          margin-left: 2px;
        }
        .topic-tag {
          display: inline-block;
          font-family: var(--font-parent-body, sans-serif);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6b8f71;
          border: 1px solid #6b8f71;
          padding: 3px 10px;
          border-radius: 100px;
          margin-bottom: 24px;
        }
        .meta-row {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .label {
          font-family: var(--font-parent-body, sans-serif);
          font-size: 11px;
          font-weight: 500;
          color: #b5aa98;
          letter-spacing: 0.05em;
        }
        .view-link {
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
          .synthesis-hero {
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
