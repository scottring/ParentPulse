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
    <div className="border-2 border-slate-800 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Role Header */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{emoji}</span>
            <div>
              <h2 className="font-mono font-bold text-sm text-slate-900 uppercase tracking-wider">
                {roleLabel}
              </h2>
              <p className="font-mono text-xs text-slate-500">
                with {otherPerson.name}
              </p>
            </div>
          </div>
          {assessments.length > 0 && (
            <div className="text-right">
              <div className={`font-mono text-lg font-bold ${
                avgScore >= 4.0 ? 'text-green-700' :
                avgScore >= 3.0 ? 'text-amber-700' : 'text-red-700'
              }`}>
                {avgScore.toFixed(1)}
              </div>
              <div className="font-mono text-[9px] text-slate-400 uppercase">overall</div>
            </div>
          )}
        </div>

        {/* Warm narrative */}
        {narrative && (
          <p className="font-mono text-xs text-slate-600 leading-relaxed mb-4 pl-9 italic">
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
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/people/${otherPerson.personId}/manual`}
            className="font-mono text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            VIEW {otherPerson.name.toUpperCase()}&apos;S MANUAL &rarr;
          </Link>
        </div>
      </div>

      {/* Active Arc */}
      {activeArc && (
        <div className="px-5 py-4 bg-slate-50 border-t border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{activeArc.emoji}</span>
            <span className="font-mono text-[11px] font-bold text-slate-800">
              {activeArc.title}
            </span>
          </div>

          {/* Outcome statement */}
          {activeArc.outcomeStatement && (
            <p className="font-mono text-[11px] text-slate-600 mb-2 pl-6 italic">
              &ldquo;{activeArc.outcomeStatement}&rdquo;
            </p>
          )}

          <div className="flex items-center gap-3 mb-2 pl-6">
            <span className="font-mono text-[10px] text-slate-500">
              Week {activeArc.currentWeek}/{activeArc.durationWeeks}
            </span>
            <span className="font-mono text-[10px] text-slate-400 capitalize">
              {activeArc.currentPhase}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {activeArc.completedItemCount}/{activeArc.totalItemCount}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-200 ml-6" style={{ width: 'calc(100% - 1.5rem)' }}>
            <div
              className="h-full bg-slate-800 transition-all duration-500"
              style={{ width: `${arcProgress}%` }}
            />
          </div>

          {activeArc.researchBasis && (
            <p className="font-mono text-[9px] text-slate-400 mt-1.5 pl-6">
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
            <p className="font-mono text-[10px] text-slate-400 text-center">
              +{todayItems.length - 2} more
            </p>
          )}
        </div>
      )}

      {/* No arc state */}
      {!activeArc && todayItems.length === 0 && assessments.length > 0 && (
        <div className="px-5 py-3 text-center border-t border-slate-100">
          <p className="font-mono text-[10px] text-slate-400">
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
