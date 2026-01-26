'use client';

/**
 * useTaggedQuestions Hook
 *
 * Manages tagged questions - questions that one family member
 * has tagged for another to answer
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import { TaggedQuestion, QuestionAnswer } from '@/types/onboarding';

interface UseTaggedQuestionsReturn {
  // Questions tagged FOR the current user to answer
  questionsForMe: TaggedQuestion[];
  // Questions the current user has tagged for others
  questionsITagged: TaggedQuestion[];
  loading: boolean;
  error: string | null;

  // Actions
  tagQuestion: (params: TagQuestionParams) => Promise<string>;
  answerTaggedQuestion: (tagId: string, answer: QuestionAnswer) => Promise<void>;
  dismissTaggedQuestion: (tagId: string) => Promise<void>;

  // Stats
  pendingCount: number;
}

interface TagQuestionParams {
  taggedUserId: string;
  taggedUserName: string;
  personId: string;
  personName: string;
  manualId?: string;
  sectionId: string;
  questionId: string;
  questionText: string;
  taggerAnswer?: QuestionAnswer;
  skippedByTagger: boolean;
  note?: string;
}

export function useTaggedQuestions(): UseTaggedQuestionsReturn {
  const { user } = useAuth();
  const [questionsForMe, setQuestionsForMe] = useState<TaggedQuestion[]>([]);
  const [questionsITagged, setQuestionsITagged] = useState<TaggedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch questions tagged for current user (real-time)
  useEffect(() => {
    if (!user?.userId || !user?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, COLLECTIONS.TAGGED_QUESTIONS),
      where('familyId', '==', user.familyId),
      where('taggedUserId', '==', user.userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const questions = snapshot.docs.map(doc => ({
          tagId: doc.id,
          ...doc.data(),
        } as TaggedQuestion));
        setQuestionsForMe(questions);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to tagged questions:', err);
        setError('Failed to load tagged questions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.userId, user?.familyId]);

  // Fetch questions current user has tagged (one-time)
  useEffect(() => {
    if (!user?.userId || !user?.familyId) return;

    const fetchTaggedByMe = async () => {
      try {
        const q = query(
          collection(firestore, COLLECTIONS.TAGGED_QUESTIONS),
          where('familyId', '==', user.familyId),
          where('taggerUserId', '==', user.userId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const questions = snapshot.docs.map(doc => ({
          tagId: doc.id,
          ...doc.data(),
        } as TaggedQuestion));

        setQuestionsITagged(questions);
      } catch (err) {
        console.error('Error fetching questions I tagged:', err);
      }
    };

    fetchTaggedByMe();
  }, [user?.userId, user?.familyId]);

  /**
   * Tag a question for another family member
   */
  const tagQuestion = useCallback(async (params: TagQuestionParams): Promise<string> => {
    if (!user?.userId || !user?.familyId) {
      throw new Error('User must be authenticated');
    }

    try {
      const taggedQuestion: Omit<TaggedQuestion, 'tagId'> = {
        familyId: user.familyId,
        taggerUserId: user.userId,
        taggerName: user.name || 'Unknown',
        taggedUserId: params.taggedUserId,
        taggedUserName: params.taggedUserName,
        personId: params.personId,
        personName: params.personName,
        manualId: params.manualId,
        sectionId: params.sectionId,
        questionId: params.questionId,
        questionText: params.questionText,
        taggerAnswer: params.taggerAnswer,
        skippedByTagger: params.skippedByTagger,
        status: 'pending',
        createdAt: Date.now(),
        note: params.note,
      };

      const docRef = await addDoc(
        collection(firestore, COLLECTIONS.TAGGED_QUESTIONS),
        taggedQuestion
      );

      // Update local state
      setQuestionsITagged(prev => [{
        tagId: docRef.id,
        ...taggedQuestion,
      }, ...prev]);

      return docRef.id;
    } catch (err) {
      console.error('Error tagging question:', err);
      throw new Error('Failed to tag question');
    }
  }, [user?.userId, user?.familyId, user?.name]);

  /**
   * Answer a question that was tagged for you
   */
  const answerTaggedQuestion = useCallback(async (
    tagId: string,
    answer: QuestionAnswer
  ): Promise<void> => {
    try {
      const docRef = doc(firestore, COLLECTIONS.TAGGED_QUESTIONS, tagId);
      await updateDoc(docRef, {
        taggedAnswer: answer,
        status: 'answered',
        answeredAt: Date.now(),
      });

      // Update local state
      setQuestionsForMe(prev => prev.filter(q => q.tagId !== tagId));
    } catch (err) {
      console.error('Error answering tagged question:', err);
      throw new Error('Failed to save answer');
    }
  }, []);

  /**
   * Dismiss a tagged question (not relevant, etc.)
   */
  const dismissTaggedQuestion = useCallback(async (tagId: string): Promise<void> => {
    try {
      const docRef = doc(firestore, COLLECTIONS.TAGGED_QUESTIONS, tagId);
      await updateDoc(docRef, {
        status: 'dismissed',
      });

      // Update local state
      setQuestionsForMe(prev => prev.filter(q => q.tagId !== tagId));
    } catch (err) {
      console.error('Error dismissing tagged question:', err);
      throw new Error('Failed to dismiss question');
    }
  }, []);

  const pendingCount = questionsForMe.length;

  return {
    questionsForMe,
    questionsITagged,
    loading,
    error,
    tagQuestion,
    answerTaggedQuestion,
    dismissTaggedQuestion,
    pendingCount,
  };
}
