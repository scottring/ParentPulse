'use client';

import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';

// ==================== Types ====================

export interface JournalEntry {
  entryId: string;
  date: Date;
  content: string;
  promptUsed?: string;
}

export interface JournalEntryData {
  entryId: string;
  familyId: string;
  userId: string;
  personId?: string; // If journaling about a specific person
  manualId?: string; // If tied to a manual
  content: string;
  promptUsed?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

export interface ActivityReflection {
  reflectionId: string;
  familyId: string;
  userId: string;
  personId: string;
  activityId: string;
  workbookId?: string;
  content: string;
  savedToManual: boolean;
  createdAt: Timestamp;
}

export interface MilestoneReflection {
  reflectionId: string;
  familyId: string;
  userId: string;
  journeyId: string;
  milestoneDay: number;
  reflection: string;
  whatHelped: string;
  stats: {
    daysCompleted: number;
    activitiesCompleted: number;
    storiesRead: number;
    repairsLogged: number;
    journalEntries: number;
  };
  createdAt: Timestamp;
}

interface UseReflectionsV2Return {
  loading: boolean;
  error: string | null;
  journalEntries: JournalEntry[];

  // Journal
  saveJournalEntry: (
    content: string,
    promptUsed?: string,
    personId?: string,
    manualId?: string
  ) => Promise<JournalEntryData | null>;
  loadJournalEntries: (
    personId?: string,
    manualId?: string,
    limitCount?: number
  ) => Promise<void>;

  // Activity Reflections
  saveActivityReflection: (
    personId: string,
    activityId: string,
    content: string,
    saveToManual: boolean,
    workbookId?: string
  ) => Promise<ActivityReflection | null>;

  // Milestone Reflections
  saveMilestoneReflection: (
    journeyId: string,
    milestoneDay: number,
    reflection: string,
    whatHelped: string,
    stats: MilestoneReflection['stats']
  ) => Promise<MilestoneReflection | null>;

  clearError: () => void;
}

// ==================== Hook ====================

export function useReflectionsV2(): UseReflectionsV2Return {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Save a new journal entry
   */
  const saveJournalEntry = useCallback(
    async (
      content: string,
      promptUsed?: string,
      personId?: string,
      manualId?: string
    ): Promise<JournalEntryData | null> => {
      if (!user) {
        setError('Must be logged in to save journal entry');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const now = Timestamp.now();
        const entryData: Omit<JournalEntryData, 'entryId'> = {
          familyId: user.familyId,
          userId: user.userId,
          personId,
          manualId,
          content,
          promptUsed,
          date: now,
          createdAt: now,
        };

        const docRef = await addDoc(
          collection(firestore, COLLECTIONS.JOURNAL_ENTRIES),
          entryData
        );

        const entry: JournalEntryData = {
          ...entryData,
          entryId: docRef.id,
        };

        // Add to local state
        setJournalEntries((prev) => [
          {
            entryId: entry.entryId,
            date: entry.date.toDate(),
            content: entry.content,
            promptUsed: entry.promptUsed,
          },
          ...prev,
        ]);

        return entry;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save journal entry';
        setError(message);
        console.error('Error saving journal entry:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Load journal entries for the current week
   */
  const loadJournalEntries = useCallback(
    async (
      personId?: string,
      _manualId?: string,
      limitCount = 7
    ): Promise<void> => {
      if (!user) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get entries from the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoTimestamp = Timestamp.fromDate(weekAgo);

        let q = query(
          collection(firestore, COLLECTIONS.JOURNAL_ENTRIES),
          where('familyId', '==', user.familyId),
          where('userId', '==', user.userId),
          where('date', '>=', weekAgoTimestamp),
          orderBy('date', 'desc'),
          limit(limitCount)
        );

        // Add optional filters
        if (personId) {
          q = query(
            collection(firestore, COLLECTIONS.JOURNAL_ENTRIES),
            where('familyId', '==', user.familyId),
            where('personId', '==', personId),
            where('date', '>=', weekAgoTimestamp),
            orderBy('date', 'desc'),
            limit(limitCount)
          );
        }

        const snapshot = await getDocs(q);

        const entries: JournalEntry[] = snapshot.docs.map((doc) => {
          const data = doc.data() as JournalEntryData;
          return {
            entryId: doc.id,
            date: data.date.toDate(),
            content: data.content,
            promptUsed: data.promptUsed,
          };
        });

        setJournalEntries(entries);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load journal entries';
        setError(message);
        console.error('Error loading journal entries:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Save an activity reflection
   */
  const saveActivityReflection = useCallback(
    async (
      personId: string,
      activityId: string,
      content: string,
      saveToManual: boolean,
      workbookId?: string
    ): Promise<ActivityReflection | null> => {
      if (!user) {
        setError('Must be logged in to save reflection');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const reflectionData: Omit<ActivityReflection, 'reflectionId'> = {
          familyId: user.familyId,
          userId: user.userId,
          personId,
          activityId,
          workbookId,
          content,
          savedToManual: saveToManual,
          createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(
          collection(firestore, COLLECTIONS.ACTIVITY_REFLECTIONS),
          reflectionData
        );

        const reflection: ActivityReflection = {
          ...reflectionData,
          reflectionId: docRef.id,
        };

        return reflection;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save reflection';
        setError(message);
        console.error('Error saving activity reflection:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Save a milestone reflection
   */
  const saveMilestoneReflection = useCallback(
    async (
      journeyId: string,
      milestoneDay: number,
      reflection: string,
      whatHelped: string,
      stats: MilestoneReflection['stats']
    ): Promise<MilestoneReflection | null> => {
      if (!user) {
        setError('Must be logged in to save milestone reflection');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const reflectionData: Omit<MilestoneReflection, 'reflectionId'> = {
          familyId: user.familyId,
          userId: user.userId,
          journeyId,
          milestoneDay,
          reflection,
          whatHelped,
          stats,
          createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(
          collection(firestore, COLLECTIONS.MILESTONE_REFLECTIONS),
          reflectionData
        );

        const milestoneReflection: MilestoneReflection = {
          ...reflectionData,
          reflectionId: docRef.id,
        };

        return milestoneReflection;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save milestone reflection';
        setError(message);
        console.error('Error saving milestone reflection:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    loading,
    error,
    journalEntries,
    saveJournalEntry,
    loadJournalEntries,
    saveActivityReflection,
    saveMilestoneReflection,
    clearError,
  };
}
