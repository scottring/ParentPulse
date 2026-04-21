'use client';

import { useEffect, useState } from 'react';
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// Tracks when the current user last viewed the Workbook, so the
// hero can surface a book-voice "Since you were last here" line
// summarising what changed.
//
// Persistence: users/{userId}/private/workbookVisit
//   { lastSeenAt: Timestamp }
//
// Flow:
//   1. On mount, read the PRIOR lastSeenAt (what the page should
//      compare against).
//   2. Then write the current Timestamp back so the next visit
//      reads this one. We write once per mount so the paragraph
//      stays stable for the duration of a visit.
//   3. The returned priorLastSeenAt is null on first-ever visit
//      (consumer should render nothing in that case).
export function useWorkbookVisit(): {
  priorLastSeenAt: Date | null;
  loaded: boolean;
} {
  const { user } = useAuth();
  const [priorLastSeenAt, setPriorLastSeenAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.userId;
    if (!userId) return;
    (async () => {
      const ref = doc(firestore, 'users', userId, 'private', 'workbookVisit');
      try {
        const snap = await getDoc(ref);
        const data = snap.data() as
          | { lastSeenAt?: Timestamp }
          | undefined;
        const prior = data?.lastSeenAt?.toDate?.() ?? null;
        if (cancelled) return;
        setPriorLastSeenAt(prior);
        setLoaded(true);
        // Write this visit back for the next read to compare against.
        await setDoc(
          ref,
          { lastSeenAt: Timestamp.now(), updatedAt: serverTimestamp() },
          { merge: true },
        );
      } catch (err) {
        if (!cancelled) {
          console.warn('useWorkbookVisit: read/write failed', err);
          setLoaded(true); // unblock the consumer; paragraph just stays empty
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  return { priorLastSeenAt, loaded };
}
