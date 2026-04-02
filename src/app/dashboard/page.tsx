'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useRingScores } from '@/hooks/useRingScores';
import { useProgression } from '@/hooks/useProgression';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import { FamilyClimate } from '@/components/dashboard/FamilyClimate';
import { RelationshipCard } from '@/components/dashboard/RelationshipCard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    hasSelfContribution,
    roles,
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
    generating,
  } = useGrowthFeed();
  const { seedProgressions } = useProgression();
  const { health } = useRingScores(assessments);
  const { addPerson } = usePerson();

  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<'spouse' | 'child'>('spouse');
  const [adding, setAdding] = useState(false);

  const isDemo = useMemo(() => {
    if (user?.isDemo) return true;
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('demo') === 'true';
    return false;
  }, [user?.isDemo]);
  const demoQ = isDemo ? '?demo=true' : '';

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

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

  if (authLoading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--parent-bg)' }}>
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--parent-primary)' }} />
      </div>
    );
  }

  if (!user) return null;

  const userName = selfPerson?.name || user.name || 'there';

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Demo banner */}
        {isDemo && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs"
            style={{
              fontFamily: 'var(--font-parent-body)',
              background: 'rgba(217,119,6,0.06)',
              border: '1px solid rgba(217,119,6,0.15)',
              color: 'var(--parent-text-light)',
            }}
          >
            <span className="font-bold" style={{ color: '#A3510B' }}>DEMO</span>
            <span>{state}</span>
          </div>
        )}

        {/* Family Climate — always shown */}
        <FamilyClimate
          health={health}
          dashboardState={state}
          userName={userName}
          roles={roles}
        />

        {/* ===== ONBOARDING STATES ===== */}

        {state === 'new_user' && selfPerson && (
          <OnboardingCard
            title="Tell us about yourself"
            body="How you handle stress, what you need from people, how you communicate. This is the foundation."
            ctaLabel="Answer questions"
            ctaHref={`/people/${selfPerson.personId}/manual/self-onboard${demoQ}`}
          />
        )}

        {state === 'self_complete' && (
          <div
            className="rounded-2xl bg-white p-6"
            style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
          >
            <h2
              className="text-base font-semibold mb-1"
              style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
            >
              Add the people in your life
            </h2>
            <p
              className="text-sm mb-4"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              Who do you want to understand better?
            </p>
            <div className="flex gap-2">
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                className="text-sm rounded-lg px-3 py-2.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-bg)',
                  color: 'var(--parent-text)',
                  border: '1px solid var(--parent-border)',
                }}
              >
                <option value="spouse">Spouse / Partner</option>
                <option value="child">Child</option>
              </select>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Their name"
                className="flex-1 text-sm rounded-lg px-3 py-2.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-bg)',
                  color: 'var(--parent-text)',
                  border: '1px solid var(--parent-border)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
              />
              <button
                onClick={handleAddPerson}
                disabled={adding || !addName.trim()}
                className="text-sm font-medium rounded-xl px-5 py-2.5 text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {state === 'has_people' && peopleNeedingContributions.map((person) => {
          const isChild = person.relationshipType === 'child';
          const href = isChild
            ? `/people/${person.personId}/manual/kid-session${demoQ}`
            : `/people/${person.personId}/manual/onboard${demoQ}`;
          return (
            <OnboardingCard
              key={person.personId}
              title={`Share what you know about ${person.name}`}
              body={`You know ${person.name} from a perspective they can\u2019t see themselves.`}
              ctaLabel={isChild ? 'Start portrait session' : `Tell us about ${person.name}`}
              ctaHref={href}
            />
          );
        })}

        {state === 'has_contributions' && (
          <OnboardingCard
            title="Ready to see the picture"
            body="We\u2019ll assess your relationships across 20 research-backed dimensions and build your first Growth Arc."
            ctaLabel={generating ? 'Analyzing...' : 'Analyze & start growing'}
            ctaOnClick={handleAnalyze}
            disabled={generating}
          />
        )}

        {/* ===== ACTIVE STATE: RELATIONSHIP CARDS ===== */}

        {state === 'active' && roles.map((role) => (
          <RelationshipCard
            key={role.otherPerson.personId}
            role={role}
            variant={role.domain === 'couple' ? 'spouse' : 'child'}
            demoQ={demoQ}
            onReact={(id, r) => submitFeedback(id, r as any)}
          />
        ))}

        {/* Footer links (active state) */}
        {state === 'active' && (
          <div className="flex items-center justify-between pt-2 pb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/people"
                className="text-xs transition-colors hover:underline"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
              >
                People
              </Link>
              {selfPerson && (
                <Link
                  href={`/people/${selfPerson.personId}/manual`}
                  className="text-xs transition-colors hover:underline"
                  style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
                >
                  My manual
                </Link>
              )}
              <Link
                href={`/roadmap${demoQ}`}
                className="text-xs transition-colors hover:underline"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
              >
                Roadmap
              </Link>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)',
              }}
            >
              {generating ? 'Analyzing...' : 'Re-analyze'}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ===== Simple Onboarding Card =====

function OnboardingCard({
  title,
  body,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  disabled,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      <h2
        className="text-base font-semibold mb-1"
        style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
      >
        {title}
      </h2>
      <p
        className="text-sm mb-4 leading-relaxed"
        style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
      >
        {body}
      </p>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
        >
          {ctaLabel}
        </Link>
      ) : ctaOnClick ? (
        <button
          onClick={ctaOnClick}
          disabled={disabled}
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
