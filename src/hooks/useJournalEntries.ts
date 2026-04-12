'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';
import {
  hasRunJournalVisibilityMigration,
  runJournalVisibilityMigration,
} from '@/lib/migrations/journal-visibility';

const PAGE_SIZE = 20;

interface UseJournalEntriesReturn {
  entries: JournalEntry[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
}

// Live chronological feed of journal entries visible to the current
// user, newest first. The first page is a real-time onSnapshot listener;
// older pages are fetched on demand via getDocs with cursor pagination.
//
// On first mount per family, runs a one-shot migration that backfills
// `visibleToUserIds` on legacy entries (written before sharing existed).
export function useJournalEntries(): UseJournalEntriesReturn {
  const { user } = useAuth();
  const [firstPage, setFirstPage] = useState<JournalEntry[] | null>(null);
  const [olderPages, setOlderPages] = useState<JournalEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the last doc of the live page for cursor, and the last doc
  // of the most-recently-fetched older page for subsequent loads.
  const firstPageLastDocRef = useRef<DocumentSnapshot | null>(null);
  const olderCursorRef = useRef<DocumentSnapshot | null>(null);

  useEffect(() => {
    const familyId = user?.familyId;
    const userId = user?.userId;
    if (!familyId || !userId) return;

    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    // Reset pagination state when user/family changes.
    setOlderPages([]);
    setHasMore(true);
    olderCursorRef.current = null;

    const subscribe = () => {
      if (cancelled) return;
      const q = query(
        collection(firestore, 'journal_entries'),
        where('familyId', '==', familyId),
        where('visibleToUserIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const rows: JournalEntry[] = snapshot.docs.map(
            (docSnap) =>
              ({
                ...(docSnap.data() as Omit<JournalEntry, 'entryId'>),
                entryId: docSnap.id,
              }) as JournalEntry,
          );
          setFirstPage(rows);
          setError(null);
          // Track last doc for cursor pagination.
          firstPageLastDocRef.current =
            snapshot.docs[snapshot.docs.length - 1] ?? null;
          // If the first page returned fewer than PAGE_SIZE, there's
          // nothing older to load (unless older pages were already loaded).
          if (snapshot.docs.length < PAGE_SIZE && olderPages.length === 0) {
            setHasMore(false);
          }
        },
        (err) => {
          console.error('Journal entries listener error:', err);
          setError('Failed to load journal');
          setFirstPage([]);
        },
      );
    };

    const init = async () => {
      if (!hasRunJournalVisibilityMigration(familyId)) {
        try {
          await runJournalVisibilityMigration(familyId, userId);
        } catch (err) {
          console.error('Journal visibility migration failed:', err);
        }
      }
      subscribe();
    };

    void init();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.familyId, user?.userId]);

  const loadMore = useCallback(async () => {
    const familyId = user?.familyId;
    const userId = user?.userId;
    if (!familyId || !userId || loadingMore || !hasMore) return;

    // Use the older-page cursor if we've already loaded more, otherwise
    // use the last doc of the live first page.
    const cursor = olderCursorRef.current ?? firstPageLastDocRef.current;
    if (!cursor) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(firestore, 'journal_entries'),
        where('familyId', '==', familyId),
        where('visibleToUserIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE),
      );
      const snapshot = await getDocs(q);
      const rows: JournalEntry[] = snapshot.docs.map(
        (docSnap) =>
          ({
            ...(docSnap.data() as Omit<JournalEntry, 'entryId'>),
            entryId: docSnap.id,
          }) as JournalEntry,
      );
      setOlderPages((prev) => [...prev, ...rows]);
      olderCursorRef.current =
        snapshot.docs[snapshot.docs.length - 1] ?? null;
      if (snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more entries:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [user?.familyId, user?.userId, loadingMore, hasMore]);

  const loading = Boolean(user?.familyId) && firstPage === null;

  // Merge first page (live) + older pages (static). Deduplicate in
  // case a new entry pushed an existing one off the first page and it
  // also appears in olderPages.
  const entries = (() => {
    const live = firstPage ?? [];
    if (olderPages.length === 0) return live;
    const liveIds = new Set(live.map((e) => e.entryId));
    return [...live, ...olderPages.filter((e) => !liveIds.has(e.entryId))];
  })();

  return {
    entries,
    loading,
    loadingMore,
    hasMore,
    loadMore: () => void loadMore(),
    error,
  };
}
