'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ManualInput,
  MultiPerspectiveItem,
  InputCollectionStatus,
  RespondentType,
  PerspectiveSynthesis,
  PromptVariant,
  getPromptVariantForAge,
} from '@/types/multi-perspective';

const INPUTS_COLLECTION = 'manual_inputs';
const MULTI_PERSPECTIVE_ITEMS_COLLECTION = 'multi_perspective_items';

// ==================== Types ====================

interface UseMultiPerspectiveInputReturn {
  // Data
  inputs: ManualInput[];
  items: MultiPerspectiveItem[];
  collectionStatus: InputCollectionStatus | null;
  loading: boolean;
  error: string | null;

  // Input operations
  submitInput: (input: Omit<ManualInput, 'inputId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateInput: (inputId: string, updates: Partial<ManualInput>) => Promise<void>;
  deleteInput: (inputId: string) => Promise<void>;

  // Collection status
  getRespondentStatus: (respondentType: RespondentType) => {
    completed: number;
    total: number;
    percentage: number;
  };
  isReadyForSynthesis: (questionId: string) => boolean;

  // Synthesis
  requestSynthesis: (questionId: string) => Promise<void>;
  updateSynthesis: (itemId: string, synthesis: Partial<PerspectiveSynthesis>) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

// ==================== Hook ====================

export function useMultiPerspectiveInput(manualId: string | undefined): UseMultiPerspectiveInputReturn {
  const { user } = useAuth();
  const [inputs, setInputs] = useState<ManualInput[]>([]);
  const [items, setItems] = useState<MultiPerspectiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inputs for this manual
  const fetchInputs = useCallback(async () => {
    if (!user || !manualId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch inputs
      const inputsQuery = query(
        collection(firestore, INPUTS_COLLECTION),
        where('manualId', '==', manualId)
      );
      const inputsSnapshot = await getDocs(inputsQuery);
      const inputsData = inputsSnapshot.docs.map((d) => d.data() as ManualInput);
      setInputs(inputsData);

      // Fetch multi-perspective items
      const itemsQuery = query(
        collection(firestore, MULTI_PERSPECTIVE_ITEMS_COLLECTION),
        where('manualId', '==', manualId)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const itemsData = itemsSnapshot.docs.map((d) => d.data() as MultiPerspectiveItem);
      setItems(itemsData);
    } catch (err) {
      console.error('Error fetching multi-perspective data:', err);
      setError('Failed to load perspective data');
    } finally {
      setLoading(false);
    }
  }, [user, manualId]);

  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  // Calculate collection status
  const collectionStatus = useMemo((): InputCollectionStatus | null => {
    if (!manualId) return null;

    // Group inputs by respondent
    const respondentMap = new Map<string, {
      respondentId: string;
      respondentName: string;
      respondentType: RespondentType;
      questions: Set<string>;
      lastInputAt?: Timestamp;
    }>();

    for (const input of inputs) {
      const existing = respondentMap.get(input.respondentId);
      if (existing) {
        existing.questions.add(input.questionId);
        if (!existing.lastInputAt || (input.createdAt && input.createdAt > existing.lastInputAt)) {
          existing.lastInputAt = input.createdAt;
        }
      } else {
        respondentMap.set(input.respondentId, {
          respondentId: input.respondentId,
          respondentName: input.respondentName,
          respondentType: input.respondentType,
          questions: new Set([input.questionId]),
          lastInputAt: input.createdAt,
        });
      }
    }

    // Get unique questions
    const uniqueQuestions = new Set(inputs.map((i) => i.questionId));

    // Build respondent status
    const respondents = Array.from(respondentMap.values()).map((r) => ({
      respondentId: r.respondentId,
      respondentName: r.respondentName,
      respondentType: r.respondentType,
      questionsAnswered: r.questions.size,
      totalAssigned: uniqueQuestions.size, // Simplified - would need routing config for accuracy
      completionPercentage: uniqueQuestions.size > 0
        ? Math.round((r.questions.size / uniqueQuestions.size) * 100)
        : 0,
      lastInputAt: r.lastInputAt,
    }));

    return {
      manualId,
      personId: '', // Would need to be passed in
      totalQuestions: uniqueQuestions.size,
      questionsWithInput: uniqueQuestions.size,
      respondents,
      pendingQuestions: [], // Would need routing config to calculate
      readyForSynthesis: items
        .filter((i) => i.status === 'ready_for_synthesis')
        .map((i) => i.itemId),
    };
  }, [manualId, inputs, items]);

  // Submit new input
  const submitInput = useCallback(
    async (inputData: Omit<ManualInput, 'inputId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      if (!user || !manualId) {
        throw new Error('Must be signed in with a valid manual');
      }

      const inputId = `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      const newInput: ManualInput = {
        ...inputData,
        inputId,
        manualId,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(firestore, INPUTS_COLLECTION, inputId), newInput);

      setInputs((prev) => [...prev, newInput]);

      return inputId;
    },
    [user, manualId]
  );

  // Update existing input
  const updateInput = useCallback(
    async (inputId: string, updates: Partial<ManualInput>) => {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(firestore, INPUTS_COLLECTION, inputId), updateData);

      setInputs((prev) =>
        prev.map((i) => (i.inputId === inputId ? { ...i, ...updateData } : i))
      );
    },
    []
  );

  // Delete input
  const deleteInput = useCallback(async (inputId: string) => {
    // Soft delete by marking as deleted, or hard delete
    await updateDoc(doc(firestore, INPUTS_COLLECTION, inputId), {
      deletedAt: Timestamp.now(),
    });

    setInputs((prev) => prev.filter((i) => i.inputId !== inputId));
  }, []);

  // Get respondent completion status
  const getRespondentStatus = useCallback(
    (respondentType: RespondentType) => {
      const respondentInputs = inputs.filter((i) => i.respondentType === respondentType);
      const uniqueQuestions = new Set(respondentInputs.map((i) => i.questionId));
      const totalQuestions = new Set(inputs.map((i) => i.questionId)).size;

      return {
        completed: uniqueQuestions.size,
        total: totalQuestions,
        percentage: totalQuestions > 0
          ? Math.round((uniqueQuestions.size / totalQuestions) * 100)
          : 0,
      };
    },
    [inputs]
  );

  // Check if a question is ready for synthesis
  const isReadyForSynthesis = useCallback(
    (questionId: string) => {
      const questionInputs = inputs.filter((i) => i.questionId === questionId);
      // Need at least 2 different respondents for meaningful synthesis
      const uniqueRespondents = new Set(questionInputs.map((i) => i.respondentId));
      return uniqueRespondents.size >= 2;
    },
    [inputs]
  );

  // Request AI synthesis for a question's inputs
  const requestSynthesis = useCallback(
    async (questionId: string) => {
      if (!user || !manualId) {
        throw new Error('Must be signed in with a valid manual');
      }

      const questionInputs = inputs.filter((i) => i.questionId === questionId);
      if (questionInputs.length < 2) {
        throw new Error('Need at least 2 inputs for synthesis');
      }

      // Create or update multi-perspective item
      const itemId = `mpi-${manualId}-${questionId}`;
      const now = Timestamp.now();

      const item: MultiPerspectiveItem = {
        itemId,
        manualId,
        category: 'general', // Would need to determine from question
        inputs: questionInputs,
        status: 'ready_for_synthesis',
        minimumRespondents: 2,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(firestore, MULTI_PERSPECTIVE_ITEMS_COLLECTION, itemId), item);

      setItems((prev) => {
        const existing = prev.findIndex((i) => i.itemId === itemId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = item;
          return updated;
        }
        return [...prev, item];
      });

      // TODO: Call Cloud Function to perform AI synthesis
      // await callSynthesisFunction(itemId);
    },
    [user, manualId, inputs]
  );

  // Update synthesis result
  const updateSynthesis = useCallback(
    async (itemId: string, synthesis: Partial<PerspectiveSynthesis>) => {
      const updateData = {
        synthesis: {
          ...synthesis,
          synthesizedAt: Timestamp.now(),
        },
        status: 'synthesized' as const,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(firestore, MULTI_PERSPECTIVE_ITEMS_COLLECTION, itemId), updateData);

      setItems((prev) =>
        prev.map((i) =>
          i.itemId === itemId
            ? { ...i, ...updateData, synthesis: updateData.synthesis as PerspectiveSynthesis }
            : i
        )
      );
    },
    []
  );

  return {
    inputs,
    items,
    collectionStatus,
    loading,
    error,
    submitInput,
    updateInput,
    deleteInput,
    getRespondentStatus,
    isReadyForSynthesis,
    requestSynthesis,
    updateSynthesis,
    refresh: fetchInputs,
  };
}

// ==================== Helper Hooks ====================

/**
 * Hook to get inputs for a specific question
 */
export function useQuestionInputs(manualId: string | undefined, questionId: string) {
  const { inputs, loading } = useMultiPerspectiveInput(manualId);

  const questionInputs = useMemo(
    () => inputs.filter((i) => i.questionId === questionId),
    [inputs, questionId]
  );

  const byRespondent = useMemo(() => {
    const map: Record<string, ManualInput> = {};
    for (const input of questionInputs) {
      map[input.respondentType] = input;
    }
    return map;
  }, [questionInputs]);

  return {
    inputs: questionInputs,
    byRespondent,
    loading,
    hasMultiplePerspectives: questionInputs.length >= 2,
  };
}

/**
 * Hook to check if a respondent can answer for a manual
 */
export function useRespondentEligibility(
  manualId: string | undefined,
  personAge?: number
) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        canRespond: false,
        respondentType: null as RespondentType | null,
        promptVariant: 'adult' as PromptVariant,
      };
    }

    // Determine respondent type based on user role and relationship
    // This would need more context about the user's relationship to the manual subject
    const respondentType: RespondentType = 'parent'; // Simplified

    // Determine prompt variant based on age
    const promptVariant: PromptVariant = personAge
      ? (personAge <= 7 ? 'child' : personAge <= 14 ? 'teen' : 'adult')
      : 'adult';

    return {
      canRespond: true,
      respondentType,
      promptVariant,
    };
  }, [user, personAge]);
}

export default useMultiPerspectiveInput;
