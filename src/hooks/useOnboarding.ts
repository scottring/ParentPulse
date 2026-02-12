import { useCallback, useRef } from 'react';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, collection } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { OnboardingPhaseId, DomainId } from '@/types/user';
import type { Manual } from '@/types/manual';
import { emptyDomains, ONBOARDING_PHASES, PHASE_DOMAINS } from '@/types/manual';

const PHASE_ORDER: OnboardingPhaseId[] = ['foundation', 'relationships', 'operations', 'strategy'];

interface UseOnboardingReturn {
  savePhaseData: (phaseId: OnboardingPhaseId, data: Record<string, unknown>) => Promise<void>;
  completePhase: (phaseId: OnboardingPhaseId) => Promise<void>;
  getNextPhase: () => OnboardingPhaseId | null;
  isPhaseComplete: (phaseId: OnboardingPhaseId) => boolean;
  isOnboardingComplete: boolean;
  getPreviousPhaseData: () => Promise<Record<string, unknown>>;
}

export function useOnboarding(): UseOnboardingReturn {
  const { user, updateUserProfile, refreshUser } = useAuth();

  const completedPhases = user?.onboardingStatus?.phasesCompleted ?? [];
  const familyManualId = user?.onboardingStatus?.familyManualId ?? null;

  const manualIdRef = useRef<string | null>(familyManualId);
  if (familyManualId && manualIdRef.current !== familyManualId) {
    manualIdRef.current = familyManualId;
  }

  const isPhaseComplete = useCallback((phaseId: OnboardingPhaseId) => {
    return completedPhases.includes(phaseId);
  }, [completedPhases]);

  const isOnboardingComplete = completedPhases.length >= 2; // Foundation + Relationships minimum

  const getNextPhase = useCallback((): OnboardingPhaseId | null => {
    return PHASE_ORDER.find(p => !completedPhases.includes(p)) ?? null;
  }, [completedPhases]);

  const getOrCreateManual = useCallback(async (): Promise<string> => {
    if (manualIdRef.current) return manualIdRef.current;
    if (!user) throw new Error('No user');

    const manualRef = doc(collection(firestore, COLLECTIONS.MANUALS));
    const manual: Manual = {
      manualId: manualRef.id,
      familyId: user.familyId,
      type: 'household',
      title: 'Our Family',
      subtitle: 'The operating manual for how we do things',
      domains: emptyDomains,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(manualRef, manual);
    manualIdRef.current = manualRef.id;
    return manualRef.id;
  }, [user]);

  const savePhaseData = useCallback(async (phaseId: OnboardingPhaseId, data: Record<string, unknown>) => {
    if (!user) throw new Error('No user');

    const manualId = await getOrCreateManual();
    const manualRef = doc(firestore, COLLECTIONS.MANUALS, manualId);

    // Each phase covers 2 domains — data should have keys for each domain
    const domains = PHASE_DOMAINS[phaseId];
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    for (const domainId of domains) {
      if (data[domainId]) {
        updates[`domains.${domainId}`] = data[domainId];
        updates[`domainMeta.${domainId}`] = {
          updatedAt: serverTimestamp(),
          updatedBy: 'onboarding',
        };
      }
    }

    await updateDoc(manualRef, updates);
  }, [user, getOrCreateManual]);

  const completePhase = useCallback(async (phaseId: OnboardingPhaseId) => {
    if (!user) throw new Error('No user');

    const manualId = await getOrCreateManual();
    const newCompleted = completedPhases.includes(phaseId)
      ? completedPhases
      : [...completedPhases, phaseId];
    const nextPhase = PHASE_ORDER.find(p => !newCompleted.includes(p)) ?? null;

    await updateUserProfile({
      onboardingStatus: {
        introCompleted: true,
        phasesCompleted: newCompleted,
        currentPhase: nextPhase,
        familyManualId: manualId,
      },
    });

    await refreshUser();
  }, [user, completedPhases, getOrCreateManual, updateUserProfile, refreshUser]);

  const getPreviousPhaseData = useCallback(async (): Promise<Record<string, unknown>> => {
    if (!familyManualId) return {};

    try {
      const manualRef = doc(firestore, COLLECTIONS.MANUALS, familyManualId);
      const manualDoc = await getDoc(manualRef);

      if (!manualDoc.exists()) return {};

      const manual = manualDoc.data() as Manual;
      const result: Record<string, unknown> = {};

      // Return all completed domain data
      for (const phaseId of completedPhases) {
        const domains = PHASE_DOMAINS[phaseId];
        for (const domainId of domains) {
          result[domainId] = manual.domains[domainId];
        }
      }

      return result;
    } catch {
      return {};
    }
  }, [familyManualId, completedPhases]);

  return {
    savePhaseData,
    completePhase,
    getNextPhase,
    isPhaseComplete,
    isOnboardingComplete,
    getPreviousPhaseData,
  };
}
