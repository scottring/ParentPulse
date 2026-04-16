'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query as firestoreQuery,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { MarginNote } from '@/types/marginNote';

// Firestore 'in' operator caps at 30 values per query. PAGE_SIZE is 6
// in JournalSpread, so a single query is always sufficient.
const FIRESTORE_IN_CAP = 30;

/**
 * Group a flat list of notes by their journalEntryId, with each group
 * sorted oldest-first so render order matches the order they were written.
 */
export function groupNotesByEntry(
  notes: MarginNote[]
): Map<string, MarginNote[]> {
  const map = new Map<string, MarginNote[]>();
  for (const n of notes) {
    const list = map.get(n.journalEntryId);
    if (list) list.push(n);
    else map.set(n.journalEntryId, [n]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }
  return map;
}

export interface UseMarginNotesResult {
  notesByEntry: Map<string, MarginNote[]>;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to all margin notes that (a) belong to any entry id in the
 * provided list, AND (b) are visible to the current user. Returns a
 * Map<journalEntryId, MarginNote[]>.
 *
 * When `journalEntryIds` is empty the hook idles — no subscription, no
 * loading flash.
 */
export function useMarginNotesForJournalEntries(
  journalEntryIds: string[]
): UseMarginNotesResult {
  const { user } = useAuth();
  const [notes, setNotes] = useState<MarginNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const idsKey = useMemo(
    () => [...journalEntryIds].sort().join(','),
    [journalEntryIds]
  );

  useEffect(() => {
    if (!user?.userId || !user.familyId || journalEntryIds.length === 0) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (journalEntryIds.length > FIRESTORE_IN_CAP) {
      setError(
        new Error(
          `useMarginNotesForJournalEntries: ${journalEntryIds.length} ids exceeds Firestore in-cap of ${FIRESTORE_IN_CAP}`
        )
      );
      return;
    }
    setLoading(true);
    const q = firestoreQuery(
      collection(firestore, 'margin_notes'),
      where('familyId', '==', user.familyId),
      where('journalEntryId', 'in', journalEntryIds),
      where('visibleToUserIds', 'array-contains', user.userId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: MarginNote[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          out.push({
            id: docSnap.id,
            familyId: data.familyId,
            journalEntryId: data.journalEntryId,
            authorUserId: data.authorUserId,
            content: data.content,
            createdAt: data.createdAt as Timestamp,
            editedAt: data.editedAt as Timestamp | undefined,
            visibleToUserIds: data.visibleToUserIds ?? [],
            sharedWithUserIds: data.sharedWithUserIds ?? [],
          });
        });
        setNotes(out);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
    // idsKey is the change signal for journalEntryIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, user?.familyId, idsKey]);

  const notesByEntry = useMemo(() => groupNotesByEntry(notes), [notes]);

  return { notesByEntry, loading, error };
}
