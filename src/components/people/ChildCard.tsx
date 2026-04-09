'use client';

import Link from 'next/link';
import { Person, PersonManual, ManualPattern } from '@/types/person-manual';
import { DimensionAssessment } from '@/types/growth-arc';
import { Timestamp } from 'firebase/firestore';
import {
  computeFreshness,
  getAgeGroup,
  ageGroupLabel,
  FreshnessStatus,
} from '@/lib/freshness-engine';
import { computeTrend } from '@/lib/scoring-engine';

interface Props {
  person: Person;
  manual?: PersonManual;
  assessments: DimensionAssessment[];
}

function computeAge(dob: Timestamp): number {
  const birthDate = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

const TREND_ARROWS: Record<string, { symbol: string; color: string }> = {
  improving: { symbol: '\u2197', color: '#16a34a' },
  stable: { symbol: '\u2192', color: '#d97706' },
  declining: { symbol: '\u2198', color: '#dc2626' },
  insufficient_data: { symbol: '\u00B7', color: '#5F564B' },
};

/**
 * Enhanced child card with emotional visibility, patterns, and developmental context.
 */
export function ChildCard({ person, manual, assessments }: Props) {
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : person.age ?? null;
  const ageGroup = age !== null ? getAgeGroup(age) : null;

  // Emotional visibility: composite score of data coverage
  const hasSelf = manual?.perspectives?.self ? 1 : 0;
  const observerCount = Math.min(manual?.perspectives?.observers?.length ?? 0, 2); // cap at 2
  const hasSynthesis = manual?.synthesizedContent ? 1 : 0;
  const freshness = manual ? computeFreshness(manual) : ('stale' as FreshnessStatus);
  const freshnessBonus = freshness === 'fresh' ? 1 : freshness === 'aging' ? 0.5 : 0;
  const visibilityScore = Math.round(((hasSelf + observerCount / 2 + hasSynthesis + freshnessBonus) / 4) * 100);

  // Patterns
  const patterns: ManualPattern[] = (manual?.emergingPatterns ?? [])
    .sort((a, b) => b.lastObserved.toMillis() - a.lastObserved.toMillis())
    .slice(0, 3);

  // What's working / not working (from synthesis)
  const overview = manual?.synthesizedContent?.overview;

  // Parent-child dimension trends
  const pcAssessments = assessments.filter((a) => a.domain === 'parent_child');
  const dimensionTrends = pcAssessments.slice(0, 4).map((a) => ({
    name: a.dimensionId.replace(/_/g, ' '),
    trend: computeTrend(a.scoreHistory),
    score: a.currentScore,
  }));

  const hasManual = person.hasManual && manual;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,165,116,0.12)', border: '2px solid #D4A574' }}
            >
              <span style={{ fontSize: '16px' }}>
                {person.name.charAt(0).toUpperCase()}
              </span>
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
              <div className="flex items-center gap-2">
                {age !== null && (
                  <span
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '15px',
                      color: '#5F564B',
                    }}
                  >
                    Age {age}
                  </span>
                )}
                {ageGroup && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'rgba(212,165,116,0.1)',
                      color: '#92400e',
                      fontWeight: 500,
                    }}
                  >
                    {ageGroupLabel(ageGroup)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emotional visibility meter */}
      <div className="px-5 py-2">
        <div className="flex items-center justify-between mb-1">
          <span
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5F564B', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            Visibility
          </span>
          <span
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: '#3A3530', fontWeight: 600 }}
          >
            {visibilityScore}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.04)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${visibilityScore}%`,
              background: visibilityScore >= 70 ? '#16a34a' : visibilityScore >= 40 ? '#d97706' : '#dc2626',
            }}
          />
        </div>
      </div>

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className="px-5 py-2 space-y-1">
          {patterns.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontWeight: 500,
                  background: p.confidence === 'validated' ? 'rgba(22,163,74,0.08)' : p.confidence === 'consistent' ? 'rgba(217,119,6,0.08)' : 'rgba(156,163,175,0.1)',
                  color: p.confidence === 'validated' ? '#166534' : p.confidence === 'consistent' ? '#92400e' : '#4A4238',
                }}
              >
                {p.confidence}
              </span>
              <span
                className="text-[11px] truncate"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
              >
                {p.description}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dimension trends */}
      {dimensionTrends.length > 0 && (
        <div className="px-5 py-2 flex gap-2 flex-wrap">
          {dimensionTrends.map((d) => {
            const t = TREND_ARROWS[d.trend];
            return (
              <span
                key={d.name}
                className="text-[10px] flex items-center gap-0.5"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
              >
                <span style={{ color: t.color }}>{t.symbol}</span>
                {d.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Overview snippet */}
      {overview && (
        <div className="px-5 py-2">
          <p
            className="line-clamp-2"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '15px',
              color: '#5F564B',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {overview}
          </p>
        </div>
      )}

      {/* Actions */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(138,128,120,0.1)' }}
      >
        <Link
          href={hasManual ? `/people/${person.personId}/manual/kid-session` : `/people/${person.personId}/create-manual`}
          className="flex-1 text-[12px] font-medium py-2 rounded-full text-center text-white transition-all hover:opacity-90"
          style={{ fontFamily: 'var(--font-parent-body)', background: '#D4A574' }}
        >
          {hasManual ? 'Update' : 'Set up manual'} &rarr;
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
