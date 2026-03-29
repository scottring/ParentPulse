'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Person } from '@/types/person-manual';
import { ManualSummary, ContributorInfo } from '@/hooks/useManualSummaries';
import { computeAge } from '@/utils/age';
import JourneyTimeline from './JourneyTimeline';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface PersonCardProps {
  person: Person;
  index: number;
  hasManual: boolean;
  summary?: ManualSummary;
  summaryLoading?: boolean;
  isTwin?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PersonCard({
  person,
  index,
  hasManual,
  summary,
  summaryLoading,
  isTwin,
  onEdit,
  onDelete,
}: PersonCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (hasManual) {
      router.push(`/people/${person.personId}/manual`);
    } else {
      router.push(`/people/${person.personId}/create-manual`);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  const personAge = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;

  // Compute summary line
  const getSummaryLine = (): string => {
    if (!summary) return '';
    const complete = summary.contributors.filter(c => c.status === 'complete').length;
    const total = summary.contributors.length;
    const drafts = summary.draftsInProgress;

    if (complete === 0 && drafts === 0) return 'No perspectives yet';
    if (drafts > 0 && complete === 0) return `${drafts} in progress`;
    if (drafts > 0) return `${complete} complete, ${drafts} in progress`;
    return `${complete} perspective${complete !== 1 ? 's' : ''} complete`;
  };

  // Get the primary CTA
  const getPrimaryCta = (): { label: string; url: string } | null => {
    if (!summary) return null;
    for (const step of summary.journeySteps) {
      if (step.status === 'in-progress' && step.actionUrl) {
        return { label: `CONTINUE: ${step.label.toUpperCase()}`, url: step.actionUrl };
      }
    }
    for (const step of summary.journeySteps) {
      if (step.status === 'not-started' && step.actionUrl) {
        return { label: `START: ${step.label.toUpperCase()}`, url: step.actionUrl };
      }
    }
    return null;
  };

  return (
    <div className="relative">
      <div
        className={`relative transition-all ${
          hasManual
            ? 'bg-white border-2 border-slate-300 hover:border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
            : 'bg-amber-50 border-2 border-amber-600 hover:border-slate-800 shadow-[4px_4px_0px_0px_rgba(217,119,6,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(217,119,6,1)]'
        }`}
        data-testid="person-card"
      >
        {/* Card number label */}
        <div
          className={`absolute -top-3 -left-3 w-10 h-10 text-white font-mono font-bold flex items-center justify-center border-2 ${
            hasManual ? 'bg-slate-800 border-green-600' : 'bg-amber-600 border-slate-800'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Menu button */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-slate-100 rounded font-mono text-slate-600 hover:text-slate-900"
            data-testid="person-menu-button"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable card body */}
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          className="cursor-pointer p-6"
        >
          {/* Header: Name + badges */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-mono text-xl font-bold text-slate-900">
              {person.name}
            </h3>
            {isTwin && (
              <span className="px-1.5 py-0.5 bg-purple-100 border border-purple-300 font-mono text-xs text-purple-700 font-bold">
                TWIN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-xs text-slate-600 uppercase tracking-wider">
              {person.relationshipType || 'UNSPECIFIED'}
            </span>
            {personAge !== null && (
              <span className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                AGE {personAge}
              </span>
            )}
          </div>

          {/* Active manual card content */}
          {hasManual && summary && !summaryLoading ? (
            <>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs text-slate-500">PROGRESS</span>
                  <span className="font-mono text-xs font-bold text-slate-700">{summary.overallProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 border border-slate-200">
                  <div
                    className={`h-full transition-all ${
                      summary.overallProgress >= 80
                        ? 'bg-green-500'
                        : summary.overallProgress >= 40
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${summary.overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Summary line */}
              <p className="font-mono text-xs text-slate-600 mb-3">
                {getSummaryLine()}
                {summary.hasSynthesis && (
                  <span className="ml-2 text-green-700 font-bold">SYNTHESIZED</span>
                )}
              </p>

              {/* Primary CTA */}
              {getPrimaryCta() && (
                <div className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 mb-3 text-center font-bold">
                  {getPrimaryCta()!.label} →
                </div>
              )}

              {/* View manual link */}
              <div className="text-center font-mono text-xs font-bold text-slate-800">
                VIEW MANUAL →
              </div>
            </>
          ) : hasManual && summaryLoading ? (
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-slate-100 animate-pulse" />
              <div className="h-4 bg-slate-100 animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 animate-pulse w-1/2" />
              <div className="mt-4 text-center font-mono text-xs font-bold text-slate-800">
                VIEW MANUAL →
              </div>
            </div>
          ) : (
            <>
              <div className="inline-block px-2 py-1 font-mono text-xs mb-4 bg-slate-800 text-white">
                PENDING
              </div>
              <div className="space-y-2 mb-6 pb-6 border-b border-amber-200">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="text-amber-700">UNINITIALIZED</span>
                </div>
              </div>
              <div className="text-center font-mono text-xs font-bold text-amber-600">
                CREATE MANUAL →
              </div>
            </>
          )}
        </div>

        {/* Expand toggle — only for cards with manuals */}
        {hasManual && summary && !summaryLoading && (
          <button
            onClick={handleExpand}
            className="w-full px-6 py-2 border-t border-slate-200 flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
          >
            <span className="font-mono text-xs text-slate-400">
              {expanded ? 'LESS' : 'DETAILS'}
            </span>
            {expanded ? (
              <ChevronUpIcon className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDownIcon className="w-3 h-3 text-slate-400" />
            )}
          </button>
        )}

        {/* Expanded content */}
        {expanded && summary && (
          <div className="px-6 pb-6 border-t border-slate-200 pt-4 space-y-5">
            {/* Contributor Matrix */}
            <div>
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
                CONTRIBUTORS
              </div>
              <div className="space-y-2">
                {summary.contributors.map((contributor, i) => (
                  <ContributorRow key={`${contributor.contributorId}-${contributor.perspectiveType}-${i}`} contributor={contributor} />
                ))}
                {summary.contributors.length === 0 && (
                  <p className="font-mono text-xs text-slate-400">No contributors yet</p>
                )}
              </div>
            </div>

            {/* Journey Timeline */}
            <div>
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-3">
                JOURNEY
              </div>
              <JourneyTimeline steps={summary.journeySteps} />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-2 top-12 z-30 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="w-full px-4 py-3 text-left font-mono text-xs hover:bg-slate-100 transition-colors border-b border-slate-200 text-slate-900 flex items-center gap-2"
              data-testid="edit-person-button"
            >
              <PencilIcon className="w-4 h-4" />
              EDIT
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-3 text-left font-mono text-xs hover:bg-red-50 transition-colors text-red-600 flex items-center gap-2"
              data-testid="delete-person-button"
            >
              <XMarkIcon className="w-4 h-4" />
              DELETE
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ContributorRow({ contributor }: { contributor: ContributorInfo }) {
  const initial = contributor.contributorName.charAt(0).toUpperCase();
  const isKidObserver = contributor.relationshipToSubject === 'child-observer';
  const isChildSession = contributor.relationshipToSubject === 'child-session';
  const roleLabel = contributor.perspectiveType === 'self'
    ? (isChildSession ? 'KID SELF' : 'SELF')
    : (isKidObserver ? 'KID OBS' : 'OBSERVER');

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
          contributor.status === 'complete'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : contributor.status === 'draft'
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}
      >
        {initial}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-800 truncate">
            {contributor.contributorName}
          </span>
          <span
            className={`px-1 py-0.5 font-mono text-xs font-bold ${
              contributor.perspectiveType === 'self'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {contributor.status === 'complete' ? (
          <span className="font-mono text-xs text-green-700 font-bold">DONE</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-slate-100 border border-slate-200">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${Math.min(100, contributor.progressPercent)}%` }}
              />
            </div>
            <span className="font-mono text-xs text-amber-700 w-8 text-right">
              {contributor.progressPercent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
