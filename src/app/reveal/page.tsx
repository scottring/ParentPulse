'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import {
  scoreToClimate,
  classifyForces,
  buildClimateSummary,
} from '@/lib/climate-engine';
import type { ClimateState } from '@/lib/climate-engine';
import type { DomainScore } from '@/types/ring-scores';
import type { DimensionDomain } from '@/config/relationship-dimensions';
import Link from 'next/link';

const DOMAIN_META: Record<DimensionDomain, { label: string; description: string }> = {
  self: { label: 'Self', description: 'Your inner resources and resilience' },
  couple: { label: 'Couple', description: 'The partnership at your core' },
  parent_child: { label: 'Parent \u2013 Child', description: 'The bonds you\u2019re building' },
};

function domainScoreToLabel(score: number): string {
  if (score >= 4.0) return 'Thriving';
  if (score >= 3.5) return 'Steady';
  if (score >= 3.0) return 'Developing';
  if (score >= 2.0) return 'Needs attention';
  if (score > 0) return 'Under pressure';
  return 'Not enough data';
}

function domainScoreToColor(score: number): string {
  if (score >= 4.0) return '#16a34a';
  if (score >= 3.5) return '#65a30d';
  if (score >= 3.0) return '#7C9082';
  if (score >= 2.0) return '#ea580c';
  if (score > 0) return '#dc2626';
  return '#4A4238';
}

function isDarkSky(climate: ClimateState) {
  return climate === 'stormy' || climate === 'overcast';
}

export default function RevealPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state, assessments, roles } = useDashboard();
  const { health } = useRingScores(assessments);

  // Animation stage: 0 = loading, 1-3 = domain reveals, 4 = forces, 5 = narrative, 6 = CTA
  const [stage, setStage] = useState(0);
  const [domainIndex, setDomainIndex] = useState(-1);
  const [showForces, setShowForces] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  const isDemo = useMemo(() => {
    if (user?.isDemo) return true;
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('demo') === 'true';
    return false;
  }, [user?.isDemo]);
  const demoQ = isDemo ? '?demo=true' : '';

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Get scored domains (only those with data)
  const scoredDomains: DomainScore[] = useMemo(() => {
    if (!health) return [];
    return health.domainScores.filter((d) => d.score > 0);
  }, [health]);

  // Climate state for background
  const climateState: ClimateState = useMemo(() => {
    if (health) return scoreToClimate(health.score, health.trend).state;
    return 'mostly_sunny';
  }, [health]);

  const dark = isDarkSky(climateState);

  // Forces
  const forces = useMemo(() => {
    if (!health) return { lifting: [], weighing: [] };
    const allDimScores = health.domainScores.flatMap((d) => d.dimensionScores);
    return classifyForces(allDimScores);
  }, [health]);

  // Narrative
  const narrative = useMemo(() => {
    if (!health) return '';
    return buildClimateSummary(health, roles);
  }, [health, roles]);

  // Animation sequence
  useEffect(() => {
    if (!health || scoredDomains.length === 0) return;

    // Stage 1: Start revealing domains one at a time
    const timers: ReturnType<typeof setTimeout>[] = [];

    // First domain after 600ms
    timers.push(setTimeout(() => setDomainIndex(0), 600));

    // Subsequent domains every 1.2s
    scoredDomains.forEach((_, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => setDomainIndex(i), 600 + i * 1200));
      }
    });

    // Forces after all domains revealed
    const forcesDelay = 600 + scoredDomains.length * 1200 + 400;
    timers.push(setTimeout(() => setShowForces(true), forcesDelay));

    // Narrative
    timers.push(setTimeout(() => setShowNarrative(true), forcesDelay + 800));

    // CTA
    timers.push(setTimeout(() => setShowCTA(true), forcesDelay + 1600));

    return () => timers.forEach(clearTimeout);
  }, [health, scoredDomains]);

  // Loading state
  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-white/40" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  // If no assessments yet, redirect to dashboard
  if (state !== 'active') {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px] flex items-center justify-center">
          <div className="glass-card-strong p-8 text-center max-w-md">
            <h2
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '1.5rem',
                fontWeight: 500,
                color: 'var(--parent-text)',
              }}
            >
              Nothing to reveal yet
            </h2>
            <p
              className="mt-3"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '14px',
                color: 'var(--parent-text-light)',
                lineHeight: 1.6,
              }}
            >
              Complete your onboarding and run an analysis first.
            </p>
            <Link
              href={`/dashboard${demoQ}`}
              className="inline-flex items-center mt-5 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
              style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const textPrimary = dark ? 'rgba(255,255,255,0.95)' : '#1a1a1a';
  const textSecondary = dark ? 'rgba(255,255,255,0.6)' : 'rgba(40,40,40,0.55)';
  const textTertiary = dark ? 'rgba(255,255,255,0.35)' : 'rgba(40,40,40,0.3)';

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px]">
        <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-16">

          {/* Phase indicator */}
          <div className="mb-8">
            <AuraPhaseIndicator phase="understand" />
          </div>

          {/* Title */}
          <h1
            className="animate-fade-in-up text-center"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 300,
              color: textPrimary,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Your family<br />climate today
          </h1>
          <div className="mb-10" />

          {/* ===== STAGE 1: Domain Reveal — 3-column cards ===== */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {scoredDomains.map((domain, i) => {
              const revealed = i <= domainIndex;
              const meta = DOMAIN_META[domain.domain];
              const label = domainScoreToLabel(domain.score);
              const color = domainScoreToColor(domain.score);
              const fillPercent = ((domain.score - 1) / 4) * 100;

              return (
                <div
                  key={domain.domain}
                  className="glass-card-strong overflow-hidden text-center"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(16px)',
                    transition: 'opacity 0.8s ease, transform 0.8s ease',
                  }}
                >
                  <div className="p-4">
                    <h3
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '15px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--parent-text-light)',
                        marginBottom: 8,
                      }}
                    >
                      {meta.label}
                    </h3>
                    <span
                      className="block"
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: '1.1rem',
                        fontWeight: 400,
                        color: 'var(--parent-text)',
                        marginBottom: 10,
                      }}
                    >
                      {label}
                    </span>
                    {/* Mini climate gradient */}
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: revealed ? `${Math.max(fillPercent, 5)}%` : '0%',
                          borderRadius: 2,
                          background: `linear-gradient(90deg, ${color}88, ${color})`,
                          transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.3s',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== STAGE 2: Forces — inline text ===== */}
          <div
            className="mb-8"
            style={{
              opacity: showForces ? 1 : 0,
              transform: showForces ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            {forces.lifting.length > 0 && (
              <div className="mb-3">
                <span
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: textTertiary,
                  }}
                >
                  Lifting you up
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '14px',
                    color: textSecondary,
                    lineHeight: 1.6,
                  }}
                >
                  {forces.lifting.map(f => f.name).join(' \u00B7 ')}
                </p>
              </div>
            )}
            {forces.weighing.length > 0 && (
              <div>
                <span
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: textTertiary,
                  }}
                >
                  Needs attention
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '14px',
                    color: textSecondary,
                    lineHeight: 1.6,
                  }}
                >
                  {forces.weighing.map(f => f.name).join(' \u00B7 ')}
                </p>
              </div>
            )}
          </div>

          {/* ===== STAGE 3: Narrative — editorial, italic, centered ===== */}
          {narrative && (
            <div
              style={{
                opacity: showNarrative ? 1 : 0,
                transform: showNarrative ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}
            >
              <div
                className="mb-8"
                style={{
                  height: '1px',
                  background: dark
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)',
                }}
              />
              <p
                className="text-center max-w-md mx-auto mb-10"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: textPrimary,
                  lineHeight: 1.55,
                  letterSpacing: '-0.01em',
                }}
              >
                &ldquo;{narrative}&rdquo;
              </p>
            </div>
          )}

          {/* ===== STAGE 4: Call to Action ===== */}
          <div
            style={{
              opacity: showCTA ? 1 : 0,
              transform: showCTA ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <Link
                href={`/workbook${demoQ}`}
                className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)', letterSpacing: '0.01em' }}
              >
                Start working on something &rarr;
              </Link>
              <Link
                href={`/dashboard${demoQ}`}
                className="text-[12px] hover:opacity-70"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontWeight: 500,
                  color: textSecondary,
                }}
              >
                Explore the dashboard &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
