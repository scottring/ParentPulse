'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useWorkbook } from '@/hooks/useWorkbook';
import { useWeeklyActivities } from '@/hooks/useWeeklyActivities';
import { useRingScores } from '@/hooks/useRingScores';
import { useDashboard } from '@/hooks/useDashboard';
import { scoreToClimate } from '@/lib/climate-engine';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import WeatherBackground from '@/components/dashboard/WeatherBackground';
import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import WorkbookChapterCard from '@/components/workbook/WorkbookChapterCard';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { ClimateState } from '@/lib/climate-engine';

export default function WorkbookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { activeChapters, loading: wbLoading, completeExercise, pauseChapter, resumeChapter } = useWorkbook();
  const { weeklyByPerson, totalCompleted, totalPending, loading: weeklyLoading } = useWeeklyActivities();
  const { assessments } = useDashboard();
  const { health } = useRingScores(assessments);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const climateState: ClimateState = useMemo(() => {
    if (health) {
      return scoreToClimate(health.score, health.trend).state;
    }
    return 'mostly_sunny';
  }, [health]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generateBatch = httpsCallable(functions, 'generateGrowthBatch');
      await generateBatch({});
    } catch (err) {
      console.error('Failed to generate activities:', err);
    } finally {
      setGenerating(false);
    }
  };

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
  const total = totalCompleted + totalPending;

  // Week label
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

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
            Weekly activities for your family
          </p>

          {/* ===== THIS WEEK — grouped by person ===== */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text-light)',
                }}
              >
                This Week
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '11px',
                  color: 'var(--parent-text-light)',
                }}
              >
                {weekLabel}
              </span>
            </div>

            {total === 0 ? (
              <div className="glass-card-strong p-6 text-center">
                <p
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '14px',
                    color: 'var(--parent-text-light)',
                    lineHeight: 1.6,
                  }}
                >
                  No activities scheduled this week.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center mt-4 px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: 'var(--parent-primary)',
                  }}
                >
                  {generating ? 'Generating...' : 'Generate this week\'s activities'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="glass-card-strong px-5 py-3 flex items-center justify-between rounded-xl">
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: 'var(--parent-text)' }}>
                    {totalCompleted} of {total} done
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(total, 12) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: i < totalCompleted ? '#7C9082' : 'rgba(138,128,120,0.2)' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Per-person sections */}
                {Array.from(weeklyByPerson.entries()).map(([personId, data]) => {
                  const isExpanded = expanded === personId;
                  const personTotal = data.completed.length + data.pending.length;
                  return (
                    <div key={personId} className="glass-card-strong rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : personId)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span style={{ fontFamily: 'var(--font-parent-display)', fontSize: '18px', fontWeight: 400, color: 'var(--parent-text)' }}>
                            {data.personName}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              fontFamily: 'var(--font-parent-body)',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: data.completed.length === personTotal ? '#7C9082' : 'var(--parent-text-light)',
                              background: data.completed.length === personTotal ? 'rgba(124,144,130,0.1)' : 'rgba(138,128,120,0.08)',
                            }}
                          >
                            {data.completed.length}/{personTotal}
                          </span>
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--parent-text-light)" strokeWidth="2"
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                          {data.pending.map((item) => (
                            <Link
                              key={item.growthItemId}
                              href={`/growth/${item.growthItemId}`}
                              className="flex items-start gap-3 py-2 group hover:opacity-80 transition-opacity"
                            >
                              <span className="text-base mt-0.5">{item.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <span
                                  className="block"
                                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: 'var(--parent-text)' }}
                                >
                                  {item.title}
                                </span>
                                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: 'var(--parent-text-light)' }}>
                                  {item.estimatedMinutes} min &middot; {item.speed}
                                </span>
                              </div>
                            </Link>
                          ))}
                          {data.completed.map((item) => (
                            <div key={item.growthItemId} className="flex items-start gap-3 py-2 opacity-45">
                              <span style={{ color: '#7C9082', fontSize: '14px', marginTop: '2px' }}>&#10003;</span>
                              <div>
                                <span
                                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: 'var(--parent-text)', textDecoration: 'line-through' }}
                                >
                                  {item.emoji} {item.title}
                                </span>
                                {item.feedback && (
                                  <span className="block" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: '#7C9082' }}>
                                    {item.feedback.reaction === 'loved_it' ? 'Loved it' :
                                     item.feedback.reaction === 'tried_it' ? 'Tried it' :
                                     item.feedback.reaction === 'not_now' ? 'Not now' : 'Skipped'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== DEEPER WORK — existing workbook chapters ===== */}
          {(active.length > 0 || paused.length > 0) && (
            <div>
              <span
                className="block mb-4"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--parent-text-light)',
                }}
              >
                Deeper Work
              </span>

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

              {paused.length > 0 && (
                <div className="mt-6">
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
