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
  arrayUnion,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Contribution,
  PerspectiveType,
  TopicCategory,
  PERSON_MANUAL_COLLECTIONS,
} from '@/types/person-manual';

interface UseContributionReturn {
  contributions: Contribution[];
  loading: boolean;
  error: string | null;

  createContribution: (data: {
    manualId: string;
    personId: string;
    perspectiveType: PerspectiveType;
    relationshipToSubject: string;
    topicCategory: TopicCategory;
    answers: Record<string, any>;
  }) => Promise<string>;

  updateContribution: (
    contributionId: string,
    updates: Partial<Pick<Contribution, 'answers' | 'status'>>
  ) => Promise<void>;

  getByManual: (manualId: string) => Contribution[];
  getByPerspective: (perspectiveType: PerspectiveType) => Contribution[];
}

export function useContribution(manualId?: string): UseContributionReturn {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to contributions for a specific manual
  useEffect(() => {
    if (!user || !manualId) {
      setContributions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
      where('manualId', '==', manualId),
      where('familyId', '==', user.familyId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          contributionId: doc.id,
        })) as Contribution[];
        setContributions(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to contributions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, manualId]);

  const createContribution = useCallback(
    async (data: {
      manualId: string;
      personId: string;
      perspectiveType: PerspectiveType;
      relationshipToSubject: string;
      topicCategory: TopicCategory;
      answers: Record<string, any>;
    }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const contribution: Omit<Contribution, 'contributionId'> = {
        manualId: data.manualId,
        personId: data.personId,
        familyId: user.familyId,
        contributorId: user.userId,
        contributorName: user.name,
        perspectiveType: data.perspectiveType,
        relationshipToSubject: data.relationshipToSubject,
        topicCategory: data.topicCategory,
        answers: data.answers,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'complete',
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        contribution
      );

      // Link contribution to manual
      const manualRef = doc(
        firestore,
        PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS,
        data.manualId
      );

      const perspectiveUpdate =
        data.perspectiveType === 'self'
          ? { 'perspectives.self': user.userId }
          : { 'perspectives.observers': arrayUnion(user.userId) };

      await updateDoc(manualRef, {
        contributionIds: arrayUnion(docRef.id),
        ...perspectiveUpdate,
        updatedAt: Timestamp.now(),
      });

      return docRef.id;
    },
    [user]
  );

  const updateContribution = useCallback(
    async (
      contributionId: string,
      updates: Partial<Pick<Contribution, 'answers' | 'status'>>
    ) => {
      const docRef = doc(
        firestore,
        PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS,
        contributionId
      );
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    },
    []
  );

  const getByManual = useCallback(
    (mid: string) => contributions.filter((c) => c.manualId === mid),
    [contributions]
  );

  const getByPerspective = useCallback(
    (perspectiveType: PerspectiveType) =>
      contributions.filter((c) => c.perspectiveType === perspectiveType),
    [contributions]
  );

  return {
    contributions,
    loading,
    error,
    createContribution,
    updateContribution,
    getByManual,
    getByPerspective,
  };
}
