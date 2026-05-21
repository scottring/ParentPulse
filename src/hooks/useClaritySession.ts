'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  ClaritySessionTurnPayload,
  Move,
  PrescriptionDraft,
} from '@/types/obstacle';

export interface UseClaritySessionReturn {
  moves: Move[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendTurn: (message: string) => Promise<void>;
  confirmPrescription: (draft: PrescriptionDraft) => Promise<void>;
  /** Most recent assistant move's prescription draft, if any. */
  pendingPrescriptionDraft: PrescriptionDraft | null;
}

export function useClaritySession(obstacleId: string | null): UseClaritySessionReturn {
  const { user } = useAuth();
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState<boolean>(!!obstacleId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obstacleId) {
      setMoves([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(firestore, 'obstacles', obstacleId, 'moves'),
      orderBy('at', 'asc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Move[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Move, 'id'>),
        }));
        setMoves(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [obstacleId]);

  const sendTurn = useCallback(
    async (message: string): Promise<void> => {
      if (!obstacleId) throw new Error('No obstacle');
      if (!message.trim()) return;
      setSending(true);
      setError(null);
      try {
        const callable = httpsCallable(functions, 'claritySessionTurn');
        await callable({ obstacleId, message });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [obstacleId],
  );

  const confirmPrescription = useCallback(
    async (draft: PrescriptionDraft): Promise<void> => {
      if (!obstacleId || !user) throw new Error('Cannot confirm');
      setSending(true);
      setError(null);
      try {
        await addDoc(
          collection(firestore, 'obstacles', obstacleId, 'moves'),
          {
            type: 'prescription',
            at: serverTimestamp(),
            byUserId: user.userId,
            payload: {
              shape: draft.shape,
              body: draft.body,
              executed: false,
            },
          },
        );
        await updateDoc(doc(firestore, 'obstacles', obstacleId), {
          status: 'prescribed',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setSending(false);
      }
    },
    [obstacleId, user],
  );

  // Find latest assistant move with a prescription draft that hasn't been confirmed yet.
  // For v1, "not confirmed" = no subsequent prescription Move.
  let pendingPrescriptionDraft: PrescriptionDraft | null = null;
  const hasConfirmedPrescription = moves.some((m) => m.type === 'prescription');
  if (!hasConfirmedPrescription) {
    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i];
      if (m.type !== 'clarity-session') continue;
      const p = m.payload as ClaritySessionTurnPayload;
      if (p.role === 'assistant' && p.prescriptionDraft) {
        pendingPrescriptionDraft = p.prescriptionDraft;
        break;
      }
    }
  }

  return {
    moves,
    loading,
    sending,
    error,
    sendTurn,
    confirmPrescription,
    pendingPrescriptionDraft,
  };
}
