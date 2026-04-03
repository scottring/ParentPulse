'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { DimensionId } from '@/config/relationship-dimensions';
import {
  WorkbookChapter,
  ExerciseCompletion,
  ReflectionRating,
  SuggestedManualEntry,
  WORKBOOK_COLLECTIONS,
} from '@/types/workbook';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

interface UseWorkbookReturn {
  activeChapters: WorkbookChapter[];
  loading: boolean;
  error: string | null;

  getChapter: (chapterId: string) => WorkbookChapter | undefined;

  startChapter: (data: {
    dimensionId: DimensionId;
    personId: string;
    personName: string;
    startingScore: number;
    targetScore: number;
    firstExerciseId: string;
  }) => Promise<string>;

  completeExercise: (
    chapterId: string,
    reflection: {
      exerciseId: string;
      rating: ReflectionRating;
      reflectionNotes: string;
      suggestedManualEntries?: SuggestedManualEntry[];
    }
  ) => Promise<void>;

  acceptManualEntry: (
    chapterId: string,
    completionId: string,
    entryId: string,
    personId: string,
    manualId: string
  ) => Promise<void>;

  pauseChapter: (chapterId: string) => Promise<void>;
  resumeChapter: (chapterId: string) => Promise<void>;
}

export function useWorkbook(): UseWorkbookReturn {
  const { user } = useAuth();
  const [activeChapters, setActiveChapters] = useState<WorkbookChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for active workbook chapters
  useEffect(() => {
    if (!user?.userId || !user?.familyId) {
      setLoading(false);
      return;
    }

    const chaptersRef = collection(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS);
    const q = query(
      chaptersRef,
      where('userId', '==', user.userId),
      where('familyId', '==', user.familyId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chapters = snapshot.docs.map((doc) => ({
          ...doc.data(),
          chapterId: doc.id,
        })) as WorkbookChapter[];
        setActiveChapters(chapters);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to workbook chapters:', err);
        setError('Failed to load workbook chapters');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.userId, user?.familyId]);

  const getChapter = useCallback(
    (chapterId: string) => {
      return activeChapters.find((ch) => ch.chapterId === chapterId);
    },
    [activeChapters]
  );

  const startChapter = useCallback(
    async (data: {
      dimensionId: DimensionId;
      personId: string;
      personName: string;
      startingScore: number;
      targetScore: number;
      firstExerciseId: string;
    }): Promise<string> => {
      if (!user?.userId || !user?.familyId) {
        throw new Error('User not authenticated');
      }

      const now = Timestamp.now();
      const chapterData: Omit<WorkbookChapter, 'chapterId'> = {
        familyId: user.familyId,
        userId: user.userId,
        dimensionId: data.dimensionId,
        personId: data.personId,
        personName: data.personName,
        status: 'active',
        currentPhase: 'awareness',
        currentExerciseId: data.firstExerciseId,
        startingScore: data.startingScore,
        currentScore: data.startingScore,
        targetScore: data.targetScore,
        completions: [],
        createdAt: now,
        updatedAt: now,
      };

      const chaptersRef = collection(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS);
      const docRef = await addDoc(chaptersRef, chapterData);
      return docRef.id;
    },
    [user?.userId, user?.familyId]
  );

  const completeExercise = useCallback(
    async (
      chapterId: string,
      reflection: {
        exerciseId: string;
        rating: ReflectionRating;
        reflectionNotes: string;
        suggestedManualEntries?: SuggestedManualEntry[];
      }
    ): Promise<void> => {
      if (!user?.userId) {
        throw new Error('User not authenticated');
      }

      const completionId = `comp_${Date.now()}`;
      const completion: ExerciseCompletion = {
        completionId,
        exerciseId: reflection.exerciseId,
        chapterId,
        userId: user.userId,
        rating: reflection.rating,
        reflectionNotes: reflection.reflectionNotes,
        completedAt: Timestamp.now(),
        suggestedManualEntries: reflection.suggestedManualEntries || [],
        manualEntriesAccepted: [],
      };

      const chapterRef = doc(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS, chapterId);
      await updateDoc(chapterRef, {
        completions: arrayUnion(completion),
        updatedAt: Timestamp.now(),
      });
    },
    [user?.userId]
  );

  const acceptManualEntry = useCallback(
    async (
      chapterId: string,
      completionId: string,
      entryId: string,
      personId: string,
      manualId: string
    ): Promise<void> => {
      // Get the chapter to find the completion and entry
      const chapterRef = doc(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS, chapterId);
      const chapterSnap = await getDoc(chapterRef);
      if (!chapterSnap.exists()) throw new Error('Chapter not found');

      const chapter = chapterSnap.data() as WorkbookChapter;
      const completion = chapter.completions.find((c) => c.completionId === completionId);
      if (!completion) throw new Error('Completion not found');

      const entry = completion.suggestedManualEntries.find((e) => e.id === entryId);
      if (!entry) throw new Error('Entry not found');

      // Mark entry as accepted in the chapter
      const updatedCompletions = chapter.completions.map((c) => {
        if (c.completionId !== completionId) return c;
        return {
          ...c,
          suggestedManualEntries: c.suggestedManualEntries.map((e) =>
            e.id === entryId ? { ...e, accepted: true } : e
          ),
          manualEntriesAccepted: [...c.manualEntriesAccepted, entryId],
        };
      });

      await updateDoc(chapterRef, {
        completions: updatedCompletions,
        updatedAt: Timestamp.now(),
      });

      // Push the entry to the person's manual
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
      const manualSnap = await getDoc(manualRef);
      if (!manualSnap.exists()) return;

      const newEntry = {
        id: `wb_${Date.now()}`,
        description: entry.content,
        context: 'Discovered through workbook exercise',
        addedDate: Timestamp.now(),
        addedBy: user?.userId || 'workbook',
        sourceType: 'discovered' as const,
      };

      // Map targetSection to the manual field
      const fieldMap: Record<string, string> = {
        triggers: 'triggers',
        what_works: 'whatWorks',
        what_doesnt_work: 'whatDoesntWork',
        boundaries: 'boundaries',
      };

      const field = fieldMap[entry.targetSection];
      if (field) {
        await updateDoc(manualRef, {
          [field]: arrayUnion(newEntry),
          updatedAt: Timestamp.now(),
        });
      }
    },
    [user?.userId]
  );

  const pauseChapter = useCallback(async (chapterId: string): Promise<void> => {
    const chapterRef = doc(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS, chapterId);
    await updateDoc(chapterRef, {
      status: 'paused',
      updatedAt: Timestamp.now(),
    });
  }, []);

  const resumeChapter = useCallback(async (chapterId: string): Promise<void> => {
    const chapterRef = doc(firestore, WORKBOOK_COLLECTIONS.WORKBOOK_CHAPTERS, chapterId);
    await updateDoc(chapterRef, {
      status: 'active',
      updatedAt: Timestamp.now(),
    });
  }, []);

  return {
    activeChapters,
    loading,
    error,
    getChapter,
    startChapter,
    completeExercise,
    acceptManualEntry,
    pauseChapter,
    resumeChapter,
  };
}
