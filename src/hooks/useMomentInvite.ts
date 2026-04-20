'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  MomentInvite,
  MomentInviteMode,
} from '@/types/moment-invite';

interface InviteViewArgs {
  momentId: string;
  targetUserId: string;
  prompt?: string;
  mode: MomentInviteMode;
}

export interface UseMomentInviteReturn {
  // All pending invites where the current user is the recipient.
  pendingForMe: MomentInvite[];
  // All invites the current user has sent (any status).
  sentByMe: MomentInvite[];
  loading: boolean;
  inviteView: (args: InviteViewArgs) => Promise<string>;
  answerInvite: (inviteId: string, answerEntryId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
}

// Live invites the current user cares about. Creates new invites
// (fromUserId = caller) and transitions existing ones when the
// recipient answers or declines.
export function useMomentInvite(): UseMomentInviteReturn {
  const { user } = useAuth();
  const [pendingForMe, setPendingForMe] = useState<MomentInvite[]>([]);
  const [sentByMe, setSentByMe] = useState<MomentInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;

    let pendingReady = false;
    let sentReady = false;
    const markReady = () => {
      if (pendingReady && sentReady) setLoading(false);
    };

    const pendingQ = query(
      collection(firestore, 'moment_invites'),
      where('familyId', '==', user.familyId),
      where('toUserId', '==', user.userId),
      where('status', '==', 'pending'),
    );
    const unsubPending = onSnapshot(
      pendingQ,
      (snap) => {
        const arr: MomentInvite[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<MomentInvite, 'inviteId'>),
          inviteId: d.id,
        }));
        setPendingForMe(arr);
        pendingReady = true;
        markReady();
      },
      (err) => {
        console.warn('useMomentInvite: pending listener error', err);
        pendingReady = true;
        markReady();
      },
    );

    const sentQ = query(
      collection(firestore, 'moment_invites'),
      where('familyId', '==', user.familyId),
      where('fromUserId', '==', user.userId),
    );
    const unsubSent = onSnapshot(
      sentQ,
      (snap) => {
        const arr: MomentInvite[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<MomentInvite, 'inviteId'>),
          inviteId: d.id,
        }));
        setSentByMe(arr);
        sentReady = true;
        markReady();
      },
      (err) => {
        console.warn('useMomentInvite: sent listener error', err);
        sentReady = true;
        markReady();
      },
    );

    return () => {
      unsubPending();
      unsubSent();
    };
  }, [user?.familyId, user?.userId]);

  const inviteView = useCallback(
    async (args: InviteViewArgs): Promise<string> => {
      if (!user?.userId || !user?.familyId) {
        throw new Error('Not signed in');
      }
      const now = Timestamp.now();
      const docRef = await addDoc(
        collection(firestore, 'moment_invites'),
        {
          familyId: user.familyId,
          momentId: args.momentId,
          fromUserId: user.userId,
          toUserId: args.targetUserId,
          mode: args.mode,
          ...(args.prompt ? { prompt: args.prompt } : {}),
          status: 'pending',
          createdAt: now,
        },
      );
      return docRef.id;
    },
    [user?.userId, user?.familyId],
  );

  const answerInvite = useCallback(
    async (inviteId: string, answerEntryId: string): Promise<void> => {
      await updateDoc(doc(firestore, 'moment_invites', inviteId), {
        status: 'answered',
        answerEntryId,
        answeredAt: serverTimestamp(),
      });
    },
    [],
  );

  const declineInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      await updateDoc(doc(firestore, 'moment_invites', inviteId), {
        status: 'declined',
        answeredAt: serverTimestamp(),
      });
    },
    [],
  );

  return {
    pendingForMe,
    sentByMe,
    loading,
    inviteView,
    answerInvite,
    declineInvite,
  };
}
