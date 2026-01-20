/**
 * usePersonManual Hook (Phase 1 - Simplified)
 *
 * Manages a person's operating manual with content stored directly
 * One manual per person, all content in single document
 */

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  PersonManual,
  RelationshipType,
  ManualTrigger,
  ManualStrategy,
  ManualBoundary,
  ManualPattern,
  ManualProgressNote,
  PERSON_MANUAL_COLLECTIONS
} from '@/types/person-manual';

interface UsePersonManualReturn {
  manual: PersonManual | null;
  loading: boolean;
  error: string | null;

  // CRUD operations
  createManual: (personId: string, personName: string, relationshipType?: RelationshipType) => Promise<string>;
  updateManual: (manualId: string, updates: Partial<PersonManual>) => Promise<void>;
  deleteManual: (manualId: string) => Promise<void>;

  // Core Info
  updateCoreInfo: (manualId: string, coreInfo: Partial<PersonManual['coreInfo']>) => Promise<void>;

  // Trigger management
  addTrigger: (manualId: string, trigger: Omit<ManualTrigger, 'id' | 'identifiedDate' | 'identifiedBy' | 'confirmedBy'>) => Promise<void>;
  updateTrigger: (manualId: string, triggerId: string, updates: Partial<ManualTrigger>) => Promise<void>;
  deleteTrigger: (manualId: string, triggerId: string) => Promise<void>;
  confirmTrigger: (manualId: string, triggerId: string) => Promise<void>;

  // Strategy management
  addStrategy: (manualId: string, strategy: Omit<ManualStrategy, 'id' | 'addedDate' | 'addedBy'>, type: 'whatWorks' | 'whatDoesntWork') => Promise<void>;
  updateStrategy: (manualId: string, strategyId: string, updates: Partial<ManualStrategy>, type: 'whatWorks' | 'whatDoesntWork') => Promise<void>;
  deleteStrategy: (manualId: string, strategyId: string, type: 'whatWorks' | 'whatDoesntWork') => Promise<void>;

  // Boundary management
  addBoundary: (manualId: string, boundary: Omit<ManualBoundary, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateBoundary: (manualId: string, boundaryId: string, updates: Partial<ManualBoundary>) => Promise<void>;
  deleteBoundary: (manualId: string, boundaryId: string) => Promise<void>;

  // Pattern management
  addPattern: (manualId: string, pattern: Omit<ManualPattern, 'id'>) => Promise<void>;
  updatePattern: (manualId: string, patternId: string, updates: Partial<ManualPattern>) => Promise<void>;
  deletePattern: (manualId: string, patternId: string) => Promise<void>;

  // Progress notes
  addProgressNote: (manualId: string, note: Omit<ManualProgressNote, 'id' | 'date' | 'addedBy'>) => Promise<void>;
  deleteProgressNote: (manualId: string, noteId: string) => Promise<void>;

  // Utility
  manualExists: (personId: string) => Promise<boolean>;
  fetchByPersonId: (personId: string) => Promise<void>;
}

export function usePersonManual(personId?: string): UsePersonManualReturn {
  const { user } = useAuth();
  const [manual, setManual] = useState<PersonManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch manual by person ID
  const fetchByPersonId = async (pid: string) => {
    if (!user?.familyId) return;

    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
        where('familyId', '==', user.familyId),
        where('personId', '==', pid),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const manualDoc = querySnapshot.docs[0];
        setManual({
          manualId: manualDoc.id,
          ...manualDoc.data()
        } as PersonManual);
      } else {
        setManual(null);
      }
    } catch (err) {
      console.error('Error fetching person manual:', err);
      setError('Failed to load manual');
      setManual(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if personId provided
  useEffect(() => {
    if (personId && user?.familyId) {
      fetchByPersonId(personId);
    } else {
      setLoading(false);
    }
  }, [personId, user?.familyId]);

  // Check if manual exists for person
  const manualExists = async (pid: string): Promise<boolean> => {
    if (!user?.familyId) return false;

    try {
      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
        where('familyId', '==', user.familyId),
        where('personId', '==', pid),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (err) {
      console.error('Error checking manual existence:', err);
      return false;
    }
  };

  // Create new manual (Phase 1 - Simplified)
  const createManual = async (pid: string, personName: string, relationshipType?: RelationshipType): Promise<string> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      // Create the manual document with empty content arrays
      const newManual: Omit<PersonManual, 'manualId'> = {
        familyId: user.familyId,
        personId: pid,
        personName,
        relationshipType,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,

        // Core information
        coreInfo: {},

        // Content arrays (empty initially)
        triggers: [],
        whatWorks: [],
        whatDoesntWork: [],
        boundaries: [],
        emergingPatterns: [],
        progressNotes: [],

        // Statistics
        totalTriggers: 0,
        totalStrategies: 0,
        totalBoundaries: 0,

        // References
        relatedJournalEntries: [],
        relatedKnowledgeIds: []
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
        newManual
      );

      const manualId = docRef.id;

      setManual({
        manualId,
        ...newManual
      });

      return manualId;
    } catch (err) {
      console.error('Error creating person manual:', err);
      throw new Error('Failed to create manual');
    }
  };

  // Update manual
  const updateManual = async (
    manualId: string,
    updates: Partial<PersonManual>
  ): Promise<void> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: manual ? manual.version + 1 : 1
      };

      await updateDoc(manualRef, updateData);

      // Update local state
      if (manual) {
        setManual({
          ...manual,
          ...updateData
        } as PersonManual);
      }
    } catch (err) {
      console.error('Error updating person manual:', err);
      throw new Error('Failed to update manual');
    }
  };

  // Delete manual
  const deleteManual = async (manualId: string): Promise<void> => {
    try {
      // Get the manual first to find the personId
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
      const manualToDelete = manual;

      // Delete the manual document
      await deleteDoc(manualRef);

      // Update the person document to remove manual reference
      if (manualToDelete?.personId) {
        const personRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE, manualToDelete.personId);
        await updateDoc(personRef, {
          hasManual: false,
          manualId: null
        });
      }

      setManual(null);
    } catch (err) {
      console.error('Error deleting person manual:', err);
      throw new Error('Failed to delete manual');
    }
  };

  // === CORE INFO ===
  const updateCoreInfo = async (
    manualId: string,
    coreInfo: Partial<PersonManual['coreInfo']>
  ): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');

    const updatedCoreInfo = {
      ...manual.coreInfo,
      ...coreInfo
    };

    await updateManual(manualId, { coreInfo: updatedCoreInfo });
  };

  // === TRIGGER MANAGEMENT ===
  const addTrigger = async (
    manualId: string,
    trigger: Omit<ManualTrigger, 'id' | 'identifiedDate' | 'identifiedBy' | 'confirmedBy'>
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const newTrigger: ManualTrigger = {
      ...trigger,
      id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      identifiedDate: Timestamp.now(),
      identifiedBy: user.userId,
      confirmedBy: []
    };

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      triggers: arrayUnion(newTrigger),
      totalTriggers: manual.triggers.length + 1,
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      triggers: [...manual.triggers, newTrigger],
      totalTriggers: manual.triggers.length + 1,
      version: manual.version + 1
    });
  };

  const updateTrigger = async (
    manualId: string,
    triggerId: string,
    updates: Partial<ManualTrigger>
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedTriggers = manual.triggers.map(t =>
      t.id === triggerId ? { ...t, ...updates } : t
    );

    await updateManual(manualId, { triggers: updatedTriggers });
  };

  const deleteTrigger = async (manualId: string, triggerId: string): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedTriggers = manual.triggers.filter(t => t.id !== triggerId);

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      triggers: updatedTriggers,
      totalTriggers: Math.max(0, manual.triggers.length - 1),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      triggers: updatedTriggers,
      totalTriggers: Math.max(0, manual.triggers.length - 1),
      version: manual.version + 1
    });
  };

  const confirmTrigger = async (manualId: string, triggerId: string): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedTriggers = manual.triggers.map(t => {
      if (t.id === triggerId && !t.confirmedBy.includes(user.userId)) {
        return { ...t, confirmedBy: [...t.confirmedBy, user.userId] };
      }
      return t;
    });

    await updateManual(manualId, { triggers: updatedTriggers });
  };

  // === STRATEGY MANAGEMENT ===
  const addStrategy = async (
    manualId: string,
    strategy: Omit<ManualStrategy, 'id' | 'addedDate' | 'addedBy'>,
    type: 'whatWorks' | 'whatDoesntWork'
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const newStrategy: ManualStrategy = {
      ...strategy,
      id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    const currentStrategies = manual[type];
    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);

    await updateDoc(manualRef, {
      [type]: arrayUnion(newStrategy),
      totalStrategies: manual.totalStrategies + 1,
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      [type]: [...currentStrategies, newStrategy],
      totalStrategies: manual.totalStrategies + 1,
      version: manual.version + 1
    });
  };

  const updateStrategy = async (
    manualId: string,
    strategyId: string,
    updates: Partial<ManualStrategy>,
    type: 'whatWorks' | 'whatDoesntWork'
  ): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');

    const updatedStrategies = manual[type].map(s =>
      s.id === strategyId ? { ...s, ...updates } : s
    );

    await updateManual(manualId, { [type]: updatedStrategies });
  };

  const deleteStrategy = async (
    manualId: string,
    strategyId: string,
    type: 'whatWorks' | 'whatDoesntWork'
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedStrategies = manual[type].filter(s => s.id !== strategyId);

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      [type]: updatedStrategies,
      totalStrategies: Math.max(0, manual.totalStrategies - 1),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      [type]: updatedStrategies,
      totalStrategies: Math.max(0, manual.totalStrategies - 1),
      version: manual.version + 1
    });
  };

  // === BOUNDARY MANAGEMENT ===
  const addBoundary = async (
    manualId: string,
    boundary: Omit<ManualBoundary, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const newBoundary: ManualBoundary = {
      ...boundary,
      id: `boundary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      boundaries: arrayUnion(newBoundary),
      totalBoundaries: manual.boundaries.length + 1,
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      boundaries: [...manual.boundaries, newBoundary],
      totalBoundaries: manual.boundaries.length + 1,
      version: manual.version + 1
    });
  };

  const updateBoundary = async (
    manualId: string,
    boundaryId: string,
    updates: Partial<ManualBoundary>
  ): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');

    const updatedBoundaries = manual.boundaries.map(b =>
      b.id === boundaryId ? { ...b, ...updates } : b
    );

    await updateManual(manualId, { boundaries: updatedBoundaries });
  };

  const deleteBoundary = async (manualId: string, boundaryId: string): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedBoundaries = manual.boundaries.filter(b => b.id !== boundaryId);

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      boundaries: updatedBoundaries,
      totalBoundaries: Math.max(0, manual.boundaries.length - 1),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      boundaries: updatedBoundaries,
      totalBoundaries: Math.max(0, manual.boundaries.length - 1),
      version: manual.version + 1
    });
  };

  // === PATTERN MANAGEMENT ===
  const addPattern = async (
    manualId: string,
    pattern: Omit<ManualPattern, 'id'>
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const newPattern: ManualPattern = {
      ...pattern,
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      emergingPatterns: arrayUnion(newPattern),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      emergingPatterns: [...manual.emergingPatterns, newPattern],
      version: manual.version + 1
    });
  };

  const updatePattern = async (
    manualId: string,
    patternId: string,
    updates: Partial<ManualPattern>
  ): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');

    const updatedPatterns = manual.emergingPatterns.map(p =>
      p.id === patternId ? { ...p, ...updates } : p
    );

    await updateManual(manualId, { emergingPatterns: updatedPatterns });
  };

  const deletePattern = async (manualId: string, patternId: string): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedPatterns = manual.emergingPatterns.filter(p => p.id !== patternId);

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      emergingPatterns: updatedPatterns,
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      emergingPatterns: updatedPatterns,
      version: manual.version + 1
    });
  };

  // === PROGRESS NOTES ===
  const addProgressNote = async (
    manualId: string,
    note: Omit<ManualProgressNote, 'id' | 'date' | 'addedBy'>
  ): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const newNote: ManualProgressNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: Timestamp.now(),
      addedBy: user.userId
    };

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      progressNotes: arrayUnion(newNote),
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      progressNotes: [...manual.progressNotes, newNote],
      version: manual.version + 1
    });
  };

  const deleteProgressNote = async (manualId: string, noteId: string): Promise<void> => {
    if (!manual || !user?.userId) throw new Error('Manual not loaded or user not authenticated');

    const updatedNotes = manual.progressNotes.filter(n => n.id !== noteId);

    const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
    await updateDoc(manualRef, {
      progressNotes: updatedNotes,
      updatedAt: Timestamp.now(),
      lastEditedAt: Timestamp.now(),
      lastEditedBy: user.userId,
      version: manual.version + 1
    });

    // Update local state
    setManual({
      ...manual,
      progressNotes: updatedNotes,
      version: manual.version + 1
    });
  };

  return {
    manual,
    loading,
    error,
    createManual,
    updateManual,
    deleteManual,
    updateCoreInfo,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    confirmTrigger,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    addBoundary,
    updateBoundary,
    deleteBoundary,
    addPattern,
    updatePattern,
    deletePattern,
    addProgressNote,
    deleteProgressNote,
    manualExists,
    fetchByPersonId
  };
}
