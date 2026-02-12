'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useManual } from '@/hooks/useManual';
import { useYearbook } from '@/hooks/useYearbook';
import { useEntries } from '@/hooks/useEntries';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { ManualSummary } from '@/components/onboarding/ManualSummary';
import { GenerationProgress } from '@/components/onboarding/GenerationProgress';
import { EntryCard } from '@/components/entry/EntryCard';
import { PHASE_DOMAINS, ONBOARDING_PHASES, PHASE_NAMES } from '@/types/manual';
import type { DomainId } from '@/types/user';

type Stage = 'summary' | 'generating' | 'preview';

export default function LaunchPage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth();
  const router = useRouter();
  const { manuals, loading: manualsLoading } = useManual();
  const { getOrCreateYearbook } = useYearbook();

  const [stage, setStage] = useState<Stage>('summary');
  const [yearbookId, setYearbookId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const entriesOptions = useMemo(
    () => (yearbookId ? { yearbookId } : {}),
    [yearbookId]
  );
  const { entries, loading: entriesLoading } = useEntries(entriesOptions);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // If user already completed launch, send them to bookshelf
  useEffect(() => {
    if (user?.onboardingStatus?.launchCompleted) {
      router.replace('/bookshelf');
    }
  }, [user, router]);

  const householdManual = manuals.find(m => m.type === 'household');

  // Compute which domains are populated based on completed phases
  const completedPhases = user?.onboardingStatus?.phasesCompleted ?? [];
  const completedDomains: DomainId[] = [...new Set(
    completedPhases.flatMap(phaseId => PHASE_DOMAINS[phaseId] ?? [])
  )];

  // Remaining phases for the "continue" option
  const remainingPhases = ONBOARDING_PHASES.filter(p => !completedPhases.includes(p.id));
  const nextPhase = remainingPhases[0] ?? null;

  const handleGenerate = useCallback(async () => {
    if (!user || !householdManual) return;

    setStage('generating');
    setGenerationError(null);

    try {
      const ybId = await getOrCreateYearbook(user.userId);
      setYearbookId(ybId);

      const generateFn = httpsCallable(functions, 'generateYearbookContent');
      await generateFn({
        familyId: user.familyId,
        personId: user.userId,
        yearbookId: ybId,
        manualId: householdManual.manualId,
        entryTypes: ['story', 'activity', 'reflection', 'discussion', 'goal', 'insight'],
      });

      setStage('preview');
    } catch (err) {
      console.error('Failed to generate yearbook content:', err);
      setGenerationError('Something went wrong generating your yearbook. Let\u2019s try again.');
      setStage('summary');
    }
  }, [user, householdManual, getOrCreateYearbook]);

  const handleComplete = useCallback(async (destination: 'yearbook' | 'bookshelf') => {
    if (!user) return;

    await updateUserProfile({
      onboardingStatus: {
        ...user.onboardingStatus,
        launchCompleted: true,
      },
    });

    if (destination === 'yearbook') {
      router.push(`/yearbook/${user.userId}`);
    } else {
      router.push('/bookshelf');
    }
  }, [user, updateUserProfile, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  // Show entries once they arrive (real-time listener will pick them up)
  const previewEntries = entries.slice(0, 4);
  const showPreviewContent = stage === 'preview' && !entriesLoading && previewEntries.length > 0;

  const phaseCount = completedPhases.length;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* ==================== Stage 1: Manual Summary ==================== */}
        {stage === 'summary' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-stone-900 heading mb-3">
                Your Family&apos;s Operating Manual
              </h1>
              <p className="text-stone-500 leading-relaxed max-w-md mx-auto">
                {phaseCount === 4
                  ? "Across four conversations, we mapped your family across every domain. Here\u2019s what we captured."
                  : `Across ${phaseCount} conversation${phaseCount === 1 ? '' : 's'}, we\u2019ve started mapping your family. Here\u2019s what we captured so far.`
                }
              </p>
            </div>

            {manualsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse text-stone-400">Loading your manual...</div>
              </div>
            ) : householdManual ? (
              <ManualSummary manual={householdManual} completedDomains={completedDomains} />
            ) : (
              <div className="text-center py-12 text-stone-400">
                Manual not found. Please complete onboarding first.
              </div>
            )}

            {generationError && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {generationError}
              </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-stone-600 mb-6 leading-relaxed">
                This is who you are on paper. Now let&apos;s bring it to life &mdash;
                personalized stories, activities, discussions, and reflections built from your own words.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={!householdManual || manualsLoading}
                  className="px-8 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 text-lg font-medium"
                >
                  Bring it to life
                </button>
                {nextPhase && (
                  <button
                    onClick={() => router.push(`/onboarding/${nextPhase.id}`)}
                    className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-medium"
                  >
                    Continue to {PHASE_NAMES[nextPhase.id]}
                    <span className="block text-xs text-stone-400 mt-0.5">
                      {remainingPhases.length} {remainingPhases.length === 1 ? 'conversation' : 'conversations'} remaining
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== Stage 2: Generation Loading ==================== */}
        {stage === 'generating' && (
          <div className="animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-stone-900 heading">
                Creating your yearbook
              </h2>
            </div>
            <GenerationProgress />
          </div>
        )}

        {/* ==================== Stage 3: Entry Preview ==================== */}
        {stage === 'preview' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-900 heading mb-3">
                Here&apos;s a taste
              </h2>
              <p className="text-stone-500">
                We created {entries.length} personalized entries for your family&apos;s yearbook.
                Here are a few to get you started.
              </p>
            </div>

            {entriesLoading && previewEntries.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse text-stone-400">Loading entries...</div>
              </div>
            ) : showPreviewContent ? (
              <div className="space-y-4">
                {previewEntries.map((entry, index) => (
                  <div
                    key={entry.entryId}
                    className="animate-fade-in-staggered"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <EntryCard
                      entry={entry}
                      personId={user.userId}
                      compact
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400">
                Your entries are being prepared...
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => handleComplete('yearbook')}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-100 font-medium"
              >
                Explore your yearbook
              </button>
              <button
                onClick={() => handleComplete('bookshelf')}
                className="px-8 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 font-medium"
              >
                Go to your bookshelf
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
