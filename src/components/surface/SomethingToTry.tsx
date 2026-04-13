'use client';

import Link from 'next/link';
import Section from '@/components/magazine/Section';
import type { GrowthItem } from '@/types/growth';

interface SomethingToTryProps {
  item: GrowthItem;
}

const TYPE_LABELS: Record<string, string> = {
  micro_activity: 'A small practice',
  conversation_guide: 'A conversation',
  reflection_prompt: 'A reflection',
  journaling: 'A journaling prompt',
  mindfulness: 'A mindful moment',
  partner_exercise: 'Together',
  solo_deep_dive: 'A deeper look',
  repair_ritual: 'A repair',
  gratitude_practice: 'Gratitude',
};

/**
 * ONE growth practice, contextually tied to the active insight.
 */
export default function SomethingToTry({ item }: SomethingToTryProps) {
  const label = TYPE_LABELS[item.type] || 'A practice';
  const minutes = item.estimatedMinutes || 0;

  return (
    <Section eyebrow="The workbook" title="Something to try">
      <div className="try-card">
        <div className="try-meta">
          <span className="try-glyph" aria-hidden="true">
            {item.emoji || '✦'}
          </span>
          <span className="try-kind">{label}</span>
          {minutes > 0 && (
            <>
              <span className="try-sep">·</span>
              <span>{minutes} min</span>
            </>
          )}
        </div>

        <h3 className="try-title">{item.title}</h3>
        <p className="try-body">{item.body}</p>

        <Link
          href={`/growth/${item.growthItemId}`}
          className="press-link"
          style={{ marginTop: 20, display: 'inline-block' }}
        >
          Begin this practice <span className="arrow">⟶</span>
        </Link>
      </div>

      <style jsx>{`
        .try-card {
          max-width: 640px;
          margin: 0 auto;
        }
        .try-meta {
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
        .try-glyph {
          font-size: 14px;
          margin-right: 8px;
          color: #5c8064;
        }
        .try-sep {
          margin: 0 8px;
          color: #b2a487;
        }
        .try-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(24px, 3.5vw, 32px);
          color: #3a3530;
          margin: 0 0 12px;
          line-height: 1.15;
          letter-spacing: -0.005em;
        }
        .try-body {
          font-family: var(--font-parent-display);
          font-size: 17px;
          line-height: 1.6;
          color: #4a4238;
          margin: 0;
          max-width: 580px;
        }
        @media (max-width: 720px) {
          .try-title {
            font-size: 22px;
          }
          .try-body {
            font-size: 15px;
          }
        }
      `}</style>
    </Section>
  );
}
