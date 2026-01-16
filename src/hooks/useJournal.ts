import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebase';
import { JournalEntry, JournalCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';

export interface CreateJournalEntryData {
  text: string;
  category: JournalCategory;
  childId?: string;
  context: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    stressLevel: number; // 1-5
  };
  attachments?: {
    photos?: File[];
    voiceNote?: File;
  };
}

export interface JournalFilters {
  childId?: string;
  category?: JournalCategory;
  startDate?: Date;
  endDate?: Date;
}

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all journal entries for the family
  const fetchEntries = async (filters?: JournalFilters) => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let q = query(
        collection(firestore, 'journal_entries'),
        where('familyId', '==', user.familyId),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters?.childId) {
        q = query(q, where('childId', '==', filters.childId));
      }
      if (filters?.category) {
        q = query(q, where('category', '==', filters.category));
      }

      const querySnapshot = await getDocs(q);
      const fetchedEntries: JournalEntry[] = [];

      querySnapshot.forEach((doc) => {
        fetchedEntries.push({
          entryId: doc.id,
          ...doc.data(),
        } as JournalEntry);
      });

      // Apply date filters client-side (Firestore has limitations on complex queries)
      let filteredEntries = fetchedEntries;
      if (filters?.startDate) {
        filteredEntries = filteredEntries.filter(
          (entry) => entry.createdAt.toDate() >= filters.startDate!
        );
      }
      if (filters?.endDate) {
        filteredEntries = filteredEntries.filter(
          (entry) => entry.createdAt.toDate() <= filters.endDate!
        );
      }

      setEntries(filteredEntries);
    } catch (err: any) {
      console.error('Error fetching journal entries:', err);
      setError(err.message || 'Failed to fetch journal entries');
    } finally {
      setLoading(false);
    }
  };

  // Create new journal entry
  const createEntry = async (data: CreateJournalEntryData): Promise<string> => {
    if (!user?.familyId) {
      throw new Error('User must be logged in with a family');
    }

    try {
      // Upload attachments first if they exist
      const photoUrls: string[] = [];
      let voiceNoteUrl: string | undefined;

      if (data.attachments?.photos) {
        for (const photo of data.attachments.photos) {
          const photoRef = ref(
            storage,
            `families/${user.familyId}/journal_entries/${Date.now()}_${photo.name}`
          );
          await uploadBytes(photoRef, photo);
          const url = await getDownloadURL(photoRef);
          photoUrls.push(url);
        }
      }

      if (data.attachments?.voiceNote) {
        const voiceRef = ref(
          storage,
          `families/${user.familyId}/journal_entries/${Date.now()}_voice.webm`
        );
        await uploadBytes(voiceRef, data.attachments.voiceNote);
        voiceNoteUrl = await getDownloadURL(voiceRef);
      }

      // Create journal entry document
      const entryData: any = {
        familyId: user.familyId,
        authorId: user.userId,
        authorName: user.name,
        text: data.text,
        category: data.category,
        context: data.context,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include optional fields if they have values
      if (data.childId) entryData.childId = data.childId;
      if (photoUrls.length > 0) entryData.photoUrls = photoUrls;
      if (voiceNoteUrl) entryData.voiceNoteUrl = voiceNoteUrl;

      const docRef = await addDoc(collection(firestore, 'journal_entries'), entryData);

      // Refresh entries list
      await fetchEntries();

      return docRef.id;
    } catch (err: any) {
      console.error('Error creating journal entry:', err);
      throw new Error(err.message || 'Failed to create journal entry');
    }
  };

  // Update existing journal entry
  const updateEntry = async (
    entryId: string,
    updates: Partial<CreateJournalEntryData>
  ): Promise<void> => {
    try {
      const entryRef = doc(firestore, 'journal_entries', entryId);

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (updates.text !== undefined) updateData.text = updates.text;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.childId !== undefined) updateData.childId = updates.childId;
      if (updates.context !== undefined) updateData.context = updates.context;

      await updateDoc(entryRef, updateData);

      // Refresh entries list
      await fetchEntries();
    } catch (err: any) {
      console.error('Error updating journal entry:', err);
      throw new Error(err.message || 'Failed to update journal entry');
    }
  };

  // Delete journal entry
  const deleteEntry = async (entryId: string): Promise<void> => {
    try {
      const entryRef = doc(firestore, 'journal_entries', entryId);

      // TODO: Also delete associated files from Storage
      // This requires storing file paths in the entry document

      await deleteDoc(entryRef);

      // Refresh entries list
      await fetchEntries();
    } catch (err: any) {
      console.error('Error deleting journal entry:', err);
      throw new Error(err.message || 'Failed to delete journal entry');
    }
  };

  // Load entries on mount
  useEffect(() => {
    if (user?.familyId) {
      fetchEntries();
    }
  }, [user?.familyId]);

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
