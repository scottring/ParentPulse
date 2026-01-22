'use client';

/**
 * Workbook Hub Page
 *
 * Selector page for choosing between parent workbook and child storybook
 */

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useParentWorkbook } from '@/hooks/useParentWorkbook';
import { useChildWorkbook } from '@/hooks/useChildWorkbook';
import { functions } from '@/lib/firebase';
import MainLayout from '@/components/layout/MainLayout';
import { shouldUserUseTestMode } from '@/utils/workbook-test-mode';

export default function WorkbookHubPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { workbook: parentWorkbook, loading: parentLoading, refreshWorkbook: refreshParent } = useParentWorkbook(personId);
  const { workbook: childWorkbook, loading: childLoading, refreshWorkbook: refreshChild } = useChildWorkbook(personId);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  const loading = authLoading || personLoading || manualLoading || parentLoading || childLoading;

  // Function to generate workbook
  const handleGenerateWorkbook = async () => {
    if (!manual || !person || !user) {
      setGenerateError('Missing required data to generate workbook');
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    try {
      const generateWeeklyWorkbooks = httpsCallable(functions, 'generateWeeklyWorkbooks', {
        timeout: 540000 // 9 minutes to match Cloud Function timeout
      });

      // Check if user should use test mode (demo account = free)
      const useTestMode = shouldUserUseTestMode(user);

      const result = await generateWeeklyWorkbooks({
        familyId: user.familyId,
        personId: personId,
        personName: person.name,
        personAge: person.dateOfBirth ?
          Math.floor((new Date().getTime() - person.dateOfBirth.toDate().getTime()) / (1000 * 60 * 60 * 24 * 365.25)) :
          undefined,
        manualId: manual.manualId,
        relationshipType: manual.relationshipType,
        triggers: manual.triggers || [],
        whatWorks: manual.whatWorks || [],
        whatDoesntWork: manual.whatDoesntWork || [],
        boundaries: manual.boundaries || [],
        coreInfo: manual.coreInfo || {},
        assessmentScores: (manual as any).assessmentScores || null,
        testMode: useTestMode, // Auto-detects demo users for free generation
        tier: 'standard' // Using standard tier (Claude Haiku + DALL-E 3)
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate workbook');
      }

      // Refresh both workbooks
      await Promise.all([refreshParent(), refreshChild()]);

      // Workbooks will auto-load via the hooks
    } catch (err) {
      console.error('Error generating workbook:', err);
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate workbook');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="manual-spinner"></div>
            <p className="mt-4 font-mono text-sm text-slate-600">Loading workbooks...</p>
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

  if (!person) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-16 px-6 text-center">
          <p className="font-mono text-lg text-slate-600">Person not found</p>
        </div>
      </MainLayout>
    );
  }

  // If no workbooks exist, show generate option
  if (!parentWorkbook && !childWorkbook) {
    // Check if manual exists
    if (!manual) {
      return (
        <MainLayout>
          <div className="max-w-4xl mx-auto py-16 px-6">
            <div className="relative bg-white border-4 border-slate-800 p-12 shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-600"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-600"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-600"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-600"></div>

              <div className="text-center">
                <div className="text-8xl mb-6">📋</div>
                <div className="inline-block px-4 py-2 bg-slate-800 text-white font-mono text-sm mb-4">
                  STATUS: NO MANUAL FOUND
                </div>
                <h2 className="font-mono text-3xl font-bold mb-6">
                  Create a Manual First
                </h2>
                <p className="text-lg text-slate-700 mb-8 max-w-md mx-auto leading-relaxed">
                  You need to create {person.name}'s manual before generating a workbook.
                </p>

                <Link
                  href={`/people/${personId}/create-manual`}
                  className="inline-block px-8 py-4 bg-emerald-600 text-white font-mono font-bold hover:bg-emerald-700 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  CREATE MANUAL →
                </Link>
              </div>
            </div>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-16 px-6">
          <div className="relative bg-white border-4 border-slate-800 p-12 shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-600"></div>

            <div className="text-center">
              <div className="text-8xl mb-6">📋</div>
              <div className="inline-block px-4 py-2 bg-slate-800 text-white font-mono text-sm mb-4">
                STATUS: NO ACTIVE WORKBOOKS
              </div>
              <h2 className="font-mono text-3xl font-bold mb-6">
                No Active Weekly Workbooks
              </h2>
              <p className="text-lg text-slate-700 mb-8 max-w-md mx-auto leading-relaxed">
                Generate weekly workbooks from {person.name}'s manual: a parent workbook for tracking behavior goals, and a child storybook with AI-generated illustrations.
              </p>

              {generateError && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-600 text-red-900 font-mono text-sm">
                  <strong>Error:</strong> {generateError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleGenerateWorkbook}
                  disabled={generating}
                  className="px-8 py-4 bg-purple-600 text-white font-mono font-bold hover:bg-purple-700 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'GENERATING WORKBOOKS...' : 'GENERATE WORKBOOKS'}
                </button>

                <Link
                  href={`/people/${personId}/manual`}
                  className="inline-block px-8 py-4 bg-slate-600 text-white font-mono font-bold hover:bg-slate-700 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  GO TO MANUAL →
                </Link>
              </div>

              {generating && (
                <div className="mt-8">
                  <div className="manual-spinner mx-auto"></div>
                  <p className="mt-4 font-mono text-sm text-slate-600">
                    Generating both parent and child workbooks with AI (this may take 1-2 minutes)...
                  </p>
                </div>
              )}
            </div>
          </div>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative">
        {/* Header */}
        <header className="relative border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-purple-600"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-purple-600"></div>

            <div className="flex items-center gap-6">
              <Link
                href={`/people/${personId}/manual`}
                className="font-mono text-3xl font-bold text-slate-800 hover:text-purple-600 transition-colors"
              >
                ←
              </Link>
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                  DUAL WORKBOOK SYSTEM
                </div>
                <h1 className="font-mono text-3xl font-bold text-slate-900">
                  {person.name}'s Weekly Workbooks
                </h1>
                {parentWorkbook && (
                  <p className="font-mono text-sm text-slate-600 mt-1">
                    Week {parentWorkbook.weekNumber} • {parentWorkbook.startDate.toDate().toLocaleDateString()} - {parentWorkbook.endDate.toDate().toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Parent Workbook Card */}
            {parentWorkbook && (
              <Link
                href={`/people/${personId}/workbook/parent`}
                className="group"
              >
                <div className="relative bg-white border-4 border-slate-800 p-8 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-600"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-600"></div>

                  <div className="text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3">
                      FOR PARENTS
                    </div>
                    <h2 className="font-mono text-2xl font-bold mb-3">
                      PARENT WORKBOOK
                    </h2>
                    <p className="text-slate-600 mb-6">
                      Behavior goals, daily strategies, weekly reflection
                    </p>

                    {/* Progress indicators */}
                    <div className="border-t-2 border-slate-200 pt-4 space-y-2">
                      <div className="font-mono text-xs text-slate-600">
                        {parentWorkbook.parentGoals.length} Goals • {parentWorkbook.dailyStrategies.filter(s => s.completed).length}/{parentWorkbook.dailyStrategies.length} Strategies
                      </div>
                      <div className="font-mono text-xs text-emerald-600 font-bold">
                        Child: {parentWorkbook.childProgressSummary.storiesRead}/7 Stories Read
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Child Workbook Card */}
            {childWorkbook && (
              <Link
                href={`/people/${personId}/workbook/child`}
                className="group"
              >
                <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-600 p-8 hover:shadow-[8px_8px_0px_0px_rgba(147,51,234,1)] transition-all">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-600"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-600"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-600"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-600"></div>

                  <div className="text-center">
                    <div className="text-6xl mb-4">📖</div>
                    <div className="inline-block px-3 py-1 bg-purple-600 text-white font-mono text-xs mb-3">
                      FOR {person.name.toUpperCase()}
                    </div>
                    <h2 className="font-serif text-2xl font-bold mb-3 text-purple-900">
                      {person.name}'s Storybook
                    </h2>
                    <p className="text-purple-700 mb-6">
                      Weekly story, activities, and adventures
                    </p>

                    {/* Story info */}
                    <div className="border-t-2 border-purple-200 pt-4 space-y-2">
                      <div className="font-serif text-sm font-bold text-purple-900">
                        "{childWorkbook.weeklyStory.title}"
                      </div>
                      <div className="font-serif text-xs text-purple-600">
                        featuring {childWorkbook.weeklyStory.characterName}
                      </div>
                      <div className="font-mono text-xs text-purple-600 font-bold mt-2">
                        Day {childWorkbook.storyProgress.currentDay} of 7
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-amber-50 border-2 border-amber-600 p-6">
            <div className="font-mono text-xs font-bold text-amber-900 mb-2">
              💡 HOW IT WORKS
            </div>
            <ul className="space-y-2 text-sm text-amber-900">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold">1.</span>
                <span><strong>Parent Workbook:</strong> Track your behavior goals and daily parenting strategies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold">2.</span>
                <span><strong>Child Storybook:</strong> {person.name} reads the weekly story and completes activities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold">3.</span>
                <span><strong>Connected Progress:</strong> Both workbooks sync - you see {person.name}'s story progress in your workbook</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
