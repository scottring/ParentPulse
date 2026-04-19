'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import type { JournalEntry } from '@/types/journal';

// Returns true when the current signed-in user is a participant of `entry`
// — EITHER tagged via personMentions (their linked Person is a subject),
// OR the entry was explicitly shared with them (`sharedWithUserIds`).
// Either way they have standing to add their perspective. Excludes the
// author (you can't respond to yourself).
//
// Sharing-as-recipient is the common case in practice: most authors
// don't bother to add person tags, they just share with the people the
// entry is about. Requiring an explicit tag would gate the feature behind
// a capture-UX change we haven't shipped yet.
export function useIsMentionedIn(
  entry:
    | Pick<JournalEntry, 'personMentions' | 'authorId' | 'sharedWithUserIds'>
    | null
    | undefined,
): boolean {
  const { user } = useAuth();
  const { people } = usePerson();

  return useMemo(() => {
    if (!entry || !user?.userId) return false;
    if (entry.authorId === user.userId) return false;

    if ((entry.sharedWithUserIds ?? []).includes(user.userId)) return true;

    const myPersonIds = (people ?? [])
      .filter((p) => p.linkedUserId === user.userId)
      .map((p) => p.personId);
    return (entry.personMentions ?? []).some((pid) => myPersonIds.includes(pid));
  }, [entry, user?.userId, people]);
}
