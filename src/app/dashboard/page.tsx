'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import RoleCard from '@/components/growth/RoleCard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    roles,
    spouse,
    peopleNeedingContributions,
  } = useDashboard();
  const {
    submitFeedback,
    seedAssessments,
    generateArc,
    generating,
  } = useGrowthFeed();
  const { addPerson } = usePerson();

  // Inline add-person form state
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'spouse' | 'child'>('spouse');
  const [adding, setAdding] = useState(false);

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
    } catch (err) {
      console.error('Failed to analyze:', err);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-mono font-bold text-2xl text-slate-800">
                {state === 'active' ? userName : `Welcome, ${userName}`}
              </h1>
              {state === 'active' ? (
                <p className="font-mono text-sm text-slate-500 mt-1">
                  Your roles &middot; your growth
                </p>
              ) : (
                <p className="font-mono text-sm text-slate-500 mt-1">
                  Let&apos;s set up your relationship health dashboard
                </p>
              )}
            </div>
            {selfPerson && state === 'active' && (
              <Link
                href={`/people/${selfPerson.personId}/manual`}
                className="font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 px-3 py-1.5 hover:border-slate-400"
              >
                MY MANUAL &rarr;
              </Link>
            )}
          </div>

          {/* Status line (active state only) */}
          {state === 'active' && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-200">
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                {roles.length} ROLE{roles.length !== 1 ? 'S' : ''}
              </span>
              {activeArcCount > 0 && (
                <span className="font-mono text-[10px] text-slate-800 font-bold uppercase tracking-wider">
                  {activeArcCount} ARC{activeArcCount !== 1 ? 'S' : ''} ACTIVE
                </span>
              )}
              {todayItemCount > 0 && (
                <span className="font-mono text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                  {todayItemCount} TO DO TODAY
                </span>
              )}
            </div>
          )}
        </header>

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
              We&apos;ll assess your relationships across 15 research-backed dimensions
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

        {/* ===== ACTIVE STATE: ROLE CARDS ===== */}

        {state === 'active' && (
          <div className="space-y-6">
            {roles.map((role) => (
              <RoleCard
                key={`${role.roleLabel}-${role.otherPerson.personId}`}
                role={role}
                onFeedback={submitFeedback}
              />
            ))}

            {/* Add another person card */}
            <div className="border border-dashed border-slate-300 p-5 text-center">
              <div className="space-y-3">
                <p className="font-mono text-xs text-slate-400">
                  + Add another person
                </p>
                <div className="flex gap-2 justify-center max-w-sm mx-auto">
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                    className="font-mono text-xs border border-slate-300 px-2 py-1.5 bg-white"
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                  </select>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 font-mono text-xs border border-slate-300 px-2 py-1.5"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                  />
                  <button
                    onClick={handleAddPerson}
                    disabled={adding || !addName.trim()}
                    className="px-3 py-1.5 bg-slate-800 text-white font-mono text-xs hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    ADD
                  </button>
                </div>
              </div>
            </div>

            {/* Start next arc button (when no active arcs) */}
            {activeArcCount === 0 && roles.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => generateArc()}
                  disabled={generating}
                  className="px-6 py-3 border-2 border-slate-800 bg-white text-slate-800 font-mono font-bold hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
                >
                  {generating ? 'GENERATING...' : 'START NEXT GROWTH ARC'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
