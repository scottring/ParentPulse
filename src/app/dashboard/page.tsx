'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useRingScores } from '@/hooks/useRingScores';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import ThreeRingDiagram from '@/components/dashboard/ThreeRingDiagram';
import ActionCard from '@/components/dashboard/ActionCard';
import TrajectoryCompass from '@/components/dashboard/TrajectoryCompass';
import PerspectiveStatusLights from '@/components/dashboard/PerspectiveStatusLights';
import EventInjectionModal from '@/components/dashboard/EventInjectionModal';
import { getDimension } from '@/config/relationship-dimensions';
import { scoreToColor } from '@/lib/scoring-engine';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    roles,
    spouse,
    assessments,
    peopleNeedingContributions,
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
  const { health } = useRingScores(assessments);
  const { addPerson, people } = usePerson();

  // Inline add-person form state
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'spouse' | 'child'>('spouse');
  const [adding, setAdding] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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
      router.push(`/people/${personId}/create-manual`);
    } catch (err) {
      console.error('Failed to add person:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      await seedAssessments();
      await generateArc();
      await generateBatch();
    } catch (err) {
      console.error('Failed to analyze:', err);
    }
  };

  return (
    <MainLayout>
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
              href={`/people/${selfPerson.personId}/manual/self-onboard`}
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
              href={`/people/${peopleNeedingContributions[0].personId}/manual/onboard`}
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

            {/* Centerpiece: Three Ring Diagram */}
            <ThreeRingDiagram
              health={health}
              onZoneClick={(domain, perspective) => {
                const domainScore = health.domainScores.find((d) => d.domain === domain);
                const zone = domainScore?.perspectiveZones.find((z) => z.perspective === perspective);
                const hasData = zone && zone.score > 0;

                // Resolve which person this zone is about based on the domain
                const targetPerson = domain === 'self'
                  ? selfPerson
                  : domain === 'couple'
                    ? (roles.find((r) => r.otherPerson.relationshipType === 'spouse')?.otherPerson
                       || people.find((p) => p.relationshipType === 'spouse'))
                    : (roles.find((r) => r.otherPerson.relationshipType === 'child')?.otherPerson
                       || people.find((p) => p.relationshipType === 'child'));

                if (hasData && targetPerson) {
                  // Navigate to the person's manual
                  router.push(`/people/${targetPerson.personId}/manual`);
                  return;
                }

                // Empty zones → route to the right onboarding action
                if (!targetPerson) return;

                if (domain === 'self') {
                  router.push(`/people/${targetPerson.personId}/manual/self-onboard`);
                } else if (domain === 'couple') {
                  router.push(`/people/${targetPerson.personId}/manual/onboard`);
                } else {
                  router.push(`/people/${targetPerson.personId}/manual/kid-session`);
                }
              }}
            />

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

            {/* Instruments row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <TrajectoryCompass
                trend={health.trend}
                primaryDimension={
                  roles.find((r) => r.activeArc)?.activeArc?.dimensionName
                }
              />
              <ActionCard
                items={(activeItems || []).slice(0, 2)}
                onReact={(itemId, reaction) => submitFeedback(itemId, reaction as any)}
                onGenerate={generateBatch}
                generating={generating}
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
            <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Add person */}
              <div className="flex gap-2">
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                  className="font-mono text-[10px] rounded px-2 py-1"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
                <button
                  onClick={handleAddPerson}
                  disabled={adding || !addName.trim()}
                  className="font-mono text-[10px] font-bold rounded px-3 py-1 transition-all disabled:opacity-30"
                  style={{
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.3)',
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
                    background: 'rgba(217,119,6,0.15)',
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.3)',
                    boxShadow: '0 0 8px rgba(217,119,6,0.1)',
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
