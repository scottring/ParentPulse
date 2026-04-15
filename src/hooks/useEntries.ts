import { useEffect, useMemo, useState } from 'react';
import type { Entry, EntryFilter } from '@/types/entry';
import {
  fetchEntries,
  firestoreEntrySource,
  type EntrySource,
} from '@/lib/entries/query';

export interface UseEntriesArgs {
  familyId: string | null;
  filter: EntryFilter;
  /** Override for tests; defaults to the Firestore-backed source. */
  source?: EntrySource;
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
}: UseEntriesArgs): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    if (!familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEntries(familyId, filter, source)
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
  }, [familyId, filterKey, source]);

  return { entries, loading, error };
}
