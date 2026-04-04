'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { GrowthItem } from '@/types/growth';

interface PersonWeekly {
  personId: string;
  personName: string;
  completed: GrowthItem[];
  pending: GrowthItem[];
}

interface UseWeeklyActivitiesReturn {
  weeklyByPerson: Map<string, PersonWeekly>;
  allCompleted: GrowthItem[];
  allPending: GrowthItem[];
  totalCompleted: number;
  totalPending: number;
  loading: boolean;
}

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function useWeeklyActivities(): UseWeeklyActivitiesReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<GrowthItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const { start, end } = getWeekBounds();
    const q = query(
      collection(firestore, 'growth_items'),
      where('familyId', '==', user.familyId),
      where('scheduledDate', '>=', Timestamp.fromDate(start)),
      where('scheduledDate', '<=', Timestamp.fromDate(end)),
    );

    const unsub = onSnapshot(q, (snap) => {
      const results: GrowthItem[] = [];
      snap.forEach((doc) => {
        results.push({ growthItemId: doc.id, ...doc.data() } as GrowthItem);
      });
      setItems(results);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user?.familyId]);

  const { weeklyByPerson, allCompleted, allPending } = useMemo(() => {
    const byPerson = new Map<string, PersonWeekly>();
    const completed: GrowthItem[] = [];
    const pending: GrowthItem[] = [];

    for (const item of items) {
      const personId = item.targetPersonIds?.[0] || 'unknown';
      const personName = item.targetPersonNames?.[0] || 'Unknown';

      if (!byPerson.has(personId)) {
        byPerson.set(personId, { personId, personName, completed: [], pending: [] });
      }
      const entry = byPerson.get(personId)!;

      if (item.status === 'completed') {
        entry.completed.push(item);
        completed.push(item);
      } else if (['active', 'seen', 'queued'].includes(item.status)) {
        entry.pending.push(item);
        pending.push(item);
      }
    }

    return { weeklyByPerson: byPerson, allCompleted: completed, allPending: pending };
  }, [items]);

  return {
    weeklyByPerson,
    allCompleted,
    allPending,
    totalCompleted: allCompleted.length,
    totalPending: allPending.length,
    loading,
  };
}
