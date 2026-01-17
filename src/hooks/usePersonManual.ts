/**
 * usePersonManual Hook
 *
 * Manages a person's operating manual - the container for all their role sections
 * One manual per person, contains metadata and references to role sections
 */

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PersonManual, RelationshipType, PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import { createManualSections } from '@/utils/manual-initialization';

interface UsePersonManualReturn {
  manual: PersonManual | null;
  loading: boolean;
  error: string | null;

  // CRUD operations
  createManual: (personId: string, personName: string, relationshipType?: RelationshipType) => Promise<string>;
  updateManual: (manualId: string, updates: Partial<PersonManual>) => Promise<void>;
  deleteManual: (manualId: string) => Promise<void>;

  // Role tracking
  incrementRoleSectionCount: (manualId: string) => Promise<void>;
  decrementRoleSectionCount: (manualId: string) => Promise<void>;
  addActiveRole: (manualId: string, roleId: string) => Promise<void>;
  removeActiveRole: (manualId: string, roleId: string) => Promise<void>;

  // Statistics
  updateStatistics: (manualId: string, stats: {
    totalTriggers?: number;
    totalStrategies?: number;
    activePlansCount?: number;
  }) => Promise<void>;

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

  // Create new manual
  const createManual = async (pid: string, personName: string, relationshipType?: RelationshipType): Promise<string> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      // Create the manual document
      const newManual: Omit<PersonManual, 'manualId'> = {
        familyId: user.familyId,
        personId: pid,
        personName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        roleSectionCount: 0,
        activeRoles: [],
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        totalTriggers: 0,
        totalStrategies: 0,
        activePlansCount: 0
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
        newManual
      );

      const manualId = docRef.id;

      // Auto-create role sections based on relationship type
      const createdSectionIds = await createManualSections({
        manualId,
        personId: pid,
        personName,
        familyId: user.familyId,
        userId: user.userId,
        relationshipType
      });

      // Update the manual with the correct section count
      if (createdSectionIds.length > 0) {
        const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
        await updateDoc(manualRef, {
          roleSectionCount: createdSectionIds.length,
          activeRoles: createdSectionIds
        });

        // Update local state with correct counts
        newManual.roleSectionCount = createdSectionIds.length;
        newManual.activeRoles = createdSectionIds;
      }

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
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS, manualId);
      await deleteDoc(manualRef);
      setManual(null);
    } catch (err) {
      console.error('Error deleting person manual:', err);
      throw new Error('Failed to delete manual');
    }
  };

  // Increment role section count
  const incrementRoleSectionCount = async (manualId: string): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');
    await updateManual(manualId, {
      roleSectionCount: manual.roleSectionCount + 1
    });
  };

  // Decrement role section count
  const decrementRoleSectionCount = async (manualId: string): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');
    await updateManual(manualId, {
      roleSectionCount: Math.max(0, manual.roleSectionCount - 1)
    });
  };

  // Add active role
  const addActiveRole = async (manualId: string, roleId: string): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');
    if (manual.activeRoles.includes(roleId)) return; // Already exists

    await updateManual(manualId, {
      activeRoles: [...manual.activeRoles, roleId]
    });
  };

  // Remove active role
  const removeActiveRole = async (manualId: string, roleId: string): Promise<void> => {
    if (!manual) throw new Error('Manual not loaded');

    await updateManual(manualId, {
      activeRoles: manual.activeRoles.filter(id => id !== roleId)
    });
  };

  // Update statistics
  const updateStatistics = async (
    manualId: string,
    stats: {
      totalTriggers?: number;
      totalStrategies?: number;
      activePlansCount?: number;
    }
  ): Promise<void> => {
    await updateManual(manualId, stats);
  };

  return {
    manual,
    loading,
    error,
    createManual,
    updateManual,
    deleteManual,
    incrementRoleSectionCount,
    decrementRoleSectionCount,
    addActiveRole,
    removeActiveRole,
    updateStatistics,
    manualExists,
    fetchByPersonId
  };
}
