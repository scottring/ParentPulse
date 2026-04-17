'use client';

import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, onSnapshot,
  query, serverTimestamp, Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  CoupleRitual, RitualCadence, DayOfWeek,
} from '@/types/couple-ritual';

interface CreateArgs {
  familyId: string;
  creatorUserId: string;
  spouseUserId: string;
  cadence: RitualCadence;
  dayOfWeek: DayOfWeek;
  startTimeLocal: string;
  durationMinutes: number;
  timezone: string;
  startsOn: Date;
  intention: string;
}

export function buildCreatePayload(args: CreateArgs): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    familyId: args.familyId,
    participantUserIds: [args.creatorUserId, args.spouseUserId],
    cadence: args.cadence,
    dayOfWeek: args.dayOfWeek,
    startTimeLocal: args.startTimeLocal,
    durationMinutes: args.durationMinutes,
    timezone: args.timezone,
    status: 'active',
    startsOn: Timestamp.fromDate(args.startsOn),
    createdAt: serverTimestamp(),
    createdByUserId: args.creatorUserId,
    updatedAt: serverTimestamp(),
    updatedByUserId: args.creatorUserId,
  };
  if (args.intention && args.intention.trim().length > 0) {
    payload.intention = args.intention.trim();
  }
  return payload;
}

interface UseCoupleRitualResult {
  ritual: CoupleRitual | null;
  loading: boolean;
  createRitual: (
    args: Omit<CreateArgs, 'familyId' | 'creatorUserId'>,
  ) => Promise<string>;
  updateRitual: (patch: Partial<CoupleRitual>) => Promise<void>;
  pauseRitual: () => Promise<void>;
  resumeRitual: () => Promise<void>;
  endRitual: () => Promise<void>;
}

export function useCoupleRitual(): UseCoupleRitualResult {
  const { user } = useAuth();
  const [ritual, setRitual] = useState<CoupleRitual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) { setLoading(false); return; }
    const q = query(
      collection(firestore, 'couple_rituals'),
      where('familyId', '==', user.familyId),
      where('status', 'in', ['active', 'paused']),
    );
    const unsub = onSnapshot(q, (snap) => {
      const first = snap.docs[0];
      setRitual(first ? ({ id: first.id, ...(first.data() as Omit<CoupleRitual, 'id'>) }) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.familyId]);

  async function createRitual(args: Omit<CreateArgs, 'familyId' | 'creatorUserId'>) {
    if (!user?.userId || !user.familyId) throw new Error('not signed in');
    const payload = buildCreatePayload({
      ...args, familyId: user.familyId, creatorUserId: user.userId,
    });
    const docRef = await addDoc(collection(firestore, 'couple_rituals'), payload);
    return docRef.id;
  }

  async function updateRitual(patch: Partial<CoupleRitual>) {
    if (!ritual || !user?.userId) return;
    await updateDoc(doc(firestore, 'couple_rituals', ritual.id), {
      ...patch, updatedAt: serverTimestamp(), updatedByUserId: user.userId,
    });
  }

  return {
    ritual, loading,
    createRitual,
    updateRitual,
    pauseRitual: () => updateRitual({ status: 'paused' }),
    resumeRitual: () => updateRitual({ status: 'active' }),
    endRitual: () => updateRitual({ status: 'ended' }),
  };
}
