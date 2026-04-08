'use client';

import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useEffect } from 'react';

// ==================== Types ====================

export interface ContributionRequest {
  requestId: string;
  familyId: string;
  requestedByUserId: string;
  requestedByName: string;
  targetEmail: string;
  targetPersonId: string;
  targetPersonName: string;
  perspectiveType: 'self' | 'observer';
  message?: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp;
}

const COLLECTION = 'contribution_requests';
const EXPIRY_DAYS = 14;

// ==================== Hook ====================

export function useContributionRequest(familyId: string | undefined) {
  const [requests, setRequests] = useState<ContributionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for pending requests for this family
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, COLLECTION),
      where('familyId', '==', familyId),
      where('status', '==', 'pending'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ContributionRequest[] = snapshot.docs.map((d) => ({
          ...d.data(),
          requestId: d.id,
        })) as ContributionRequest[];
        setRequests(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [familyId]);

  const createRequest = useCallback(
    async (params: {
      requestedByUserId: string;
      requestedByName: string;
      targetEmail: string;
      targetPersonId: string;
      targetPersonName: string;
      perspectiveType: 'self' | 'observer';
      message?: string;
    }) => {
      if (!familyId) throw new Error('No family ID');

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(
        now.toMillis() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );

      const docRef = await addDoc(collection(firestore, COLLECTION), {
        familyId,
        ...params,
        status: 'pending',
        createdAt: now,
        expiresAt,
      });

      return docRef.id;
    },
    [familyId],
  );

  const markCompleted = useCallback(async (requestId: string) => {
    await updateDoc(doc(firestore, COLLECTION, requestId), {
      status: 'completed',
      completedAt: Timestamp.now(),
    });
  }, []);

  const pendingCount = requests.filter(
    (r) => r.expiresAt.toMillis() > Date.now(),
  ).length;

  return { requests, loading, createRequest, markCompleted, pendingCount };
}
