'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { PHASE_NAMES, PHASE_DESCRIPTIONS, ONBOARDING_PHASES } from '@/types/manual';
import type { OnboardingPhaseId } from '@/types/user';
import { useConversation } from '@/hooks/useConversation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ConversationView } from '@/components/onboarding/ConversationView';
import { LayerProgress } from '@/components/onboarding/LayerProgress';
import { SynthesisReview } from '@/components/onboarding/SynthesisReview';

const VALID_PHASES: OnboardingPhaseId[] = ['foundation', 'relationships', 'operations', 'strategy'];
const MIN_PHASES_FOR_LAUNCH = 2;

export default function OnboardingPhasePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const phaseId = params.layerId as OnboardingPhaseId;

  const { turns, isLoading: convLoading, error: convError, lastResponse, startConversation, sendMessage } = useConversation();
  const { savePhaseData, completePhase, getNextPhase, getPreviousPhaseData } = useOnboarding();

  const [phase, setPhase] = useState<'conversation' | 'review' | 'choose-next'>('conversation');
  const [isSaving, setIsSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const [savedNextPhase, setSavedNextPhase] = useState<OnboardingPhaseId | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !started && VALID_PHASES.includes(phaseId)) {
      setStarted(true);
      getPreviousPhaseData().then(prevDomains => {
        startConversation(phaseId, user.familyId, prevDomains);
      });
    }
  }, [user, phaseId, started, startConversation, getPreviousPhaseData]);

  useEffect(() => {
    if (lastResponse?.type === 'synthesis' && lastResponse.structuredData) {
      setPhase('review');
    }
  }, [lastResponse]);

  const handleSendMessage = useCallback(async (message: string) => {
    await sendMessage(message);
  }, [sendMessage]);

  const handleApprove = useCallback(async (editedData?: Record<string, unknown>) => {
    const dataToSave = editedData || lastResponse?.structuredData;
    if (!dataToSave) return;
    setIsSaving(true);
    try {
      await savePhaseData(phaseId, dataToSave);
      await completePhase(phaseId);

      // Compute next phase from what we KNOW is now complete
      // (can't rely on getNextPhase() — stale closure after refreshUser)
      const completedAfterThis = [...(user?.onboardingStatus?.phasesCompleted ?? []), phaseId];
      const next = VALID_PHASES.find(p => !completedAfterThis.includes(p)) ?? null;

      if (!next) {
        // All phases done — go straight to launch
        router.push('/onboarding/launch');
      } else if (completedAfterThis.length >= MIN_PHASES_FOR_LAUNCH) {
        // Minimum met — offer choice
        setSavedNextPhase(next);
        setPhase('choose-next');
      } else {
        // Not enough yet — auto-advance
        router.push(`/onboarding/${next}`);
      }
    } catch (err) {
      console.error('Failed to save phase:', err);
    } finally {
      setIsSaving(false);
    }
  }, [lastResponse, phaseId, savePhaseData, completePhase, router, user]);

  const handleEdit = useCallback(() => {
    setPhase('conversation');
  }, []);

  if (!VALID_PHASES.includes(phaseId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Invalid phase. Redirecting...</p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  const completedPhases = user.onboardingStatus?.phasesCompleted ?? [];

  // Count remaining phases (excluding the one we just finished)
  const remainingPhases = ONBOARDING_PHASES.filter(
    p => !completedPhases.includes(p.id) && p.id !== phaseId
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {phase !== 'choose-next' && (
        <div className="border-b border-stone-200 bg-white px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-stone-900 heading">
                {PHASE_NAMES[phaseId]}
              </h1>
              <p className="text-xs text-stone-400">{PHASE_DESCRIPTIONS[phaseId]}</p>
            </div>
            <LayerProgress completedPhases={completedPhases} currentPhase={phaseId} />
          </div>
        </div>
      )}

      {/* Error */}
      {convError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700 max-w-2xl mx-auto">{convError}</p>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        {phase === 'conversation' ? (
          <ConversationView
            turns={turns}
            isLoading={convLoading}
            onSendMessage={handleSendMessage}
            phaseId={phaseId}
          />
        ) : phase === 'review' && lastResponse?.structuredData ? (
          <div className="p-4">
            <SynthesisReview
              phaseId={phaseId}
              summary={lastResponse.message}
              structuredData={lastResponse.structuredData}
              onApprove={handleApprove}
              onEdit={handleEdit}
              isLoading={isSaving}
            />
          </div>
        ) : phase === 'choose-next' ? (
          <div className="p-4">
            <ChooseNextStep
              nextPhase={savedNextPhase}
              remainingCount={remainingPhases.length}
              onContinue={() => {
                if (savedNextPhase) router.push(`/onboarding/${savedNextPhase}`);
              }}
              onLaunch={() => router.push('/onboarding/launch')}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChooseNextStep({
  nextPhase,
  remainingCount,
  onContinue,
  onLaunch,
}: {
  nextPhase: OnboardingPhaseId | null;
  remainingCount: number;
  onContinue: () => void;
  onLaunch: () => void;
}) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center text-center py-12 px-4">
      <h2 className="text-2xl font-bold text-stone-900 heading mb-3">
        Nice work
      </h2>
      <p className="text-stone-500 leading-relaxed max-w-md mb-10">
        You&apos;ve covered enough ground to bring your manual to life.
        You can generate your first yearbook entries now, or keep going to make them even richer.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={onLaunch}
          className="flex-1 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 font-medium"
        >
          Bring it to life
        </button>
        {nextPhase && (
          <button
            onClick={onContinue}
            className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-medium"
          >
            Continue to {PHASE_NAMES[nextPhase]}
            <span className="block text-xs text-stone-400 mt-0.5">
              {remainingCount} {remainingCount === 1 ? 'phase' : 'phases'} remaining
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
