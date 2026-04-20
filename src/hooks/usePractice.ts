'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalMedia } from '@/types/journal';
import {
  type Practice,
  type PracticeSession,
  WEEKLY_RELISH_PROMPTS,
  WEEKLY_RELISH_SLUG,
  weekOfSunday,
} from '@/types/practice';

interface UsePracticeReturn {
  practice: Practice | null;
  sessions: PracticeSession[];
  loading: boolean;
  error: string | null;
  // Log a new sit-down. Body is required; media is optional.
  logSession: (body: string, media?: JournalMedia[]) => Promise<string>;
  // Mark this cycle done without a written session (optional — the
  // submit path already updates lastCompleted via logSession).
  markDoneThisWeek: () => Promise<void>;
  isDoneThisWeek: boolean;
}

// Resolves a practice by Firestore id. If practiceId === 'weekly-relish'
// and no doc exists yet for this family, auto-seeds the default
// Weekly Relish practice and returns that.
export function usePractice(
  practiceId: string | null | undefined,
): UsePracticeReturn {
  const { user } = useAuth();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(practiceId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!practiceId || !user?.familyId || !user?.userId) return;
    let cancelled = false;

    // Two paths:
    //   1. Existing doc with this id — subscribe.
    //   2. Well-known slug ('weekly-relish') with no doc for this
    //      family — seed it once and then subscribe.
    (async () => {
      const ref = doc(firestore, 'practices', practiceId);

      // If the id is the stable seed slug, check if THIS family's
      // copy exists (we use familyId-prefixed ids for seeded ones).
      const familyScopedId =
        practiceId === WEEKLY_RELISH_SLUG
          ? `${user.familyId}__${WEEKLY_RELISH_SLUG}`
          : practiceId;

      const scopedRef = doc(firestore, 'practices', familyScopedId);

      // Seed if missing.
      if (practiceId === WEEKLY_RELISH_SLUG) {
        try {
          const snap = await getDocs(
            query(
              collection(firestore, 'practices'),
              where('familyId', '==', user.familyId),
              where('slug', '==', WEEKLY_RELISH_SLUG),
            ),
          );
          if (snap.empty) {
            await setDoc(scopedRef, {
              practiceId: familyScopedId,
              familyId: user.familyId,
              slug: WEEKLY_RELISH_SLUG,
              name: 'Our weekly Relish.',
              description:
                'A 20-minute Sunday sit-down. Just the two of us, the workbook, and a cup of something.',
              prompts: [...WEEKLY_RELISH_PROMPTS],
              cadence: 'weekly',
              createdByUserId: user.userId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('usePractice: seed failed', err);
        }
      }

      const activeRef = practiceId === WEEKLY_RELISH_SLUG ? scopedRef : ref;
      const unsub = onSnapshot(
        activeRef,
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setPractice(null);
            setError('Practice not found');
            setLoading(false);
            return;
          }
          setPractice({
            ...(snap.data() as Omit<Practice, 'practiceId'>),
            practiceId: snap.id,
          });
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.warn('usePractice: listener error', err);
          if (!cancelled) {
            setError('Failed to load practice');
            setLoading(false);
          }
        },
      );

      // Sessions listener
      const sessionsQuery = query(
        collection(firestore, 'practices', activeRef.id, 'sessions'),
        orderBy('createdAt', 'desc'),
      );
      const sessUnsub = onSnapshot(
        sessionsQuery,
        (snap) => {
          if (cancelled) return;
          const arr: PracticeSession[] = snap.docs.map((d) => ({
            ...(d.data() as Omit<PracticeSession, 'sessionId'>),
            sessionId: d.id,
          }));
          setSessions(arr);
        },
        (err) => {
          console.warn('usePractice: sessions listener error', err);
        },
      );

      if (cancelled) {
        unsub();
        sessUnsub();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [practiceId, user?.familyId, user?.userId]);

  const thisWeek = weekOfSunday();
  const isDoneThisWeek = practice?.lastCompletedWeekOf === thisWeek;

  const logSession = useCallback(
    async (body: string, media?: JournalMedia[]): Promise<string> => {
      if (!practice || !user?.userId || !user?.familyId) {
        throw new Error('Not ready');
      }
      const weekOf = weekOfSunday();
      const ref = await addDoc(
        collection(firestore, 'practices', practice.practiceId, 'sessions'),
        {
          practiceId: practice.practiceId,
          familyId: user.familyId,
          weekOf,
          body: body.trim(),
          media: media ?? [],
          createdByUserId: user.userId,
          createdAt: serverTimestamp(),
        },
      );
      // Bump lastCompleted on the parent practice doc.
      await updateDoc(doc(firestore, 'practices', practice.practiceId), {
        lastCompletedWeekOf: weekOf,
        lastCompletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return ref.id;
    },
    [practice, user],
  );

  const markDoneThisWeek = useCallback(async () => {
    if (!practice) return;
    const weekOf = weekOfSunday();
    await updateDoc(doc(firestore, 'practices', practice.practiceId), {
      lastCompletedWeekOf: weekOf,
      lastCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }, [practice]);

  return {
    practice,
    sessions,
    loading,
    error,
    logSession,
    markDoneThisWeek,
    isDoneThisWeek,
  };
}
