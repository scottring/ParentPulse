/**
 * WorkbookCard Component
 *
 * Dashboard card showing a person's active workbook for the week
 * Displays activity level, priority items, and quick actions
 */

'use client';

import { WeeklyWorkbook, WorkbookStats } from '@/types/workbook';
import { Person } from '@/types/person-manual';
import Link from 'next/link';
import { HeroIcon } from '@/components/common/HeroIcon';

interface WorkbookCardProps {
  person: Person;
  workbook: WeeklyWorkbook;
  stats: WorkbookStats;
}

export function WorkbookCard({ person, workbook, stats }: WorkbookCardProps) {
  // Calculate days into the week (0-6)
  const weekStart = workbook.startDate.toDate();
  const today = new Date();
  const daysIntoWeek = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = 7 - daysIntoWeek;

  // Activity dots based on stats
  const activityDots = Array.from({ length: 5 }, (_, i) => i < stats.activityLevel);

  // Workbook focus description - use first parent goal as focus
  const focusText = workbook.parentGoals[0]?.description || 'General observations';

  return (
    <Link
      href={`/people/${person.personId}/workbook`}
      className="block bg-white border-2 border-stone-200 rounded-lg p-5 hover:border-stone-400 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-semibold text-lg">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt={person.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              person.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Person info */}
          <div>
            <h3 className="font-semibold text-stone-900 text-lg">
              {person.name}
            </h3>
            <p className="text-sm text-stone-500 capitalize">
              {person.relationshipType?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Priority badge */}
        {stats.priorityItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-medium text-orange-700">
              {stats.priorityItems.length} priority
            </span>
          </div>
        )}
      </div>

      {/* Week info */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-stone-100">
        <div className="text-sm">
          <span className="text-stone-500">Week {workbook.weekNumber}</span>
          <span className="mx-2 text-stone-300">•</span>
          <span className="text-stone-600 font-medium">
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
          </span>
        </div>

        {/* Activity level dots */}
        <div className="flex items-center gap-1">
          {activityDots.map((filled, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                filled ? 'bg-emerald-500' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Weekly focus */}
      <div className="mb-4">
        <div className="flex items-start gap-2">
          <HeroIcon name="FlagIcon" className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Focus
            </p>
            <p className="text-sm text-stone-700 line-clamp-2">
              {focusText}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-stone-900">
            {stats.observationsCount}
          </div>
          <div className="text-xs text-stone-500">
            Observations
          </div>
        </div>

        {/* Additional stats - show behavior/chips if available */}
        {stats.behaviorInstancesCount !== undefined && stats.behaviorInstancesCount > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900">
              {stats.behaviorInstancesCount}
            </div>
            <div className="text-xs text-stone-500">
              Behaviors
            </div>
          </div>
        )}
        {stats.chipTransactionsCount !== undefined && stats.chipTransactionsCount > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900">
              {stats.chipTransactionsCount}
            </div>
            <div className="text-xs text-stone-500">
              Chips
            </div>
          </div>
        )}
      </div>

      {/* Priority items */}
      {stats.priorityItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-md p-3 mb-4">
          <div className="flex items-start gap-2">
            <HeroIcon name="ExclamationTriangleIcon" className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-orange-900 mb-1">
                Needs attention
              </p>
              <p className="text-sm text-orange-800 line-clamp-2">
                {stats.priorityItems[0]}
              </p>
              {stats.priorityItems.length > 1 && (
                <p className="text-xs text-orange-600 mt-1">
                  +{stats.priorityItems.length - 1} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick actions hint */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-500">Click to view workbook</span>
        <HeroIcon name="ChevronRightIcon" className="w-4 h-4 text-stone-400" />
      </div>
    </Link>
  );
}

/**
 * Empty state when no workbooks exist
 */
export function EmptyWorkbookState() {
  return (
    <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
          <HeroIcon name="BookOpenIcon" className="w-8 h-8 text-stone-400" />
        </div>
      </div>
      <h3 className="font-semibold text-stone-900 mb-2">
        No active workbooks
      </h3>
      <p className="text-sm text-stone-600 mb-4 max-w-md mx-auto">
        Workbooks are automatically created at the start of each week. Create a manual for someone to get started.
      </p>
      <Link
        href="/people"
        className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors text-sm font-medium"
      >
        <HeroIcon name="PlusIcon" className="w-4 h-4" />
        Add People
      </Link>
    </div>
  );
}

/**
 * Loading skeleton for workbook card
 */
export function WorkbookCardSkeleton() {
  return (
    <div className="bg-white border-2 border-stone-200 rounded-lg p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-200" />
          <div>
            <div className="h-5 w-32 bg-stone-200 rounded mb-2" />
            <div className="h-4 w-24 bg-stone-200 rounded" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 pb-3 border-b border-stone-100">
        <div className="h-4 w-40 bg-stone-200 rounded" />
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-stone-200" />
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-4 w-20 bg-stone-200 rounded mb-2" />
        <div className="h-4 w-full bg-stone-200 rounded" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 w-12 bg-stone-200 rounded mx-auto mb-1" />
            <div className="h-3 w-16 bg-stone-200 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
