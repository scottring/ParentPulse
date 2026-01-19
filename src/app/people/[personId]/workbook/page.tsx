'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useWeeklyWorkbook } from '@/hooks/useWeeklyWorkbook';
import { usePersonManual } from '@/hooks/usePersonManual';
import { ParentBehaviorGoal, DailyActivity, WeeklyReflection, ACTIVITY_TEMPLATES } from '@/types/workbook';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import MainLayout from '@/components/layout/MainLayout';

export default function WeeklyWorkbookPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const {
    workbook,
    loading: workbookLoading,
    error: workbookError,
    createWorkbook,
    logGoalCompletion,
    completeActivity,
    saveReflection,
    completeWorkbook
  } = useWeeklyWorkbook(personId);

  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState<Partial<WeeklyReflection>>({
    whatWorkedWell: '',
    whatWasChallenging: '',
    insightsLearned: '',
    adjustmentsForNextWeek: ''
  });
  const [saving, setSaving] = useState(false);
  const [animatingGoals, setAnimatingGoals] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Check for auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Generate workbook
  const handleGenerateWorkbook = async () => {
    if (!user?.familyId || !person || !manual) {
      setGenerationError('Missing required data to generate workbook');
      return;
    }

    // Validate relationshipType exists
    const relationshipType = manual.relationshipType || person.relationshipType;
    if (!relationshipType) {
      setGenerationError('Relationship type is required. Please complete manual onboarding first.');
      return;
    }

    setGenerating(true);
    setGenerationError(null);

    try {
      // Call Cloud Function to generate workbook content
      const generateWorkbookFunction = httpsCallable<any, { success: boolean; content?: any; error?: string }>(
        functions,
        'generateWeeklyWorkbook'
      );

      const result = await generateWorkbookFunction({
        familyId: user.familyId,
        personId: person.personId,
        personName: person.name,
        manualId: manual.manualId,
        relationshipType: relationshipType,
        personAge: person.dateOfBirth ?
          Math.floor((Date.now() - person.dateOfBirth.toDate().getTime()) / (365.25 * 24 * 60 * 60 * 1000)) :
          undefined,
        triggers: manual.triggers || [],
        whatWorks: manual.whatWorks || [],
        boundaries: manual.boundaries || [],
        assessmentScores: (manual as any).assessmentScores || undefined,  // Self-worth & VIA scores
        coreInfo: manual.coreInfo || undefined  // Includes selfWorthInsights
      });

      if (!result.data.success || !result.data.content) {
        throw new Error(result.data.error || 'Failed to generate workbook');
      }

      // Create workbook with generated content
      const { parentGoals, dailyActivities } = result.data.content;

      // Ensure each goal has required fields initialized
      const initializedGoals = parentGoals.map((goal: any, index: number) => ({
        id: `goal-${crypto.randomUUID()}`,
        description: goal.description,
        targetFrequency: goal.targetFrequency,
        rationale: goal.rationale || '',
        relatedTriggerId: goal.relatedTriggerId || null,
        relatedStrategyId: goal.relatedStrategyId || null,
        completionLog: [] // Initialize empty completion log
      }));

      // Ensure each activity has required fields initialized
      const initializedActivities = dailyActivities.map((activity: any, index: number) => ({
        id: `activity-${crypto.randomUUID()}`,
        type: activity.type,
        suggestedTime: activity.suggestedTime || 'anytime',
        customization: activity.customization || '',
        completed: false,
        childResponse: null,
        parentNotes: null,
        recordedBy: null
      }));

      await createWorkbook(
        person.personId,
        person.name,
        manual.manualId,
        initializedGoals,
        initializedActivities
      );

      // Success - workbook will appear automatically via hook subscription
    } catch (error) {
      console.error('Error generating workbook:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate workbook');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || personLoading || workbookLoading || manualLoading) {
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

  if (!user || !person) {
    return null;
  }

  // If no workbook exists yet, show create prompt
  if (!workbook) {
    return (
      <MainLayout>
        <div className="relative">
        <header className="relative border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>

            <div className="flex items-center gap-6">
              <Link
                href={`/people/${personId}/manual`}
                className="font-mono text-3xl font-bold text-slate-800 hover:text-amber-600 transition-colors"
              >
                ←
              </Link>
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                  WEEKLY WORKBOOK SYSTEM
                </div>
                <h1 className="font-mono text-3xl font-bold text-slate-900">
                  {person.name}'s Operating Manual
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
          <div className="relative bg-white border-4 border-slate-800 p-12 shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-600"></div>

            <div className="text-center">
              <div className="text-8xl mb-6">📋</div>
              <div className="inline-block px-4 py-2 bg-slate-800 text-white font-mono text-sm mb-4">
                STATUS: NO ACTIVE WORKBOOK
              </div>
              <h2 className="font-mono text-3xl font-bold mb-6">
                Workbook Not Initialized
              </h2>
              <p className="text-lg text-slate-700 mb-8 max-w-md mx-auto leading-relaxed">
                Create a weekly workbook to begin tracking parent behavior goals and interactive activities with {person.name}.
              </p>

              {/* Error messages */}
              {(workbookError || generationError) && (
                <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 font-mono text-sm text-red-800">
                  ERROR: {generationError || workbookError}
                </div>
              )}

              {/* Manual required warning */}
              {!manual && !manualLoading && (
                <div className="bg-amber-50 border-2 border-amber-600 p-4 mb-6 font-mono text-sm text-amber-800">
                  ⚠️ Manual required to generate workbook
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleGenerateWorkbook}
                  disabled={generating || !manual || manualLoading}
                  className="px-8 py-4 bg-emerald-600 text-white font-mono font-bold hover:bg-emerald-700 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="generate-workbook-button"
                >
                  {generating ? 'GENERATING WORKBOOK...' : '⚡ GENERATE THIS WEEK\'S WORKBOOK'}
                </button>
                <Link
                  href={`/people/${personId}/manual`}
                  className="inline-block px-8 py-4 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="return-to-manual-button"
                >
                  RETURN TO MANUAL →
                </Link>
              </div>

              {/* Generation help text */}
              {generating && (
                <p className="mt-6 text-sm font-mono text-slate-600">
                  AI analyzing manual content to generate personalized goals and activities...
                </p>
              )}
            </div>
          </div>
        </main>
        </div>
      </MainLayout>
    );
  }

  // Calculate progress
  const totalGoals = workbook.parentGoals.length;
  const goalsWithProgress = workbook.parentGoals.map(goal => {
    const completionLog = goal.completionLog || [];
    const completionsToday = completionLog.filter(log => {
      const logDate = log.date.toDate();
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    });
    const completedToday = completionsToday.some(log => log.completed);
    const totalCompletions = completionLog.filter(log => log.completed).length;
    return { goal, completedToday, totalCompletions };
  });

  const completedActivities = workbook.dailyActivities.filter(a => a.completed).length;
  const totalActivities = workbook.dailyActivities.length;

  const weekStart = workbook.startDate.toDate();
  const weekEnd = workbook.endDate.toDate();
  const daysInWeek = Math.ceil((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysCompleted = Math.min(Math.ceil((new Date().getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)), daysInWeek);
  const progressPercent = Math.min((daysCompleted / daysInWeek) * 100, 100);

  const handleLogGoal = async (goalId: string, completed: boolean) => {
    if (!workbook) return;

    // Trigger stamp animation
    setAnimatingGoals(prev => new Set(prev).add(goalId));
    setTimeout(() => {
      setAnimatingGoals(prev => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }, 600);

    try {
      await logGoalCompletion(workbook.workbookId, goalId, completed);
    } catch (error) {
      console.error('Error logging goal:', error);
      alert('Failed to log goal completion');
    }
  };

  const handleSaveReflection = async () => {
    if (!workbook || !user) return;

    setSaving(true);
    try {
      const fullReflection: WeeklyReflection = {
        whatWorkedWell: reflection.whatWorkedWell || '',
        whatWasChallenging: reflection.whatWasChallenging || '',
        insightsLearned: reflection.insightsLearned || '',
        adjustmentsForNextWeek: reflection.adjustmentsForNextWeek || '',
        completedDate: Timestamp.now(),
        completedBy: user.userId
      };

      await saveReflection(workbook.workbookId, fullReflection);
      await completeWorkbook(workbook.workbookId);

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
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-purple-600"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-purple-600"></div>

          <div className="flex items-center gap-6 mb-6">
            <Link
              href={`/people/${personId}/manual`}
              className="font-mono text-3xl font-bold text-slate-800 hover:text-purple-600 transition-colors"
              data-testid="back-to-manual-button"
            >
              ←
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs">
                  WEEK {workbook.weekNumber}
                </div>
                <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs">
                  STATUS: ACTIVE
                </div>
              </div>
              <h1 className="font-mono text-3xl font-bold text-slate-900">
                {person.name}'s Weekly Workbook
              </h1>
              <p className="font-mono text-sm text-slate-600 mt-1" data-testid="week-date-range">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Technical gauge progress */}
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-sm font-bold text-slate-800">WEEK PROGRESS</span>
              <span className="font-mono text-sm text-slate-600">
                DAY {daysCompleted} / {daysInWeek}
              </span>
            </div>
            <div className="relative h-8 bg-slate-200 border-2 border-slate-800 overflow-hidden">
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 1px, transparent 1px, transparent 20px)'
              }}></div>

              {/* Progress fill */}
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercent}%` }}
                data-testid="progress-bar"
              >
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
                }}></div>
              </div>

              {/* Needle indicator */}
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

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        {/* Weekly Focus - Technical specification card */}
        <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-600"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-600"></div>

          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-4">
            SPECIFICATION: WEEKLY FOCUS
          </div>
          <p className="text-xl leading-relaxed text-slate-800">
            {workbook.parentGoals[0]?.description || 'Parent behavior goals for this week'}
          </p>
        </div>

        {/* Parent Goals - Checklist with stamp animation */}
        <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                SECTION 2: PARENT BEHAVIOR GOALS
              </div>
              <p className="font-mono text-sm text-slate-600">Track your own behavior changes</p>
            </div>
          </div>

          <div className="space-y-4">
            {goalsWithProgress.map(({ goal, completedToday, totalCompletions }, index) => (
              <div
                key={goal.id}
                className="relative border-2 border-slate-300 bg-slate-50 p-6 hover:border-slate-400 transition-colors"
                data-testid="goal-card"
              >
                {/* Goal number label */}
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                  {index + 1}
                </div>

                <div className="flex items-start gap-6">
                  {/* Checkbox with stamp animation */}
                  <button
                    onClick={() => handleLogGoal(goal.id, !completedToday)}
                    className="relative flex-shrink-0 w-16 h-16 border-4 border-slate-800 hover:border-amber-600 transition-all group"
                    style={{
                      backgroundColor: completedToday ? '#059669' : 'white'
                    }}
                    data-testid="goal-checkbox"
                  >
                    {completedToday && (
                      <div className={`absolute inset-0 flex items-center justify-center ${animatingGoals.has(goal.id) ? 'stamp-animation' : ''}`}>
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
                    <p className="font-mono text-lg font-bold mb-2 text-slate-900">
                      {goal.description}
                    </p>
                    <div className="flex items-center gap-6 font-mono text-sm text-slate-600">
                      <span>TARGET: {goal.targetFrequency}</span>
                      <span>|</span>
                      <span>COMPLETED: {totalCompletions}x</span>
                    </div>
                  </div>

                  {completedToday && (
                    <div className="flex-shrink-0">
                      <div className="px-3 py-1 bg-green-600 text-white font-mono text-xs font-bold">
                        ✓ TODAY
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activities - Blueprint card grid */}
        <div className="relative bg-white border-4 border-slate-800 p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-600"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-600"></div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                SECTION 3: INTERACTIVE ACTIVITIES
              </div>
              <p className="font-mono text-sm text-slate-600">Complete with {person.name}</p>
            </div>
            <div className="font-mono text-sm text-slate-600">
              {completedActivities} / {totalActivities} COMPLETE
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workbook.dailyActivities.map((activity, index) => {
              const template = ACTIVITY_TEMPLATES[activity.type];
              return (
                <Link
                  key={activity.id}
                  href={`/people/${personId}/workbook/activities/${activity.id}`}
                  className="relative group"
                  data-testid="activity-card"
                >
                  <div className={`border-4 p-6 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    activity.completed
                      ? 'border-green-600 bg-green-50'
                      : 'border-slate-400 bg-white hover:border-amber-600'
                  }`}>
                    {/* Activity number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 text-white font-mono text-sm font-bold flex items-center justify-center border-2 border-amber-600">
                      {index + 1}
                    </div>

                    <div className="text-5xl mb-4">{template.emoji}</div>
                    <h3 className="font-mono font-bold text-lg mb-2 text-slate-900">
                      {template.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      {template.description}
                    </p>
                    <div className="font-mono text-xs text-slate-500">
                      {template.estimatedMinutes} MIN • AGES {template.ageAppropriate.minAge}
                      {template.ageAppropriate.maxAge ? `-${template.ageAppropriate.maxAge}` : '+'}
                    </div>

                    {activity.completed && (
                      <div className="absolute top-4 right-4 w-16 h-16 rotate-12">
                        <div className="w-full h-full rounded-full border-4 border-green-600 bg-green-600 flex items-center justify-center font-mono text-white text-2xl font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Weekly Reflection */}
        {daysCompleted >= daysInWeek && !workbook.weeklyReflection && (
          <div className="relative bg-amber-50 border-4 border-amber-600 p-8 shadow-[6px_6px_0px_0px_rgba(217,119,6,1)]" data-testid="reflection-section">
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
                  data-testid="begin-reflection-button"
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
                  { key: 'adjustmentsForNextWeek', label: 'Adjustments for next week', placeholder: 'Modifications to approach...' }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block font-mono font-bold mb-2 text-slate-900 text-sm uppercase tracking-wide">
                      {field.label}
                    </label>
                    <textarea
                      value={String(reflection[field.key as keyof typeof reflection] || '')}
                      onChange={(e) => setReflection(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full p-4 border-2 border-slate-800 font-mono text-sm focus:outline-none focus:border-amber-600 bg-white"
                      rows={4}
                      placeholder={field.placeholder}
                      data-testid={`${field.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => setShowReflection(false)}
                    disabled={saving}
                    className="px-6 py-3 border-2 border-slate-800 font-mono font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                    data-testid="cancel-reflection-button"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveReflection}
                    disabled={saving}
                    className="px-8 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    data-testid="complete-week-button"
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
          <div className="relative bg-green-50 border-4 border-green-600 p-8 shadow-[6px_6px_0px_0px_rgba(5,150,105,1)]" data-testid="completed-section">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-slate-800"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-slate-800"></div>

            <div className="inline-block px-3 py-1 bg-green-600 text-white font-mono text-xs mb-4">
              STATUS: COMPLETED
            </div>
            <h2 className="font-mono text-2xl font-bold mb-3 text-green-900">
              Week {workbook.weekNumber} Documentation Complete
            </h2>
            <p className="font-mono text-sm text-green-800 mb-6" data-testid="completion-date">
              Completed: {workbook.weeklyReflection.completedDate.toDate().toLocaleDateString()}
            </p>
            <Link
              href={`/people/${personId}/manual`}
              className="inline-block px-8 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-green-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              data-testid="generate-next-cycle-button"
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
