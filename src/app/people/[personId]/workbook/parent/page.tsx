'use client';

/**
 * Parent Workbook Page
 *
 * Parent-facing weekly workbook with:
 * - Parent behavior goals
 * - Daily parenting strategies (aligned with child's story)
 * - Child progress summary
 * - Weekly reflection
 *
 * Maintains technical manual aesthetic
 */

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useParentWorkbook } from '@/hooks/useParentWorkbook';
import { useChildWorkbookByWeekId } from '@/hooks/useChildWorkbook';
import type { ParentWeeklyReflection } from '@/types/parent-workbook';
import MainLayout from '@/components/layout/MainLayout';

export default function ParentWorkbookPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const {
    workbook,
    loading: workbookLoading,
    error: workbookError,
    logGoalCompletion,
    logDailyStrategyCompletion,
    saveWeeklyReflection,
    completeWorkbook,
  } = useParentWorkbook(personId);

  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState<Partial<Omit<ParentWeeklyReflection, 'completedAt' | 'completedBy'>>>({
    whatWorkedWell: '',
    whatWasChallenging: '',
    insightsLearned: '',
    adjustmentsForNextWeek: '',
  });
  const [saving, setSaving] = useState(false);
  const [animatingGoals, setAnimatingGoals] = useState<Set<string>>(new Set());
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  const loading = authLoading || personLoading || workbookLoading;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="manual-spinner"></div>
            <p className="mt-4 font-mono text-sm text-slate-600">Loading workbook...</p>
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
      </MainLayout>
    );
  }

  if (!person || !workbook) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-16 px-6 text-center">
          <p className="font-mono text-lg text-slate-600">
            {workbookError || 'Workbook not found'}
          </p>
          <Link
            href={`/people/${personId}/workbook`}
            className="inline-block mt-4 px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all"
          >
            ← BACK TO HUB
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Calculate progress
  const totalGoals = workbook.parentGoals.length;
  const goalsWithProgress = workbook.parentGoals.map((goal) => {
    const completionLog = goal.completionLog || [];
    const completionsToday = completionLog.filter((log) => {
      const logDate = log.date.toDate();
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    });
    const completedToday = completionsToday.some((log) => log.completed);
    const totalCompletions = completionLog.filter((log) => log.completed).length;
    return { goal, completedToday, totalCompletions };
  });

  const weekStart = workbook.startDate.toDate();
  const weekEnd = workbook.endDate.toDate();
  const daysInWeek = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysCompleted = Math.min(
    Math.ceil((new Date().getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)),
    daysInWeek
  );
  const progressPercent = Math.min((daysCompleted / daysInWeek) * 100, 100);
  const isWeekEnd = daysCompleted >= daysInWeek;

  const handleLogGoal = async (goalId: string, completed: boolean) => {
    setAnimatingGoals((prev) => new Set(prev).add(goalId));
    setTimeout(() => {
      setAnimatingGoals((prev) => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }, 600);

    try {
      await logGoalCompletion(goalId, completed);
    } catch (error) {
      console.error('Error logging goal:', error);
      alert('Failed to log goal completion');
    }
  };

  const handleLogStrategy = async (dayNumber: number, completed: boolean) => {
    try {
      await logDailyStrategyCompletion(dayNumber, completed);
    } catch (error) {
      console.error('Error logging strategy:', error);
      alert('Failed to log strategy completion');
    }
  };

  const handleSaveReflection = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await saveWeeklyReflection({
        whatWorkedWell: reflection.whatWorkedWell || '',
        whatWasChallenging: reflection.whatWasChallenging || '',
        insightsLearned: reflection.insightsLearned || '',
        adjustmentsForNextWeek: reflection.adjustmentsForNextWeek || '',
      });

      await completeWorkbook();

      alert('Week completed! Generate next week\'s workbook from the manual page.');
      router.push(`/people/${personId}/manual`);
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="relative">
        {/* Header */}
        <header className="relative border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>

            <div className="flex items-center gap-6 mb-6">
              <Link
                href={`/people/${personId}/workbook`}
                className="font-mono text-3xl font-bold text-slate-800 hover:text-amber-600 transition-colors"
              >
                ←
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs">
                    WEEK {workbook.weekNumber}
                  </div>
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs">
                    STATUS: {workbook.status.toUpperCase()}
                  </div>
                </div>
                <h1 className="font-mono text-3xl font-bold text-slate-900">
                  Parent Workbook - {person.name}
                </h1>
                <p className="font-mono text-sm text-slate-600 mt-1">
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                  {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Progress gauge */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm font-bold text-slate-800">WEEK PROGRESS</span>
                <span className="font-mono text-sm text-slate-600">DAY {daysCompleted} / {daysInWeek}</span>
              </div>
              <div className="relative h-8 bg-slate-200 border-2 border-slate-800 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 1px, transparent 1px, transparent 20px)',
                  }}
                ></div>
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                    }}
                  ></div>
                </div>
                <div
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 transition-all duration-1000 ease-out"
                  style={{ left: `${progressPercent}%` }}
                >
                  <div className="absolute -top-1 -left-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Section 1: Parent Behavior Goals */}
          <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
              SECTION 1: PARENT BEHAVIOR GOALS
            </div>

            <div className="space-y-4">
              {goalsWithProgress.map(({ goal, completedToday, totalCompletions }, index) => (
                <div
                  key={goal.id}
                  className="relative border-2 border-slate-300 bg-slate-50 p-6 hover:border-slate-400 transition-colors"
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                    {index + 1}
                  </div>

                  <div className="flex items-start gap-6">
                    <button
                      onClick={() => handleLogGoal(goal.id, !completedToday)}
                      className="relative flex-shrink-0 w-16 h-16 border-4 border-slate-800 hover:border-amber-600 transition-all group"
                      style={{
                        backgroundColor: completedToday ? '#059669' : 'white',
                      }}
                    >
                      {completedToday && (
                        <div
                          className={`absolute inset-0 flex items-center justify-center ${
                            animatingGoals.has(goal.id) ? 'stamp-animation' : ''
                          }`}
                        >
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {!completedToday && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-amber-600"></div>
                      )}
                    </button>

                    <div className="flex-1">
                      <p className="font-mono text-lg font-bold mb-2 text-slate-900">{goal.description}</p>
                      <div className="flex items-center gap-6 font-mono text-sm text-slate-600">
                        <span>TARGET: {goal.targetFrequency}</span>
                        <span>|</span>
                        <span>COMPLETED: {totalCompletions}x</span>
                      </div>
                    </div>

                    {completedToday && (
                      <div className="flex-shrink-0">
                        <div className="px-3 py-1 bg-green-600 text-white font-mono text-xs font-bold">✓ TODAY</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Daily Parenting Strategies */}
          <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-600"></div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-2">
                  SECTION 2: DAILY PARENTING STRATEGIES
                </div>
                <p className="font-mono text-sm text-slate-600">Aligned with {person.name}'s weekly story</p>
              </div>
              <div className="font-mono text-sm text-slate-600">
                {workbook.dailyStrategies.filter((s) => s.completed).length} / {workbook.dailyStrategies.length} COMPLETE
              </div>
            </div>

            <div className="space-y-3">
              {workbook.dailyStrategies.map((strategy, index) => (
                <div
                  key={strategy.dayNumber}
                  className={`border-2 p-4 transition-all ${
                    strategy.completed
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-300 bg-white hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleLogStrategy(strategy.dayNumber, !strategy.completed)}
                      className={`flex-shrink-0 w-10 h-10 border-2 font-mono text-xs font-bold transition-all ${
                        strategy.completed
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-slate-400 bg-white text-slate-600 hover:border-purple-600'
                      }`}
                    >
                      {strategy.completed ? '✓' : index + 1}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-mono font-bold text-base text-slate-900">{strategy.strategyTitle}</h3>
                        <span className="font-mono text-xs text-slate-500 uppercase">{strategy.day}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{strategy.strategyDescription}</p>

                      {expandedStrategy === strategy.dayNumber && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                          <div className="bg-purple-50 border-l-4 border-purple-600 p-3">
                            <p className="font-mono text-xs font-bold text-purple-900 mb-1">CONNECTION TO STORY:</p>
                            <p className="text-sm text-purple-800">{strategy.connectionToStory}</p>
                          </div>
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-900 mb-2">PRACTICAL TIPS:</p>
                            <ul className="space-y-1">
                              {strategy.practicalTips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                  <span className="font-mono text-amber-600">→</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setExpandedStrategy(expandedStrategy === strategy.dayNumber ? null : strategy.dayNumber)}
                        className="mt-2 text-xs font-mono text-purple-600 hover:text-purple-800 font-bold"
                      >
                        {expandedStrategy === strategy.dayNumber ? '▲ HIDE DETAILS' : '▼ SHOW DETAILS'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Child Progress Summary */}
          <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-600 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(147,51,234,1)]">
            <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-6">
              SECTION 3: CHILD STORY PROGRESS
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="font-mono text-xs text-purple-600 mb-2">STORIES READ</div>
                <div className="text-3xl font-bold text-purple-900">{workbook.childProgressSummary.storiesRead}/7</div>
              </div>
              <div>
                <div className="font-mono text-xs text-purple-600 mb-2">ACTIVITIES DONE</div>
                <div className="text-3xl font-bold text-purple-900">{workbook.childProgressSummary.activitiesCompleted}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-purple-600 mb-2">WEEK PROGRESS</div>
                <div className="text-3xl font-bold text-purple-900">{workbook.childProgressSummary.storyCompletionPercent}%</div>
              </div>
            </div>

            <Link
              href={`/people/${personId}/workbook/child`}
              className="inline-block px-6 py-3 bg-purple-600 text-white font-mono font-bold hover:bg-purple-700 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              VIEW CHILD'S STORYBOOK →
            </Link>
          </div>

          {/* Section 4: Weekly Reflection */}
          {isWeekEnd && !workbook.weeklyReflection && (
            <div className="relative bg-amber-50 border-4 border-amber-600 p-8 shadow-[6px_6px_0px_0px_rgba(217,119,6,1)]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-slate-800"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-slate-800"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-slate-800"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-slate-800"></div>

              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
                SECTION 4: WEEKLY REFLECTION
              </div>

              {!showReflection ? (
                <div className="text-center py-8">
                  <p className="text-xl mb-8 text-slate-800 font-mono">
                    Week {workbook.weekNumber} complete. Document observations before generating next cycle.
                  </p>
                  <button
                    onClick={() => setShowReflection(true)}
                    className="px-8 py-4 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    BEGIN REFLECTION →
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    { key: 'whatWorkedWell', label: 'What worked well this week?', placeholder: 'Successful strategies and achievements...' },
                    { key: 'whatWasChallenging', label: 'What was challenging?', placeholder: 'Difficulties encountered...' },
                    { key: 'insightsLearned', label: 'Insights learned', placeholder: 'Key observations and discoveries...' },
                    { key: 'adjustmentsForNextWeek', label: 'Adjustments for next week', placeholder: 'Modifications to approach...' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block font-mono font-bold mb-2 text-slate-900 text-sm uppercase tracking-wide">
                        {field.label}
                      </label>
                      <textarea
                        value={String(reflection[field.key as keyof typeof reflection] || '')}
                        onChange={(e) => setReflection((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full p-4 border-2 border-slate-800 font-mono text-sm focus:outline-none focus:border-amber-600 bg-white"
                        rows={4}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}

                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      onClick={() => setShowReflection(false)}
                      disabled={saving}
                      className="px-6 py-3 border-2 border-slate-800 font-mono font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleSaveReflection}
                      disabled={saving}
                      className="px-8 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      {saving ? 'SAVING...' : 'COMPLETE WEEK →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already completed */}
          {workbook.weeklyReflection && (
            <div className="relative bg-green-50 border-4 border-green-600 p-8 shadow-[6px_6px_0px_0px_rgba(5,150,105,1)]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-slate-800"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-slate-800"></div>

              <div className="inline-block px-3 py-1 bg-green-600 text-white font-mono text-xs mb-4">
                STATUS: COMPLETED
              </div>
              <h2 className="font-mono text-2xl font-bold mb-3 text-green-900">Week {workbook.weekNumber} Documentation Complete</h2>
              <p className="font-mono text-sm text-green-800 mb-6">
                Completed: {workbook.weeklyReflection.completedAt.toDate().toLocaleDateString()}
              </p>
              <Link
                href={`/people/${personId}/manual`}
                className="inline-block px-8 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-green-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                GENERATE NEXT CYCLE →
              </Link>
            </div>
          )}
        </main>

        <style jsx>{`
          .stamp-animation {
            animation: stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          @keyframes stamp {
            0% {
              transform: scale(0) rotate(-45deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(-5deg);
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </MainLayout>
  );
}
