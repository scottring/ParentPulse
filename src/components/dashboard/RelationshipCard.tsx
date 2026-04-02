'use client';

import Link from 'next/link';
import type { UserRole } from '@/hooks/useDashboard';
import type { Contribution } from '@/types/person-manual';
import { scoreToRelationshipPhrase, computeDataConfidence } from '@/lib/climate-engine';
import { scoreToColor } from '@/lib/scoring-engine';
import { computeAge } from '@/utils/age';

interface RelationshipCardProps {
  role: UserRole;
  variant: 'spouse' | 'child';
  demoQ?: string;
  onReact?: (itemId: string, reaction: string) => void;
}

const VARIANT_STYLES = {
  spouse: {
    bg: 'rgba(212, 165, 116, 0.06)',
    border: '#D4A574',
  },
  child: {
    bg: 'rgba(124, 144, 130, 0.05)',
    border: '#7C9082',
  },
};

export function RelationshipCard({ role, variant, demoQ = '', onReact }: RelationshipCardProps) {
  const styles = VARIANT_STYLES[variant];
  const person = role.otherPerson;

  // Compute age
  const age = person.age || (person.dateOfBirth ? computeAge(person.dateOfBirth) : null);

  // Compute relationship health
  const avgScore = role.assessments.length > 0
    ? role.assessments.reduce((sum, a) => sum + a.currentScore, 0) / role.assessments.length
    : 0;
  const healthPhrase = scoreToRelationshipPhrase(avgScore, role.domain);
  const healthColor = avgScore > 0 ? scoreToColor(avgScore) : '#D4D4D4';

  // Data confidence
  const confidence = computeDataConfidence(role, demoQ);

  // Today's growth item
  const todayItem = role.todayItems[0] || null;

  // Narrative snippet (spouse only)
  const narrativeSnippet = variant === 'spouse' && role.narrative
    ? role.narrative.length > 120 ? role.narrative.slice(0, 117) + '...' : role.narrative
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: styles.bg,
        borderLeft: `3px solid ${styles.border}`,
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="px-6 py-5">
        {/* Header: name, age, role */}
        <div className="flex items-baseline gap-2">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
          >
            {person.name}
          </h2>
          <span
            className="text-sm"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            {age !== null && `${age}`}
            {variant === 'spouse' && ' \u00B7 Spouse'}
          </span>
        </div>

        {/* Narrative snippet (spouse only) */}
        {narrativeSnippet && (
          <p
            className="mt-2 text-sm italic leading-relaxed"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            &ldquo;{narrativeSnippet}&rdquo;
          </p>
        )}

        {/* Health phrase */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: healthColor }}
          />
          <span
            className="text-sm font-medium"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
          >
            {healthPhrase}
          </span>
        </div>

        {/* Data confidence bar */}
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#E8E3DC' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${confidence.percentage}%`,
                  background: confidence.percentage >= 50 ? 'var(--parent-primary)' : 'var(--parent-secondary)',
                }}
              />
            </div>
            <span
              className="text-xs shrink-0"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              {confidence.label}
            </span>
          </div>

          {/* Top-up link */}
          {confidence.needsTopUp && (
            <Link
              href={confidence.topUpHref}
              className="inline-block mt-2 text-xs font-medium transition-colors hover:underline"
              style={{ fontFamily: 'var(--font-parent-body)', color: styles.border }}
            >
              {confidence.topUpLabel} &rarr;
            </Link>
          )}
        </div>

        {/* Today's growth item */}
        {todayItem && (
          <div
            className="mt-4 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--parent-border)' }}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5">{todayItem.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium leading-snug"
                  style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
                >
                  {todayItem.title}
                </p>
                {todayItem.body && (
                  <p
                    className="text-xs mt-1 leading-relaxed"
                    style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
                  >
                    {todayItem.body.length > 100 ? todayItem.body.slice(0, 97) + '...' : todayItem.body}
                  </p>
                )}
              </div>
            </div>

            {todayItem.status !== 'completed' && onReact && (
              <div className="flex gap-1.5 mt-2.5 ml-7">
                {[
                  { emoji: '\u2705', key: 'tried_it', label: 'Tried it' },
                  { emoji: '\u23f0', key: 'not_now', label: 'Not now' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => onReact(todayItem.growthItemId, r.key)}
                    className="px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid var(--parent-border)' }}
                    title={r.label}
                  >
                    {r.emoji} <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
