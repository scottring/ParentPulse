'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useRingScores } from '@/hooks/useRingScores';
import { useProgression } from '@/hooks/useProgression';
import { usePerson } from '@/hooks/usePerson';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useFreshness } from '@/hooks/useFreshness';
import { useActionItems } from '@/hooks/useActionItems';
import { computeOneThing } from '@/lib/one-thing-engine';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { GrowthArc } from '@/types/growth-arc';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    state,
    selfPerson,
    hasSelfContribution,
    roles,
    assessments,
    people,
    manuals,
    peopleNeedingContributions,
    contributions,
  } = useDashboard();
  const {
    seedAssessments,
    generateArc,
    generateBatch,
    generating,
  } = useGrowthFeed();
  const { seedProgressions } = useProgression();
  const { health } = useRingScores(assessments);
  const { addPerson } = usePerson();
  const { activeChapters } = useWorkbook();

  const { familyCompleteness } = useFreshness({ people, manuals, contributions });
  const { items: actionItems } = useActionItems({
    people, manuals, contributions, assessments, userId: user?.userId || '',
  });

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

  const todayItems = useMemo(() => roles.flatMap((r) => r.todayItems), [roles]);
  const activeArcs = useMemo(
    () => roles.map((r) => r.activeArc).filter((a): a is GrowthArc => a !== null),
    [roles],
  );

  const oneThing = useMemo(
    () => computeOneThing({
      state, userId: user?.userId || '',
      userName: selfPerson?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there',
      selfPerson, people, manuals, contributions, assessments,
      roles, activeArcs, todayItems, hasSelfContribution,
    }),
    [state, user, selfPerson, people, manuals, contributions, assessments, roles, activeArcs, todayItems, hasSelfContribution],
  );

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
      router.push(`/reveal${demoQ}`);
    } catch (err) {
      console.error('Failed to analyze:', err);
    }
  };

  // Loading
  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--parent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;

  const userName = selfPerson?.name?.split(' ')[0] || user.name?.split(' ')[0] || 'there';
  const urgentCount = actionItems.filter((i) => i.priority === 'high').length;

  // ==================== ONBOARDING STATES ====================
  if (state !== 'active') {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[60px]">
          <div className="relish-container" style={{ maxWidth: 600 }}>
            <div className="pt-16 pb-12 text-center">
              <h1
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                  fontWeight: 300,
                  color: '#3A3530',
                  lineHeight: 1.15,
                }}
              >
                Welcome back
              </h1>
              <p className="mt-3" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: '#A09888' }}>
                {oneThing.description}
              </p>
            </div>

            <div className="space-y-4 pb-16">
              {state === 'new_user' && selfPerson && (
                <OnboardingCard
                  title="Start with you"
                  body="How you handle stress, what you need, how you communicate."
                  ctaLabel="Begin"
                  ctaHref={`/people/${selfPerson.personId}/manual/self-onboard${demoQ}`}
                />
              )}

              {state === 'self_complete' && (
                <div className="relish-card p-6">
                  <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '20px', fontWeight: 400, color: '#3A3530' }}>
                    Who matters most?
                  </h2>
                  <p className="mt-1 mb-5" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468', lineHeight: 1.6 }}>
                    Add the people you want to understand better.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                      className="text-sm rounded-lg px-3 py-2.5"
                      style={{ fontFamily: 'var(--font-parent-body)', background: '#F5F3EF', color: '#3A3530', border: '1px solid #E8E3DC' }}
                    >
                      <option value="spouse">Spouse / Partner</option>
                      <option value="child">Child</option>
                    </select>
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="Their name"
                      className="flex-1 text-sm rounded-lg px-4 py-2.5"
                      style={{ fontFamily: 'var(--font-parent-body)', background: '#F5F3EF', color: '#3A3530', border: '1px solid #E8E3DC' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                    />
                    <button
                      onClick={handleAddPerson}
                      disabled={adding || !addName.trim()}
                      className="text-sm font-medium rounded-lg px-5 py-2.5 text-white disabled:opacity-40"
                      style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
                    >
                      {adding ? '...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {state === 'has_people' && peopleNeedingContributions.map((person) => {
                const isChild = person.relationshipType === 'child';
                const href = isChild ? `/people/${person.personId}/manual/kid-session${demoQ}` : `/people/${person.personId}/manual/onboard${demoQ}`;
                return (
                  <OnboardingCard
                    key={person.personId}
                    title={`What do you see in ${person.name}?`}
                    body={`You see ${person.name} from a perspective they can\u2019t see themselves.`}
                    ctaLabel={isChild ? 'Start session' : 'Begin'}
                    ctaHref={href}
                  />
                );
              })}

              {state === 'has_contributions' && (
                <OnboardingCard
                  title="Ready to see the picture"
                  body="We'll map your relationships across 20 dimensions."
                  ctaLabel={generating ? 'Reading...' : 'Analyze'}
                  ctaOnClick={handleAnalyze}
                  disabled={generating}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE STATE: BOOKSHELF ====================

  const completenessPercent = familyCompleteness.overallPercent;
  const growthProgress = activeArcs.length > 0
    ? Math.round((activeArcs[0].completedItemCount / Math.max(activeArcs[0].totalItemCount, 1)) * 100)
    : 0;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[60px] flex items-center justify-center min-h-[calc(100vh-60px)]">
        <div className="relish-container w-full">
          {/* Greeting */}
          <div className="pb-8 text-center">
            <h1
              className="animate-fade-in-up"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                fontWeight: 600,
                color: '#3A3530',
                lineHeight: 1.15,
              }}
            >
              Welcome back
            </h1>
            <p className="mt-3" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: '#9B9488' }}>
              Your family&apos;s manual needs attention
            </p>
          </div>

          {/* The Three Books */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pb-3">
            <Link href={`/family-manual${demoQ}`} className="book-card-family relative">
              {urgentCount > 0 && (
                <div className="attention-badge">{urgentCount}</div>
              )}
              <div className="flex flex-col items-center text-center gap-4">
                <BookIcon />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '20px', fontWeight: 500 }}>
                    The Family Manual
                  </h2>
                  <p className="mt-1.5" style={{ fontSize: '13px', opacity: 0.75 }}>
                    Your family&apos;s living guide
                  </p>
                </div>
              </div>
              <div className="book-card-spine">
                <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: 'rgba(255,255,255,0.35)', width: `${completenessPercent}%` }} />
              </div>
            </Link>

            <Link href={`/workbook${demoQ}`} className="book-card-growth">
              <div className="flex flex-col items-center text-center gap-4">
                <WorkbookIcon />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '20px', fontWeight: 500 }}>
                    The Growth Workbook
                  </h2>
                  <p className="mt-1.5" style={{ fontSize: '13px', opacity: 0.75 }}>
                    Daily practice & reflections
                  </p>
                </div>
              </div>
              <div className="book-card-spine">
                <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: 'rgba(255,255,255,0.35)', width: `${growthProgress}%` }} />
              </div>
            </Link>

            <Link href={`/reports${demoQ}`} className="book-card-reports">
              <div className="flex flex-col items-center text-center gap-4">
                <ReportsIcon />
                <div>
                  <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '20px', fontWeight: 500 }}>
                    The Reports Binder
                  </h2>
                  <p className="mt-1.5" style={{ fontSize: '13px', opacity: 0.75 }}>
                    Progress & summaries
                  </p>
                </div>
              </div>
              <div className="book-card-spine">
                <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: 'rgba(255,255,255,0.35)', width: '0%' }} />
              </div>
            </Link>
          </div>

          {/* Shelf line */}
          <div className="bookshelf-line" />

        </div>
      </div>
    </div>
  );
}

// ==================== Onboarding Card ====================

function OnboardingCard({
  title, body, ctaLabel, ctaHref, ctaOnClick, disabled,
}: {
  title: string; body: string; ctaLabel: string;
  ctaHref?: string; ctaOnClick?: () => void; disabled?: boolean;
}) {
  return (
    <div className="relish-card p-6">
      <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '20px', fontWeight: 400, color: '#3A3530' }}>
        {title}
      </h2>
      <p className="mt-1 mb-5" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468', lineHeight: 1.6 }}>
        {body}
      </p>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="one-thing-cta"
        >
          {ctaLabel}
        </Link>
      ) : ctaOnClick ? (
        <button onClick={ctaOnClick} disabled={disabled} className="one-thing-cta disabled:opacity-40">
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

// ==================== Icons ====================

function BookIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="8" y="6" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M14 6v28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M18 14h10M18 18h8M18 22h6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function WorkbookIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M8 8h10c2 0 2 2 2 2v22s0-2-2-2H8V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M32 8H22c-2 0-2 2-2 2v22s0-2 2-2h10V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M20 10v22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="10" y="6" width="20" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M10 12h20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M15 18h10M15 22h8M15 26h6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="15" y="8" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
