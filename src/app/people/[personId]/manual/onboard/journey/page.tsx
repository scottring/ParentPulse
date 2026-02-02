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
  const [showGraduation, setShowGraduation] = useState(false);

  // Fetch manual
  useEffect(() => {
    async function fetchManual() {
      if (!user || !personId) return;

      setLoadingManual(true);
      try {
        // Try person_manuals collection first
        const manualRef = doc(firestore, 'person_manuals', personId);
        const manualSnap = await getDoc(manualRef);

        if (manualSnap.exists()) {
          setManual(manualSnap.data() as PersonManual);
        } else {
          // Try child_manuals as fallback
          const childManualRef = doc(firestore, 'child_manuals', personId);
          const childManualSnap = await getDoc(childManualRef);

          if (childManualSnap.exists()) {
            setManual(childManualSnap.data() as PersonManual);
          }
        }
      } catch (err) {
        console.error('Error fetching manual:', err);
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-red-200 p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            Error Loading Journey
          </h2>
          <p className="font-mono text-sm text-slate-600 mb-4">{error}</p>
          <TechnicalButton
            variant="outline"
            onClick={() => router.push(`/people/${personId}/manual`)}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Manual
          </TechnicalButton>
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
