'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useMomentInvite } from '@/hooks/useMomentInvite';
import { usePerson } from '@/hooks/usePerson';
import { useSettledMentions } from '@/hooks/useSettledMentions';
import { listOpenThreads, type OpenThread } from '@/lib/open-threads';
import type { Moment } from '@/types/moment';
import type { Ritual } from '@/types/ritual';

interface UseOpenThreadsReturn {
  threads: OpenThread[];
  loading: boolean;
}

/**
 * Live feed of the user's open threads. Subscribes to moments +
 * rituals + the existing journal entries stream, runs them through
 * the listOpenThreads predicate, and returns the sorted result.
 */
export function useOpenThreads(): UseOpenThreadsReturn {
  const { user } = useAuth();
  const { entries } = useJournalEntries();
  const { pendingForMe, loading: invitesLoading } = useMomentInvite();
  const { people } = usePerson();
  const { settledIds } = useSettledMentions();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [momentsReady, setMomentsReady] = useState(false);
  const [ritualsReady, setRitualsReady] = useState(false);

  useEffect(() => {
    if (!user?.familyId) return;
    // Moments: any in family. We re-filter in the predicate by
    // synthesis presence, so fetching all is fine at current volume.
    const q = query(
      collection(firestore, 'moments'),
      where('familyId', '==', user.familyId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: Moment[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Moment, 'momentId'>),
        momentId: d.id,
      }));
      setMoments(arr);
      setMomentsReady(true);
    }, (err) => {
      console.warn('useOpenThreads: moments listener error', err);
      setMomentsReady(true);
    });
    return () => unsub();
  }, [user?.familyId]);

  useEffect(() => {
    if (!user?.familyId || !user?.userId) return;
    // Only the user's own rituals (they must be a participant to read).
    const q = query(
      collection(firestore, 'rituals'),
      where('familyId', '==', user.familyId),
      where('participantUserIds', 'array-contains', user.userId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: Ritual[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Ritual, 'ritualId'>),
        ritualId: d.id,
      }));
      setRituals(arr);
      setRitualsReady(true);
    }, (err) => {
      console.warn('useOpenThreads: rituals listener error', err);
      setRitualsReady(true);
    });
    return () => unsub();
  }, [user?.familyId, user?.userId]);

  const me = useMemo(() => {
    if (!user?.userId) return undefined;
    const personIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    return {
      userId: user.userId,
      personIds,
      settledMentionIds: settledIds,
    };
  }, [user?.userId, people, settledIds]);

  const threads = useMemo(
    () =>
      listOpenThreads({
        moments,
        rituals,
        entries,
        pendingInvitesForMe: pendingForMe,
        me,
      }),
    [moments, rituals, entries, pendingForMe, me],
  );

  return {
    threads,
    loading: !momentsReady || !ritualsReady || invitesLoading,
  };
}
