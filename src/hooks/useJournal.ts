'use client';

import { useState } from 'react';
import {
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { JournalCategory } from '@/types/journal';

interface CreateEntryInput {
  text: string;
  category: JournalCategory;
  personMentions?: string[];
  isPrivate?: boolean;
}

interface UseJournalReturn {
  createEntry: (input: CreateEntryInput) => Promise<string>;
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

      const docData: Record<string, unknown> = {
        familyId: user.familyId,
        authorId: user.userId,
        text: input.text.trim(),
        category: input.category,
        tags: [],
        isPrivate: input.isPrivate ?? false,
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

  return { createEntry, saving, error };
}
