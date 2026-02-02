'use client';

import { useState } from 'react';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  ProgressBar,
} from '@/components/technical';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type {
  HouseholdWeeklyFocusV2,
  FocusArea,
  FocusDomain,
} from '@/types/household-workbook';
import { FOCUS_DOMAIN_META } from '@/types/household-workbook';

// ==================== Types ====================

interface HouseholdFocusCardProps {
  focus: HouseholdWeeklyFocusV2;
  onMarkActionComplete: (focusAreaId: string, actionId: string) => void;
  onMarkActionIncomplete: (focusAreaId: string, actionId: string) => void;
  onAddJournalEntry: () => void;
  onOpenReflection: () => void;
  onEditPlan: () => void;
}

// ==================== Component ====================

export default function HouseholdFocusCard({
  focus,
  onMarkActionComplete,
  onMarkActionIncomplete,
  onAddJournalEntry,
  onOpenReflection,
  onEditPlan,
}: HouseholdFocusCardProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<FocusDomain>>(
    new Set(focus.preferences.focusDomains)
  );

  // Get visible focus areas (excluding removed ones)
  const visibleAreas = [
    ...focus.focusAreas.filter(
      (area) => !(focus.removedAreaIds || []).includes(area.focusAreaId)
    ),
    ...(focus.userAddedAreas || []),
  ];

  // Group by domain (using layerId to approximate domain)
  const areasByDomain = groupAreasByDomain(visibleAreas, focus.preferences.focusDomains);

  // Calculate progress
  const totalActions = visibleAreas.reduce(
    (sum, area) => sum + area.actions.length,
    0
  );
  const completedActions = focus.completedActions.length;
  const progressPercentage =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const isActionComplete = (focusAreaId: string, actionId: string) =>
    focus.completedActions.includes(`${focusAreaId}:${actionId}`);

  const toggleDomain = (domain: FocusDomain) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  const weekOfDate = focus.weekOf.toDate();
  const formattedDate = weekOfDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TechnicalCard shadowSize="md" className="p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-800 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono font-bold text-sm uppercase tracking-wider">
            This Week&apos;s Focus
          </h3>
          <span className="font-mono text-xs text-slate-400">{formattedDate}</span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold">
            {completedActions}/{totalActions}
          </span>
        </div>
      </div>

      {/* Focus Areas by Domain */}
      <div className="divide-y divide-slate-200">
        {focus.preferences.focusDomains.map((domain) => {
          const domainMeta = FOCUS_DOMAIN_META[domain];
          const domainAreas = areasByDomain[domain] || [];
          const isExpanded = expandedDomains.has(domain);

          if (domainAreas.length === 0) return null;

          const domainCompleted = domainAreas.reduce((sum, area) => {
            return (
              sum +
              area.actions.filter((a) =>
                isActionComplete(area.focusAreaId, a.actionId)
              ).length
            );
          }, 0);
          const domainTotal = domainAreas.reduce(
            (sum, area) => sum + area.actions.length,
            0
          );

          return (
            <div key={domain}>
              {/* Domain Header */}
              <button
                onClick={() => toggleDomain(domain)}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
                    {domainMeta.label}
                  </span>
                  <TechnicalLabel
                    variant="subtle"
                    color={domainCompleted === domainTotal ? 'green' : 'slate'}
                    size="xs"
                  >
                    {domainCompleted}/{domainTotal}
                  </TechnicalLabel>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Domain Content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {domainAreas.map((area) => (
                    <FocusAreaItem
                      key={area.focusAreaId}
                      area={area}
                      isActionComplete={(actionId) =>
                        isActionComplete(area.focusAreaId, actionId)
                      }
                      onToggleAction={(actionId, completed) => {
                        if (completed) {
                          onMarkActionIncomplete(area.focusAreaId, actionId);
                        } else {
                          onMarkActionComplete(area.focusAreaId, actionId);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          onClick={onAddJournalEntry}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-mono"
        >
          <PlusIcon className="w-4 h-4" />
          QUICK JOURNAL
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEditPlan}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-mono"
          >
            <PencilIcon className="w-3 h-3" />
            EDIT
          </button>
          {focus.status === 'active' && (
            <TechnicalButton variant="outline" size="sm" onClick={onOpenReflection}>
              WEEKLY REFLECTION
            </TechnicalButton>
          )}
        </div>
      </div>
    </TechnicalCard>
  );
}

// ==================== Sub-Components ====================

interface FocusAreaItemProps {
  area: FocusArea;
  isActionComplete: (actionId: string) => boolean;
  onToggleAction: (actionId: string, currentlyComplete: boolean) => void;
}

function FocusAreaItem({
  area,
  isActionComplete,
  onToggleAction,
}: FocusAreaItemProps) {
  const allComplete = area.actions.every((a) => isActionComplete(a.actionId));

  return (
    <div
      className={`p-3 border-l-4 ${
        allComplete ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-mono font-bold text-sm text-slate-800">
          {area.title}
        </h4>
        {allComplete && (
          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
        )}
      </div>

      <div className="space-y-2">
        {area.actions.map((action) => {
          const completed = isActionComplete(action.actionId);

          return (
            <button
              key={action.actionId}
              onClick={() => onToggleAction(action.actionId, completed)}
              className="w-full flex items-start gap-2 text-left group"
            >
              <div
                className={`
                  w-4 h-4 mt-0.5 border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${completed
                    ? 'border-green-500 bg-green-500'
                    : 'border-slate-300 group-hover:border-slate-400'
                  }
                `}
              >
                {completed && (
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                )}
              </div>
              <span
                className={`text-sm ${
                  completed ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {action.description}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-green-600 mt-2 opacity-80">
        Success: {area.successMetric}
      </p>
    </div>
  );
}

// ==================== Helpers ====================

function groupAreasByDomain(
  areas: FocusArea[],
  selectedDomains: FocusDomain[]
): Record<FocusDomain, FocusArea[]> {
  const grouped: Record<FocusDomain, FocusArea[]> = {
    physical_environment: [],
    behavior_boundaries: [],
    partner_dynamics: [],
    routines_rituals: [],
    self_regulation: [],
    values_alignment: [],
  };

  // Simple mapping based on layerId and sourceType
  areas.forEach((area) => {
    let domain: FocusDomain = 'values_alignment';

    // Attempt to infer domain from layer and source type
    if (area.layerId === 1) {
      domain = area.sourceType === 'trigger' ? 'self_regulation' : 'physical_environment';
    } else if (area.layerId === 2) {
      domain = 'partner_dynamics';
    } else if (area.layerId === 3) {
      domain = 'behavior_boundaries';
    } else if (area.layerId === 4) {
      domain = area.sourceType === 'ritual' ? 'routines_rituals' : 'behavior_boundaries';
    } else if (area.layerId === 5) {
      domain = 'values_alignment';
    } else if (area.layerId === 6) {
      domain = 'values_alignment';
    }

    // Prefer domains that were actually selected
    if (selectedDomains.includes(domain)) {
      grouped[domain].push(area);
    } else {
      // Fallback to first selected domain
      const fallback = selectedDomains[0] || 'values_alignment';
      grouped[fallback].push(area);
    }
  });

  return grouped;
}
