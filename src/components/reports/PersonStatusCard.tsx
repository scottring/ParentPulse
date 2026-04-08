'use client';

import { useState } from 'react';
import { Person, PersonManual } from '@/types/person-manual';
import { DimensionAssessment } from '@/types/growth-arc';
import { computeTrend, getBaselineSnapshot } from '@/lib/scoring-engine';
import Link from 'next/link';

interface Props {
  person: Person;
  manual?: PersonManual;
  assessments: DimensionAssessment[];
  periodMs?: number;
}

const TREND_DISPLAY: Record<string, { symbol: string; color: string; label: string }> = {
  improving: { symbol: '\u2197', color: '#16a34a', label: 'Improving' },
  stable: { symbol: '\u2192', color: '#d97706', label: 'Stable' },
  declining: { symbol: '\u2198', color: '#dc2626', label: 'Declining' },
  insufficient_data: { symbol: '\u00B7', color: '#9ca3af', label: 'Insufficient data' },
};

export function PersonStatusCard({ person, manual, assessments, periodMs }: Props) {
  const [expanded, setExpanded] = useState(false);

  const cutoff = periodMs ? Date.now() - periodMs : 0;
  const personAssessments = assessments
    .filter((a) =>
      a.participantIds?.includes(person.personId) || a.participantNames?.includes(person.name),
    )
    .map((a) => {
      if (!periodMs) return a;
      // Filter score history to only include snapshots within the period
      return {
        ...a,
        scoreHistory: a.scoreHistory.filter(
          (s) => s.timestamp.toMillis() >= cutoff,
        ),
      };
    });

  const synth = manual?.synthesizedContent;
  const recentGaps = synth?.gaps?.filter((g) => g.gapSeverity === 'significant_gap') ?? [];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,144,130,0.08)', border: '1.5px solid rgba(124,144,130,0.2)' }}
          >
            <span style={{ fontFamily: 'var(--font-parent-display)', fontSize: '14px', color: '#3A3530' }}>
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '15px', fontWeight: 500, color: '#3A3530' }}>
              {person.name}
            </h4>
            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: '#9ca3af' }}>
              {personAssessments.length} dimensions tracked
            </span>
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '14px', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          &#9662;
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(138,128,120,0.06)' }}>
          {/* Dimension scores with trends */}
          {personAssessments.length > 0 && (
            <div className="space-y-2 pt-3">
              {personAssessments.map((a) => {
                const trend = computeTrend(a.scoreHistory);
                const t = TREND_DISPLAY[trend];
                const baseline = getBaselineSnapshot(a);
                const baselineScore = baseline?.score;

                return (
                  <div key={a.assessmentId} className="flex items-center justify-between">
                    <span
                      className="text-[12px] capitalize"
                      style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
                    >
                      {a.dimensionId.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      {baselineScore !== undefined && (
                        <span className="text-[10px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}>
                          from {baselineScore.toFixed(1)}
                        </span>
                      )}
                      <span
                        className="text-[12px] font-medium"
                        style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
                      >
                        {a.currentScore.toFixed(1)}
                      </span>
                      <span style={{ color: t.color, fontSize: '12px' }}>{t.symbol}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notable gaps */}
          {recentGaps.length > 0 && (
            <div className="pt-2">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#d97706' }}
              >
                Notable gaps
              </span>
              <div className="mt-1 space-y-1">
                {recentGaps.slice(0, 3).map((g) => (
                  <p key={g.id} className="text-[11px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
                    {g.topic}: {g.synthesis}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Link to portrait */}
          <Link
            href={`/people/${person.personId}/portrait`}
            className="inline-block text-[11px] mt-2 hover:underline"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}
          >
            View full portrait &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
