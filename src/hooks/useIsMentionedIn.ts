'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import type { JournalEntry } from '@/types/journal';

// Returns true when the current signed-in user is a subject of `entry`
// — i.e. one of the Persons whose linkedUserId equals user.userId has
// its personId inside entry.personMentions, AND the user is not the
// author of the entry (you can't respond to yourself).
export function useIsMentionedIn(
  entry: Pick<JournalEntry, 'personMentions' | 'authorId'> | null | undefined,
): boolean {
  const { user } = useAuth();
  const { people } = usePerson();

  return useMemo(() => {
    if (!entry || !user?.userId) return false;
    if (entry.authorId === user.userId) return false;
    const myPersonIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    return (entry.personMentions ?? []).some((pid) => myPersonIds.includes(pid));
  }, [entry, user?.userId, people]);
}
