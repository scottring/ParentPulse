'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdWorkbook } from '@/hooks/useHouseholdWorkbook';
import { useHouseholdManual, useHouseholdJourney } from '@/hooks/useHouseholdManual';
import type { StepDeliverable } from '@/types/household-workbook';
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
    </div>
  );
}
