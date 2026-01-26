'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalLabel, TechnicalButton, SectionHeader } from '../technical';
import { MilestonePeriodPlan, WeekPlanSummary } from '@/types/household-workbook';

interface MilestonePlanViewProps {
  plan: MilestonePeriodPlan;
  currentWeek: number;
  // Show how this milestone fits into the larger journey
  journeyContext?: {
    day90Milestone: string;
    day60Milestone: string;
    day30Milestone: string;
  };
  onEditPlan?: (updates: Partial<MilestonePeriodPlan>) => void;
  onEditWeek?: (weekNumber: number, updates: Partial<WeekPlanSummary>) => void;
  className?: string;
}

// Default journey context
export const DEFAULT_JOURNEY_CONTEXT = {
  day30Milestone: 'Daily transitions are smooth and predictable',
  day60Milestone: 'Chores and responsibilities are shared without nagging',
  day90Milestone: 'Our home feels peaceful and organized',
};

// Default plan for Day 30 milestone "Smooth daily transitions"
export const DEFAULT_DAY30_PLAN: Omit<MilestonePeriodPlan, 'periodId' | 'familyId' | 'createdAt' | 'updatedAt'> = {
  milestoneTarget: 'day30',
  milestoneDescription: 'Daily transitions are smooth and predictable',
  periodGoal: 'Transform the chaos of daily transitions into calm, predictable rhythms',
  whyThisMatters: 'Transitions (morning, after-school, bedtime) are when most family stress happens. Smoothing these out creates a calmer home for everyone.',
  weeklyPlan: [
    {
      weekNumber: 1,
      title: 'Morning Routine',
      focus: 'Creating a Launch Pad',
      keyActivities: [
        'Set up a launch pad near the door for bags, keys, shoes',
        'Create visual morning checklists for each person',
        'Establish night-before prep habits',
        'Practice for 3-4 days and adjust',
      ],
      expectedProgress: 'Mornings feel calmer, less rushing, everyone knows what to do',
    },
    {
      weekNumber: 2,
      title: 'After-School Transition',
      focus: 'The Reentry Routine',
      buildingOn: 'With mornings working, tackle the afternoon chaos',
      keyActivities: [
        'Create a "landing zone" for school stuff',
        'Establish a 15-min decompression ritual',
        'Set up homework time expectations',
        'Build in snack + connection time',
      ],
      expectedProgress: 'Kids transition home smoothly, homework battles reduced',
    },
    {
      weekNumber: 3,
      title: 'Evening Routine',
      focus: 'Winding Down Together',
      buildingOn: 'Now connect the day with a calm evening',
      keyActivities: [
        'Set consistent dinner time (flexible range OK)',
        'Create bedtime countdown routine',
        'Establish screen-off time',
        'Add a brief connection ritual before bed',
      ],
      expectedProgress: 'Evenings feel less hectic, bedtime is smoother',
    },
    {
      weekNumber: 4,
      title: 'Integration Week',
      focus: 'Connecting All Transitions',
      buildingOn: 'Link your routines into one flowing day',
      keyActivities: [
        'Family meeting: What\'s working? What needs tweaking?',
        'Document successful routines in your manual',
        'Address any remaining friction points',
        'Celebrate your progress!',
      ],
      expectedProgress: 'Transitions feel natural, family rhythm is established',
    },
  ],
  expectedOutcomes: [
    'Morning, after-school, and bedtime transitions are predictable',
    'Less nagging and reminding needed',
    'Kids take more ownership of their routines',
    'Family stress levels noticeably lower',
  ],
  isUserEdited: false,
};

export function MilestonePlanView({
  plan,
  currentWeek,
  journeyContext = DEFAULT_JOURNEY_CONTEXT,
  onEditPlan,
  onEditWeek,
  className = '',
}: MilestonePlanViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editingOverview, setEditingOverview] = useState(false);
  const [editedGoal, setEditedGoal] = useState(plan.periodGoal);
  const [editedOutcomes, setEditedOutcomes] = useState(plan.expectedOutcomes.join('\n'));
  const [showJourneyContext, setShowJourneyContext] = useState(false);

  const totalWeeks = plan.weeklyPlan.length;
  const progressPercent = ((currentWeek - 1) / totalWeeks) * 100;

  const handleSaveOverview = () => {
    if (onEditPlan) {
      onEditPlan({
        periodGoal: editedGoal,
        expectedOutcomes: editedOutcomes.split('\n').filter(o => o.trim()),
        isUserEdited: true,
      });
    }
    setEditingOverview(false);
  };

  const getMilestoneLabel = () => {
    switch (plan.milestoneTarget) {
      case 'day30': return 'DAY 30 MILESTONE';
      case 'day60': return 'DAY 60 MILESTONE';
      case 'day90': return 'DAY 90 MILESTONE';
    }
  };

  return (
    <div className={className}>
      {/* 90-Day Journey Context - Collapsible */}
      <div className="mb-4">
        <button
          onClick={() => setShowJourneyContext(!showJourneyContext)}
          className="w-full text-left p-3 bg-slate-100 border-2 border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 flex items-center justify-center">
                <span className="font-mono text-xs font-bold text-white">90</span>
              </div>
              <div>
                <span className="font-mono text-xs text-slate-500">90-DAY DESTINATION</span>
                <p className="font-mono font-bold text-slate-800">{journeyContext.day90Milestone}</p>
              </div>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {showJourneyContext ? '▼' : '▶'}
            </span>
          </div>
        </button>

        {showJourneyContext && (
          <div className="border-2 border-t-0 border-slate-200 p-4 bg-white">
            <div className="flex items-start gap-4">
              {/* Visual cascade */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 flex items-center justify-center ${plan.milestoneTarget === 'day30' ? 'bg-amber-500' : 'bg-slate-300'}`}>
                  <span className="font-mono text-xs font-bold text-white">30</span>
                </div>
                <div className="w-0.5 h-4 bg-slate-300" />
                <div className={`w-10 h-10 flex items-center justify-center ${plan.milestoneTarget === 'day60' ? 'bg-amber-500' : 'bg-slate-300'}`}>
                  <span className="font-mono text-xs font-bold text-white">60</span>
                </div>
                <div className="w-0.5 h-4 bg-slate-300" />
                <div className={`w-10 h-10 flex items-center justify-center ${plan.milestoneTarget === 'day90' ? 'bg-amber-500' : 'bg-slate-800'}`}>
                  <span className="font-mono text-xs font-bold text-white">90</span>
                </div>
              </div>

              {/* Milestone descriptions */}
              <div className="flex-1 space-y-3">
                <div className={`p-2 ${plan.milestoneTarget === 'day30' ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}>
                  <span className="font-mono text-[10px] text-slate-500">DAY 30</span>
                  <p className={`text-sm ${plan.milestoneTarget === 'day30' ? 'font-bold text-amber-800' : 'text-slate-600'}`}>
                    {journeyContext.day30Milestone}
                  </p>
                </div>
                <div className={`p-2 ${plan.milestoneTarget === 'day60' ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}>
                  <span className="font-mono text-[10px] text-slate-500">DAY 60</span>
                  <p className={`text-sm ${plan.milestoneTarget === 'day60' ? 'font-bold text-amber-800' : 'text-slate-600'}`}>
                    {journeyContext.day60Milestone}
                  </p>
                </div>
                <div className={`p-2 ${plan.milestoneTarget === 'day90' ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}>
                  <span className="font-mono text-[10px] text-slate-500">DAY 90</span>
                  <p className={`text-sm ${plan.milestoneTarget === 'day90' ? 'font-bold text-amber-800' : 'text-slate-600'}`}>
                    {journeyContext.day90Milestone}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 italic">
              Each milestone builds toward the next. Complete Day 30 to unlock Day 60.
            </p>
          </div>
        )}
      </div>

      {/* Main overview card */}
      <TechnicalCard cornerBrackets shadowSize="lg" className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <TechnicalLabel variant="filled" color="amber" size="sm" className="mb-2">
              {getMilestoneLabel()}
            </TechnicalLabel>
            <h2 className="font-mono font-bold text-xl text-slate-800 mb-1">
              {plan.milestoneDescription}
            </h2>
            <p className="text-sm text-slate-500">
              {totalWeeks} weeks to achieve this milestone
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-mono text-xs text-slate-400 hover:text-slate-600 p-2"
          >
            {isExpanded ? '[COLLAPSE]' : '[EXPAND]'}
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-slate-500">PERIOD PROGRESS</span>
            <span className="font-mono text-xs font-bold text-slate-700">
              Week {currentWeek} of {totalWeeks}
            </span>
          </div>
          <div className="h-3 bg-slate-200 flex">
            {plan.weeklyPlan.map((week, idx) => (
              <div
                key={week.weekNumber}
                className={`
                  flex-1 border-r border-white last:border-r-0
                  ${idx < currentWeek - 1 ? 'bg-green-500' : ''}
                  ${idx === currentWeek - 1 ? 'bg-amber-500' : ''}
                  ${idx > currentWeek - 1 ? 'bg-slate-200' : ''}
                `}
                title={`Week ${week.weekNumber}: ${week.title}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {plan.weeklyPlan.map((week) => (
              <span
                key={week.weekNumber}
                className={`font-mono text-[10px] ${
                  week.weekNumber === currentWeek ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}
              >
                W{week.weekNumber}
              </span>
            ))}
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Goal and Why */}
            <div className="mb-6 p-4 bg-slate-50 border-l-4 border-slate-400">
              {editingOverview ? (
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">
                      PERIOD GOAL
                    </label>
                    <textarea
                      value={editedGoal}
                      onChange={(e) => setEditedGoal(e.target.value)}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-slate-500 mb-1">
                      EXPECTED OUTCOMES (one per line)
                    </label>
                    <textarea
                      value={editedOutcomes}
                      onChange={(e) => setEditedOutcomes(e.target.value)}
                      className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <TechnicalButton variant="primary" size="sm" onClick={handleSaveOverview}>
                      SAVE
                    </TechnicalButton>
                    <TechnicalButton variant="outline" size="sm" onClick={() => setEditingOverview(false)}>
                      CANCEL
                    </TechnicalButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        THE GOAL
                      </h3>
                      <p className="text-slate-700 mb-3">{plan.periodGoal}</p>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        WHY THIS MATTERS
                      </h3>
                      <p className="text-sm text-slate-600">{plan.whyThisMatters}</p>
                    </div>
                    {onEditPlan && (
                      <button
                        onClick={() => setEditingOverview(true)}
                        className="font-mono text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        [EDIT]
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Weekly breakdown */}
            <div className="mb-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">
                YOUR 4-WEEK JOURNEY
              </h3>
              <div className="space-y-3">
                {plan.weeklyPlan.map((week) => (
                  <WeekSummaryCard
                    key={week.weekNumber}
                    week={week}
                    isCurrentWeek={week.weekNumber === currentWeek}
                    isPastWeek={week.weekNumber < currentWeek}
                    onEdit={onEditWeek ? () => setEditingWeek(week.weekNumber) : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Expected outcomes */}
            <div className="p-4 bg-green-50 border-2 border-green-200">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-green-700 mb-3">
                BY THE END OF THIS PERIOD, YOU&apos;LL HAVE:
              </h3>
              <ul className="space-y-2">
                {plan.expectedOutcomes.map((outcome, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                    <span className="text-green-600 mt-0.5">✓</span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>

            {/* User edited indicator */}
            {plan.isUserEdited && (
              <p className="mt-4 font-mono text-[10px] text-slate-400 text-center">
                This plan has been customized by you
              </p>
            )}
          </>
        )}
      </TechnicalCard>
    </div>
  );
}

// Sub-component for week summary
function WeekSummaryCard({
  week,
  isCurrentWeek,
  isPastWeek,
  onEdit,
}: {
  week: WeekPlanSummary;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  onEdit?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(isCurrentWeek);

  return (
    <div
      className={`
        border-2 transition-colors
        ${isCurrentWeek ? 'border-amber-400 bg-amber-50' : ''}
        ${isPastWeek ? 'border-green-300 bg-green-50' : ''}
        ${!isCurrentWeek && !isPastWeek ? 'border-slate-200' : ''}
      `}
    >
      {/* Week header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center gap-3"
      >
        {/* Week number badge */}
        <div
          className={`
            w-10 h-10 flex items-center justify-center flex-shrink-0
            ${isPastWeek ? 'bg-green-600' : ''}
            ${isCurrentWeek ? 'bg-amber-600' : ''}
            ${!isCurrentWeek && !isPastWeek ? 'bg-slate-300' : ''}
          `}
        >
          {isPastWeek ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className={`font-mono text-sm font-bold ${isCurrentWeek ? 'text-white' : 'text-slate-500'}`}>
              W{week.weekNumber}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold ${isCurrentWeek ? 'text-amber-800' : 'text-slate-800'}`}>
              {week.title}
            </span>
            {isCurrentWeek && (
              <TechnicalLabel variant="filled" color="amber" size="xs">
                CURRENT
              </TechnicalLabel>
            )}
          </div>
          <p className={`text-sm ${isCurrentWeek ? 'text-amber-700' : 'text-slate-600'}`}>
            {week.focus}
          </p>
        </div>

        <span className="font-mono text-xs text-slate-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pl-16">
          {week.buildingOn && (
            <p className="text-xs text-slate-500 italic mb-2">
              {week.buildingOn}
            </p>
          )}

          <div className="mb-3">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              KEY ACTIVITIES
            </h4>
            <ul className="space-y-1">
              {week.keyActivities.map((activity, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  {activity}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-2 bg-slate-100">
            <span className="font-mono text-[10px] uppercase text-slate-500">Expected:</span>{' '}
            <span className="text-sm text-slate-700">{week.expectedProgress}</span>
          </div>

          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="mt-2 font-mono text-[10px] text-slate-400 hover:text-slate-600"
            >
              [EDIT WEEK]
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MilestonePlanView;
