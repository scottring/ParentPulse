/**
 * useRelationshipManual Hook
 *
 * Manages relationship manuals - shared manuals between two or more people
 * Examples: Marriage manual, parent-child manual, friendship manual
 *
 * Linked but independent from person manuals - contains joint content and relationship dynamics
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
  orderBy
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  RelationshipManual,
  SharedGoal,
  RelationshipRitual,
  RelationshipTradition,
  ConflictPattern,
  ConnectionStrategy,
  RelationshipMilestone,
  PERSON_MANUAL_COLLECTIONS
} from '@/types/person-manual';

interface UseRelationshipManualReturn {
  manual: RelationshipManual | null;
  loading: boolean;
  error: string | null;

  // CRUD
  createManual: (participantIds: string[], participantNames: string[], relationshipType: RelationshipManual['relationshipType'], title: string, description?: string) => Promise<string>;
  updateManual: (relationshipId: string, updates: Partial<RelationshipManual>) => Promise<void>;
  deleteManual: (relationshipId: string) => Promise<void>;

  // Content management - Shared Goals
  addSharedGoal: (relationshipId: string, goal: Omit<SharedGoal, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateSharedGoal: (relationshipId: string, goalId: string, updates: Partial<Omit<SharedGoal, 'id' | 'addedDate' | 'addedBy'>>) => Promise<void>;
  removeSharedGoal: (relationshipId: string, goalId: string) => Promise<void>;

  // Content management - Rituals
  addRitual: (relationshipId: string, ritual: Omit<RelationshipRitual, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateRitual: (relationshipId: string, ritualId: string, updates: Partial<Omit<RelationshipRitual, 'id' | 'addedDate' | 'addedBy'>>) => Promise<void>;
  removeRitual: (relationshipId: string, ritualId: string) => Promise<void>;

  // Content management - Traditions
  addTradition: (relationshipId: string, tradition: Omit<RelationshipTradition, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateTradition: (relationshipId: string, traditionId: string, updates: Partial<Omit<RelationshipTradition, 'id' | 'addedDate' | 'addedBy'>>) => Promise<void>;
  removeTradition: (relationshipId: string, traditionId: string) => Promise<void>;

  // Content management - Conflict Patterns
  addConflictPattern: (relationshipId: string, pattern: Omit<ConflictPattern, 'id' | 'identifiedDate' | 'identifiedBy'>) => Promise<void>;
  updateConflictPattern: (relationshipId: string, patternId: string, updates: Partial<Omit<ConflictPattern, 'id' | 'identifiedDate' | 'identifiedBy'>>) => Promise<void>;
  removeConflictPattern: (relationshipId: string, patternId: string) => Promise<void>;

  // Content management - Connection Strategies
  addConnectionStrategy: (relationshipId: string, strategy: Omit<ConnectionStrategy, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateConnectionStrategy: (relationshipId: string, strategyId: string, updates: Partial<Omit<ConnectionStrategy, 'id' | 'addedDate' | 'addedBy'>>) => Promise<void>;
  removeConnectionStrategy: (relationshipId: string, strategyId: string) => Promise<void>;

  // Content management - Milestones
  addMilestone: (relationshipId: string, milestone: Omit<RelationshipMilestone, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  removeMilestone: (relationshipId: string, milestoneId: string) => Promise<void>;

  // Queries
  getRelationshipManualsForPerson: (personId: string) => Promise<RelationshipManual[]>;
  getRelationshipBetween: (personId1: string, personId2: string) => Promise<RelationshipManual | null>;
}

/**
 * Hook for a single relationship manual by ID
 */
export function useRelationshipManual(relationshipId?: string): UseRelationshipManualReturn {
  const { user } = useAuth();
  const [manual, setManual] = useState<RelationshipManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch relationship manual by ID
  useEffect(() => {
    if (!relationshipId) {
      setLoading(false);
      return;
    }

    if (!user?.familyId) {
      console.warn('useRelationshipManual: No familyId available for user');
      setLoading(false);
      return;
    }

    const fetchManual = async () => {
      try {
        setLoading(true);
        setError(null);

        const docRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS, relationshipId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as RelationshipManual;

          // Verify the manual belongs to the user's family
          if (data.familyId !== user.familyId) {
            setError('You do not have permission to view this relationship manual');
            setManual(null);
          } else {
            setManual({
              ...data,
              relationshipId: docSnap.id
            } as RelationshipManual);
          }
        } else {
          setManual(null);
          setError('Relationship manual not found');
        }
      } catch (err) {
        console.error('Error fetching relationship manual:', err);
        setError('Failed to load relationship manual');
      } finally {
        setLoading(false);
      }
    };

    fetchManual();
  }, [relationshipId, user]);

  // Helper function to get manual
  const getManual = async (id: string): Promise<RelationshipManual | null> => {
    try {
      const docRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          relationshipId: docSnap.id,
          ...docSnap.data()
        } as RelationshipManual;
      }
      return null;
    } catch (err) {
      console.error('Error getting manual:', err);
      return null;
    }
  };

  // Create new relationship manual
  const createManual = async (
    participantIds: string[],
    participantNames: string[],
    relationshipType: RelationshipManual['relationshipType'],
    title: string,
    description?: string
  ): Promise<string> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newManual: Omit<RelationshipManual, 'relationshipId'> = {
        familyId: user.familyId,
        participantIds,
        participantNames,
        relationshipType,
        relationshipTitle: title,
        relationshipDescription: description || '',
        sharedGoals: [],
        rituals: [],
        traditions: [],
        conflictPatterns: [],
        connectionStrategies: [],
        importantMilestones: [],
        jointNotes: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        lastEditedBy: user.userId,
        relatedPersonManualIds: [] // Will be populated if needed
      };

      const docRef = await addDoc(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS),
        newManual
      );

      setManual({
        relationshipId: docRef.id,
        ...newManual
      } as RelationshipManual);

      return docRef.id;
    } catch (err) {
      console.error('Error creating relationship manual:', err);
      throw new Error('Failed to create relationship manual');
    }
  };

  // Update relationship manual
  const updateManual = async (
    id: string,
    updates: Partial<RelationshipManual>
  ): Promise<void> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS, id);
      const currentManual = await getManual(id);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: currentManual ? currentManual.version + 1 : 1
      };

      await updateDoc(manualRef, updateData);

      // Update local state
      if (manual && manual.relationshipId === id) {
        setManual({ ...manual, ...updateData } as RelationshipManual);
      }
    } catch (err) {
      console.error('Error updating relationship manual:', err);
      throw new Error('Failed to update relationship manual');
    }
  };

  // Delete relationship manual
  const deleteManual = async (id: string): Promise<void> => {
    try {
      const manualRef = doc(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS, id);
      await deleteDoc(manualRef);

      if (manual && manual.relationshipId === id) {
        setManual(null);
      }
    } catch (err) {
      console.error('Error deleting relationship manual:', err);
      throw new Error('Failed to delete relationship manual');
    }
  };

  // Add shared goal
  const addSharedGoal = async (
    id: string,
    goal: Omit<SharedGoal, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newGoal: SharedGoal = {
      id: `goal_${Date.now()}`,
      ...goal,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual(id, {
      sharedGoals: [...currentManual.sharedGoals, newGoal]
    });
  };

  // Update shared goal
  const updateSharedGoal = async (
    id: string,
    goalId: string,
    updates: Partial<Omit<SharedGoal, 'id' | 'addedDate' | 'addedBy'>>
  ): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const updatedGoals = currentManual.sharedGoals.map(g =>
      g.id === goalId ? { ...g, ...updates } : g
    );

    await updateManual(id, { sharedGoals: updatedGoals });
  };

  // Remove shared goal
  const removeSharedGoal = async (id: string, goalId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      sharedGoals: currentManual.sharedGoals.filter(g => g.id !== goalId)
    });
  };

  // Add ritual
  const addRitual = async (
    id: string,
    ritual: Omit<RelationshipRitual, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newRitual: RelationshipRitual = {
      id: `ritual_${Date.now()}`,
      ...ritual,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual(id, {
      rituals: [...currentManual.rituals, newRitual]
    });
  };

  // Update ritual
  const updateRitual = async (
    id: string,
    ritualId: string,
    updates: Partial<Omit<RelationshipRitual, 'id' | 'addedDate' | 'addedBy'>>
  ): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const updatedRituals = currentManual.rituals.map(r =>
      r.id === ritualId ? { ...r, ...updates } : r
    );

    await updateManual(id, { rituals: updatedRituals });
  };

  // Remove ritual
  const removeRitual = async (id: string, ritualId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      rituals: currentManual.rituals.filter(r => r.id !== ritualId)
    });
  };

  // Add tradition
  const addTradition = async (
    id: string,
    tradition: Omit<RelationshipTradition, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newTradition: RelationshipTradition = {
      id: `tradition_${Date.now()}`,
      ...tradition,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual(id, {
      traditions: [...currentManual.traditions, newTradition]
    });
  };

  // Update tradition
  const updateTradition = async (
    id: string,
    traditionId: string,
    updates: Partial<Omit<RelationshipTradition, 'id' | 'addedDate' | 'addedBy'>>
  ): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const updatedTraditions = currentManual.traditions.map(t =>
      t.id === traditionId ? { ...t, ...updates } : t
    );

    await updateManual(id, { traditions: updatedTraditions });
  };

  // Remove tradition
  const removeTradition = async (id: string, traditionId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      traditions: currentManual.traditions.filter(t => t.id !== traditionId)
    });
  };

  // Add conflict pattern
  const addConflictPattern = async (
    id: string,
    pattern: Omit<ConflictPattern, 'id' | 'identifiedDate' | 'identifiedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newPattern: ConflictPattern = {
      id: `pattern_${Date.now()}`,
      ...pattern,
      identifiedDate: Timestamp.now(),
      identifiedBy: user.userId
    };

    await updateManual(id, {
      conflictPatterns: [...currentManual.conflictPatterns, newPattern]
    });
  };

  // Update conflict pattern
  const updateConflictPattern = async (
    id: string,
    patternId: string,
    updates: Partial<Omit<ConflictPattern, 'id' | 'identifiedDate' | 'identifiedBy'>>
  ): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const updatedPatterns = currentManual.conflictPatterns.map(p =>
      p.id === patternId ? { ...p, ...updates } : p
    );

    await updateManual(id, { conflictPatterns: updatedPatterns });
  };

  // Remove conflict pattern
  const removeConflictPattern = async (id: string, patternId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      conflictPatterns: currentManual.conflictPatterns.filter(p => p.id !== patternId)
    });
  };

  // Add connection strategy
  const addConnectionStrategy = async (
    id: string,
    strategy: Omit<ConnectionStrategy, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newStrategy: ConnectionStrategy = {
      id: `strategy_${Date.now()}`,
      ...strategy,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual(id, {
      connectionStrategies: [...currentManual.connectionStrategies, newStrategy]
    });
  };

  // Update connection strategy
  const updateConnectionStrategy = async (
    id: string,
    strategyId: string,
    updates: Partial<Omit<ConnectionStrategy, 'id' | 'addedDate' | 'addedBy'>>
  ): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const updatedStrategies = currentManual.connectionStrategies.map(s =>
      s.id === strategyId ? { ...s, ...updates } : s
    );

    await updateManual(id, { connectionStrategies: updatedStrategies });
  };

  // Remove connection strategy
  const removeConnectionStrategy = async (id: string, strategyId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      connectionStrategies: currentManual.connectionStrategies.filter(s => s.id !== strategyId)
    });
  };

  // Add milestone
  const addMilestone = async (
    id: string,
    milestone: Omit<RelationshipMilestone, 'id' | 'addedDate' | 'addedBy'>
  ): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');

    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    const newMilestone: RelationshipMilestone = {
      id: `milestone_${Date.now()}`,
      ...milestone,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual(id, {
      importantMilestones: [...currentManual.importantMilestones, newMilestone]
    });
  };

  // Remove milestone
  const removeMilestone = async (id: string, milestoneId: string): Promise<void> => {
    const currentManual = await getManual(id);
    if (!currentManual) throw new Error('Manual not found');

    await updateManual(id, {
      importantMilestones: currentManual.importantMilestones.filter(m => m.id !== milestoneId)
    });
  };

  // Get all relationship manuals for a specific person
  const getRelationshipManualsForPerson = async (personId: string): Promise<RelationshipManual[]> => {
    if (!user?.familyId) return [];

    try {
      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS),
        where('familyId', '==', user.familyId),
        where('participantIds', 'array-contains', personId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        relationshipId: doc.id,
        ...doc.data()
      } as RelationshipManual));
    } catch (err) {
      console.error('Error fetching relationship manuals for person:', err);
      return [];
    }
  };

  // Get relationship manual between two specific people
  const getRelationshipBetween = async (personId1: string, personId2: string): Promise<RelationshipManual | null> => {
    if (!user?.familyId) return null;

    try {
      const q = query(
        collection(firestore, PERSON_MANUAL_COLLECTIONS.RELATIONSHIP_MANUALS),
        where('familyId', '==', user.familyId),
        where('participantIds', 'array-contains', personId1)
      );

      const querySnapshot = await getDocs(q);

      // Filter results to find manual that contains both participants
      const manuals = querySnapshot.docs
        .map(doc => ({
          relationshipId: doc.id,
          ...doc.data()
        } as RelationshipManual))
        .filter(manual => manual.participantIds.includes(personId2));

      return manuals.length > 0 ? manuals[0] : null;
    } catch (err) {
      console.error('Error finding relationship between people:', err);
      return null;
    }
  };

  return {
    manual,
    loading,
    error,
    createManual,
    updateManual,
    deleteManual,
    addSharedGoal,
    updateSharedGoal,
    removeSharedGoal,
    addRitual,
    updateRitual,
    removeRitual,
    addTradition,
    updateTradition,
    removeTradition,
    addConflictPattern,
    updateConflictPattern,
    removeConflictPattern,
    addConnectionStrategy,
    updateConnectionStrategy,
    removeConnectionStrategy,
    addMilestone,
    removeMilestone,
    getRelationshipManualsForPerson,
    getRelationshipBetween
  };
}
