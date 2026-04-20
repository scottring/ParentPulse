'use client';
/* ================================================================
   Relish · Integration — useCaptureSubmit
   Wires the overlay's CaptureSheet to the real journal_entries
   write path (useJournal.createEntry), so visibility denormalization,
   subjectType, and context.timeOfDay are handled correctly.
   ================================================================ */

import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useJournal } from '@/hooks/useJournal';
import type { CaptureSubmission } from '@/design/workbook/CaptureSheet';

export function useCaptureSubmit() {
  const { user } = useAuth();
  const { people } = useDashboard();
  const { createEntry } = useJournal();

  return useCallback(
    async (s: CaptureSubmission) => {
      if (!user?.userId || !user.familyId) throw new Error('not signed in');

      const personMatch = s.person
        ? people.find(
            (p) => p.name === s.person || p.name.startsWith(s.person!),
          )
        : null;

      const sharedWithUserIds =
        s.visibility === 'everyone'
          ? people
              .map((p) => p.linkedUserId)
              .filter((uid): uid is string => !!uid && uid !== user.userId)
          : [];

      await createEntry({
        text: s.text,
        category: 'moment',
        personMentions: personMatch ? [personMatch.personId] : [],
        tags: s.tag ? [s.tag] : [],
        sharedWithUserIds,
        media: s.media,
      });
    },
    [user, people, createEntry],
  );
}
