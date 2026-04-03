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
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import WeatherBackground from '@/components/dashboard/WeatherBackground';
import { RelationshipCard } from '@/components/dashboard/RelationshipCard';
import { DeepenCard } from '@/components/dashboard/DeepenCard';
import { scoreToClimate, getGreeting, buildClimateSummary, getOnboardingClimate } from '@/lib/climate-engine';
import { useAssessmentNeeds, loadAndClearContradictions } from '@/hooks/useAssessmentNeeds';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import Link from 'next/link';
import type { ClimateState } from '@/lib/climate-engine';

function isDarkSky(climate: ClimateState) {
  return climate === 'stormy' || climate === 'overcast';
}

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
    seedAssessments,
    generateArc,
    generateBatch,
    generating,
  } = useGrowthFeed();
  const { seedProgressions } = useProgression();
  const { health } = useRingScores(assessments);
  const { addPerson } = usePerson();
  const { activeChapters } = useWorkbook();

  const activeWorkbookDimIds = useMemo(
    () => activeChapters.filter(c => c.status === 'active').map(c => c.dimensionId),
    [activeChapters],
  );
  const [contradictionIds] = useState(() => loadAndClearContradictions());
  const { visibleNeeds, startAssessment, dismissNeed } = useAssessmentNeeds(
    assessments,
    activeWorkbookDimIds,
    undefined,
    contradictionIds,
  );

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

  const climateState: ClimateState = useMemo(() => {
    if (state === 'active' && health) {
      return scoreToClimate(health.score, health.trend).state;
    }
    return 'mostly_sunny';
  }, [state, health]);

  const dark = isDarkSky(climateState);

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

  if (authLoading || state === 'loading') {
    return (
      <WeatherBackground climate="mostly_sunny">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-white/40" />
        </div>
      </WeatherBackground>
    );
  }

  if (!user) return null;

  const userName = selfPerson?.name?.split(' ')[0] || user.name?.split(' ')[0] || 'there';
  const climate = state === 'active' && health ? scoreToClimate(health.score, health.trend) : null;
  const summary = state === 'active' && health ? buildClimateSummary(health, roles) : null;
  const onboarding = state !== 'active' ? getOnboardingClimate(state, userName) : null;

  const textPrimary = dark ? 'rgba(255,255,255,0.95)' : '#1a1a1a';
  const textSecondary = dark ? 'rgba(255,255,255,0.6)' : 'rgba(40,40,40,0.55)';
  const textTertiary = dark ? 'rgba(255,255,255,0.35)' : 'rgba(40,40,40,0.3)';
  const textClass = dark ? 'sky-text-dark' : 'sky-text';

  return (
    <WeatherBackground climate={climateState}>
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px]">

        {/* ===== HERO SECTION — the emotional center ===== */}
        <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-6">

          {/* Phase indicator — shown during onboarding states */}
          {state !== 'active' && (
            <div className="mb-4">
              <AuraPhaseIndicator phase="assess" />
            </div>
          )}

          {/* Demo tag */}
          {isDemo && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-[11px] tracking-wide uppercase"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(217,119,6,0.12)',
                color: '#A3510B',
                border: '1px solid rgba(217,119,6,0.2)',
                fontWeight: 500,
              }}
            >
              Demo &middot; {state}
            </div>
          )}

          {/* Greeting — large, editorial */}
          <h1
            className={`${textClass} animate-fade-in-up`}
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(2rem, 5vw, 2.75rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: textPrimary,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Good {getTimeOfDay()}, {userName}
          </h1>

          {/* Active state: Climate label + trend */}
          {climate && health && (
            <div className="mt-6">
              {/* Climate state as hero text */}
              <span
                className="block"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                  fontWeight: 300,
                  color: textPrimary,
                  lineHeight: 1.2,
                }}
              >
                {climate.state === 'clear' ? 'Clear skies' :
                 climate.state === 'mostly_sunny' ? 'Mostly sunny' :
                 climate.state === 'partly_cloudy' ? 'Partly cloudy' :
                 climate.state === 'overcast' ? 'Overcast' :
                 'Heavy weather'}
              </span>
              <span
                className="block mt-2"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '13px',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: textSecondary,
                }}
              >
                {climate.trendPhrase}
              </span>
            </div>
          )}

          {/* Active state: narrative summary */}
          {summary && (
            <p
              className={`mt-5 max-w-md leading-relaxed ${textClass}`}
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '14px',
                fontWeight: 400,
                color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,30,0.65)',
                lineHeight: 1.65,
              }}
            >
              {summary}
            </p>
          )}

          {/* Onboarding message */}
          {onboarding && (
            <p
              className={`mt-4 max-w-sm ${textClass}`}
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '15px',
                color: textSecondary,
                lineHeight: 1.6,
              }}
            >
              {onboarding.message}
            </p>
          )}
        </div>

        {/* ===== CONTENT ===== */}
        <div className="max-w-xl mx-auto px-5 sm:px-8 pb-12">

          {/* Thin separator line */}
          {state === 'active' && (
            <div
              className="mb-6"
              style={{
                height: '1px',
                background: dark
                  ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)',
              }}
            />
          )}

          <div className="space-y-4">

            {/* DEEPEN CARDS: Surface when assessment data gaps exist */}
            {state === 'active' && visibleNeeds.map((need) => (
              <DeepenCard
                key={need.dimensionId}
                need={need}
                onStart={() => startAssessment(need)}
                onDismiss={() => dismissNeed(need)}
              />
            ))}

            {/* ONBOARDING: Self */}
            {state === 'new_user' && selfPerson && (
              <OnboardingCard
                title="Start with you"
                body="How you handle stress, what you need, how you communicate."
                ctaLabel="Begin"
                ctaHref={`/people/${selfPerson.personId}/manual/self-onboard${demoQ}`}
                phaseClass="phase-card-assess"
              />
            )}

            {/* ONBOARDING: Add people */}
            {state === 'self_complete' && (
              <div className="glass-card-strong p-6">
                <h2
                  className="text-lg mb-1"
                  style={{ fontFamily: 'var(--font-parent-display)', fontWeight: 500, color: 'var(--parent-text)' }}
                >
                  Who matters most?
                </h2>
                <p
                  className="text-sm mb-5"
                  style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', lineHeight: 1.6 }}
                >
                  Add the people you want to understand better.
                </p>
                <div className="flex gap-2">
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as 'spouse' | 'child')}
                    className="text-sm rounded-2xl px-3 py-2.5"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'rgba(255,255,255,0.5)',
                      color: 'var(--parent-text)',
                      border: '1px solid rgba(0,0,0,0.06)',
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
                    className="flex-1 text-sm rounded-2xl px-4 py-2.5"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      background: 'rgba(255,255,255,0.5)',
                      color: 'var(--parent-text)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                  />
                  <button
                    onClick={handleAddPerson}
                    disabled={adding || !addName.trim()}
                    className="text-sm font-medium rounded-2xl px-5 py-2.5 text-white hover:opacity-90 disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
                  >
                    {adding ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {/* ONBOARDING: Contribute */}
            {state === 'has_people' && peopleNeedingContributions.map((person) => {
              const isChild = person.relationshipType === 'child';
              const href = isChild
                ? `/people/${person.personId}/manual/kid-session${demoQ}`
                : `/people/${person.personId}/manual/onboard${demoQ}`;
              return (
                <OnboardingCard
                  key={person.personId}
                  title={`What do you see in ${person.name}?`}
                  body={`You see ${person.name} from a perspective they can\u2019t see themselves.`}
                  ctaLabel={isChild ? 'Start session' : `Begin`}
                  ctaHref={href}
                />
              );
            })}

            {/* ONBOARDING: Analyze */}
            {state === 'has_contributions' && (
              <OnboardingCard
                title="Ready to read the sky"
                body="We'll map your relationships across 20 dimensions and find where the weather is headed."
                ctaLabel={generating ? 'Reading...' : 'Analyze'}
                ctaOnClick={handleAnalyze}
                disabled={generating}
              />
            )}

            {/* ===== ACTIVE: Relationship forecasts ===== */}
            {state === 'active' && (
              <div className="space-y-4">
                {/* Section label */}
                <span
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: textTertiary,
                  }}
                >
                  Forecasts
                </span>

                {roles.map((role) => (
                  <RelationshipCard
                    key={role.otherPerson.personId}
                    role={role}
                    variant={role.domain === 'couple' ? 'spouse' : 'child'}
                    demoQ={demoQ}
                    activeChapters={activeChapters}
                  />
                ))}
              </div>
            )}

            {/* CHECK-IN PROMPT: Show at bottom when 7+ days overdue */}
            {state === 'active' && activeChapters.filter(c => c.status === 'active').length > 0 && (() => {
              const now = Date.now();
              const sevenDays = 7 * 24 * 60 * 60 * 1000;
              const lastCompletion = activeChapters
                .flatMap(c => c.completions)
                .reduce((latest, comp) => {
                  const t = comp.completedAt?.toMillis?.() || 0;
                  return t > latest ? t : latest;
                }, 0);
              const needsCheckin = lastCompletion === 0 || (now - lastCompletion) > sevenDays;
              if (!needsCheckin) return null;

              return (
                <Link
                  href={`/checkin${demoQ}`}
                  className="block glass-card-strong p-5 hover:opacity-90 transition-opacity phase-card-assimilate"
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--parent-text)',
                    }}
                  >
                    It&apos;s been a week. Ready for a quick check-in?
                  </h3>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12.5px',
                      color: 'var(--parent-text-light)',
                    }}
                  >
                    ~3 minutes
                  </p>
                </Link>
              );
            })()}

            {/* Footer links — spec: People · Workbook · Manual */}
            {state === 'active' && (
              <div className="flex items-center justify-center gap-5 pt-6 pb-10">
                {[
                  { href: '/people', label: 'People' },
                  { href: '/workbook', label: 'Workbook' },
                  selfPerson && { href: `/people/${selfPerson.personId}/manual`, label: 'Manual' },
                ].filter(Boolean).map((link) => (
                  <Link
                    key={link!.href}
                    href={link!.href}
                    className="text-[11px] tracking-wide uppercase hover:opacity-70"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      color: textTertiary,
                    }}
                  >
                    {link!.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </WeatherBackground>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ===== Onboarding Card =====

function OnboardingCard({
  title, body, ctaLabel, ctaHref, ctaOnClick, disabled, phaseClass,
}: {
  title: string; body: string; ctaLabel: string;
  ctaHref?: string; ctaOnClick?: () => void; disabled?: boolean;
  phaseClass?: string;
}) {
  return (
    <div className={`glass-card-strong p-6 ${phaseClass || ''}`}>
      <h2
        className="text-lg mb-1.5"
        style={{ fontFamily: 'var(--font-parent-display)', fontWeight: 500, color: 'var(--parent-text)' }}
      >
        {title}
      </h2>
      <p
        className="text-sm mb-5 leading-relaxed"
        style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', lineHeight: 1.6 }}
      >
        {body}
      </p>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
          style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)', letterSpacing: '0.01em' }}
        >
          {ctaLabel}
        </Link>
      ) : ctaOnClick ? (
        <button
          onClick={ctaOnClick}
          disabled={disabled}
          className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
          style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)', letterSpacing: '0.01em' }}
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
