'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Therapist, TherapyWindow, TherapyTheme } from '@/types/therapy';

export type TherapyAggregateState =
  | { ready: false }
  | {
      ready: true;
      hasTherapist: boolean;
      openWindowId: string | null;
      themeCount: number;
      starredCarriedTwicePlus: boolean;
      openedAtMillis: number | null;
      typicalCadenceDays: number;
    };

const DEFAULT_CADENCE_DAYS = 7;

/**
 * Lightweight aggregate hook for the Surface therapy card.
 * Returns counts-only data — never exposes theme titles or content.
 *
 * Uses cascading subscriptions:
 *   1. therapists where ownerUserId == userId
 *   2. If therapist found: therapy_windows where therapistId == X && status == 'open'
 *   3. If open window found: therapy_themes where windowId == X
 */
export function useTherapyAggregate(): TherapyAggregateState {
  const { user } = useAuth();
  const [state, setState] = useState<TherapyAggregateState>({ ready: false });

  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      // No user — defer setState to avoid synchronous call in effect body
      const t = setTimeout(() => setState({ ready: false }), 0);
      return () => clearTimeout(t);
    }

    // Step 1: Subscribe to therapists
    const therapistQ = query(
      collection(firestore, 'therapists'),
      where('ownerUserId', '==', userId)
    );

    let unsubWindow: (() => void) | null = null;
    let unsubThemes: (() => void) | null = null;

    const unsubTherapist = onSnapshot(therapistQ, (therapistSnap) => {
      // Clean up inner subscriptions whenever therapist list changes
      unsubWindow?.();
      unsubWindow = null;
      unsubThemes?.();
      unsubThemes = null;

      if (therapistSnap.empty) {
        setState({
          ready: true,
          hasTherapist: false,
          openWindowId: null,
          themeCount: 0,
          starredCarriedTwicePlus: false,
          openedAtMillis: null,
          typicalCadenceDays: DEFAULT_CADENCE_DAYS,
        });
        return;
      }

      const therapistDoc = therapistSnap.docs[0];
      const therapist = { id: therapistDoc.id, ...(therapistDoc.data() as Omit<Therapist, 'id'>) };

      // Step 2: Subscribe to open therapy windows for this therapist
      const windowQ = query(
        collection(firestore, 'therapy_windows'),
        where('therapistId', '==', therapist.id),
        where('status', '==', 'open')
      );

      unsubWindow = onSnapshot(windowQ, (windowSnap) => {
        // Clean up themes subscription when window changes
        unsubThemes?.();
        unsubThemes = null;

        if (windowSnap.empty) {
          setState({
            ready: true,
            hasTherapist: true,
            openWindowId: null,
            themeCount: 0,
            starredCarriedTwicePlus: false,
            openedAtMillis: null,
            typicalCadenceDays: DEFAULT_CADENCE_DAYS,
          });
          return;
        }

        const windowDoc = windowSnap.docs[0];
        const window = { id: windowDoc.id, ...(windowDoc.data() as Omit<TherapyWindow, 'id'>) };
        const openedAtMillis = window.openedAt?.toMillis?.() ?? null;

        // Step 3: Subscribe to themes for this window
        const themesQ = query(
          collection(firestore, 'therapy_themes'),
          where('windowId', '==', window.id)
        );

        unsubThemes = onSnapshot(themesQ, (themesSnap) => {
          let themeCount = 0;
          let starredCarriedTwicePlus = false;

          for (const doc of themesSnap.docs) {
            const theme = doc.data() as Omit<TherapyTheme, 'id'>;
            // Only count non-dismissed themes
            if (theme.userState?.dismissed) continue;
            themeCount++;
            if (
              theme.userState?.starred &&
              (theme.lifecycle?.carriedForwardCount ?? 0) >= 2
            ) {
              starredCarriedTwicePlus = true;
            }
          }

          setState({
            ready: true,
            hasTherapist: true,
            openWindowId: window.id,
            themeCount,
            starredCarriedTwicePlus,
            openedAtMillis,
            typicalCadenceDays: DEFAULT_CADENCE_DAYS,
          });
        });
      });
    });

    return () => {
      unsubTherapist();
      unsubWindow?.();
      unsubThemes?.();
    };
  }, [user?.userId]);

  return state;
}
