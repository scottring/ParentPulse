'use client';

import { UserRole } from '@/hooks/useDashboard';
import DimensionBars from './DimensionBars';
import GrowthCard from './GrowthCard';
import { FeedbackReaction, ImpactRating } from '@/types/growth';
import Link from 'next/link';

interface RoleCardProps {
  role: UserRole;
  onFeedback: (
    itemId: string,
    reaction: FeedbackReaction,
    impactRating?: ImpactRating,
    note?: string,
  ) => Promise<void>;
}

const ROLE_EMOJI: Record<string, string> = {
  Spouse: '\uD83D\uDC91',
  Parent: '\uD83E\uDDF8',
  Caregiver: '\uD83E\uDDE1',
  Sibling: '\uD83E\uDD1D',
  Friend: '\u2B50',
};

export default function RoleCard({ role, onFeedback }: RoleCardProps) {
  const { roleLabel, otherPerson, assessments, activeArc, todayItems, narrative } = role;
  const emoji = ROLE_EMOJI[roleLabel] || '\uD83D\uDC64';

  const avgScore = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.currentScore, 0) / assessments.length
    : 0;

  const arcProgress = activeArc
    ? Math.round(((activeArc.completedItemCount || 0) / (activeArc.totalItemCount || 1)) * 100)
    : 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Role Header */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{emoji}</span>
            <div>
              <h2
                className="text-sm tracking-wide"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontWeight: 600,
                  color: '#3A3530',
                }}
              >
                {roleLabel}
              </h2>
              <p
                className="text-xs"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
              >
                with {otherPerson.name}
              </p>
            </div>
          </div>
          {assessments.length > 0 && (
            <div className="text-right">
              <div
                className="text-lg font-medium"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: avgScore >= 4.0 ? '#16a34a' :
                    avgScore >= 3.0 ? '#5C5347' : '#dc2626',
                }}
              >
                {avgScore.toFixed(1)}
              </div>
              <div
                className="text-[9px]"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
              >
                overall
              </div>
            </div>
          )}
        </div>

        {/* Warm narrative */}
        {narrative && (
          <p
            className="text-xs leading-relaxed mb-4 pl-9 italic"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
          >
            &ldquo;{narrative}&rdquo;
          </p>
        )}

        {/* Dimension bars */}
        {assessments.length > 0 && (
          <div className="mb-3">
            <DimensionBars
              assessments={assessments}
              activeArcDimensionId={activeArc?.dimensionId}
            />
          </div>
        )}

        {/* Manual link */}
        <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
          <Link
            href={`/people/${otherPerson.personId}/manual`}
            className="text-[10px] hover:opacity-70 transition-colors"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
          >
            View {otherPerson.name}&apos;s Manual &rarr;
          </Link>
        </div>
      </div>

      {/* Active Arc */}
      {activeArc && (
        <div
          className="px-5 py-4"
          style={{
            background: 'rgba(0,0,0,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.4)',
            borderBottom: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{activeArc.emoji}</span>
            <span
              className="text-[11px] font-medium"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}
            >
              {activeArc.title}
            </span>
          </div>

          {/* Outcome statement */}
          {activeArc.outcomeStatement && (
            <p
              className="text-[11px] mb-2 pl-6 italic"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
            >
              &ldquo;{activeArc.outcomeStatement}&rdquo;
            </p>
          )}

          <div className="flex items-center gap-3 mb-2 pl-6">
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              Week {activeArc.currentWeek}/{activeArc.durationWeeks}
            </span>
            <span
              className="text-[10px] capitalize"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              {activeArc.currentPhase}
            </span>
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              {activeArc.completedItemCount}/{activeArc.totalItemCount}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden ml-6"
            style={{ width: 'calc(100% - 1.5rem)', background: 'rgba(0,0,0,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${arcProgress}%`, background: '#7C9082' }}
            />
          </div>

          {activeArc.researchBasis && (
            <p
              className="text-[9px] mt-1.5 pl-6"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              {activeArc.researchBasis}
            </p>
          )}
        </div>
      )}

      {/* Today's items */}
      {todayItems.length > 0 && (
        <div className="p-4 space-y-3">
          {todayItems.slice(0, 2).map((item) => (
            <GrowthCard
              key={item.growthItemId}
              item={item}
              onFeedback={onFeedback}
            />
          ))}
          {todayItems.length > 2 && (
            <p
              className="text-[10px] text-center"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              +{todayItems.length - 2} more
            </p>
          )}
        </div>
      )}

      {/* No arc state */}
      {!activeArc && todayItems.length === 0 && assessments.length > 0 && (
        <div
          className="px-5 py-3 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}
        >
          <p
            className="text-[10px]"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
          >
            No active arc &middot; weakest: {
              [...assessments].sort((a, b) => a.currentScore - b.currentScore)[0]
                ?.dimensionId.replace(/_/g, ' ')
            }
          </p>
        </div>
      )}
    </div>
  );
}
