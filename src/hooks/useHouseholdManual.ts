'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import type {
  HouseholdManual,
  HouseholdMember,
  HouseholdTrigger,
  HouseholdStrategy,
  HouseholdBoundary,
  HouseholdRoutine,
  HouseholdJourney,
  HouseholdMilestone,
  LayerId,
} from '@/types/household-workbook';

// ==================== Household Manual Hook ====================

interface UseHouseholdManualReturn {
  manual: HouseholdManual | null;
  loading: boolean;
  error: string | null;
  saveManual: (manual: HouseholdManual) => Promise<void>;
  updateManual: (updates: Partial<HouseholdManual>) => Promise<void>;
  // Member operations
  addMember: (member: HouseholdMember) => Promise<void>;
  updateMember: (personId: string, updates: Partial<HouseholdMember>) => Promise<void>;
  deleteMember: (personId: string) => Promise<void>;
  // Trigger operations
  addTrigger: (trigger: HouseholdTrigger) => Promise<void>;
  updateTrigger: (triggerId: string, updates: Partial<HouseholdTrigger>) => Promise<void>;
  deleteTrigger: (triggerId: string) => Promise<void>;
  // Strategy operations
  addStrategy: (strategy: HouseholdStrategy) => Promise<void>;
  updateStrategy: (strategyId: string, updates: Partial<HouseholdStrategy>) => Promise<void>;
  deleteStrategy: (strategyId: string) => Promise<void>;
  // Boundary operations
  addBoundary: (boundary: HouseholdBoundary) => Promise<void>;
  updateBoundary: (boundaryId: string, updates: Partial<HouseholdBoundary>) => Promise<void>;
  deleteBoundary: (boundaryId: string) => Promise<void>;
  // Routine operations
  addRoutine: (routine: HouseholdRoutine) => Promise<void>;
  // Family values operations
  addFamilyValue: (value: string) => Promise<void>;
  deleteFamilyValue: (value: string) => Promise<void>;
  updateFamilyMotto: (motto: string) => Promise<void>;
  // Utility
  refreshManual: () => Promise<void>;
  deleteManual: () => Promise<void>;
}

export function useHouseholdManual(familyId: string | undefined): UseHouseholdManualReturn {
  const { user } = useAuth();
  const [manual, setManual] = useState<HouseholdManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManual = useCallback(async () => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query for household manual by familyId
      const manualQuery = query(
        collection(firestore, COLLECTIONS.HOUSEHOLD_MANUALS),
        where('familyId', '==', familyId)
      );
      const snapshot = await getDocs(manualQuery);

      if (!snapshot.empty) {
        setManual(snapshot.docs[0].data() as HouseholdManual);
      } else {
        setManual(null);
      }
    } catch (err) {
      console.error('Error fetching household manual:', err);
      setError('Failed to load household manual');
    } finally {
      setLoading(false);
    }
  }, [user, familyId]);

  useEffect(() => {
    fetchManual();
  }, [fetchManual]);

  // Note: Household members are displayed directly from manual.members
  // The People page merges them with the people collection as a fallback

  // Save entire manual
  const saveManual = useCallback(
    async (manualData: HouseholdManual) => {
      if (!user) throw new Error('Must be signed in');

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_MANUALS, manualData.manualId);
      await setDoc(docRef, {
        ...manualData,
        updatedAt: Timestamp.now(),
      });

      setManual(manualData);
    },
    [user]
  );

  // Update manual fields
  const updateManual = useCallback(
    async (updates: Partial<HouseholdManual>) => {
      if (!user || !manual) throw new Error('Must be signed in with manual loaded');

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_MANUALS, manual.manualId);
      const fullUpdates = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, fullUpdates);
      setManual({ ...manual, ...fullUpdates } as HouseholdManual);
    },
    [user, manual]
  );

  // Calculate completeness
  const calculateCompleteness = useCallback(
    (
      triggers: HouseholdTrigger[],
      strategies: HouseholdStrategy[],
      boundaries: HouseholdBoundary[],
      routines: HouseholdRoutine[]
    ) => {
      const byLayer = (items: { layerId: LayerId }[], layerId: LayerId) =>
        items.filter((i) => i.layerId === layerId).length > 0 ? 100 : 0;

      const allItems = [...triggers, ...strategies, ...boundaries, ...routines];

      const layer1 = byLayer(allItems, 1);
      const layer2 = byLayer(allItems, 2);
      const layer3 = byLayer(allItems, 3);
      const layer4 = byLayer(allItems, 4);
      const layer5 = byLayer(allItems, 5);
      const layer6 = byLayer(allItems, 6);

      return {
        layer1,
        layer2,
        layer3,
        layer4,
        layer5,
        layer6,
        overall: Math.round((layer1 + layer2 + layer3 + layer4 + layer5 + layer6) / 6),
      };
    },
    []
  );

  // Trigger operations
  const addTrigger = useCallback(
    async (trigger: HouseholdTrigger) => {
      if (!manual) return;
      const triggers = [...manual.triggers, trigger];
      await updateManual({
        triggers,
        completeness: calculateCompleteness(triggers, manual.strategies, manual.boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  const updateTrigger = useCallback(
    async (triggerId: string, updates: Partial<HouseholdTrigger>) => {
      if (!manual) return;
      const triggers = manual.triggers.map((t) =>
        t.triggerId === triggerId ? { ...t, ...updates } : t
      );
      await updateManual({ triggers });
    },
    [manual, updateManual]
  );

  const deleteTrigger = useCallback(
    async (triggerId: string) => {
      if (!manual) return;
      const triggers = manual.triggers.filter((t) => t.triggerId !== triggerId);
      await updateManual({
        triggers,
        completeness: calculateCompleteness(triggers, manual.strategies, manual.boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  // Strategy operations
  const addStrategy = useCallback(
    async (strategy: HouseholdStrategy) => {
      if (!manual) return;
      const strategies = [...manual.strategies, strategy];
      await updateManual({
        strategies,
        completeness: calculateCompleteness(manual.triggers, strategies, manual.boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  const updateStrategy = useCallback(
    async (strategyId: string, updates: Partial<HouseholdStrategy>) => {
      if (!manual) return;
      const strategies = manual.strategies.map((s) =>
        s.strategyId === strategyId ? { ...s, ...updates } : s
      );
      await updateManual({ strategies });
    },
    [manual, updateManual]
  );

  const deleteStrategy = useCallback(
    async (strategyId: string) => {
      if (!manual) return;
      const strategies = manual.strategies.filter((s) => s.strategyId !== strategyId);
      await updateManual({
        strategies,
        completeness: calculateCompleteness(manual.triggers, strategies, manual.boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  // Boundary operations
  const addBoundary = useCallback(
    async (boundary: HouseholdBoundary) => {
      if (!manual) return;
      const boundaries = [...manual.boundaries, boundary];
      await updateManual({
        boundaries,
        completeness: calculateCompleteness(manual.triggers, manual.strategies, boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  const updateBoundary = useCallback(
    async (boundaryId: string, updates: Partial<HouseholdBoundary>) => {
      if (!manual) return;
      const boundaries = manual.boundaries.map((b) =>
        b.boundaryId === boundaryId ? { ...b, ...updates } : b
      );
      await updateManual({ boundaries });
    },
    [manual, updateManual]
  );

  const deleteBoundary = useCallback(
    async (boundaryId: string) => {
      if (!manual) return;
      const boundaries = manual.boundaries.filter((b) => b.boundaryId !== boundaryId);
      await updateManual({
        boundaries,
        completeness: calculateCompleteness(manual.triggers, manual.strategies, boundaries, manual.routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  // Routine operations
  const addRoutine = useCallback(
    async (routine: HouseholdRoutine) => {
      if (!manual) return;
      const routines = [...manual.routines, routine];
      await updateManual({
        routines,
        completeness: calculateCompleteness(manual.triggers, manual.strategies, manual.boundaries, routines),
      });
    },
    [manual, updateManual, calculateCompleteness]
  );

  // Member operations
  const addMember = useCallback(
    async (member: HouseholdMember) => {
      if (!manual || !user) return;

      // Add to household manual members array
      const members = [...manual.members, member];
      await updateManual({ members });

      // Also create a Person document in the people collection for sync
      const personDoc = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, member.personId);
      await setDoc(personDoc, {
        personId: member.personId,
        familyId: manual.familyId,
        name: member.name,
        // Note: Firestore doesn't accept undefined values, so we use null or omit the field
        dateOfBirth: member.dateOfBirth || null,
        avatarUrl: member.avatarUrl || null,
        householdRole: member.role,
        hasManual: false,
        addedAt: Timestamp.now(),
        addedByUserId: user.userId,
      }, { merge: true });
    },
    [manual, updateManual, user]
  );

  const updateMember = useCallback(
    async (personId: string, updates: Partial<HouseholdMember>) => {
      if (!manual) return;

      // Update in household manual
      const members = manual.members.map((m) =>
        m.personId === personId ? { ...m, ...updates } : m
      );
      await updateManual({ members });

      // Also update the Person document
      const personDoc = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, personId);
      const personUpdates: Record<string, any> = {};
      if (updates.name) personUpdates.name = updates.name;
      if (updates.dateOfBirth !== undefined) personUpdates.dateOfBirth = updates.dateOfBirth;
      if (updates.avatarUrl !== undefined) personUpdates.avatarUrl = updates.avatarUrl;
      if (updates.role) personUpdates.householdRole = updates.role;

      if (Object.keys(personUpdates).length > 0) {
        await updateDoc(personDoc, personUpdates);
      }
    },
    [manual, updateManual]
  );

  const deleteMember = useCallback(
    async (personId: string) => {
      if (!manual) return;

      // Remove from household manual
      const members = manual.members.filter((m) => m.personId !== personId);
      await updateManual({ members });

      // Also delete from people collection
      const personDoc = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, personId);
      try {
        await deleteDoc(personDoc);
      } catch (err) {
        console.warn('Could not delete person document:', err);
      }
    },
    [manual, updateManual]
  );

  // Family values operations
  const addFamilyValue = useCallback(
    async (value: string) => {
      if (!manual) return;
      const familyValues = [...manual.familyValues, value];
      await updateManual({ familyValues });
    },
    [manual, updateManual]
  );

  const deleteFamilyValue = useCallback(
    async (value: string) => {
      if (!manual) return;
      const familyValues = manual.familyValues.filter((v) => v !== value);
      await updateManual({ familyValues });
    },
    [manual, updateManual]
  );

  const updateFamilyMotto = useCallback(
    async (motto: string) => {
      if (!manual) return;
      await updateManual({ familyMotto: motto });
    },
    [manual, updateManual]
  );

  // Delete entire manual
  const deleteManual = useCallback(async () => {
    if (!manual) return;
    const { deleteDoc } = await import('firebase/firestore');
    const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_MANUALS, manual.manualId);
    await deleteDoc(docRef);
    setManual(null);
  }, [manual]);

  return {
    manual,
    loading,
    error,
    saveManual,
    updateManual,
    // Members
    addMember,
    updateMember,
    deleteMember,
    // Triggers
    addTrigger,
    updateTrigger,
    deleteTrigger,
    // Strategies
    addStrategy,
    updateStrategy,
    deleteStrategy,
    // Boundaries
    addBoundary,
    updateBoundary,
    deleteBoundary,
    // Routines
    addRoutine,
    // Family values
    addFamilyValue,
    deleteFamilyValue,
    updateFamilyMotto,
    // Utility
    refreshManual: fetchManual,
    deleteManual,
  };
}

// ==================== Household Journey Hook ====================

interface UseHouseholdJourneyReturn {
  journey: HouseholdJourney | null;
  loading: boolean;
  error: string | null;
  createJourney: (painPoints: string[], milestones: { day30: string; day60: string; day90: string }) => Promise<string>;
  updateJourney: (updates: Partial<HouseholdJourney>) => Promise<void>;
  completeMilestone: (target: 'day30' | 'day60' | 'day90') => Promise<void>;
  refreshJourney: () => Promise<void>;
}

export function useHouseholdJourney(familyId: string | undefined): UseHouseholdJourneyReturn {
  const { user } = useAuth();
  const [journey, setJourney] = useState<HouseholdJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJourney = useCallback(async () => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query for active journey
      const journeyQuery = query(
        collection(firestore, COLLECTIONS.HOUSEHOLD_JOURNEYS),
        where('familyId', '==', familyId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(journeyQuery);

      if (!snapshot.empty) {
        setJourney(snapshot.docs[0].data() as HouseholdJourney);
      } else {
        setJourney(null);
      }
    } catch (err) {
      console.error('Error fetching household journey:', err);
      setError('Failed to load journey');
    } finally {
      setLoading(false);
    }
  }, [user, familyId]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  const createJourney = useCallback(
    async (painPoints: string[], milestoneDescriptions: { day30: string; day60: string; day90: string }) => {
      if (!user || !familyId) throw new Error('Must be signed in');

      const journeyId = `journey-${familyId}-${Date.now()}`;
      const now = Timestamp.now();

      // Determine which layers to focus on based on pain points
      const { HOUSEHOLD_PAIN_POINTS } = await import('@/types/household-workbook');
      const layersFocused = new Set<LayerId>();
      painPoints.forEach((ppId) => {
        const pp = HOUSEHOLD_PAIN_POINTS.find((p) => p.id === ppId);
        if (pp) {
          pp.relatedLayers.forEach((l) => layersFocused.add(l as LayerId));
        }
      });

      const newJourney: HouseholdJourney = {
        journeyId,
        familyId,
        startDate: now,
        selectedPainPoints: painPoints,
        layersFocused: Array.from(layersFocused),
        milestones: {
          day30: {
            target: 'day30',
            description: milestoneDescriptions.day30,
            status: 'active',
          },
          day60: {
            target: 'day60',
            description: milestoneDescriptions.day60,
            status: 'upcoming',
          },
          day90: {
            target: 'day90',
            description: milestoneDescriptions.day90,
            status: 'upcoming',
          },
        },
        currentDay: 1,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_JOURNEYS, journeyId);
      await setDoc(docRef, newJourney);

      setJourney(newJourney);
      return journeyId;
    },
    [user, familyId]
  );

  const updateJourney = useCallback(
    async (updates: Partial<HouseholdJourney>) => {
      if (!user || !journey) throw new Error('Must be signed in with journey loaded');

      const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_JOURNEYS, journey.journeyId);
      const fullUpdates = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, fullUpdates);
      setJourney({ ...journey, ...fullUpdates } as HouseholdJourney);
    },
    [user, journey]
  );

  const completeMilestone = useCallback(
    async (target: 'day30' | 'day60' | 'day90') => {
      if (!journey) return;

      const now = Timestamp.now();
      const updatedMilestones = { ...journey.milestones };

      // Mark current milestone as completed
      updatedMilestones[target] = {
        ...updatedMilestones[target],
        status: 'completed',
        achievedAt: now,
      };

      // Activate next milestone if exists
      if (target === 'day30' && updatedMilestones.day60.status === 'upcoming') {
        updatedMilestones.day60.status = 'active';
      } else if (target === 'day60' && updatedMilestones.day90.status === 'upcoming') {
        updatedMilestones.day90.status = 'active';
      }

      await updateJourney({ milestones: updatedMilestones });
    },
    [journey, updateJourney]
  );

  return {
    journey,
    loading,
    error,
    createJourney,
    updateJourney,
    completeMilestone,
    refreshJourney: fetchJourney,
  };
}

// ==================== Create Empty Household Manual ====================

export function createEmptyHouseholdManual(
  familyId: string,
  householdName: string
): HouseholdManual {
  const now = Timestamp.now();
  return {
    manualId: `household-${familyId}`,
    familyId,
    householdName,
    members: [],
    triggers: [],
    strategies: [],
    boundaries: [],
    routines: [],
    familyValues: [],
    completeness: {
      layer1: 0,
      layer2: 0,
      layer3: 0,
      layer4: 0,
      layer5: 0,
      layer6: 0,
      overall: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export default useHouseholdManual;
