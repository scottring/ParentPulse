import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import type { Entry, EntryType, EntryContent, EntryLifecycle } from '@/types/entry';
import type { DomainId } from '@/types/user';

interface UseEntriesOptions {
  yearbookId?: string;
  manualId?: string;
  personId?: string;
  type?: EntryType;
  domain?: DomainId;
  lifecycle?: EntryLifecycle;
}

interface UseEntriesReturn {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  getEntry: (entryId: string) => Entry | undefined;
  createEntry: (data: NewEntryData) => Promise<string>;
  updateEntry: (entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  completeEntry: (entryId: string) => Promise<void>;
}

interface NewEntryData {
  type: EntryType;
  source: Entry['source'];
  domain: DomainId;
  title: string;
  content: EntryContent;
  manualId?: string;
  yearbookId?: string;
  personId?: string;
  visibility?: Entry['visibility'];
}

export function useEntries(options: UseEntriesOptions = {}): UseEntriesReturn {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const constraints = [
      where('familyId', '==', user.familyId),
    ];

    if (options.yearbookId) constraints.push(where('yearbookId', '==', options.yearbookId));
    if (options.manualId) constraints.push(where('manualId', '==', options.manualId));
    if (options.personId) constraints.push(where('personId', '==', options.personId));
    if (options.type) constraints.push(where('type', '==', options.type));
    if (options.domain) constraints.push(where('domain', '==', options.domain));
    if (options.lifecycle) constraints.push(where('lifecycle', '==', options.lifecycle));

    const q = query(
      collection(firestore, COLLECTIONS.ENTRIES),
      ...constraints,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as Entry);
      setEntries(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to entries:', err);
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [
    user?.familyId,
    options.yearbookId,
    options.manualId,
    options.personId,
    options.type,
    options.domain,
    options.lifecycle,
  ]);

  const getEntry = useCallback((entryId: string) => {
    return entries.find(e => e.entryId === entryId);
  }, [entries]);

  const createEntry = useCallback(async (data: NewEntryData): Promise<string> => {
    if (!user) throw new Error('No user');

    const entryRef = doc(collection(firestore, COLLECTIONS.ENTRIES));
    const entry: Entry = {
      entryId: entryRef.id,
      familyId: user.familyId,
      manualId: data.manualId,
      yearbookId: data.yearbookId,
      personId: data.personId,
      type: data.type,
      source: data.source,
      domain: data.domain,
      title: data.title,
      content: data.content,
      linkedEntryIds: [],
      lifecycle: 'active',
      visibility: data.visibility || 'family',
      createdAt: serverTimestamp() as any,
    };

    await setDoc(entryRef, entry);
    return entryRef.id;
  }, [user]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<Entry>) => {
    const entryRef = doc(firestore, COLLECTIONS.ENTRIES, entryId);
    await updateDoc(entryRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    await deleteDoc(doc(firestore, COLLECTIONS.ENTRIES, entryId));
  }, []);

  const completeEntry = useCallback(async (entryId: string) => {
    const entryRef = doc(firestore, COLLECTIONS.ENTRIES, entryId);
    await updateDoc(entryRef, {
      lifecycle: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, []);

  return {
    entries,
    loading,
    error,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    completeEntry,
  };
}
