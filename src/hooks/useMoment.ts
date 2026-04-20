'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Moment } from '@/types/moment';
import type { JournalEntry } from '@/types/journal';

interface UseMomentReturn {
  moment: Moment | null;
  views: JournalEntry[];
  loading: boolean;
  notFound: boolean;
  error: string | null;
}

// Subscribes to a moment doc and the set of journal_entries that
// point at it (its views). The views query uses the composite index
// on (familyId, momentId, visibleToUserIds, createdAt) so each
// client only sees views it's allowed to read.
export function useMoment(momentId: string | null | undefined): UseMomentReturn {
  const { user } = useAuth();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [views, setViews] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(momentId));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!momentId || !user?.familyId || !user?.userId) return;

    const loaded = { moment: false, views: false };
    const markLoaded = (which: 'moment' | 'views') => {
      loaded[which] = true;
      if (loaded.moment && loaded.views) setLoading(false);
    };

    const momentRef = doc(firestore, 'moments', momentId);
    const momentUnsub = onSnapshot(
      momentRef,
      (snap) => {
        if (!snap.exists()) {
          setMoment(null);
          setNotFound(true);
        } else {
          setMoment({
            ...(snap.data() as Omit<Moment, 'momentId'>),
            momentId: snap.id,
          });
          setNotFound(false);
        }
        markLoaded('moment');
        setError(null);
      },
      (err) => {
        console.error('useMoment: moment listener error', err);
        setError('Failed to load moment');
        markLoaded('moment');
      },
    );

    const viewsQuery = query(
      collection(firestore, 'journal_entries'),
      where('familyId', '==', user.familyId),
      where('momentId', '==', momentId),
      where('visibleToUserIds', 'array-contains', user.userId),
      orderBy('createdAt', 'asc'),
    );
    const viewsUnsub = onSnapshot(
      viewsQuery,
      (snap) => {
        const arr: JournalEntry[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<JournalEntry, 'entryId'>),
          entryId: d.id,
        } as JournalEntry));
        setViews(arr);
        markLoaded('views');
      },
      (err) => {
        console.error('useMoment: views listener error', err);
        setError('Failed to load views');
        markLoaded('views');
      },
    );

    return () => {
      momentUnsub();
      viewsUnsub();
    };
  }, [momentId, user?.familyId, user?.userId]);

  return { moment, views, loading, notFound, error };
}
