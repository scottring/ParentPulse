'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdWorkbook } from '@/hooks/useHouseholdWorkbook';
import { useHouseholdManual, useHouseholdJourney } from '@/hooks/useHouseholdManual';
import type { StepDeliverable } from '@/types/household-workbook';
import type { EditContext } from '@/components/household/WeeklyFocusCard';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  SectionHeader,
} from '@/components/technical';
import {
  WeeklyFocusCard,
  MilestoneTracker,
  HouseholdReflectionForm,
  MilestonePlanView,
  DEFAULT_DAY30_PLAN,
  DEFAULT_JOURNEY_CONTEXT,
} from '@/components/household';
import { openCoachWithMessage } from '@/components/coach';
import {
  createMockHouseholdWorkbook,
  HouseholdWeeklyFocus,
  LayerId,
  MilestonePeriodPlan,
} from '@/types/household-workbook';
import { Timestamp } from 'firebase/firestore';

export default function HouseholdWorkbookPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    workbook,
    loading: workbookLoading,
    submitReflection,
    createWorkbook,
  } = useHouseholdWorkbook(user?.familyId);
  const { journey, loading: journeyLoading } = useHouseholdJourney(user?.familyId);
  const { manual, addTrigger, addStrategy, addBoundary } = useHouseholdManual(user?.familyId);

  // Get household members from manual or use defaults
  const householdMembers = manual?.members?.map(m => ({
    personId: m.personId,
    personName: m.name,
  })) || [
    { personId: 'parent-1', personName: 'Parent' },
    { personId: 'child-1', personName: 'Child' },
  ];
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [showMilestonePlan, setShowMilestonePlan] = useState(false);
  const [aiEditContext, setAiEditContext] = useState<EditContext | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || workbookLoading || journeyLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading workbook...
          </p>
        </div>
      </div>
    );
  }

  // No journey started - redirect to household page
  if (!journey) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <TechnicalCard cornerBrackets shadowSize="lg" className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-2xl text-white">!</span>
            </div>
            <h1 className="font-mono font-bold text-xl text-slate-800 mb-4">
              NO ACTIVE JOURNEY
            </h1>
            <p className="text-slate-600 mb-6">
              You need to complete household onboarding before accessing the workbook.
            </p>
            <TechnicalButton
              variant="primary"
              onClick={() => router.push('/household/onboard')}
            >
              START ONBOARDING
            </TechnicalButton>
          </TechnicalCard>
        </div>
      </div>
    );
  }

  // Use mock workbook if none exists (for demo purposes)
  const displayWorkbook = workbook || {
    ...createMockHouseholdWorkbook(user.familyId || 'demo', '2026-W04', 4),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Calculate current week within milestone period (1-4 for day30, 1-8 for day60, etc.)
  const currentWeekInPeriod = Math.min(
    Math.ceil(displayWorkbook.journeyDayNumber / 7),
    4 // Cap at 4 for day30 milestone
  );

  // Create milestone period plan (would come from Firestore in real app)
  const milestonePlan: MilestonePeriodPlan = {
    periodId: `plan-${user.familyId}-day30`,
    familyId: user.familyId || 'demo',
    ...DEFAULT_DAY30_PLAN,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const handleReflectionSubmit = async (reflection: {
    weekHighlight: string;
    weekChallenge: string;
    nextWeekFocus: string;
    familyMoodRating: 1 | 2 | 3 | 4 | 5;
  }) => {
    await submitReflection(reflection);
    setShowReflectionForm(false);
  };

  const handleCreateWorkbook = async () => {
    // Create a sample workbook for demo
    const sampleFocus: HouseholdWeeklyFocus = {
      title: 'Creating a Launch Pad',
      description: 'Set up a dedicated spot for everything you need in the morning',
      whyItMatters: 'When everything has a home, mornings flow better and stress decreases',
      layersFocused: [3, 4] as LayerId[],
    };

    await createWorkbook(
      sampleFocus,
      journey.currentDay,
      {
        target: journey.milestones.day30.status === 'active' ? 'day30' :
                journey.milestones.day60.status === 'active' ? 'day60' : 'day90',
        description: journey.milestones.day30.status === 'active' ? journey.milestones.day30.description :
                     journey.milestones.day60.status === 'active' ? journey.milestones.day60.description :
                     journey.milestones.day90.description,
        daysRemaining: journey.milestones.day30.status === 'active' ? 30 - journey.currentDay :
                       journey.milestones.day60.status === 'active' ? 60 - journey.currentDay :
                       90 - journey.currentDay,
      }
    );
  };

  // Add to manual from workbook
  const handleAddToManual = async (type: 'trigger' | 'strategy' | 'boundary', description: string) => {
    const now = Timestamp.now();
    try {
      if (type === 'trigger') {
        await addTrigger({
          triggerId: `trigger-${Date.now()}`,
          description,
          severity: 'medium',
          layerId: 3, // Default to "Our Rhythms" layer
          source: 'workbook',
          createdAt: now,
          updatedAt: now,
        });
      } else if (type === 'strategy') {
        await addStrategy({
          strategyId: `strategy-${Date.now()}`,
          description,
          effectiveness: 4, // Default to "usually works"
          layerId: 3,
          source: 'workbook',
          createdAt: now,
          updatedAt: now,
        });
      } else if (type === 'boundary') {
        await addBoundary({
          boundaryId: `boundary-${Date.now()}`,
          description,
          category: 'negotiable', // Default
          layerId: 3,
          source: 'workbook',
          createdAt: now,
          updatedAt: now,
        });
      }
      alert(`Added ${type} to your household manual!`);
    } catch (err) {
      console.error('Failed to add to manual:', err);
      alert('Failed to add to manual. Please try again.');
    }
  };

  // Handle deliverable updates from weekly focus steps
  const handleDeliverableUpdate = (instructionId: string, deliverable: StepDeliverable) => {
    console.log('Deliverable created:', { instructionId, deliverable });
    // TODO: Save deliverables to workbook in Firestore
    // For now, we just log and show feedback
    if (deliverable.type === 'checklist') {
      alert('Checklist saved! Your morning checklists have been created.');
    } else if (deliverable.type === 'location') {
      alert('Location saved! Your launch pad location is set.');
    } else if (deliverable.type === 'assignment') {
      alert('Assignments saved! Responsibilities have been assigned.');
    } else if (deliverable.type === 'note') {
      alert('Note saved! Your observations have been captured.');
    }
  };

  // Handle AI-assisted editing
  const handleEditWithAI = (context: EditContext) => {
    setAiEditContext(context);
  };

  // Generate prompt for AI coach based on edit context
  const getAIEditPrompt = (context: EditContext): string => {
    const milestoneContext = `Current milestone: "${displayWorkbook.currentMilestone.description}" (Day ${displayWorkbook.journeyDayNumber} of 90)`;

    if (context.editType === 'focus') {
      return `I'd like help editing my Week ${context.weekNumber} focus activity. Here's what I currently have:

**Title:** ${context.currentContent.title}
**Description:** ${context.currentContent.description}
**Why It Matters:** ${context.currentContent.whyItMatters}

${milestoneContext}

Please help me refine this content while keeping it aligned with my overall 90-day journey goals. I want to maintain the integrity of the plan while making it work better for my family.`;
    } else if (context.editType === 'instruction') {
      return `I'd like help editing Step ${context.currentContent.step} of my Week ${context.weekNumber} focus activity ("${context.weeklyFocus.title}").

**Current Step Title:** ${context.currentContent.title}
**Current Description:** ${context.currentContent.description}

${milestoneContext}

Please help me refine this step while keeping it aligned with the overall weekly focus and my 90-day journey goals.`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Navigation */}
      <nav className="border-b-2 border-slate-800 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/household"
            className="font-mono text-sm text-slate-600 hover:text-slate-800"
          >
            &larr; HOUSEHOLD MANUAL
          </Link>
          <div className="flex items-center gap-4">
            <TechnicalLabel variant="outline" color="amber" size="sm">
              WEEK {displayWorkbook.weekNumber}
            </TechnicalLabel>
            <TechnicalLabel variant="subtle" color="slate" size="sm">
              {displayWorkbook.weekId}
            </TechnicalLabel>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
              <span className="font-mono font-bold text-xl text-white">W</span>
            </div>
            <div>
              <h1 className="font-mono font-bold text-2xl text-slate-800">
                HOUSEHOLD WORKBOOK
              </h1>
              <p className="font-mono text-sm text-slate-500">
                WEEK {displayWorkbook.weekNumber} &middot; {displayWorkbook.weekId}
              </p>
            </div>
          </div>
          <p className="text-slate-600 max-w-2xl">
            Your weekly action plan for building a calmer, more organized household.
            Follow the focus activity, complete tasks, and add what you learn to your manual.
          </p>
        </header>

        {/* 30,000 Foot View - Milestone Period Plan */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader
              title="YOUR 30-DAY ROADMAP"
              subtitle="The big picture for this milestone period"
            />
            <TechnicalButton
              variant="outline"
              size="sm"
              onClick={() => setShowMilestonePlan(!showMilestonePlan)}
            >
              {showMilestonePlan ? 'HIDE ROADMAP' : 'VIEW ROADMAP'}
            </TechnicalButton>
          </div>

          {showMilestonePlan && (
            <MilestonePlanView
              plan={milestonePlan}
              currentWeek={currentWeekInPeriod}
              journeyContext={DEFAULT_JOURNEY_CONTEXT}
              className="mb-8"
            />
          )}
        </section>

        {/* No workbook yet - create one */}
        {!workbook && (
          <TechnicalCard cornerBrackets shadowSize="md" className="p-6 text-center">
            <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
              CREATE THIS WEEK&apos;S WORKBOOK
            </h2>
            <p className="text-slate-600 mb-4">
              You don&apos;t have a workbook for this week yet. Create one to start tracking your household goals.
            </p>
            <TechnicalButton variant="primary" onClick={handleCreateWorkbook}>
              CREATE WORKBOOK
            </TechnicalButton>
          </TechnicalCard>
        )}

        {/* Header cards with milestone tracker and progress */}
        {/* TODO: These info cards could be improved later - consider making them more visually engaging */}
        {/* or consolidating the information in a more meaningful way */}
        <div className="grid md:grid-cols-2 gap-6">
          <MilestoneTracker
            currentMilestone={displayWorkbook.currentMilestone}
            journeyDay={displayWorkbook.journeyDayNumber}
          />
        </div>

        {/* Weekly focus with instructions */}
        <section>
          <SectionHeader
            title="THIS WEEK'S FOCUS"
            subtitle="Your main activity and how to do it"
            className="mb-4"
          />
          <WeeklyFocusCard
            weeklyFocus={displayWorkbook.weeklyFocus}
            weekNumber={displayWorkbook.weekNumber}
            householdMembers={householdMembers}
            onDeliverableUpdate={handleDeliverableUpdate}
            onAddToManual={handleAddToManual}
            onEditWithAI={handleEditWithAI}
          />
        </section>

        {/* Reflection section */}
        <section>
          <SectionHeader
            title="END OF WEEK"
            subtitle="Reflect on your progress"
            className="mb-4"
          />

          {displayWorkbook.weeklyReflection ? (
            <TechnicalCard shadowSize="md" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TechnicalLabel variant="filled" color="green" size="sm">
                  REFLECTION SUBMITTED
                </TechnicalLabel>
                <span className="font-mono text-xs text-slate-500">
                  Mood rating: {displayWorkbook.weeklyReflection.familyMoodRating}/5
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    HIGHLIGHT
                  </h4>
                  <p className="text-slate-700">{displayWorkbook.weeklyReflection.weekHighlight}</p>
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    CHALLENGE
                  </h4>
                  <p className="text-slate-700">{displayWorkbook.weeklyReflection.weekChallenge}</p>
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    NEXT WEEK
                  </h4>
                  <p className="text-slate-700">{displayWorkbook.weeklyReflection.nextWeekFocus}</p>
                </div>
              </div>
            </TechnicalCard>
          ) : showReflectionForm ? (
            <HouseholdReflectionForm onSubmit={handleReflectionSubmit} />
          ) : (
            <TechnicalCard shadowSize="sm" className="p-6 text-center">
              <p className="text-slate-600 mb-4">
                Ready to reflect on this week? Take a moment to capture what worked and what didn&apos;t.
              </p>
              <TechnicalButton
                variant="primary"
                onClick={() => setShowReflectionForm(true)}
              >
                START REFLECTION
              </TechnicalButton>
            </TechnicalCard>
          )}
        </section>

        {/* Quick navigation */}
        <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-200">
          <TechnicalButton
            variant="secondary"
            onClick={() => router.push('/household')}
          >
            VIEW MANUAL
          </TechnicalButton>
          <TechnicalButton variant="outline" onClick={() => router.push('/dashboard')}>
            DASHBOARD
          </TechnicalButton>
        </div>
      </main>

      {/* AI Edit Panel */}
      {aiEditContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono font-bold text-white uppercase text-sm">
                    AI-Assisted Edit
                  </h3>
                  <p className="font-mono text-[10px] text-slate-300">
                    {aiEditContext.editType === 'focus' ? 'EDITING WEEKLY FOCUS' : `EDITING STEP ${aiEditContext.currentContent.step}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiEditContext(null)}
                className="text-white hover:text-amber-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Current Content Display */}
              <div className="mb-6">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  CURRENT CONTENT
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="font-mono text-[10px] text-slate-500">TITLE</span>
                    <p className="font-medium text-slate-800">{aiEditContext.currentContent.title}</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-slate-500">DESCRIPTION</span>
                    <p className="text-slate-600">{aiEditContext.currentContent.description}</p>
                  </div>
                  {aiEditContext.currentContent.whyItMatters && (
                    <div>
                      <span className="font-mono text-[10px] text-slate-500">WHY IT MATTERS</span>
                      <p className="text-slate-600">{aiEditContext.currentContent.whyItMatters}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Context Info */}
              <div className="mb-6 p-3 bg-amber-50 border-l-4 border-amber-500">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                  JOURNEY CONTEXT
                </h4>
                <p className="text-sm text-amber-800">
                  <strong>Milestone:</strong> {displayWorkbook.currentMilestone.description}
                </p>
                <p className="text-sm text-amber-800">
                  <strong>Progress:</strong> Day {displayWorkbook.journeyDayNumber} of 90 • Week {displayWorkbook.weekNumber}
                </p>
              </div>

              {/* AI Prompt Preview */}
              <div className="mb-6">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  AI WILL HELP YOU WITH
                </h4>
                <div className="p-4 bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <p className="mb-2">
                    The AI coach will help you refine this content while maintaining alignment with:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Your 30/60/90 day milestone goals</li>
                    <li>The weekly focus theme and structure</li>
                    <li>Your household&apos;s specific needs and context</li>
                    <li>Evidence-based parenting strategies</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <TechnicalButton
                  variant="primary"
                  onClick={() => {
                    const prompt = getAIEditPrompt(aiEditContext);
                    setAiEditContext(null);
                    // Open the coach with the pre-filled message
                    openCoachWithMessage(prompt, 'household-workbook');
                  }}
                >
                  OPEN AI COACH
                </TechnicalButton>
                <TechnicalButton
                  variant="outline"
                  onClick={() => setAiEditContext(null)}
                >
                  CANCEL
                </TechnicalButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
