'use client';

import { useMemo } from 'react';
import { usePerson } from '@/hooks/usePerson';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { Person } from '@/types/person-manual';
import type { JournalEntry } from '@/types/journal';
import { entryMentionsPerson } from '@/lib/entry-mentions';

export interface LeastWrittenPerson {
  person: Person;
  daysSinceLast: number;      // 9999 if never written about
  entriesCount: number;
  openThreadsCount: number;
  lastEntry?: JournalEntry;   // most recent entry mentioning them
}

// Returns the family member who's been written about least recently —
// the "someone you haven't written about in a while" slot on the
// Workbook. Excludes self and archived people. Prefers people with
// at least one past entry (so we have a last-line to echo); falls
// back to never-written-about if the family has no history yet.
export function useLeastWrittenPerson(): {
  loading: boolean;
  candidate: LeastWrittenPerson | null;
} {
  const { people, loading: peopleLoading } = usePerson();
  const { entries } = useJournalEntries();

  const candidate = useMemo<LeastWrittenPerson | null>(() => {
    const eligible = people.filter(
      (p) => !p.archived && p.relationshipType !== 'self',
    );
    if (eligible.length === 0) return null;

    const now = Date.now();
    const scored = eligible.map((person) => {
      const mentions = entries.filter((e) =>
        entryMentionsPerson(e, person.personId),
      );
      const latest = mentions
        .map((e) => e.createdAt?.toDate?.())
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      const daysSinceLast = latest
        ? Math.floor((now - latest.getTime()) / 86_400_000)
        : 9999;
      const lastEntry = latest
        ? mentions
            .filter((e) => e.createdAt?.toDate?.().getTime() === latest.getTime())[0]
        : undefined;
      return {
        person,
        daysSinceLast,
        entriesCount: mentions.length,
        openThreadsCount: 0,
        lastEntry,
      } as LeastWrittenPerson;
    });

    // Prefer someone with at least one past entry — otherwise we
    // have no last-line to echo on the card. Fall back to never-
    // written if nobody has history yet.
    const withHistory = scored
      .filter((s) => s.entriesCount > 0)
      .sort((a, b) => b.daysSinceLast - a.daysSinceLast);
    if (withHistory[0]) return withHistory[0];

    const neverWritten = scored
      .filter((s) => s.entriesCount === 0)
      .sort((a, b) => {
        const aAdded = a.person.addedAt?.toMillis?.() ?? 0;
        const bAdded = b.person.addedAt?.toMillis?.() ?? 0;
        return aAdded - bAdded;
      });
    return neverWritten[0] ?? null;
  }, [people, entries]);

  return {
    loading: peopleLoading,
    candidate,
  };
}
