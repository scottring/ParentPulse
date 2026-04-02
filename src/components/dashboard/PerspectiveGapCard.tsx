'use client';

import type { PerspectiveZone } from '@/types/ring-scores';
import type { DimensionDomain } from '@/config/relationship-dimensions';

interface PerspectiveGapCardProps {
  domain: DimensionDomain;
  zones: PerspectiveZone[];
}

const DOMAIN_LABELS: Record<string, string> = {
  self: 'Self',
  couple: 'Couple',
  parent_child: 'Parent-Child',
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  self: 'You',
  spouse: 'Your spouse',
  kids: 'Your kids',
};

/**
 * Shows where perspectives diverge meaningfully (>0.8 gap) for a domain.
 */
export function PerspectiveGapCard({ domain, zones }: PerspectiveGapCardProps) {
  const scored = zones.filter((z) => z.score > 0);
  if (scored.length < 2) return null;

  // Find pairs with gaps > 0.8
  const gaps: { a: PerspectiveZone; b: PerspectiveZone; diff: number }[] = [];
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const diff = Math.abs(scored[i].score - scored[j].score);
      if (diff >= 0.8) {
        gaps.push({ a: scored[i], b: scored[j], diff: Math.round(diff * 10) / 10 });
      }
    }
  }

  if (gaps.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(212, 165, 116, 0.06)', border: '1px solid rgba(212, 165, 116, 0.15)' }}
    >
      <p
        className="text-xs font-medium tracking-wide uppercase mb-3"
        style={{ fontFamily: 'var(--font-parent-body)', color: '#B8864A', letterSpacing: '0.08em' }}
      >
        Perspective gap &middot; {DOMAIN_LABELS[domain]}
      </p>

      <div className="space-y-3">
        {gaps.map((gap, i) => {
          const higher = gap.a.score > gap.b.score ? gap.a : gap.b;
          const lower = gap.a.score > gap.b.score ? gap.b : gap.a;

          return (
            <div key={i}>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
              >
                <span className="font-medium">{PERSPECTIVE_LABELS[higher.perspective]}</span>
                {' '}rate{higher.perspective === 'self' ? '' : 's'} this{' '}
                <span className="font-medium">{higher.score.toFixed(1)}</span>
                {', while '}
                <span className="font-medium">{PERSPECTIVE_LABELS[lower.perspective].toLowerCase()}</span>
                {' rate'}{lower.perspective === 'self' ? '' : 's'}{' it '}
                <span className="font-medium">{lower.score.toFixed(1)}</span>
                {'.'}
              </p>
              <p
                className="text-xs mt-1"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
              >
                A gap of {gap.diff} points &mdash; worth exploring together
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
