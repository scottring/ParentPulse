'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
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
      title: 'Complete your self-assessment',
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

    const spousePerson = roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson;
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
  }, [selfPerson, hasSelfContribution, spouse, roles, assessments, peopleNeedingContributions]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING...</p>
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
      <div
        className="min-h-screen p-4 sm:p-6 lg:p-8"
        style={{ background: 'linear-gradient(145deg, #1a1a1a, #111)' }}
      >
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-6">
          <h1
            className="font-mono font-bold text-xl"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Your Growth Journey
          </h1>
          <p
            className="font-mono text-[11px] mt-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}
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
            className="font-mono text-[14px] font-bold tracking-wider mt-2"
            style={{ color: overallDisplay.color }}
          >
            {overallDisplay.label}
          </h2>
          <p
            className="font-mono text-[10px] mt-1"
            style={{ color: 'rgba(255,255,255,0.35)' }}
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
              className="font-mono text-[10px] font-bold tracking-widest mb-3"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              DOMAIN BREAKDOWN
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {domainProgressions.map((dp) => {
                const display = getStageDisplay(dp.stage);
                return (
                  <div
                    key={dp.domain}
                    className="rounded-lg p-4"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{display.emoji}</span>
                      <div>
                        <span
                          className="font-mono text-[10px] font-bold tracking-wider block"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {dp.domain === 'self' ? 'SELF' : dp.domain === 'couple' ? 'COUPLE' : 'PARENT'}
                        </span>
                        <span
                          className="font-mono text-[8px] tracking-wider"
                          style={{ color: display.color }}
                        >
                          {display.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-1 rounded-full overflow-hidden mb-2"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
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
                        className="font-mono text-[8px]"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                      >
                        Score: {dp.criteria.averageDomainScore.toFixed(1)}
                      </span>
                      <span
                        className="font-mono text-[8px]"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                      >
                        {dp.criteria.totalItemsCompleted} done
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {dp.requirements.slice(0, 2).map((req, i) => (
                        <p
                          key={i}
                          className="font-mono text-[8px] mt-0.5"
                          style={{ color: 'rgba(255,255,255,0.2)' }}
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
