'use client';

import { useCallback, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type {
  JournalCategory,
  UpdateEntryInput,
} from '@/types/journal';

interface CreateEntryInput {
  text: string;
  category: JournalCategory;
  personMentions?: string[];
  // User IDs (other than the author) who can read this entry. Empty
  // or omitted = private to author.
  sharedWithUserIds?: string[];
}

interface UseJournalReturn {
  createEntry: (input: CreateEntryInput) => Promise<string>;
  updateEntry: (
    entryId: string,
    patch: UpdateEntryInput,
    // Required whenever `patch.sharedWithUserIds` is set — we need the
    // author's userId to recompute `visibleToUserIds`. Callers pass
    // the current entry's authorId so this hook doesn't have to
    // re-fetch.
    authorId?: string,
  ) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export function useJournal(): UseJournalReturn {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEntry = async (input: CreateEntryInput): Promise<string> => {
    if (!user?.familyId) throw new Error('No family context');

    setSaving(true);
    setError(null);

    try {
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay =
        hour < 6 ? 'night' :
        hour < 12 ? 'morning' :
        hour < 17 ? 'afternoon' :
        hour < 21 ? 'evening' : 'night';

      const sharedWithUserIds = input.sharedWithUserIds ?? [];
      // Denormalized visibility list — author plus everyone they
      // explicitly shared with. Firestore rules and queries both read
      // this field via `array-contains`, so it must always include the
      // author so they can read their own entries.
      const visibleToUserIds = Array.from(
        new Set([user.userId, ...sharedWithUserIds]),
      );

      const docData: Record<string, unknown> = {
        familyId: user.familyId,
        authorId: user.userId,
        text: input.text.trim(),
        category: input.category,
        tags: [],
        visibleToUserIds,
        sharedWithUserIds,
        personMentions: input.personMentions ?? [],
        context: {
          timeOfDay,
        },
        createdAt: Timestamp.now(),
      };

      // Set legacy childId if exactly one person is mentioned
      // (used by daily analysis cloud function)
      if (input.personMentions?.length === 1) {
        docData.childId = input.personMentions[0];
      }

      const docRef = await addDoc(
        collection(firestore, 'journal_entries'),
        docData
      );

      return docRef.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entry';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Patch an existing entry. Only fields present in `patch` are
  // written. When sharing changes, visibleToUserIds is recomputed from
  // the patched sharedWithUserIds plus the entry's author.
  const updateEntry = useCallback(
    async (
      entryId: string,
      patch: UpdateEntryInput,
      authorId?: string,
    ): Promise<void> => {
      if (!user?.familyId) throw new Error('No family context');
      setSaving(true);
      setError(null);
      try {
        const updates: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
        };

        if (patch.text !== undefined) updates.text = patch.text.trim();
        if (patch.title !== undefined) updates.title = patch.title.trim();
        if (patch.category !== undefined) updates.category = patch.category;
        if (patch.personMentions !== undefined) {
          updates.personMentions = patch.personMentions;
        }
        if (patch.sharedWithUserIds !== undefined) {
          if (!authorId) {
            throw new Error(
              'updateEntry: authorId is required when updating sharedWithUserIds',
            );
          }
          const sharedWithUserIds = patch.sharedWithUserIds;
          updates.sharedWithUserIds = sharedWithUserIds;
          // Recompute denormalized visibility. Author always present.
          updates.visibleToUserIds = Array.from(
            new Set([authorId, ...sharedWithUserIds]),
          );
        }

        await updateDoc(
          doc(firestore, 'journal_entries', entryId),
          updates,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update entry';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.familyId],
  );

  return { createEntry, updateEntry, saving, error };
}
