'use client';

import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalEntry } from '@/types/journal';

export interface EchoMatch {
  entryId: string;
  text: string;
  title: string | null;
  category: string;
  summary: string | null;
  themes: string[];
  createdAt: { _seconds: number; _nanoseconds: number };
  authorId: string;
}

interface UseJournalEchoReturn {
  echo: EchoMatch | null;
  loading: boolean;
}

/**
 * Finds a semantically similar older journal entry to surface as a
 * "featured echo" on the /journal page. Given a recent entry, calls
 * the findSimilarEntries Cloud Function for vector search.
 *
 * Returns the best match (oldest-first preference among top results),
 * or null if no good echo exists.
 */
export function useJournalEcho(
  recentEntries: JournalEntry[],
): UseJournalEchoReturn {
  const { user } = useAuth();
  const [echo, setEcho] = useState<EchoMatch | null>(null);
  const [loading, setLoading] = useState(false);

  // Pick the most recent entry as the seed for the echo search.
  const seedEntry = recentEntries[0] ?? null;
  const seedId = seedEntry?.entryId ?? null;
  const familyId = user?.familyId ?? null;

  useEffect(() => {
    if (!seedId || !familyId) {
      setEcho(null);
      return;
    }

    // Only search if the seed entry has an enrichment (meaning it's
    // been processed). Unenriched entries may not have embeddings yet.
    if (!seedEntry?.enrichment) {
      setEcho(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fn = httpsCallable(functions, 'findSimilarEntries');
    fn({ entryId: seedId, familyId, limit: 3 })
      .then((result) => {
        if (cancelled) return;
        const data = result.data as { matches: EchoMatch[] };
        // Prefer the oldest match among the top results — the further
        // back in time, the more powerful the "echo" feeling.
        const matches = data.matches || [];
        if (matches.length === 0) {
          setEcho(null);
        } else {
          const oldest = matches.reduce((a, b) => {
            const aTime = a.createdAt?._seconds ?? 0;
            const bTime = b.createdAt?._seconds ?? 0;
            return aTime < bTime ? a : b;
          });
          setEcho(oldest);
        }
      })
      .catch(() => {
        if (!cancelled) setEcho(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [seedId, familyId, seedEntry?.enrichment]);

  return { echo, loading };
}
