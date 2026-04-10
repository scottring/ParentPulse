'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { usePerson } from '@/hooks/usePerson';
import { useRingScores } from '@/hooks/useRingScores';
import { useProgression } from '@/hooks/useProgression';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import MainLayout from '@/components/layout/MainLayout';
import JourneyPath from '@/components/roadmap/JourneyPath';
import StageCard from '@/components/roadmap/StageCard';
import { GrowthStage } from '@/types/growth-arc';
import { getStageDisplay } from '@/lib/progression-engine';

export default function RoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    roles,
    assessments,
    hasSelfContribution,
    spouse,
    peopleNeedingContributions,
  } = useDashboard();
  const { people } = usePerson();
  const { health } = useRingScores(assessments);
  const {
    domainProgressions,
    overallStage,
    overallDisplay,
  } = useProgression();
  const { arcGroups, activeItems, completedItems } = useGrowthFeed();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Build onboarding steps for LEARNING stage
  const onboardingSteps = useMemo(() => {
    const steps: {
      id: string;
      title: string;
      complete: boolean;
      action?: { label: string; href: string } | null;
    }[] = [];

    steps.push({
      id: 'self-assessment',
      title: 'Complete your self-portrait',
      complete: hasSelfContribution,
      action: selfPerson
        ? { label: 'START', href: `/people/${selfPerson.personId}/manual/self-onboard` }
        : null,
    });

    const hasSpouse = !!spouse || roles.some((r) => r.otherPerson.relationshipType === 'spouse');
    steps.push({
      id: 'add-spouse',
      title: 'Add your spouse or partner',
      complete: hasSpouse,
      action: !hasSpouse ? { label: 'ADD', href: '/dashboard' } : null,
    });

    const spousePerson = roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson
      || people.find((p) => p.relationshipType === 'spouse');
    const hasSpouseObservation = spousePerson
      ? !peopleNeedingContributions.some((p) => p.personId === spousePerson.personId)
      : false;
    steps.push({
      id: 'observe-spouse',
      title: 'Share observations about your spouse',
      complete: hasSpouseObservation,
      action: spousePerson
        ? { label: 'CONTRIBUTE', href: `/people/${spousePerson.personId}/manual/onboard` }
        : null,
    });

    const children = roles.filter((r) => r.otherPerson.relationshipType === 'child');
    steps.push({
      id: 'add-children',
      title: 'Add your children',
      complete: children.length > 0,
      action: { label: 'ADD', href: '/dashboard' },
    });

    const hasAssessments = assessments.length > 0;
    steps.push({
      id: 'run-analysis',
      title: 'Run AI analysis',
      complete: hasAssessments,
      action: !hasAssessments ? { label: 'ANALYZE', href: '/dashboard' } : null,
    });

    const hasActiveArc = roles.some((r) => r.activeArc);
    steps.push({
      id: 'first-arc',
      title: 'Start your first Growth Arc',
      complete: hasActiveArc,
      action: hasAssessments && !hasActiveArc ? { label: 'START', href: '/dashboard' } : null,
    });

    return steps;
  }, [selfPerson, hasSelfContribution, spouse, roles, assessments, peopleNeedingContributions, people]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7C9082]/20 border-t-[#7C9082] rounded-full animate-spin"></div>
          <p className="mt-4 text-sm" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const stages: GrowthStage[] = ['learning', 'growing', 'mastering', 'assimilating'];
  const currentIndex = stages.indexOf(overallStage);

  // Stats
  const totalCompleted = completedItems.length;
  const activeArcCount = arcGroups.length;

  return (
    <MainLayout>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-6">
          <h1
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '44px',
              fontWeight: 400,
              color: '#3A3530',
            }}
          >
            Your Growth Journey
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '19px',
              color: '#5F564B',
            }}
          >
            {totalCompleted} activities completed
            {activeArcCount > 0 && ` \u00B7 ${activeArcCount} active arc${activeArcCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Journey path visualization */}
        <div className="max-w-3xl mx-auto">
          <JourneyPath currentStage={overallStage} />
        </div>

        {/* Overall stage display */}
        <div className="max-w-3xl mx-auto mb-6 text-center">
          <span className="text-4xl">{overallDisplay.emoji}</span>
          <h2
            className="mt-2"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: '25px',
              fontWeight: 400,
              color: '#3A3530',
            }}
          >
            {overallDisplay.label}
          </h2>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '19px',
              color: '#6B6254',
            }}
          >
            {overallDisplay.description}
          </p>
        </div>

        {/* Stage cards */}
        <div className="max-w-3xl mx-auto space-y-4">
          {stages.map((stage, i) => {
            const isCurrent = i === currentIndex;
            const isCompleted = i < currentIndex;
            const isLocked = i > currentIndex + 1; // Allow peeking at next stage

            return (
              <StageCard
                key={stage}
                stage={stage}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
                isLocked={isLocked}
                domainProgressions={domainProgressions}
                onboardingSteps={
                  stage === 'learning' && state !== 'active'
                    ? onboardingSteps
                    : stage === 'learning' && state === 'active'
                      ? onboardingSteps.filter((s) => !s.complete)
                      : undefined
                }
              />
            );
          })}
        </div>

        {/* Domain breakdown */}
        {domainProgressions.length > 0 && (
          <div className="max-w-3xl mx-auto mt-8">
            <h3
              className="mb-3"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B6254',
              }}
            >
              DOMAIN BREAKDOWN
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {domainProgressions.map((dp) => {
                const display = getStageDisplay(dp.stage);
                return (
                  <div
                    key={dp.domain}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(124,144,130,0.15)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{display.emoji}</span>
                      <div>
                        <span
                          className="block"
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            fontSize: '17px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: '#3A3530',
                          }}
                        >
                          {dp.domain === 'self' ? 'SELF' : dp.domain === 'couple' ? 'COUPLE' : 'PARENT'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            fontSize: '17px',
                            letterSpacing: '0.05em',
                            color: display.color,
                          }}
                        >
                          {display.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-1 rounded-full overflow-hidden mb-2"
                      style={{ background: 'rgba(124,144,130,0.15)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round(dp.stageProgress * 100)}%`,
                          background: display.color,
                        }}
                      />
                    </div>

                    {/* Key stats */}
                    <div className="flex justify-between">
                      <span
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          fontSize: '17px',
                          color: '#6B6254',
                        }}
                      >
                        Score: {dp.criteria.averageDomainScore.toFixed(1)}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-parent-body)',
                          fontSize: '17px',
                          color: '#6B6254',
                        }}
                      >
                        {dp.criteria.totalItemsCompleted} done
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(124,144,130,0.15)' }}>
                      {dp.requirements.slice(0, 2).map((req, i) => (
                        <p
                          key={i}
                          className="mt-0.5"
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            fontSize: '17px',
                            color: '#6B6254',
                          }}
                        >
                          &bull; {req}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
