'use client';

import Link from 'next/link';
import { Person, PersonManual } from '@/types/person-manual';
import { DimensionAssessment } from '@/types/growth-arc';
import { computeFreshness, freshnessLabel, FreshnessStatus } from '@/lib/freshness-engine';

interface Props {
  person: Person;
  manual?: PersonManual;
  assessments: DimensionAssessment[];
}

function freshnessColor(status: FreshnessStatus): string {
  return status === 'fresh' ? '#16a34a' : status === 'aging' ? '#d97706' : '#9ca3af';
}

/**
 * Enhanced card for spouse/partner on the People page.
 * Shows connection quality, alignment, freshness, and active areas.
 */
export function SpouseCard({ person, manual, assessments }: Props) {
  // Connection quality: average of couple-domain scores
  const coupleAssessments = assessments.filter((a) => a.domain === 'couple');
  const avgScore = coupleAssessments.length > 0
    ? coupleAssessments.reduce((s, a) => s + a.currentScore, 0) / coupleAssessments.length
    : 0;
  const connectionLabel = avgScore >= 4 ? 'Strong' : avgScore >= 3 ? 'Good' : avgScore >= 2 ? 'Growing' : avgScore > 0 ? 'Needs attention' : 'No data';

  // Freshness
  const freshness = manual ? computeFreshness(manual) : 'stale' as FreshnessStatus;
  const freshLabel = manual ? freshnessLabel(manual) : 'No manual yet';

  // Alignment: count aligned vs gaps+blindspots
  const synth = manual?.synthesizedContent;
  const alignedCount = synth?.alignments?.length ?? 0;
  const gapCount = (synth?.gaps?.length ?? 0) + (synth?.blindSpots?.length ?? 0);
  const total = alignedCount + gapCount;
  const alignmentPercent = total > 0 ? Math.round((alignedCount / total) * 100) : null;

  // Active areas (significant gaps)
  const significantGaps = synth?.gaps?.filter((g) => g.gapSeverity === 'significant_gap') ?? [];

  const hasManual = person.hasManual && manual;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,144,130,0.12)', border: '2px solid #7C9082' }}
            >
              <span style={{ fontSize: '18px' }}>💑</span>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '17px',
                  fontWeight: 500,
                  color: '#3A3530',
                }}
              >
                {person.name}
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '11px',
                  color: '#7C7468',
                }}
              >
                Partner
              </span>
            </div>
          </div>

          {/* Connection score */}
          {avgScore > 0 && (
            <div className="text-right">
              <span
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '22px',
                  fontWeight: 400,
                  color: '#3A3530',
                }}
              >
                {avgScore.toFixed(1)}
              </span>
              <span
                className="block"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '10px',
                  color: '#7C7468',
                }}
              >
                {connectionLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 pb-3 flex items-center gap-4 flex-wrap">
        {/* Freshness */}
        <span
          className="flex items-center gap-1"
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: freshnessColor(freshness) }}
          />
          <span style={{ color: '#7C7468' }}>{freshLabel}</span>
        </span>

        {/* Alignment */}
        {alignmentPercent !== null && (
          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: '#7C7468' }}>
            {alignmentPercent}% aligned
          </span>
        )}
      </div>

      {/* Significant gaps as tags */}
      {significantGaps.length > 0 && (
        <div className="px-5 pb-3 flex gap-1.5 flex-wrap">
          {significantGaps.slice(0, 3).map((gap) => (
            <span
              key={gap.id}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(217,119,6,0.08)',
                color: '#92400e',
                border: '1px solid rgba(217,119,6,0.15)',
              }}
            >
              {gap.topic}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(138,128,120,0.1)' }}
      >
        <Link
          href={hasManual ? `/people/${person.personId}/manual/onboard` : `/people/${person.personId}/create-manual`}
          className="flex-1 text-[12px] font-medium py-2 rounded-full text-center text-white transition-all hover:opacity-90"
          style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
        >
          {hasManual ? 'Update perspective' : 'Set up manual'} &rarr;
        </Link>
        {hasManual && (
          <Link
            href={`/people/${person.personId}/portrait`}
            className="text-[12px] font-medium px-4 py-2 rounded-full text-center transition-all hover:opacity-80"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#5C5347',
              border: '1px solid rgba(138,128,120,0.2)',
            }}
          >
            Portrait
          </Link>
        )}
      </div>
    </div>
  );
}
