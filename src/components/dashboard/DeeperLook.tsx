'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DomainScore } from '@/types/ring-scores';

interface DeeperLookProps {
  domainScores: DomainScore[];
}

const DOMAIN_LABELS: Record<string, string> = {
  self: 'Self',
  couple: 'Couple',
  parent_child: 'Parent-Child',
};

export function DeeperLook({ domainScores }: DeeperLookProps) {
  const [expanded, setExpanded] = useState(false);
  const scoredDomains = domainScores.filter((d) => d.score > 0);

  if (scoredDomains.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50/50"
      >
        <p
          className="text-xs font-medium tracking-wide uppercase"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', letterSpacing: '0.08em' }}
        >
          Deeper look
        </p>
        <span
          className="text-xs transition-transform"
          style={{
            color: 'var(--parent-text-light)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {'\u25BC'}
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-5">
          {/* Domain summary rows */}
          <div className="space-y-3 mb-4">
            {scoredDomains.map((d) => (
              <DomainRow key={d.domain} domainScore={d} />
            ))}
          </div>

          {/* Link to full deep dive */}
          <Link
            href="/dashboard/deep-dive"
            className="inline-flex items-center text-sm font-medium transition-colors hover:underline"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-primary)' }}
          >
            See full picture &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function DomainRow({ domainScore }: { domainScore: DomainScore }) {
  const maxScore = 5;
  const fillPct = (domainScore.score / maxScore) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
        >
          {DOMAIN_LABELS[domainScore.domain] || domainScore.domain}
        </span>
        <span
          className="text-xs"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
        >
          {domainScore.score.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8E3DC' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${fillPct}%`,
            background: domainScore.score >= 3.5 ? 'var(--parent-primary)' : domainScore.score >= 2.5 ? 'var(--parent-secondary)' : '#C49556',
          }}
        />
      </div>
    </div>
  );
}
