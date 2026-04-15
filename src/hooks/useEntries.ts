import { useEffect, useMemo, useState } from 'react';
import type { Entry, EntryFilter } from '@/types/entry';
import {
  fetchEntries,
  firestoreEntrySource,
  firestoreFamilyRoster,
  type EntrySource,
  type FamilyRosterFetcher,
} from '@/lib/entries/query';
import { useAuth } from '@/context/AuthContext';

export interface UseEntriesArgs {
  familyId: string | null;
  filter: EntryFilter;
  /** Override for tests; defaults to the Firestore-backed source. */
  source?: EntrySource;
  /** Override for tests; defaults to the Firestore-backed roster fetcher. */
  fetchRoster?: FamilyRosterFetcher;
}

export interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
}

export function useEntries({
  familyId,
  filter,
  source = firestoreEntrySource,
  fetchRoster = firestoreFamilyRoster,
}: UseEntriesArgs): UseEntriesResult {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    if (!familyId || !user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const currentUserId = user.userId;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEntries(familyId, filter, source, currentUserId, fetchRoster)
      .then((es) => {
        if (!cancelled) {
          setEntries(es);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setEntries([]);
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // filterKey is the actual change signal for `filter`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, filterKey, source, fetchRoster, user]);

  return { entries, loading, error };
}
