'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { OnboardingPhaseId } from '@/types/user';

const ALL_PHASES: OnboardingPhaseId[] = ['foundation', 'relationships', 'operations', 'strategy'];

export default function OnboardingHub() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const currentPhase = user.onboardingStatus?.currentPhase;
    if (currentPhase) {
      router.replace(`/onboarding/${currentPhase}`);
    } else {
      const completed = user.onboardingStatus?.phasesCompleted ?? [];
      const nextPhase = ALL_PHASES.find(p => !completed.includes(p));

      if (nextPhase) {
        router.replace(`/onboarding/${nextPhase}`);
      } else if (!user.onboardingStatus?.launchCompleted) {
        router.replace('/onboarding/launch');
      } else {
        router.replace('/bookshelf');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-stone-400">Preparing your conversation...</div>
    </div>
  );
}
