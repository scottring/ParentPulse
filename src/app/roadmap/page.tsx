'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { scoreToColor } from '@/lib/scoring-engine';
import { DimensionDomain } from '@/config/relationship-dimensions';
import { PerspectiveType } from '@/types/ring-scores';

interface RoadmapStep {
  id: string;
  tier: 1 | 2 | 3;
  title: string;
  description: string;
  action: { label: string; href: string } | null;
  complete: boolean;
  domain?: DimensionDomain;
  perspective?: PerspectiveType;
}

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Dynamically build roadmap steps based on current data state
  const steps = useMemo((): RoadmapStep[] => {
    const result: RoadmapStep[] = [];

    // ===== TIER 1: Data Coverage =====

    // Self-assessment
    result.push({
      id: 'self-assessment',
      tier: 1,
      title: 'Complete your self-assessment',
      description: 'Answer questions about yourself — how you handle stress, what you need, how you communicate.',
      action: selfPerson ? { label: 'START', href: `/people/${selfPerson.personId}/manual/self-onboard` } : null,
      complete: hasSelfContribution,
    });

    // Add spouse
    const hasSpouse = !!spouse || roles.some((r) => r.otherPerson.relationshipType === 'spouse');
    result.push({
      id: 'add-spouse',
      tier: 1,
      title: 'Add your spouse or partner',
      description: 'Add the person you share your life with so the app can assess your relationship.',
      action: !hasSpouse ? { label: 'ADD', href: '/dashboard' } : null,
      complete: hasSpouse,
    });

    // Observe spouse
    const spousePerson = roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson;
    const hasSpouseObservation = spousePerson ? !peopleNeedingContributions.some((p) => p.personId === spousePerson.personId) : false;
    result.push({
      id: 'observe-spouse',
      tier: 1,
      title: 'Share your observations about your spouse',
      description: 'You see things about them they can\'t see themselves. Your perspective is half the picture.',
      action: spousePerson ? { label: 'CONTRIBUTE', href: `/people/${spousePerson.personId}/manual/onboard` } : null,
      complete: hasSpouseObservation,
      domain: 'couple',
      perspective: 'self',
    });

    // Invite spouse
    const spouseHasAccount = spousePerson?.linkedUserId;
    result.push({
      id: 'invite-spouse',
      tier: 1,
      title: 'Invite your spouse to contribute their perspective',
      description: 'They log in with their own account and answer questions — about themselves AND about you.',
      action: !spouseHasAccount ? { label: 'INVITE', href: '/settings' } : null,
      complete: !!spouseHasAccount,
      domain: 'couple',
      perspective: 'spouse',
    });

    // Add children
    const children = roles.filter((r) => r.otherPerson.relationshipType === 'child');
    result.push({
      id: 'add-children',
      tier: 1,
      title: 'Add your children',
      description: 'Add each child (age 8+) so their perspective can inform the parental domain.',
      action: { label: 'ADD', href: '/dashboard' },
      complete: children.length > 0,
      domain: 'parent_child',
    });

    // Kid sessions
    if (children.length > 0) {
      for (const child of children) {
        const hasKidSession = !peopleNeedingContributions.some((p) => p.personId === child.otherPerson.personId);
        result.push({
          id: `kid-session-${child.otherPerson.personId}`,
          tier: 1,
          title: `Run a kid session with ${child.otherPerson.name}`,
          description: 'A parent-supervised emoji-based session where your child shares how they see things.',
          action: { label: 'START SESSION', href: `/people/${child.otherPerson.personId}/manual/kid-session` },
          complete: hasKidSession,
          domain: 'parent_child',
          perspective: 'kids',
        });
      }
    }

    // ===== TIER 2: Data Quality =====

    // Run initial analysis
    const hasAssessments = assessments.length > 0;
    result.push({
      id: 'run-analysis',
      tier: 2,
      title: 'Run AI analysis',
      description: 'The AI scores all 20 dimensions across your relationships and identifies strengths and gaps.',
      action: hasAssessments ? null : { label: 'ANALYZE', href: '/dashboard' },
      complete: hasAssessments,
    });

    // Check for low-confidence dimensions
    if (health) {
      for (const ds of health.domainScores) {
        const lowConf = ds.dimensionScores.filter((d) => d.confidence === 'low');
        if (lowConf.length > 0) {
          result.push({
            id: `quality-${ds.domain}`,
            tier: 2,
            title: `Improve data quality for ${ds.domain === 'self' ? 'Self' : ds.domain === 'couple' ? 'Spouse' : 'Parent'} domain`,
            description: `${lowConf.length} dimension${lowConf.length > 1 ? 's' : ''} have low confidence. Answer follow-up questions to sharpen the scores.`,
            action: null, // TODO: link to targeted assessment prompts
            complete: false,
            domain: ds.domain,
          });
        }
      }

      // Check for missing perspective zones
      for (const ds of health.domainScores) {
        for (const zone of ds.perspectiveZones) {
          if (zone.score === 0) {
            const domainLabel = ds.domain === 'self' ? 'Self' : ds.domain === 'couple' ? 'Spouse' : 'Parent';
            result.push({
              id: `perspective-${ds.domain}-${zone.perspective}`,
              tier: 2,
              title: `Get ${zone.perspective} perspective for ${domainLabel} domain`,
              description: `The ${zone.perspective} perspective is missing for the ${domainLabel.toLowerCase()} domain. This zone is currently empty.`,
              action: zone.perspective === 'self' && selfPerson
                ? { label: 'ASSESS', href: `/people/${selfPerson.personId}/manual/self-onboard` }
                : zone.perspective === 'spouse' && spousePerson
                  ? { label: 'CONTRIBUTE', href: `/people/${spousePerson.personId}/manual/onboard` }
                  : zone.perspective === 'kids' && children.length > 0
                    ? { label: 'KID SESSION', href: `/people/${children[0].otherPerson.personId}/manual/kid-session` }
                    : null,
              complete: false,
              domain: ds.domain,
              perspective: zone.perspective,
            });
          }
        }
      }
    }

    // ===== TIER 3: Action Readiness =====

    const hasActiveArc = roles.some((r) => r.activeArc);
    result.push({
      id: 'first-arc',
      tier: 3,
      title: 'Start your first Growth Arc',
      description: 'A structured 2-3 week course targeting your weakest dimension with daily micro-practices.',
      action: hasAssessments && !hasActiveArc ? { label: 'START ARC', href: '/dashboard' } : null,
      complete: hasActiveArc,
    });

    result.push({
      id: 'feedback-loop',
      tier: 3,
      title: 'Complete growth items to build the feedback loop',
      description: 'As you complete actions and rate their impact, the AI learns what works for you and prescribes better.',
      action: null,
      complete: false, // ongoing
    });

    return result;
  }, [selfPerson, hasSelfContribution, spouse, roles, assessments, health, peopleNeedingContributions]);

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

  const tierLabels = {
    1: { title: 'DATA COVERAGE', subtitle: 'Fill the empty zones', color: '#d97706' },
    2: { title: 'DATA QUALITY', subtitle: 'Sharpen the scores', color: '#65a30d' },
    3: { title: 'ACTION READINESS', subtitle: 'Unlock the Evolve loop', color: '#16a34a' },
  };

  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <MainLayout>
      <div
        className="min-h-screen p-4 sm:p-6 lg:p-8"
        style={{ background: 'linear-gradient(145deg, #1a1a1a, #111)' }}
      >
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <h1
            className="font-mono font-bold text-xl"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Road Map to Balance
          </h1>
          <p
            className="font-mono text-[11px] mt-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {completedCount} of {totalCount} steps complete
          </p>

          {/* Progress bar */}
          <div
            className="mt-3 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #d97706, #16a34a)',
              }}
            />
          </div>
        </div>

        {/* Steps by tier */}
        <div className="max-w-3xl mx-auto space-y-8">
          {([1, 2, 3] as const).map((tier) => {
            const tierSteps = steps.filter((s) => s.tier === tier);
            if (tierSteps.length === 0) return null;
            const tierInfo = tierLabels[tier];
            const tierComplete = tierSteps.every((s) => s.complete);

            return (
              <div key={tier}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
                    style={{
                      background: tierComplete ? `${tierInfo.color}30` : 'rgba(255,255,255,0.05)',
                      color: tierComplete ? tierInfo.color : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${tierComplete ? tierInfo.color : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {tier}
                  </div>
                  <div>
                    <span
                      className="font-mono text-[10px] font-bold tracking-widest"
                      style={{ color: tierInfo.color }}
                    >
                      {tierInfo.title}
                    </span>
                    <span
                      className="font-mono text-[10px] ml-2"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {tierInfo.subtitle}
                    </span>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2 ml-3 border-l border-white/10 pl-6">
                  {tierSteps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-lg p-4 transition-all"
                      style={{
                        background: step.complete ? 'rgba(22,163,74,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${step.complete ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-[12px] font-bold"
                              style={{
                                color: step.complete ? 'rgba(22,163,74,0.7)' : 'rgba(255,255,255,0.75)',
                                textDecoration: step.complete ? 'line-through' : 'none',
                              }}
                            >
                              {step.complete ? '✓ ' : ''}{step.title}
                            </span>
                          </div>
                          <p
                            className="font-mono text-[11px] mt-1 leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                          >
                            {step.description}
                          </p>
                        </div>

                        {!step.complete && step.action && (
                          <Link
                            href={step.action.href}
                            className="font-mono text-[10px] font-bold px-3 py-1.5 rounded shrink-0 transition-all hover:scale-105"
                            style={{
                              color: '#d97706',
                              border: '1px solid rgba(217,119,6,0.3)',
                              background: 'rgba(217,119,6,0.1)',
                            }}
                          >
                            {step.action.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
