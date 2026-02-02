'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  HouseholdWeeklyFocusV2,
  WeeklyPlanningPreferences,
  FocusArea,
  WeeklyJournalEntry,
} from '@/types/household-workbook';

// ==================== Types ====================

interface GenerateFocusResult {
  success: boolean;
  focus?: HouseholdWeeklyFocusV2;
  error?: string;
}

interface UseHouseholdFocusReturn {
  // Current focus
  currentFocus: HouseholdWeeklyFocusV2 | null;
  isLoading: boolean;
  error: string | null;

  // Focus generation
  generateNewFocus: (preferences: WeeklyPlanningPreferences) => Promise<GenerateFocusResult>;
  isGenerating: boolean;

  // Focus management
  confirmFocus: () => Promise<void>;
  removeFocusArea: (focusAreaId: string) => Promise<void>;
  addCustomFocusArea: (area: Omit<FocusArea, 'focusAreaId'>) => Promise<void>;

  // Action tracking
  markActionComplete: (focusAreaId: string, actionId: string) => Promise<void>;
  markActionIncomplete: (focusAreaId: string, actionId: string) => Promise<void>;

  // Journal
  addJournalEntry: (entry: Omit<WeeklyJournalEntry, 'entryId' | 'timestamp'>) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;

  // Reflection
  submitReflection: (notes: string, rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;

  // History
  focusHistory: HouseholdWeeklyFocusV2[];
  loadFocusHistory: () => Promise<void>;
}

// ==================== Constants ====================

const FOCUS_COLLECTION = 'household_weekly_focus';

// ==================== Hook ====================

export function useHouseholdFocus(familyId: string | undefined): UseHouseholdFocusReturn {
  const { user } = useAuth();
  const [currentFocus, setCurrentFocus] = useState<HouseholdWeeklyFocusV2 | null>(null);
  const [focusHistory, setFocusHistory] = useState<HouseholdWeeklyFocusV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to current week's focus
  useEffect(() => {
    if (!familyId) {
      setIsLoading(false);
      return;
    }

    const startOfWeek = getStartOfWeek();

    const q = query(
      collection(firestore, FOCUS_COLLECTION),
      where('familyId', '==', familyId),
      where('weekOf', '>=', startOfWeek),
      orderBy('weekOf', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as HouseholdWeeklyFocusV2;
          setCurrentFocus({ ...data, focusId: snapshot.docs[0].id });
        } else {
          setCurrentFocus(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching household focus:', err);
        setError('Failed to load weekly focus');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  // Generate new focus using Cloud Function
  const generateNewFocus = useCallback(
    async (preferences: WeeklyPlanningPreferences): Promise<GenerateFocusResult> => {
      if (!familyId || !user) {
        return { success: false, error: 'Must be signed in' };
      }

      setIsGenerating(true);
      setError(null);

      try {
        const generateFn = httpsCallable<
          { familyId: string; preferences: WeeklyPlanningPreferences },
          { success: boolean; focus?: HouseholdWeeklyFocusV2; error?: string }
        >(functions, 'generateWeeklyHouseholdFocus');

        const result = await generateFn({ familyId, preferences });

        if (result.data.success && result.data.focus) {
          // Save draft to Firestore
          const focusId = `focus-${familyId}-${Date.now()}`;
          const focusDoc: HouseholdWeeklyFocusV2 = {
            ...result.data.focus,
            focusId,
            familyId,
            status: 'draft',
            weekOf: Timestamp.now(),
            generatedAt: Timestamp.now(),
            completedActions: [],
            journalEntries: [],
          };

          await setDoc(doc(firestore, FOCUS_COLLECTION, focusId), focusDoc);

          return { success: true, focus: focusDoc };
        }

        return { success: false, error: result.data.error || 'Failed to generate focus' };
      } catch (err) {
        console.error('Error generating focus:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate focus';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsGenerating(false);
      }
    },
    [familyId, user]
  );

  // Confirm focus and activate it
  const confirmFocus = useCallback(async () => {
    if (!currentFocus?.focusId) return;

    await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
      status: 'active',
      activatedAt: Timestamp.now(),
    });
  }, [currentFocus]);

  // Remove a focus area (user refinement)
  const removeFocusArea = useCallback(
    async (focusAreaId: string) => {
      if (!currentFocus?.focusId) return;

      const updatedRemovedIds = [
        ...(currentFocus.removedAreaIds || []),
        focusAreaId,
      ];

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        removedAreaIds: updatedRemovedIds,
      });
    },
    [currentFocus]
  );

  // Add custom focus area
  const addCustomFocusArea = useCallback(
    async (area: Omit<FocusArea, 'focusAreaId'>) => {
      if (!currentFocus?.focusId) return;

      const newArea: FocusArea = {
        ...area,
        focusAreaId: `custom-${Date.now()}`,
      };

      const updatedUserAreas = [...(currentFocus.userAddedAreas || []), newArea];

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        userAddedAreas: updatedUserAreas,
      });
    },
    [currentFocus]
  );

  // Mark action complete
  const markActionComplete = useCallback(
    async (focusAreaId: string, actionId: string) => {
      if (!currentFocus?.focusId) return;

      const completionKey = `${focusAreaId}:${actionId}`;
      const updatedCompletedActions = [
        ...currentFocus.completedActions,
        completionKey,
      ];

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        completedActions: updatedCompletedActions,
      });
    },
    [currentFocus]
  );

  // Mark action incomplete
  const markActionIncomplete = useCallback(
    async (focusAreaId: string, actionId: string) => {
      if (!currentFocus?.focusId) return;

      const completionKey = `${focusAreaId}:${actionId}`;
      const updatedCompletedActions = currentFocus.completedActions.filter(
        (key) => key !== completionKey
      );

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        completedActions: updatedCompletedActions,
      });
    },
    [currentFocus]
  );

  // Add journal entry
  const addJournalEntry = useCallback(
    async (entry: Omit<WeeklyJournalEntry, 'entryId' | 'timestamp'>) => {
      if (!currentFocus?.focusId) return;

      const newEntry: WeeklyJournalEntry = {
        ...entry,
        entryId: `journal-${Date.now()}`,
        timestamp: Timestamp.now(),
      };

      const updatedEntries = [...currentFocus.journalEntries, newEntry];

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        journalEntries: updatedEntries,
      });
    },
    [currentFocus]
  );

  // Delete journal entry
  const deleteJournalEntry = useCallback(
    async (entryId: string) => {
      if (!currentFocus?.focusId) return;

      const updatedEntries = currentFocus.journalEntries.filter(
        (e) => e.entryId !== entryId
      );

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        journalEntries: updatedEntries,
      });
    },
    [currentFocus]
  );

  // Submit end-of-week reflection
  const submitReflection = useCallback(
    async (notes: string, rating: 1 | 2 | 3 | 4 | 5) => {
      if (!currentFocus?.focusId) return;

      await updateDoc(doc(firestore, FOCUS_COLLECTION, currentFocus.focusId), {
        reflectionNotes: notes,
        effectivenessRating: rating,
        status: 'completed',
        completedAt: Timestamp.now(),
      });
    },
    [currentFocus]
  );

  // Load focus history
  const loadFocusHistory = useCallback(async () => {
    if (!familyId) return;

    try {
      const q = query(
        collection(firestore, FOCUS_COLLECTION),
        where('familyId', '==', familyId),
        orderBy('weekOf', 'desc'),
        limit(12) // Last 12 weeks
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map((d) => ({
        ...(d.data() as HouseholdWeeklyFocusV2),
        focusId: d.id,
      }));

      setFocusHistory(history);
    } catch (err) {
      console.error('Error loading focus history:', err);
    }
  }, [familyId]);

  return {
    currentFocus,
    isLoading,
    error,
    generateNewFocus,
    isGenerating,
    confirmFocus,
    removeFocusArea,
    addCustomFocusArea,
    markActionComplete,
    markActionIncomplete,
    addJournalEntry,
    deleteJournalEntry,
    submitReflection,
    focusHistory,
    loadFocusHistory,
  };
}

// ==================== Helper Functions ====================

function getStartOfWeek(): Timestamp {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(startOfWeek);
}

export default useHouseholdFocus;
