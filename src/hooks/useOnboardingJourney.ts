'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { LayerId } from '@/types/assessment';
import type { RespondentType } from '@/types/multi-perspective';
import type {
  OnboardingProgress,
  LayerOnboardingStatus,
  OnboardingMilestone,
  OnboardingManualType,
} from '@/types/onboarding-progress';
import { DEFAULT_LAYER_ORDER } from '@/types/onboarding-progress';
import {
  getLayerRequirements,
  getLayerRequirement,
} from '@/config/layer-requirements';
import {
  getMilestonesForManualType,
  checkNewlyAchievedMilestones,
  getMilestoneProgress,
  getCelebrationMessage,
} from '@/config/onboarding-milestones';

const PROGRESS_COLLECTION = 'onboarding_progress';

// ==================== Types ====================

interface UseOnboardingJourneyReturn {
  // Progress data
  progress: OnboardingProgress | null;
  loading: boolean;
  error: string | null;
  isGraduated: boolean;

  // Layer operations
  getCurrentLayer: () => LayerOnboardingStatus | null;
  getLayerStatus: (layerId: LayerId) => LayerOnboardingStatus | null;
  updateLayerProgress: (
    layerId: LayerId,
    updates: Partial<LayerOnboardingStatus>
  ) => Promise<void>;
  markLayerComplete: (layerId: LayerId) => Promise<void>;

  // Content tracking
  addLayerContent: (
    layerId: LayerId,
    category: string,
    count: number
  ) => Promise<void>;
  updateRespondentStatus: (
    layerId: LayerId,
    respondentType: RespondentType
  ) => Promise<void>;

  // Milestone operations
  milestoneProgress: {
    achieved: number;
    total: number;
    percentage: number;
    nextMilestone?: { milestoneId: string; name: string; description: string };
  };
  checkMilestones: () => OnboardingMilestone[];
  acknowledgeMilestone: (milestoneId: string) => Promise<void>;

  // Graduation
  canGraduate: boolean;
  graduate: () => Promise<void>;

  // Initialization
  initializeJourney: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

// ==================== Hook Implementation ====================

export function useOnboardingJourney(
  manualId: string | undefined,
  manualType: OnboardingManualType = 'person',
  personId?: string
): UseOnboardingJourneyReturn {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive progress ID from manual ID
  const progressId = manualId ? `progress-${manualId}` : undefined;

  // ==================== Data Fetching ====================

  const fetchProgress = useCallback(async () => {
    if (!user || !progressId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const progressRef = doc(firestore, PROGRESS_COLLECTION, progressId);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        setProgress(progressSnap.data() as OnboardingProgress);
      } else {
        setProgress(null);
      }
    } catch (err) {
      console.error('Error fetching onboarding progress:', err);
      setError('Failed to load onboarding progress');
    } finally {
      setLoading(false);
    }
  }, [user, progressId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // ==================== Initialize Journey ====================

  const initializeJourney = useCallback(async () => {
    if (!user || !manualId || !progressId) {
      throw new Error('Must be signed in with a valid manual');
    }

    const requirements = getLayerRequirements(manualType);
    const milestoneConfigs = getMilestonesForManualType(manualType);
    const now = Timestamp.now();

    // Create initial layer statuses
    const layers: Record<number, LayerOnboardingStatus> = {};
    for (const layerReq of requirements.layers) {
      layers[layerReq.layerId] = {
        layerId: layerReq.layerId,
        layerName: layerReq.layerName,
        status: 'not_started',
        requiredItems: layerReq.contentRequirements.reduce(
          (sum, r) => sum + r.minimumCount,
          0
        ),
        completedItems: 0,
        contentPercentage: 0,
        requiredRespondents: layerReq.requiredRespondentTypes || [],
        completedRespondents: [],
        perspectivePercentage: 0,
        synthesisStatus: 'pending',
      };
    }

    // Create initial milestones
    const milestones: OnboardingMilestone[] = milestoneConfigs.map((config) => ({
      milestoneId: config.milestoneId,
      name: config.name,
      description: config.description,
      icon: config.icon,
      celebrationShown: false,
    }));

    const newProgress: OnboardingProgress = {
      progressId,
      manualId,
      manualType,
      personId,
      familyId: user.familyId,
      startedAt: now,
      layers,
      currentLayer: DEFAULT_LAYER_ORDER[0], // Start with L6
      completedLayers: [],
      overallPercentage: 0,
      milestones,
      lastActivityAt: now,
      updatedAt: now,
    };

    await setDoc(doc(firestore, PROGRESS_COLLECTION, progressId), newProgress);
    setProgress(newProgress);
  }, [user, manualId, manualType, personId, progressId]);

  // ==================== Layer Operations ====================

  const getCurrentLayer = useCallback((): LayerOnboardingStatus | null => {
    if (!progress) return null;
    return progress.layers[progress.currentLayer] || null;
  }, [progress]);

  const getLayerStatus = useCallback(
    (layerId: LayerId): LayerOnboardingStatus | null => {
      if (!progress) return null;
      return progress.layers[layerId] || null;
    },
    [progress]
  );

  const updateLayerProgress = useCallback(
    async (layerId: LayerId, updates: Partial<LayerOnboardingStatus>) => {
      if (!progress || !progressId) return;

      const now = Timestamp.now();
      const currentLayer = progress.layers[layerId];
      if (!currentLayer) return;

      const updatedLayer = { ...currentLayer, ...updates };

      // Recalculate content percentage
      if (updatedLayer.requiredItems > 0) {
        updatedLayer.contentPercentage = Math.min(
          100,
          Math.round((updatedLayer.completedItems / updatedLayer.requiredItems) * 100)
        );
      }

      // Recalculate perspective percentage
      if (updatedLayer.requiredRespondents.length > 0) {
        const completed = updatedLayer.completedRespondents.filter((r) =>
          updatedLayer.requiredRespondents.includes(r)
        ).length;
        updatedLayer.perspectivePercentage = Math.round(
          (completed / updatedLayer.requiredRespondents.length) * 100
        );
      } else {
        // No required respondents, so perspective is complete
        updatedLayer.perspectivePercentage = 100;
      }

      // Update status based on progress
      if (
        updatedLayer.contentPercentage >= 100 &&
        updatedLayer.perspectivePercentage >= 100
      ) {
        updatedLayer.status = 'complete';
        updatedLayer.completedAt = now;
      } else if (updatedLayer.completedItems > 0 || updatedLayer.completedRespondents.length > 0) {
        updatedLayer.status = 'in_progress';
        if (!updatedLayer.startedAt) {
          updatedLayer.startedAt = now;
        }
      }

      const updatedLayers = {
        ...progress.layers,
        [layerId]: updatedLayer,
      };

      // Update completed layers list
      const completedLayers = Object.values(updatedLayers)
        .filter((l) => l.status === 'complete')
        .map((l) => l.layerId);

      // Recalculate overall percentage
      const overallPercentage = Math.round(
        Object.values(updatedLayers).reduce((sum, layer) => {
          return sum + (layer.contentPercentage + layer.perspectivePercentage) / 2;
        }, 0) / Object.keys(updatedLayers).length
      );

      // Find next layer to work on
      let currentLayerId = progress.currentLayer;
      if (updatedLayer.status === 'complete') {
        const nextLayer = DEFAULT_LAYER_ORDER.find(
          (id) => !completedLayers.includes(id)
        );
        if (nextLayer) {
          currentLayerId = nextLayer;
        }
      }

      const updateData = {
        layers: updatedLayers,
        completedLayers,
        overallPercentage,
        currentLayer: currentLayerId,
        lastActivityAt: now,
        updatedAt: now,
      };

      await updateDoc(doc(firestore, PROGRESS_COLLECTION, progressId), updateData);
      setProgress({ ...progress, ...updateData });
    },
    [progress, progressId]
  );

  const markLayerComplete = useCallback(
    async (layerId: LayerId) => {
      await updateLayerProgress(layerId, {
        status: 'complete',
        contentPercentage: 100,
        perspectivePercentage: 100,
        completedAt: Timestamp.now(),
      });
    },
    [updateLayerProgress]
  );

  // ==================== Content Tracking ====================

  const addLayerContent = useCallback(
    async (layerId: LayerId, category: string, count: number) => {
      if (!progress) return;

      const currentLayer = progress.layers[layerId];
      if (!currentLayer) return;

      const newCompletedItems = Math.min(
        currentLayer.completedItems + count,
        currentLayer.requiredItems
      );

      await updateLayerProgress(layerId, {
        completedItems: newCompletedItems,
      });
    },
    [progress, updateLayerProgress]
  );

  const updateRespondentStatus = useCallback(
    async (layerId: LayerId, respondentType: RespondentType) => {
      if (!progress) return;

      const currentLayer = progress.layers[layerId];
      if (!currentLayer) return;

      // Add respondent if not already present
      if (!currentLayer.completedRespondents.includes(respondentType)) {
        await updateLayerProgress(layerId, {
          completedRespondents: [...currentLayer.completedRespondents, respondentType],
        });
      }
    },
    [progress, updateLayerProgress]
  );

  // ==================== Milestone Operations ====================

  const milestoneProgress = useMemo(() => {
    if (!progress) {
      return { achieved: 0, total: 0, percentage: 0 };
    }
    return getMilestoneProgress(progress, manualType);
  }, [progress, manualType]);

  const checkMilestones = useCallback((): OnboardingMilestone[] => {
    if (!progress) return [];

    const newlyAchieved = checkNewlyAchievedMilestones(progress, manualType);

    return newlyAchieved.map((config) => ({
      milestoneId: config.milestoneId,
      name: config.name,
      description: config.description,
      icon: config.icon,
      achievedAt: Timestamp.now(),
      celebrationShown: false,
    }));
  }, [progress, manualType]);

  const acknowledgeMilestone = useCallback(
    async (milestoneId: string) => {
      if (!progress || !progressId) return;

      const now = Timestamp.now();
      const updatedMilestones = progress.milestones.map((m) => {
        if (m.milestoneId === milestoneId) {
          return {
            ...m,
            achievedAt: m.achievedAt || now,
            celebrationShown: true,
          };
        }
        return m;
      });

      await updateDoc(doc(firestore, PROGRESS_COLLECTION, progressId), {
        milestones: updatedMilestones,
        updatedAt: now,
      });

      setProgress({ ...progress, milestones: updatedMilestones, updatedAt: now });
    },
    [progress, progressId]
  );

  // ==================== Graduation ====================

  const isGraduated = useMemo(() => {
    return !!progress?.graduatedAt;
  }, [progress]);

  const canGraduate = useMemo(() => {
    if (!progress || isGraduated) return false;
    return progress.completedLayers.length === 6;
  }, [progress, isGraduated]);

  const graduate = useCallback(async () => {
    if (!progress || !progressId || !canGraduate) return;

    const now = Timestamp.now();

    // Mark graduation milestone as achieved
    const updatedMilestones = progress.milestones.map((m) => {
      if (m.milestoneId === 'graduation') {
        return {
          ...m,
          achievedAt: now,
          celebrationShown: false,
        };
      }
      return m;
    });

    await updateDoc(doc(firestore, PROGRESS_COLLECTION, progressId), {
      graduatedAt: now,
      milestones: updatedMilestones,
      updatedAt: now,
    });

    setProgress({
      ...progress,
      graduatedAt: now,
      milestones: updatedMilestones,
      updatedAt: now,
    });
  }, [progress, progressId, canGraduate]);

  // ==================== Return ====================

  return {
    progress,
    loading,
    error,
    isGraduated,
    getCurrentLayer,
    getLayerStatus,
    updateLayerProgress,
    markLayerComplete,
    addLayerContent,
    updateRespondentStatus,
    milestoneProgress,
    checkMilestones,
    acknowledgeMilestone,
    canGraduate,
    graduate,
    initializeJourney,
    refresh: fetchProgress,
  };
}

export default useOnboardingJourney;
