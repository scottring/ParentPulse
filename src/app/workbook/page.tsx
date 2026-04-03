'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useRingScores } from '@/hooks/useRingScores';
import { useDashboard } from '@/hooks/useDashboard';
import { scoreToClimate } from '@/lib/climate-engine';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import WeatherBackground from '@/components/dashboard/WeatherBackground';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import WorkbookChapterCard from '@/components/workbook/WorkbookChapterCard';
import Link from 'next/link';
import type { ClimateState } from '@/lib/climate-engine';

export default function WorkbookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeChapters, loading: wbLoading, completeExercise, pauseChapter, resumeChapter } = useWorkbook();
  const { assessments } = useDashboard();
  const { health } = useRingScores(assessments);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const climateState: ClimateState = useMemo(() => {
    if (health) {
      return scoreToClimate(health.score, health.trend).state;
    }
    return 'mostly_sunny';
  }, [health]);

  if (authLoading || wbLoading) {
    return (
      <WeatherBackground climate="mostly_sunny">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-white/40" />
        </div>
      </WeatherBackground>
    );
  }

  if (!user) return null;

  const active = activeChapters.filter((c) => c.status === 'active');
  const paused = activeChapters.filter((c) => c.status === 'paused');

  return (
    <WeatherBackground climate={climateState}>
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px]">
        <div className="max-w-xl mx-auto px-5 sm:px-8 pt-10 pb-12">
          {/* Phase indicator */}
          <div className="mb-6">
            <AuraPhaseIndicator phase="respond" />
          </div>

          {/* Page heading */}
          <h1
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'var(--parent-text)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Your workbook
          </h1>
          <p
            className="mt-2 mb-8"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '14px',
              color: 'var(--parent-text-light)',
              lineHeight: 1.6,
            }}
          >
            What you&apos;re working on
          </p>

          {/* Empty state */}
          {active.length === 0 && paused.length === 0 && (
            <div className="glass-card-strong p-6 text-center">
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '14px',
                  color: 'var(--parent-text-light)',
                  lineHeight: 1.6,
                }}
              >
                No active exercises. Visit your dashboard to find areas to work on.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center mt-4 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: 'var(--parent-primary)',
                }}
              >
                Go to dashboard
              </Link>
            </div>
          )}

          {/* Active chapters */}
          {active.length > 0 && (
            <div className="space-y-4">
              {active.map((chapter) => (
                <WorkbookChapterCard
                  key={chapter.chapterId}
                  chapter={chapter}
                  onCompleteExercise={completeExercise}
                  onPause={pauseChapter}
                  onResume={resumeChapter}
                />
              ))}
            </div>
          )}

          {/* Paused chapters */}
          {paused.length > 0 && (
            <div className="mt-8">
              <span
                className="block mb-3"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text-light)',
                  opacity: 0.5,
                }}
              >
                Paused
              </span>
              <div className="space-y-4">
                {paused.map((chapter) => (
                  <WorkbookChapterCard
                    key={chapter.chapterId}
                    chapter={chapter}
                    onCompleteExercise={completeExercise}
                    onPause={pauseChapter}
                    onResume={resumeChapter}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer link */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="text-[11px] tracking-wide uppercase hover:opacity-70"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontWeight: 500,
                letterSpacing: '0.06em',
                color: 'var(--parent-text-light)',
                opacity: 0.5,
              }}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </WeatherBackground>
  );
}
