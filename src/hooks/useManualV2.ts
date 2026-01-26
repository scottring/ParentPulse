'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ChildManual,
  MarriageManual,
  FamilyManual,
  ManualTrigger,
  ManualStrategy,
  ManualBoundary,
  RepairStrategy,
} from '@/types/manual';

const CHILD_MANUALS_COLLECTION = 'child_manuals';
const MARRIAGE_MANUALS_COLLECTION = 'marriage_manuals';
const FAMILY_MANUALS_COLLECTION = 'family_manuals';

// ==================== Family Manual Hook ====================

interface UseFamilyManualReturn {
  manual: FamilyManual | null;
  loading: boolean;
  error: string | null;
  saveManual: (manual: FamilyManual) => Promise<void>;
  updateManual: (updates: Partial<FamilyManual>) => Promise<void>;
  refreshManual: () => Promise<void>;
}

export function useFamilyManualV2(manualId: string | undefined): UseFamilyManualReturn {
  const { user } = useAuth();
  const [manual, setManual] = useState<FamilyManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManual = useCallback(async () => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(firestore, FAMILY_MANUALS_COLLECTION, manualId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setManual(docSnap.data() as FamilyManual);
      } else {
        setManual(null);
      }
    } catch (err) {
      console.error('Error fetching family manual:', err);
      setError('Failed to load manual');
    } finally {
      setLoading(false);
    }
  }, [user, manualId]);

  useEffect(() => {
    fetchManual();
  }, [fetchManual]);

  const saveManual = useCallback(
    async (manualData: FamilyManual) => {
      if (!user) throw new Error('Must be signed in');

      const docRef = doc(firestore, FAMILY_MANUALS_COLLECTION, manualData.manualId);
      await setDoc(docRef, {
        ...manualData,
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
      });

      setManual(manualData);
    },
    [user]
  );

  const updateManual = useCallback(
    async (updates: Partial<FamilyManual>) => {
      if (!user || !manual) throw new Error('Must be signed in with manual loaded');

      const docRef = doc(firestore, FAMILY_MANUALS_COLLECTION, manual.manualId);
      const fullUpdates = {
        ...updates,
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: (manual.version || 0) + 1,
      };

      await updateDoc(docRef, fullUpdates);
      setManual({ ...manual, ...fullUpdates });
    },
    [user, manual]
  );

  return {
    manual,
    loading,
    error,
    saveManual,
    updateManual,
    refreshManual: fetchManual,
  };
}

// ==================== Combined Manual Hook (Auto-detects type) ====================

interface UseAnyManualReturn {
  manual: ChildManual | FamilyManual | null;
  manualType: 'child' | 'family' | null;
  loading: boolean;
  error: string | null;
  refreshManual: () => Promise<void>;
}

export function useAnyManual(manualId: string | undefined): UseAnyManualReturn {
  const { user } = useAuth();
  const [manual, setManual] = useState<ChildManual | FamilyManual | null>(null);
  const [manualType, setManualType] = useState<'child' | 'family' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManual = useCallback(async () => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try child manual first
      const childDocRef = doc(firestore, CHILD_MANUALS_COLLECTION, manualId);
      const childDocSnap = await getDoc(childDocRef);

      if (childDocSnap.exists()) {
        setManual(childDocSnap.data() as ChildManual);
        setManualType('child');
        setLoading(false);
        return;
      }

      // Try family manual
      const familyDocRef = doc(firestore, FAMILY_MANUALS_COLLECTION, manualId);
      const familyDocSnap = await getDoc(familyDocRef);

      if (familyDocSnap.exists()) {
        setManual(familyDocSnap.data() as FamilyManual);
        setManualType('family');
        setLoading(false);
        return;
      }

      // Not found
      setManual(null);
      setManualType(null);
    } catch (err) {
      console.error('Error fetching manual:', err);
      setError('Failed to load manual');
    } finally {
      setLoading(false);
    }
  }, [user, manualId]);

  useEffect(() => {
    fetchManual();
  }, [fetchManual]);

  return {
    manual,
    manualType,
    loading,
    error,
    refreshManual: fetchManual,
  };
}

// ==================== Child Manual Hook ====================

interface UseChildManualV2Return {
  manual: ChildManual | null;
  loading: boolean;
  error: string | null;
  saveManual: (manual: ChildManual) => Promise<void>;
  updateManual: (updates: Partial<ChildManual>) => Promise<void>;
  addTrigger: (trigger: ManualTrigger) => Promise<void>;
  updateTrigger: (triggerId: string, updates: Partial<ManualTrigger>) => Promise<void>;
  deleteTrigger: (triggerId: string) => Promise<void>;
  addStrategy: (strategy: ManualStrategy, type: 'works' | 'doesnt_work') => Promise<void>;
  updateStrategy: (strategyId: string, updates: Partial<ManualStrategy>, type: 'works' | 'doesnt_work') => Promise<void>;
  deleteStrategy: (strategyId: string, type: 'works' | 'doesnt_work') => Promise<void>;
  addBoundary: (boundary: ManualBoundary) => Promise<void>;
  updateBoundary: (boundaryId: string, updates: Partial<ManualBoundary>) => Promise<void>;
  deleteBoundary: (boundaryId: string) => Promise<void>;
  addRepairStrategy: (repair: RepairStrategy) => Promise<void>;
  refreshManual: () => Promise<void>;
}

export function useChildManualV2(manualId: string | undefined): UseChildManualV2Return {
  const { user } = useAuth();
  const [manual, setManual] = useState<ChildManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch manual
  const fetchManual = useCallback(async () => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(firestore, CHILD_MANUALS_COLLECTION, manualId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setManual(docSnap.data() as ChildManual);
      } else {
        setManual(null);
      }
    } catch (err) {
      console.error('Error fetching child manual:', err);
      setError('Failed to load manual');
    } finally {
      setLoading(false);
    }
  }, [user, manualId]);

  useEffect(() => {
    fetchManual();
  }, [fetchManual]);

  // Save entire manual
  const saveManual = useCallback(
    async (manualData: ChildManual) => {
      if (!user) throw new Error('Must be signed in');

      const docRef = doc(firestore, CHILD_MANUALS_COLLECTION, manualData.manualId);
      await setDoc(docRef, {
        ...manualData,
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
      });

      setManual(manualData);
    },
    [user]
  );

  // Update manual fields
  const updateManual = useCallback(
    async (updates: Partial<ChildManual>) => {
      if (!user || !manual) throw new Error('Must be signed in with manual loaded');

      const docRef = doc(firestore, CHILD_MANUALS_COLLECTION, manual.manualId);
      const fullUpdates = {
        ...updates,
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: (manual.version || 0) + 1,
      };

      await updateDoc(docRef, fullUpdates);
      setManual({ ...manual, ...fullUpdates });
    },
    [user, manual]
  );

  // Trigger operations
  const addTrigger = useCallback(
    async (trigger: ManualTrigger) => {
      if (!manual) return;
      const triggers = [...manual.triggers, trigger];
      await updateManual({
        triggers,
        completeness: {
          ...manual.completeness,
          triggers: triggers.length,
        },
      });
    },
    [manual, updateManual]
  );

  const updateTrigger = useCallback(
    async (triggerId: string, updates: Partial<ManualTrigger>) => {
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
        completeness: {
          ...manual.completeness,
          triggers: triggers.length,
        },
      });
    },
    [manual, updateManual]
  );

  // Strategy operations
  const addStrategy = useCallback(
    async (strategy: ManualStrategy, type: 'works' | 'doesnt_work') => {
      if (!manual) return;
      const field = type === 'works' ? 'whatWorks' : 'whatDoesntWork';
      const strategies = [...manual[field], strategy];
      await updateManual({
        [field]: strategies,
        completeness: {
          ...manual.completeness,
          strategies: manual.whatWorks.length + manual.whatDoesntWork.length + 1,
        },
      });
    },
    [manual, updateManual]
  );

  const updateStrategy = useCallback(
    async (strategyId: string, updates: Partial<ManualStrategy>, type: 'works' | 'doesnt_work') => {
      if (!manual) return;
      const field = type === 'works' ? 'whatWorks' : 'whatDoesntWork';
      const strategies = manual[field].map((s) =>
        s.strategyId === strategyId ? { ...s, ...updates } : s
      );
      await updateManual({ [field]: strategies });
    },
    [manual, updateManual]
  );

  const deleteStrategy = useCallback(
    async (strategyId: string, type: 'works' | 'doesnt_work') => {
      if (!manual) return;
      const field = type === 'works' ? 'whatWorks' : 'whatDoesntWork';
      const strategies = manual[field].filter((s) => s.strategyId !== strategyId);
      await updateManual({
        [field]: strategies,
        completeness: {
          ...manual.completeness,
          strategies: manual.whatWorks.length + manual.whatDoesntWork.length - 1,
        },
      });
    },
    [manual, updateManual]
  );

  // Boundary operations
  const addBoundary = useCallback(
    async (boundary: ManualBoundary) => {
      if (!manual) return;
      const boundaries = [...manual.boundaries, boundary];
      await updateManual({
        boundaries,
        completeness: {
          ...manual.completeness,
          boundaries: boundaries.length,
        },
      });
    },
    [manual, updateManual]
  );

  const updateBoundary = useCallback(
    async (boundaryId: string, updates: Partial<ManualBoundary>) => {
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
        completeness: {
          ...manual.completeness,
          boundaries: boundaries.length,
        },
      });
    },
    [manual, updateManual]
  );

  // Repair strategy operations
  const addRepairStrategy = useCallback(
    async (repair: RepairStrategy) => {
      if (!manual) return;
      const repairStrategies = [...manual.repairStrategies, repair];
      await updateManual({
        repairStrategies,
        completeness: {
          ...manual.completeness,
          repairStrategies: repairStrategies.length,
        },
      });
    },
    [manual, updateManual]
  );

  return {
    manual,
    loading,
    error,
    saveManual,
    updateManual,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    addBoundary,
    updateBoundary,
    deleteBoundary,
    addRepairStrategy,
    refreshManual: fetchManual,
  };
}

// ==================== Family Manuals List Hook ====================

export function useFamilyManualsV2(familyId: string | undefined) {
  const { user } = useAuth();
  const [childManuals, setChildManuals] = useState<ChildManual[]>([]);
  const [marriageManual, setMarriageManual] = useState<MarriageManual | null>(null);
  const [familyManual, setFamilyManual] = useState<FamilyManual | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchManuals = useCallback(async () => {
    if (!user || !familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch child manuals
      const childQuery = query(
        collection(firestore, CHILD_MANUALS_COLLECTION),
        where('familyId', '==', familyId),
        orderBy('personName')
      );
      const childSnap = await getDocs(childQuery);
      setChildManuals(childSnap.docs.map((d) => d.data() as ChildManual));

      // Fetch marriage manual
      const marriageQuery = query(
        collection(firestore, MARRIAGE_MANUALS_COLLECTION),
        where('familyId', '==', familyId)
      );
      const marriageSnap = await getDocs(marriageQuery);
      if (!marriageSnap.empty) {
        setMarriageManual(marriageSnap.docs[0].data() as MarriageManual);
      }

      // Fetch family manual
      const familyQuery = query(
        collection(firestore, FAMILY_MANUALS_COLLECTION),
        where('familyId', '==', familyId)
      );
      const familySnap = await getDocs(familyQuery);
      if (!familySnap.empty) {
        setFamilyManual(familySnap.docs[0].data() as FamilyManual);
      }
    } catch (err) {
      console.error('Error fetching family manuals:', err);
    } finally {
      setLoading(false);
    }
  }, [user, familyId]);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  return { childManuals, marriageManual, familyManual, loading, refresh: fetchManuals };
}

// ==================== Create Manual Helper ====================

export function createEmptyChildManual(
  familyId: string,
  personId: string,
  personName: string,
  createdBy: string
): ChildManual {
  const now = Timestamp.now();
  return {
    manualId: `manual-${personId}`,
    familyId,
    personId,
    personName,
    manualType: 'child',
    coreInfo: {
      interests: [],
      strengths: [],
    },
    triggers: [],
    whatWorks: [],
    whatDoesntWork: [],
    boundaries: [],
    repairStrategies: [],
    patterns: [],
    progressNotes: [],
    parentingPrinciples: [],
    activeGoalIds: [],
    createdAt: now,
    createdBy,
    lastEditedAt: now,
    lastEditedBy: createdBy,
    version: 1,
    completeness: {
      triggers: 0,
      strategies: 0,
      boundaries: 0,
      repairStrategies: 0,
      overallPercent: 0,
    },
  };
}
