'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useRingScores } from '@/hooks/useRingScores';
import { useProgression } from '@/hooks/useProgression';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import ThreeRingDiagram from '@/components/dashboard/ThreeRingDiagram';
import TrajectoryCompass from '@/components/dashboard/TrajectoryCompass';
import PerspectiveStatusLights from '@/components/dashboard/PerspectiveStatusLights';
import EventInjectionModal from '@/components/dashboard/EventInjectionModal';
import PortraitInventory from '@/components/dashboard/PortraitInventory';
import HarmonyExplainer from '@/components/dashboard/HarmonyExplainer';
import { getDimension } from '@/config/relationship-dimensions';
import { scoreToColor } from '@/lib/scoring-engine';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    hasSelfContribution,
    roles,
    spouse,
    assessments,
    peopleNeedingContributions,
    contributions,
  } = useDashboard();
  const {
    activeItems,
    submitFeedback,
    seedAssessments,
    generateArc,
    generateBatch,
    processAcuteEvent,
    generating,
  } = useGrowthFeed();
  const {
    domainProgressions,
    overallStage,
    overallDisplay,
    seedProgressions,
  } = useProgression();
  const { health } = useRingScores(assessments);
  const { addPerson, people } = usePerson();

  // Inline add-person form state
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'spouse' | 'child'>('spouse');
  const [adding, setAdding] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Auto-show explainer on first visit to active state
  useEffect(() => {
    if (state === 'active') {
      const seen = localStorage.getItem('relish-explainer-seen');
      if (!seen) {
        setShowExplainer(true);
        localStorage.setItem('relish-explainer-seen', '1');
      }
    }
  }, [state]);

  // Compute what next steps the user should take
  const nextSteps = useMemo(() => {
    if (state !== 'active' || !health) return null;

    const hasAnyArc = roles.some((r) => r.activeArc);
    const hasGrowthItems = (activeItems?.length || 0) > 0;
    const hasChildren = roles.some((r) => r.otherPerson.relationshipType === 'child');
    const hasSpouse = roles.some((r) => r.otherPerson.relationshipType === 'spouse');

    // Find weakest domain
    const scoredDomains = health.domainScores.filter((d) => d.score > 0);
    const weakest = scoredDomains.length > 0
      ? scoredDomains.reduce((min, d) => d.score < min.score ? d : min)
      : null;
    const weakestLabel = weakest?.domain === 'self' ? 'Self' : weakest?.domain === 'couple' ? 'Spouse' : 'Parent';

    // Find missing perspectives (empty zones)
    const missingPerspectives: string[] = [];
    for (const ds of health.domainScores) {
      for (const zone of ds.perspectiveZones) {
        if (zone.score === 0) {
          const domainLabel = ds.domain === 'self' ? 'Self' : ds.domain === 'couple' ? 'Spouse' : 'Parent';
          const perspLabel = zone.perspective === 'self' ? 'self' : zone.perspective === 'spouse' ? 'spouse' : 'kids';
          missingPerspectives.push(`${perspLabel} view of ${domainLabel}`);
        }
      }
    }

    const steps: { icon: string; text: string; action?: string; href?: string; onClick?: () => void }[] = [];

    // Priority 1: Start a growth arc if none exist
    if (!hasAnyArc) {
      steps.push({
        icon: '🌱',
        text: weakest
          ? `Your ${weakestLabel} domain scored ${weakest.score.toFixed(1)} — start a Growth Arc to strengthen it`
          : 'Start a Growth Arc to begin working on your lowest-scoring dimension',
        action: 'START GROWTH ARC',
        onClick: () => generateArc(),
      });
    }

    // Priority 2: Generate growth items if arc exists but no items
    if (hasAnyArc && !hasGrowthItems) {
      steps.push({
        icon: '⚡',
        text: 'Your Growth Arc is set. Generate this week\'s activities to start making progress.',
        action: 'GENERATE ACTIONS',
        onClick: () => generateBatch(),
      });
    }

    // Priority 3: Add missing family members
    if (!hasChildren) {
      steps.push({
        icon: '👶',
        text: 'Add your children to unlock the Parent ring and get a complete picture',
      });
    }
    if (!hasSpouse) {
      steps.push({
        icon: '💑',
        text: 'Add your spouse/partner to unlock the Couple ring',
      });
    }

    // Priority 4: List missing perspectives
    if (missingPerspectives.length > 0 && missingPerspectives.length <= 6) {
      steps.push({
        icon: '👁',
        text: `Missing perspectives: ${missingPerspectives.join(', ')} — more perspectives means sharper scores`,
      });
    }

    // Priority 5: Synthesize manuals if not done
    if (selfPerson) {
      steps.push({
        icon: '📖',
        text: 'Visit your manual to synthesize perspectives and see where self-view and others\' views align or differ',
        action: 'VIEW MANUAL',
        href: `/people/${selfPerson.personId}/manual`,
      });
    }

    return steps.length > 0 ? steps : null;
  }, [state, health, roles, activeItems, selfPerson, generateArc, generateBatch]);

  const isDemo = useMemo(() => {
    if (user?.isDemo) return true;
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('demo') === 'true';
    return false;
  }, [user?.isDemo]);
  const demoQ = isDemo ? '?demo=true' : '';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Compute summary nudge for the active dashboard (must be before early returns)
  const dashboardSummary = useMemo(() => {
    if (state !== 'active') return null;

    const hasChildren = roles.some((r) => r.otherPerson.relationshipType === 'child');

    // Count portrait gaps
    let portraitGaps = 0;
    if (!hasSelfContribution) portraitGaps++;
    portraitGaps += peopleNeedingContributions.length;

    // Count active growth items
    const growthItemCount = activeItems?.length || 0;

    // Build the nudge message
    const parts: string[] = [];
    if (!hasChildren) {
      parts.push('Add your children to unlock the parent ring');
    } else if (portraitGaps > 0) {
      parts.push(`${portraitGaps} portrait${portraitGaps !== 1 ? 's' : ''} to complete`);
    }
    if (growthItemCount > 0) {
      parts.push(`${growthItemCount} activit${growthItemCount !== 1 ? 'ies' : 'y'} this week`);
    }

    if (parts.length === 0) return null;

    return {
      message: parts.join(' · '),
      showAddChild: !hasChildren,
      portraitGaps,
      growthItemCount,
    };
  }, [state, roles, hasSelfContribution, peopleNeedingContributions, activeItems]);

  if (authLoading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="manual-spinner"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING...</p>
        </div>
        <style jsx>{`
          .manual-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #1e293b;
            border-top-color: #d97706;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  const userName = selfPerson?.name || user.name || 'there';
  const activeArcCount = roles.filter((r) => r.activeArc).length;
  const todayItemCount = roles.reduce((sum, r) => sum + r.todayItems.length, 0);

  // Compute step numbers for onboarding
  const totalSteps = 4;
  const currentStep =
    state === 'new_user' ? 1 :
    state === 'self_complete' ? 2 :
    state === 'has_people' ? 3 :
    state === 'has_contributions' ? 4 : 0;

  const handleAddPerson = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const personId = await addPerson({
        name: addName.trim(),
        relationshipType: addType,
        canSelfContribute: addType === 'spouse',
      });
      setAddName('');
      // Auto-create manual for the new person
      router.push(`/people/${personId}/create-manual${demoQ}`);
    } catch (err) {
      console.error('Failed to add person:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      await seedAssessments();
      await seedProgressions();
      await generateArc();
      await generateBatch();
    } catch (err) {
      console.error('Failed to analyze:', err);
    }
  };

  return (
    <MainLayout>
      {isDemo && (
        <div className="px-4 sm:px-6 pt-3">
          <div
            className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-[11px]"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <span style={{ color: '#A3510B', fontWeight: 700 }}>DEMO</span>
            <span style={{ color: '#6B6B6B' }}>
              Logged in as <strong style={{ color: '#2C2C2C' }}>{user?.name}</strong>
              {' · '}State: <strong style={{ color: '#2C2C2C' }}>{state}</strong>
              {selfPerson && <> · Self: <strong style={{ color: '#2C2C2C' }}>{selfPerson.name}</strong></>}
              {spouse && <> · Spouse: <strong style={{ color: '#2C2C2C' }}>{spouse.name}</strong></>}
            </span>
          </div>
        </div>
      )}
      <div className={state === 'active' ? '' : 'max-w-5xl mx-auto px-4 sm:px-6 py-8'}>

        {/* Header (onboarding states only) */}
        {state !== 'active' && (
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-mono font-bold text-2xl text-slate-800">
                {`Welcome, ${userName}`}
              </h1>
              <p className="font-mono text-sm text-slate-500 mt-1">
                Let&apos;s set up your relationship health dashboard
              </p>
            </div>
          </div>
        </header>
        )}


        {/* ===== ONBOARDING CARDS ===== */}

        {/* Step 1: Complete your manual */}
        {state === 'new_user' && selfPerson && (
          <div className="border-2 border-slate-800 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <div className="font-mono text-[10px] text-slate-400 mb-3">
              STEP {currentStep} OF {totalSteps}
            </div>
            <h2 className="font-mono font-bold text-lg text-slate-900 mb-2">
              Complete Your Manual
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6 leading-relaxed">
              Tell us about yourself — how you handle stress, what you need from people,
              how you communicate. This is the foundation everything else builds on.
            </p>
            <Link
              href={`/people/${selfPerson.personId}/manual/self-onboard${demoQ}`}
              className="inline-block px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all"
            >
              ANSWER QUESTIONS &rarr;
            </Link>
          </div>
        )}

        {/* Step 2: Add your spouse (or first person) */}
        {state === 'self_complete' && (
          <div className="border-2 border-slate-800 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <div className="font-mono text-[10px] text-slate-400 mb-3">
              STEP {currentStep} OF {totalSteps}
            </div>
            <h2 className="font-mono font-bold text-lg text-slate-900 mb-2">
              Add the people in your life
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-4 leading-relaxed">
              Who do you want to understand better? Start with your spouse or partner.
            </p>

            {/* Inline add form */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                  className="font-mono text-sm border-2 border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="spouse">Spouse/Partner</option>
                  <option value="child">Child</option>
                </select>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Their name"
                  className="flex-1 font-mono text-sm border-2 border-slate-300 px-3 py-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
                <button
                  onClick={handleAddPerson}
                  disabled={adding || !addName.trim()}
                  className="px-4 py-2 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
                >
                  {adding ? '...' : 'ADD'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Share what you know about them */}
        {state === 'has_people' && peopleNeedingContributions.length > 0 && (
          <div className="border-2 border-slate-800 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <div className="font-mono text-[10px] text-slate-400 mb-3">
              STEP {currentStep} OF {totalSteps}
            </div>
            <h2 className="font-mono font-bold text-lg text-slate-900 mb-2">
              Share what you know about {peopleNeedingContributions[0].name}
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6 leading-relaxed">
              You know {peopleNeedingContributions[0].name} from a perspective they can&apos;t see themselves.
              Your observations are the other half of the picture.
            </p>
            <Link
              href={`/people/${peopleNeedingContributions[0].personId}/manual/onboard${demoQ}`}
              className="inline-block px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all"
            >
              ANSWER ABOUT {peopleNeedingContributions[0].name.toUpperCase()} &rarr;
            </Link>
            {peopleNeedingContributions.length > 1 && (
              <p className="font-mono text-[10px] text-slate-400 mt-3">
                +{peopleNeedingContributions.length - 1} more {peopleNeedingContributions.length === 2 ? 'person' : 'people'} after this
              </p>
            )}
          </div>
        )}

        {/* Step 4: Analyze & start growing */}
        {state === 'has_contributions' && (
          <div className="border-2 border-slate-800 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <div className="font-mono text-[10px] text-slate-400 mb-3">
              STEP {currentStep} OF {totalSteps}
            </div>
            <h2 className="font-mono font-bold text-lg text-slate-900 mb-2">
              See your relationship health
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-4 leading-relaxed">
              We&apos;ll assess your relationships across 20 research-backed dimensions
              and build your first Growth Arc — a structured plan targeting your
              biggest opportunity.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={generating}
              className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'ANALYZING...' : 'ANALYZE & START GROWING'}
            </button>
            <p className="font-mono text-[9px] text-slate-400 mt-3">
              Based on Gottman, Johnson (EFT), Attachment Theory, Baumrind, and Siegel
            </p>
          </div>
        )}

        {/* ===== ACTIVE STATE: THREE-RING DASHBOARD ===== */}

        {state === 'active' && health && (
          <div
            className="min-h-screen p-4 sm:p-6"
          >
            {/* Dashboard header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1
                  className="font-mono font-bold text-lg"
                  style={{ color: '#2C2C2C' }}
                >
                  {userName}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: scoreToColor(health.score) }}>
                    {health.score.toFixed(1)}
                  </span>
                  {overallDisplay && (
                    <span
                      className="font-mono text-[10px] font-bold tracking-wider"
                      style={{ color: overallDisplay.color }}
                    >
                      {overallDisplay.emoji} {overallDisplay.label}
                    </span>
                  )}
                  {activeArcCount > 0 && (
                    <span className="font-mono text-[10px] tracking-wider" style={{ color: '#6B6B6B' }}>
                      {activeArcCount} ARC{activeArcCount !== 1 ? 'S' : ''}
                    </span>
                  )}
                  {selfPerson && (
                    <Link
                      href={`/people/${selfPerson.personId}/manual`}
                      className="font-mono text-[10px] tracking-wider transition-colors"
                      style={{ color: '#A3A3A3' }}
                    >
                      MY MANUAL &rarr;
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={generating}
                  className="font-mono text-[10px] font-bold tracking-wider px-3 py-1.5 rounded transition-all hover:scale-105 disabled:opacity-30"
                  style={{
                    color: '#6B6B6B',
                    border: '1px solid #E8E3DC',
                  }}
                >
                  {generating ? 'ANALYZING...' : '↻ RE-ANALYZE'}
                </button>
              <button
                onClick={() => setEventModalOpen(true)}
                className="font-mono text-[10px] font-bold tracking-wider px-3 py-1.5 rounded transition-all hover:scale-105"
                style={{
                  color: '#d97706',
                  border: '1px solid rgba(217,119,6,0.4)',
                  background: 'rgba(217,119,6,0.08)',
                }}
              >
                🚨 SOMETHING HAPPENED
              </button>
              </div>
            </div>

            {/* Orientation */}
            <div
              className="rounded-lg px-5 py-4 mb-4 flex items-start justify-between"
              style={{ background: '#FAF8F5', border: '1px solid #E8E3DC' }}
            >
              <div className="flex-1">
                <h2 className="font-mono text-[13px] font-bold" style={{ color: '#2C2C2C' }}>
                  Your Portrait
                </h2>
                <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: '#6B6B6B' }}>
                  This is your relationship portrait — a living picture of how you&apos;re doing
                  across every role, shaped by the people who know you best. Tap the
                  {' '}<span style={{ color: '#d97706', fontWeight: 600 }}>?</span> to take a quick walkthrough.
                </p>
              </div>
              <button
                onClick={() => setShowExplainer(true)}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mono text-[12px] font-bold transition-all hover:scale-110 ml-3"
                style={{
                  color: '#6B6B6B',
                  border: '2px solid #E8E3DC',
                  background: '#FFFFFF',
                }}
                title="How does the harmony wheel work?"
              >
                ?
              </button>
            </div>

            {/* Centerpiece: Three Ring Diagram */}
            <div ref={diagramRef} className="relative">
              <ThreeRingDiagram
                health={health}
                onZoneClick={showExplainer ? undefined : (domain, perspective) => {
                  const domainScore = health.domainScores.find((d) => d.domain === domain);
                  const zone = domainScore?.perspectiveZones.find((z) => z.perspective === perspective);
                  const hasData = zone && zone.score > 0;

                  const targetPerson = domain === 'self'
                    ? selfPerson
                    : domain === 'couple'
                      ? (roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson
                         || people.find((p) => p.relationshipType === 'spouse'))
                      : (roles.find((r) => r.otherPerson.relationshipType === 'child')?.otherPerson
                         || people.find((p) => p.relationshipType === 'child'));

                  // Zones with data → go to manual view
                  if (hasData && targetPerson) {
                    router.push(`/people/${targetPerson.personId}/manual`);
                    return;
                  }

                  if (!targetPerson) return;

                  // Empty zones — only navigate if the current user can fill them
                  // Spouse perspective zones need the spouse to log in — current user can't act
                  if (perspective === 'spouse') return;

                  if (perspective === 'kids') {
                    // All "kids" perspective zones = kid observes a family member
                    // Find the first child to use as the observer
                    const kidPerson = roles.find((r) => r.otherPerson.relationshipType === 'child')?.otherPerson
                      || people.find((p) => p.relationshipType === 'child');
                    if (!kidPerson) return;

                    // The subject being observed depends on the domain:
                    // - Self domain: kid observes you (Bob)
                    // - Couple domain: kid observes your spouse
                    // - Parent domain: kid observes you as a parent (Bob)
                    const observedPerson = domain === 'couple'
                      ? (roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson
                         || people.find((p) => p.relationshipType === 'spouse'))
                      : selfPerson; // Self and parent_child domains = kid observes you

                    if (!observedPerson) return;

                    router.push(`/people/${observedPerson.personId}/manual/kid-observer-session${demoQ ? demoQ + '&' : '?'}observer=${kidPerson.personId}`);
                    return;
                  }

                  if (domain === 'self') {
                    router.push(`/people/${targetPerson.personId}/manual/self-onboard${demoQ}`);
                  } else {
                    // Couple or parent_child with self perspective = your observations
                    router.push(`/people/${targetPerson.personId}/manual/onboard${demoQ}`);
                  }
                }}
              />

              {/* Explainer overlay — positioned on top of the actual diagram */}
              {showExplainer && (
                <HarmonyExplainer
                  onClose={() => setShowExplainer(false)}
                  diagramRef={diagramRef}
                />
              )}
            </div>

            {/* Domain scores row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {health.domainScores.map((ds) => (
                <div
                  key={ds.domain}
                  className="rounded-lg p-3 text-center"
                  style={{
                    background: '#FFFFFF',
                    border: '2px solid #E8E3DC',
                    boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.15)',
                  }}
                >
                  <div
                    className="font-mono text-[9px] font-bold tracking-widest mb-1"
                    style={{ color: '#6B6B6B' }}
                  >
                    {ds.domain === 'self' ? 'SELF' : ds.domain === 'couple' ? 'SPOUSE' : 'PARENT'}
                  </div>
                  <div
                    className="font-mono text-xl font-bold"
                    style={{ color: ds.score > 0 ? scoreToColor(ds.score) : '#D4D4D4' }}
                  >
                    {ds.score > 0 ? ds.score.toFixed(1) : '—'}
                  </div>
                  {/* Mini dimension bars */}
                  <div className="flex gap-0.5 mt-2 justify-center">
                    {ds.dimensionScores.map((dim, i) => (
                      <div
                        key={`${dim.dimensionId}-${i}`}
                        className="w-1.5 rounded-full"
                        style={{
                          height: `${Math.max(4, (dim.score / 5) * 24)}px`,
                          background: scoreToColor(dim.score),
                          opacity: 0.7,
                        }}
                        title={`${getDimension(dim.dimensionId)?.name}: ${dim.score.toFixed(1)}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Portrait Inventory */}
            <div className="mt-4">
              <PortraitInventory
                selfPerson={selfPerson}
                hasSelfContribution={hasSelfContribution}
                roles={roles}
                contributions={contributions}
                userId={user?.userId || ''}
                demoQ={demoQ}
                activeGrowthItems={activeItems}
                onReactToItem={(itemId, reaction) => submitFeedback(itemId, reaction as any)}
              />
            </div>

            {/* What's Next guidance */}
            {nextSteps && nextSteps.length > 0 && (
              <div
                className="mt-4 rounded-lg overflow-hidden"
                style={{ background: '#FFFFFF', border: '2px solid #E8E3DC' }}
              >
                <div
                  className="px-5 py-2.5 flex items-center gap-2"
                  style={{ background: '#FAF8F5', borderBottom: '1px solid #E8E3DC' }}
                >
                  <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#6B6B6B' }}>
                    WHAT&apos;S NEXT
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: '#F0EBE4' }}>
                  {nextSteps.slice(0, 3).map((step, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-sm flex-shrink-0 mt-0.5">{step.icon}</span>
                        <span
                          className="font-mono text-[11px] leading-relaxed"
                          style={{ color: '#4A4A4A' }}
                        >
                          {step.text}
                        </span>
                      </div>
                      {step.action && (step.onClick || step.href) && (
                        step.href ? (
                          <Link
                            href={step.href}
                            className="flex-shrink-0 font-mono text-[9px] font-bold tracking-wider px-3 py-1.5 rounded transition-all hover:scale-105"
                            style={{
                              color: '#d97706',
                              border: '1px solid rgba(217,119,6,0.3)',
                              background: 'rgba(217,119,6,0.08)',
                            }}
                          >
                            {step.action}
                          </Link>
                        ) : (
                          <button
                            onClick={step.onClick}
                            disabled={generating}
                            className="flex-shrink-0 font-mono text-[9px] font-bold tracking-wider px-3 py-1.5 rounded transition-all hover:scale-105 disabled:opacity-30"
                            style={{
                              color: '#d97706',
                              border: '1px solid rgba(217,119,6,0.3)',
                              background: 'rgba(217,119,6,0.08)',
                            }}
                          >
                            {generating ? '...' : step.action}
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary nudge */}
            {dashboardSummary && (
              <div
                className="mt-4 rounded-xl px-5 py-3 flex items-center justify-between"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8E3DC',
                }}
              >
                <div className="flex items-center gap-3">
                  {dashboardSummary.showAddChild ? (
                    <button
                      onClick={() => {
                        setAddType('child');
                        document.getElementById('add-person-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="font-mono text-[10px] font-bold px-3 py-1.5 rounded transition-all hover:scale-105"
                      style={{
                        color: '#d97706',
                        border: '1px solid rgba(217,119,6,0.3)',
                        background: 'rgba(217,119,6,0.08)',
                      }}
                    >
                      + ADD CHILD
                    </button>
                  ) : null}
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: '#6B6B6B' }}
                  >
                    {dashboardSummary.message}
                  </span>
                </div>
                <Link
                  href={`/roadmap${demoQ}`}
                  className="font-mono text-[10px] tracking-wider transition-colors flex-shrink-0"
                  style={{ color: '#A3A3A3' }}
                >
                  Full roadmap &rarr;
                </Link>
              </div>
            )}

            {/* Instruments row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <TrajectoryCompass
                trend={health.trend}
                primaryDimension={
                  roles.find((r) => r.activeArc)?.activeArc?.dimensionName
                }
              />
              <PerspectiveStatusLights
                selfActive={assessments.some((a) => a.domain === 'self')}
                spouseActive={assessments.some((a) => a.domain === 'couple')}
                kidsActive={assessments.some((a) => a.domain === 'parent_child')}
                selfCount={assessments.filter((a) => a.domain === 'self').length}
                spouseCount={assessments.filter((a) => a.domain === 'couple').length}
                kidsCount={assessments.filter((a) => a.domain === 'parent_child').length}
              />
            </div>

            {/* Bottom actions */}
            <div id="add-person-form" className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid #E8E3DC' }}>
              {/* Add person */}
              <div className="flex gap-2">
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                  className="font-mono text-[10px] rounded px-2 py-1"
                  style={{
                    background: '#FFFFFF',
                    color: '#6B6B6B',
                    border: '1px solid #E8E3DC',
                  }}
                >
                  <option value="child">Child</option>
                  <option value="spouse">Spouse</option>
                </select>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name"
                  className="font-mono text-[10px] rounded px-2 py-1 w-24"
                  style={{
                    background: '#FFFFFF',
                    color: '#2C2C2C',
                    border: '1px solid #E8E3DC',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
                <button
                  onClick={handleAddPerson}
                  disabled={adding || !addName.trim()}
                  className="font-mono text-[10px] font-bold rounded px-3 py-1 transition-all disabled:opacity-30"
                  style={{
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.4)',
                  }}
                >
                  + ADD
                </button>
              </div>

              {/* Generate arc */}
              {activeArcCount === 0 && roles.length > 0 && (
                <button
                  onClick={() => generateArc()}
                  disabled={generating}
                  className="font-mono text-[10px] font-bold tracking-wider px-4 py-2 rounded transition-all disabled:opacity-30"
                  style={{
                    background: 'rgba(217,119,6,0.1)',
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.5)',
                    boxShadow: '2px 2px 0px 0px rgba(217,119,6,0.4)',
                  }}
                >
                  {generating ? 'GENERATING...' : 'START GROWTH ARC'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Event injection modal */}
        <EventInjectionModal
          open={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          onSubmit={async (text) => {
            await processAcuteEvent(text);
          }}
        />

      </div>
    </MainLayout>
  );
}
