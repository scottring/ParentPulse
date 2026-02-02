'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingJourney } from '@/hooks/useOnboardingJourney';
import type { LayerId } from '@/types/assessment';
import type { PersonManual } from '@/types/person-manual';
import JourneyOverview from '@/components/onboarding/JourneyOverview';
import GraduationCelebration from '@/components/onboarding/GraduationCelebration';
import { TechnicalButton } from '@/components/technical';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function ManualJourneyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const personId = params.personId as string;

  const [manual, setManual] = useState<PersonManual | null>(null);
  const [loadingManual, setLoadingManual] = useState(true);
  const [manualError, setManualError] = useState<string | null>(null);
  const [showGraduation, setShowGraduation] = useState(false);

  // Fetch manual
  useEffect(() => {
    async function fetchManual() {
      if (!user || !personId) return;

      // Check user permissions
      if (user.role !== 'parent' || !user.familyId) {
        setManualError('Permission denied: You need to be a parent with a family to access this page.');
        setLoadingManual(false);
        return;
      }

      setLoadingManual(true);
      setManualError(null);
      try {
        console.log('[Journey] Fetching manual for personId:', personId);
        // Try person_manuals collection first
        const manualRef = doc(firestore, 'person_manuals', personId);
        const manualSnap = await getDoc(manualRef);

        if (manualSnap.exists()) {
          console.log('[Journey] Found manual in person_manuals');
          setManual(manualSnap.data() as PersonManual);
        } else {
          // Try child_manuals as fallback
          console.log('[Journey] Manual not found in person_manuals, trying child_manuals');
          const childManualRef = doc(firestore, 'child_manuals', personId);
          const childManualSnap = await getDoc(childManualRef);

          if (childManualSnap.exists()) {
            console.log('[Journey] Found manual in child_manuals');
            setManual(childManualSnap.data() as PersonManual);
          } else {
            console.log('[Journey] Manual not found in either collection');
          }
        }
      } catch (err: unknown) {
        console.error('[Journey] Error fetching manual:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('permission')) {
          setManualError('Permission denied: Unable to access manual. Please check your user permissions.');
        } else {
          setManualError(`Error loading manual: ${errorMessage}`);
        }
      } finally {
        setLoadingManual(false);
      }
    }

    fetchManual();
  }, [user, personId]);

  // Initialize journey hook
  const {
    progress,
    loading: journeyLoading,
    error,
    isGraduated,
    initializeJourney,
    acknowledgeMilestone,
    graduate,
    canGraduate,
  } = useOnboardingJourney(
    manual?.manualId || personId,
    'person',
    personId
  );

  // Initialize journey if not exists
  useEffect(() => {
    if (!journeyLoading && !progress && manual) {
      initializeJourney();
    }
  }, [journeyLoading, progress, manual, initializeJourney]);

  // Handlers
  const handleStartLayer = (layerId: LayerId) => {
    router.push(`/people/${personId}/manual/onboard?layer=${layerId}`);
  };

  const handleContinueLayer = (layerId: LayerId) => {
    router.push(`/people/${personId}/manual/onboard?layer=${layerId}`);
  };

  const handleViewLayer = (layerId: LayerId) => {
    router.push(`/people/${personId}/manual?layer=${layerId}`);
  };

  const handleGraduate = async () => {
    await graduate();
    setShowGraduation(true);
  };

  const handleEnterLivingMode = () => {
    router.push(`/people/${personId}/manual`);
  };

  const handleViewManual = () => {
    router.push(`/people/${personId}/manual`);
  };

  // Loading state
  if (authLoading || loadingManual || journeyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500">Loading journey...</p>
        </div>
      </div>
    );
  }

  // Error state (manual error or journey error)
  if (error || manualError) {
    const errorMsg = manualError || error;
    const isPermissionError = errorMsg?.toLowerCase().includes('permission');

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-red-200 p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            {isPermissionError ? 'Permission Error' : 'Error Loading Journey'}
          </h2>
          <p className="font-mono text-sm text-slate-600 mb-4">{errorMsg}</p>
          {isPermissionError && (
            <div className="bg-amber-50 border border-amber-200 p-3 mb-4 text-left">
              <p className="font-mono text-xs text-amber-800 mb-2">
                <strong>To fix this:</strong>
              </p>
              <ol className="font-mono text-xs text-amber-700 list-decimal ml-4 space-y-1">
                <li>Go to Firebase Console → Firestore</li>
                <li>Find your user document in &quot;users&quot; collection</li>
                <li>Ensure you have: <code className="bg-amber-100 px-1">role: &quot;parent&quot;</code></li>
                <li>Ensure you have a valid <code className="bg-amber-100 px-1">familyId</code></li>
              </ol>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <TechnicalButton
              variant="outline"
              onClick={() => router.push(`/people/${personId}/manual`)}
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Manual
            </TechnicalButton>
            <TechnicalButton
              variant="outline"
              onClick={() => router.push('/walkthrough')}
            >
              Walkthrough Controls
            </TechnicalButton>
          </div>
        </div>
      </div>
    );
  }

  // No manual found
  if (!manual) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-slate-200 p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            Manual Not Found
          </h2>
          <p className="font-mono text-sm text-slate-600 mb-4">
            Please create a manual first before starting the onboarding journey.
          </p>
          <TechnicalButton
            variant="primary"
            onClick={() => router.push(`/people/${personId}/create-manual`)}
          >
            Create Manual
          </TechnicalButton>
        </div>
      </div>
    );
  }

  // Show graduation celebration
  if (showGraduation && progress) {
    return (
      <GraduationCelebration
        progress={progress}
        personName={manual.personName}
        onEnterLivingMode={handleEnterLivingMode}
        onViewManual={handleViewManual}
      />
    );
  }

  // Already graduated - redirect or show living mode
  if (isGraduated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-green-200 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 border-2 border-green-400 flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            Journey Complete!
          </h2>
          <p className="font-mono text-sm text-slate-600 mb-4">
            {manual.personName}&apos;s manual is now a living document.
          </p>
          <TechnicalButton variant="primary" onClick={handleViewManual}>
            View Living Manual
          </TechnicalButton>
        </div>
      </div>
    );
  }

  // Show journey overview
  if (!progress) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500">
            Initializing journey...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <button
          onClick={() => router.push(`/people/${personId}/manual`)}
          className="flex items-center gap-2 font-mono text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Manual
        </button>
      </div>

      {/* Journey Overview */}
      <JourneyOverview
        progress={progress}
        personName={manual.personName}
        onStartLayer={handleStartLayer}
        onContinueLayer={handleContinueLayer}
        onViewLayer={handleViewLayer}
        onGraduate={canGraduate ? handleGraduate : undefined}
        onAcknowledgeMilestone={acknowledgeMilestone}
      />
    </div>
  );
}
