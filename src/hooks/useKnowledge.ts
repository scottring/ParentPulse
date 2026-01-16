import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { KnowledgeBase, SourceType } from '@/types';

interface AddKnowledgeData {
  sourceType: SourceType;
  title: string;
  author?: string;
  url?: string;
  excerpt: string;
  notes?: string;
  tags?: string[];
  file?: File;
}

export function useKnowledge() {
  const { user } = useAuth();
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch knowledge items
  useEffect(() => {
    if (!user || !user.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'knowledge_base'),
      where('familyId', '==', user.familyId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const knowledgeItems: KnowledgeBase[] = snapshot.docs.map((doc) => ({
          knowledgeId: doc.id,
          ...doc.data(),
        } as KnowledgeBase));

        setItems(knowledgeItems);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching knowledge items:', err);
        setError('Failed to load knowledge items');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Add new knowledge item
  const addKnowledge = async (data: AddKnowledgeData): Promise<string> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      let fileUrl: string | undefined;

      // Upload file if provided
      if (data.file) {
        const fileExtension = data.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, `knowledge/${user.familyId}/${fileName}`);

        await uploadBytes(storageRef, data.file);
        fileUrl = await getDownloadURL(storageRef);
      }

      // Create basic knowledge item - only include fields with values
      const knowledgeData: any = {
        familyId: user.familyId,
        addedByParentId: user.userId,
        timestamp: Timestamp.now(),
        sourceType: data.sourceType,
        title: data.title,
        excerpt: data.excerpt,
        tags: data.tags || [],
        relatedJournalEntries: [],
        // AI extraction will be added by a Cloud Function (future enhancement)
        aiExtraction: {
          keyInsights: [],
          actionableStrategies: [],
          relevantConcepts: [],
          summary: data.excerpt.slice(0, 200) + '...',
        },
      };

      // Only include optional fields if they have values
      if (data.author) knowledgeData.author = data.author;
      if (data.url || fileUrl) knowledgeData.url = fileUrl || data.url;
      if (data.notes) knowledgeData.notes = data.notes;
      if (fileUrl) knowledgeData.fileUrl = fileUrl;

      const docRef = await addDoc(collection(firestore, 'knowledge_base'), knowledgeData);
      return docRef.id;
    } catch (err) {
      console.error('Error adding knowledge item:', err);
      throw new Error('Failed to add knowledge item');
    }
  };

  // Update knowledge item
  const updateKnowledge = async (knowledgeId: string, updates: Partial<AddKnowledgeData>): Promise<void> => {
    try {
      const docRef = doc(firestore, 'knowledge_base', knowledgeId);
      await updateDoc(docRef, updates as any);
    } catch (err) {
      console.error('Error updating knowledge item:', err);
      throw new Error('Failed to update knowledge item');
    }
  };

  // Delete knowledge item
  const deleteKnowledge = async (knowledgeId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'knowledge_base', knowledgeId));
    } catch (err) {
      console.error('Error deleting knowledge item:', err);
      throw new Error('Failed to delete knowledge item');
    }
  };

  // Get items by source type
  const getItemsByType = (sourceType: SourceType): KnowledgeBase[] => {
    return items.filter(item => item.sourceType === sourceType);
  };

  // Get items by tag
  const getItemsByTag = (tag: string): KnowledgeBase[] => {
    return items.filter(item => item.tags.includes(tag));
  };

  return {
    items,
    loading,
    error,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    getItemsByType,
    getItemsByTag,
    books: getItemsByType('book'),
    podcasts: getItemsByType('podcast'),
    articles: getItemsByType('article'),
    research: getItemsByType('research'),
    videos: getItemsByType('video'),
  };
}
