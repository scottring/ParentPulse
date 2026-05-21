'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Obstacle, ObstacleOrigin } from '@/types/obstacle';

export interface UseObstacleReturn {
  obstacle: Obstacle | null;
  loading: boolean;
  error: string | null;
}

/** Real-time subscription to a single obstacle by id. */
export function useObstacle(obstacleId: string | null): UseObstacleReturn {
  const [obstacle, setObstacle] = useState<Obstacle | null>(null);
  const [loading, setLoading] = useState<boolean>(!!obstacleId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obstacleId) {
      setObstacle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(firestore, 'obstacles', obstacleId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setObstacle(null);
          setError('Obstacle not found');
        } else {
          setObstacle({ id: snap.id, ...(snap.data() as Omit<Obstacle, 'id'>) });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [obstacleId]);

  return { obstacle, loading, error };
}

export interface CreateObstacleInput {
  subjectPersonIds?: string[];
  origin?: ObstacleOrigin;
  originRefId?: string | null;
}

export interface UseCreateObstacleReturn {
  create: (input?: CreateObstacleInput) => Promise<string>;
  creating: boolean;
  error: string | null;
}

/**
 * Creates a new private obstacle owned by the current user. Returns
 * the new obstacle id. v1 defaults: private visibility, not sensitive,
 * origin = 'direct'.
 */
export function useCreateObstacle(): UseCreateObstacleReturn {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (input?: CreateObstacleInput): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      setCreating(true);
      setError(null);
      try {
        const docData = {
          title: '',
          summary: '',
          authorId: user.userId,
          familyId: user.familyId,
          subjectPersonIds: input?.subjectPersonIds ?? [],
          status: 'fresh' as const,
          visibility: { mode: 'private' as const, sharedWith: [user.userId] },
          visibleToUserIds: [user.userId],
          sensitive: false,
          allowSpecificsInOutput: false,
          bringToTherapy: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          clearedAt: null,
          origin: input?.origin ?? 'direct',
          originRefId: input?.originRefId ?? null,
        };
        const ref = await addDoc(collection(firestore, 'obstacles'), docData);
        return ref.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [user],
  );

  return { create, creating, error };
}

/** Update obstacle status (e.g., user confirms prescription). */
export async function updateObstacleStatus(
  obstacleId: string,
  status: Obstacle['status'],
): Promise<void> {
  await updateDoc(doc(firestore, 'obstacles', obstacleId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
