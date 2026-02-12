import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { CoherenceCheckin, CheckinResponse, DriftSignal } from '@/types/checkin';

function getCurrentISOWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const daysSinceJan4 = Math.floor((now.getTime() - jan4.getTime()) / 86400000);
  const weekNum = Math.ceil((daysSinceJan4 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface UseCheckinReturn {
  currentCheckin: CoherenceCheckin | null;
  recentCheckins: CoherenceCheckin[];
  recentDriftSignals: DriftSignal[];
  loading: boolean;
  error: string | null;
  currentWeek: string;
  hasCheckedInThisWeek: boolean;
  submitCheckin: (responses: Record<string, CheckinResponse>) => Promise<string>;
}

export function useCheckin(): UseCheckinReturn {
  const { user } = useAuth();
  const [recentCheckins, setRecentCheckins] = useState<CoherenceCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentWeek = getCurrentISOWeek();

  useEffect(() => {
    if (!user?.familyId) {
      setRecentCheckins([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, COLLECTIONS.CHECKINS),
      where('familyId', '==', user.familyId),
      where('userId', '==', user.userId),
      orderBy('createdAt', 'desc'),
      limit(12)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as CoherenceCheckin);
      setRecentCheckins(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to checkins:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId, user?.userId]);

  const currentCheckin = recentCheckins.find(c => c.week === currentWeek) || null;
  const hasCheckedInThisWeek = !!currentCheckin;

  // Collect unacknowledged drift signals from recent check-ins (up to 3)
  const recentDriftSignals: DriftSignal[] = recentCheckins
    .flatMap(c => c.driftSignals ?? [])
    .filter(ds => !ds.acknowledged)
    .slice(0, 3);

  const submitCheckin = useCallback(async (
    responses: Record<string, CheckinResponse>
  ): Promise<string> => {
    if (!user) throw new Error('No user');

    const checkinRef = doc(collection(firestore, COLLECTIONS.CHECKINS));
    const checkin: CoherenceCheckin = {
      checkinId: checkinRef.id,
      familyId: user.familyId,
      userId: user.userId,
      week: currentWeek,
      responses,
      systemObservations: [],
      createdAt: serverTimestamp() as any,
    };

    await setDoc(checkinRef, checkin);
    return checkinRef.id;
  }, [user, currentWeek]);

  return {
    currentCheckin,
    recentCheckins,
    recentDriftSignals,
    loading,
    error,
    currentWeek,
    hasCheckedInThisWeek,
    submitCheckin,
  };
}
