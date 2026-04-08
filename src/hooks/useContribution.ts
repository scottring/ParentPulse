'use client';

import { useState, useEffect, useCallback } from 'react';

// Recursively strip undefined values from an object (Firestore rejects them)
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = stripUndefined(value);
    }
  }
  return cleaned;
}
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
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

/**
 * Strip answers marked 'private' from a contribution when the viewer is not the contributor.
 * The contributor themselves always sees their own private answers.
 */
function filterPrivateAnswers(contribution: Contribution, viewerUserId: string): Contribution {
  // Contributor sees everything
  if (contribution.contributorId === viewerUserId) return contribution;

  const visibility = contribution.answerVisibility;
  if (!visibility || Object.keys(visibility).length === 0) return contribution;

  // Deep-clone answers so we don't mutate the Firestore cache
  const filtered = { ...contribution, answers: { ...contribution.answers } };
  for (const sectionId of Object.keys(visibility)) {
    if (!filtered.answers[sectionId]) continue;
    const sectionVis = visibility[sectionId];
    filtered.answers[sectionId] = { ...filtered.answers[sectionId] };
    for (const questionId of Object.keys(sectionVis)) {
      if (sectionVis[questionId] === 'private') {
        delete filtered.answers[sectionId][questionId];
      }
    }
  }
  return filtered;
}

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
    updates: Partial<Pick<Contribution, 'answers' | 'status' | 'draftProgress' | 'answerVisibility' | 'aiGeneratedFields' | 'revisionHistory'>>
  ) => Promise<boolean>;

  /** Save or update a draft contribution. Creates on first call, updates thereafter. */
  saveDraft: (data: {
    manualId: string;
    personId: string;
    perspectiveType: PerspectiveType;
    relationshipToSubject: string;
    answers: Record<string, any>;
    sectionIndex: number;
    questionIndex: number;
    answerVisibility?: Record<string, Record<string, 'visible' | 'private'>>;
    aiGeneratedFields?: Record<string, string[]>;
    contributorName?: string; // Override contributor name (e.g., kid's name for kid-observer)
  }) => Promise<string>;

  /** Complete a draft — mark as 'complete' and link to manual. Snapshots previous answers into revisionHistory if this is a revision. */
  completeDraft: (contributionId: string, manualId: string, previousAnswers?: Record<string, any>) => Promise<void>;

  /** Find an existing draft for the current user on a given manual+perspective. */
  findDraft: (
    manualId: string,
    perspectiveType: PerspectiveType,
    relationshipToSubject?: string
  ) => Promise<Contribution | null>;

  getByManual: (manualId: string) => Contribution[];
  getByPerspective: (perspectiveType: PerspectiveType) => Contribution[];
}

export function useContribution(manualId?: string, additionalManualIds?: string[]): UseContributionReturn {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key for all manual IDs to avoid unnecessary re-subscriptions
  const allManualIds = [manualId, ...(additionalManualIds || [])].filter(Boolean) as string[];
  const manualIdsKey = allManualIds.sort().join(',');

  // Listen to all contributions (draft + complete) for the manual(s)
  useEffect(() => {
    if (!user || allManualIds.length === 0) {
      setContributions([]);
      setLoading(false);
      return;
    }

    const q = allManualIds.length === 1
      ? query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
          where('manualId', '==', allManualIds[0]),
          where('familyId', '==', user.familyId)
        )
      : query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
          where('manualId', 'in', allManualIds),
          where('familyId', '==', user.familyId)
        );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          ...d.data(),
          contributionId: d.id,
        })) as Contribution[];
        // Strip private answers from other people's contributions
        const filtered = docs.map((c) => filterPrivateAnswers(c, user.userId));
        setContributions(filtered);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to contributions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, manualIdsKey]);

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
        answers: stripUndefined(data.answers),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'complete',
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        contribution
      );

      // Link contribution to manual
      await linkContributionToManual(data.manualId, docRef.id, data.perspectiveType, user.userId);

      return docRef.id;
    },
    [user]
  );

  const updateContribution = useCallback(
    async (
      contributionId: string,
      updates: Partial<Pick<Contribution, 'answers' | 'status' | 'draftProgress' | 'answerVisibility' | 'aiGeneratedFields' | 'revisionHistory'>>
    ): Promise<boolean> => {
      try {
        const docRef = doc(
          firestore,
          PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS,
          contributionId
        );
        await updateDoc(docRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
        return true;
      } catch (err: any) {
        console.error('updateContribution failed (doc may not exist):', contributionId, err.message);
        return false;
      }
    },
    []
  );

  const findDraft = useCallback(
    async (
      mid: string,
      perspectiveType: PerspectiveType,
      relationshipToSubject?: string
    ): Promise<Contribution | null> => {
      if (!user) return null;

      const constraints = [
        where('familyId', '==', user.familyId),
        where('manualId', '==', mid),
        where('contributorId', '==', user.userId),
        where('perspectiveType', '==', perspectiveType),
        where('status', '==', 'draft'),
      ];

      if (relationshipToSubject) {
        constraints.push(where('relationshipToSubject', '==', relationshipToSubject));
      }

      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        ...constraints
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const docSnap = snapshot.docs[0];
      return { ...docSnap.data(), contributionId: docSnap.id } as Contribution;
    },
    [user]
  );

  const saveDraft = useCallback(
    async (data: {
      manualId: string;
      personId: string;
      perspectiveType: PerspectiveType;
      relationshipToSubject: string;
      answers: Record<string, any>;
      sectionIndex: number;
      questionIndex: number;
      answerVisibility?: Record<string, Record<string, 'visible' | 'private'>>;
      aiGeneratedFields?: Record<string, string[]>;
      contributorName?: string;
    }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      // Check for existing draft — use relationshipToSubject to disambiguate kid-observer vs parent observer
      const existingDraft = await findDraft(data.manualId, data.perspectiveType, data.relationshipToSubject);

      const extraFields: Record<string, any> = {};
      if (data.answerVisibility && Object.keys(data.answerVisibility).length > 0) {
        extraFields.answerVisibility = stripUndefined(data.answerVisibility);
      }
      if (data.aiGeneratedFields && Object.keys(data.aiGeneratedFields).length > 0) {
        extraFields.aiGeneratedFields = stripUndefined(data.aiGeneratedFields);
      }

      if (existingDraft) {
        // Try to update existing draft — if it fails (deleted doc), fall through to create new
        const updated = await updateContribution(existingDraft.contributionId, {
          answers: stripUndefined(data.answers),
          draftProgress: {
            sectionIndex: data.sectionIndex,
            questionIndex: data.questionIndex,
          },
          ...extraFields,
        });
        if (updated) {
          return existingDraft.contributionId;
        }
        // Update failed — document was deleted externally, create a new draft below
        console.warn('Draft update failed, creating new draft');
      }

      // Create new draft
      const contribution: Omit<Contribution, 'contributionId'> = {
        manualId: data.manualId,
        personId: data.personId,
        familyId: user.familyId,
        contributorId: user.userId,
        contributorName: data.contributorName || user.name,
        perspectiveType: data.perspectiveType,
        relationshipToSubject: data.relationshipToSubject,
        topicCategory: 'overview', // Will cover all topics
        answers: stripUndefined(data.answers),
        draftProgress: {
          sectionIndex: data.sectionIndex,
          questionIndex: data.questionIndex,
        },
        ...extraFields,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'draft',
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        contribution
      );

      return docRef.id;
    },
    [user, findDraft, updateContribution]
  );

  const completeDraft = useCallback(
    async (contributionId: string, mid: string, previousAnswers?: Record<string, any>) => {
      if (!user) throw new Error('Not authenticated');

      const docRef = doc(
        firestore,
        PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS,
        contributionId
      );

      // If previousAnswers were passed (revision flow), snapshot them into history.
      // Otherwise, check if this contribution was previously completed — if so, read
      // its current answers and snapshot them before overwriting.
      const answersToSnapshot = previousAnswers || await (async () => {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'complete' && data.answers && Object.keys(data.answers).length > 0) {
            return data.answers;
          }
        }
        return null;
      })();

      const updates: Record<string, any> = {
        status: 'complete',
        draftProgress: null,
        aiGeneratedFields: null,
        updatedAt: Timestamp.now(),
      };

      if (answersToSnapshot) {
        updates.revisionHistory = arrayUnion({
          answers: stripUndefined(answersToSnapshot),
          revisedAt: Timestamp.now(),
        });
      }

      await updateDoc(docRef, updates);

      // Link to manual
      const contrib = contributions.find((c) => c.contributionId === contributionId);
      const perspectiveType = contrib?.perspectiveType || 'self';
      await linkContributionToManual(mid, contributionId, perspectiveType, user.userId);
    },
    [user, contributions]
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
    saveDraft,
    completeDraft,
    findDraft,
    getByManual,
    getByPerspective,
  };
}

// Helper: link a contribution to a manual document
async function linkContributionToManual(
  manualId: string,
  contributionId: string,
  perspectiveType: PerspectiveType,
  userId: string
) {
  const manualRef = doc(
    firestore,
    PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS,
    manualId
  );

  const perspectiveUpdate =
    perspectiveType === 'self'
      ? { 'perspectives.self': userId }
      : { 'perspectives.observers': arrayUnion(userId) };

  await updateDoc(manualRef, {
    contributionIds: arrayUnion(contributionId),
    ...perspectiveUpdate,
    updatedAt: Timestamp.now(),
    lastContributionAt: Timestamp.now(),
  });
}
