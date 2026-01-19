'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  ChildManual,
  Trigger,
  Strategy,
  AvoidStrategy,
  Strength,
} from '../types/child-manual';
import { COLLECTIONS } from '../types';

interface UseChildManualReturn {
  manual: ChildManual | null;
  loading: boolean;
  error: string | null;

  // Trigger operations
  addTrigger: (text: string, severity: 1 | 2 | 3 | 4 | 5, examples?: string[]) => Promise<void>;
  updateTrigger: (triggerId: string, updates: Partial<Omit<Trigger, 'id' | 'addedBy' | 'addedAt'>>) => Promise<void>;
  removeTrigger: (triggerId: string) => Promise<void>;

  // Strategy operations
  addStrategy: (text: string, effectiveness: 1 | 2 | 3 | 4 | 5, context?: string) => Promise<void>;
  updateStrategy: (strategyId: string, updates: Partial<Omit<Strategy, 'id' | 'addedBy' | 'addedAt'>>) => Promise<void>;
  removeStrategy: (strategyId: string) => Promise<void>;

  // Avoid strategy operations
  addAvoidStrategy: (text: string) => Promise<void>;
  removeAvoidStrategy: (avoidStrategyId: string) => Promise<void>;

  // Strength operations
  addStrength: (text: string) => Promise<void>;
  removeStrength: (strengthId: string) => Promise<void>;

  // Context operations
  updateContextNotes: (contextNotes: string) => Promise<void>;

  // General operations
  refreshManual: () => Promise<void>;
}

export const useChildManual = (childId: string | null): UseChildManualReturn => {
  const { user } = useAuth();
  const [manual, setManual] = useState<ChildManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch manual when childId changes
  useEffect(() => {
    if (!childId || !user?.familyId) {
      setManual(null);
      setLoading(false);
      return;
    }

    const fetchManual = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get the child to find the manualId
        const childRef = doc(firestore, COLLECTIONS.CHILDREN, childId);
        const childDoc = await getDoc(childRef);

        if (!childDoc.exists()) {
          setError('Child not found');
          setManual(null);
          setLoading(false);
          return;
        }

        const childData = childDoc.data();
        const manualId = childData?.manualId;

        // Check if manualId exists and is a valid non-empty string
        if (!manualId || typeof manualId !== 'string' || manualId.trim() === '') {
          // Child has no manual yet
          setManual(null);
          setLoading(false);
          return;
        }

        // Get the manual
        const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manualId);
        const manualDoc = await getDoc(manualRef);

        if (manualDoc.exists()) {
          setManual(manualDoc.data() as ChildManual);
        } else {
          setError('Manual not found');
          setManual(null);
        }
      } catch (err: any) {
        console.error('Error fetching manual:', err);
        setError(err.message || 'Failed to load manual');
      } finally {
        setLoading(false);
      }
    };

    fetchManual();
  }, [childId, user?.familyId]);

  // ==================== Helper Functions ====================

  const ensureManual = () => {
    if (!manual) {
      throw new Error('No manual loaded');
    }
    if (!manual.manualId || typeof manual.manualId !== 'string' || manual.manualId.trim() === '') {
      throw new Error('Invalid manual ID');
    }
    if (!user) {
      throw new Error('User must be logged in');
    }
    if (user.role !== 'parent') {
      throw new Error('Only parents can edit manuals');
    }
  };

  const updateManualMetadata = async (manualRef: any) => {
    await updateDoc(manualRef, {
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: user!.userId,
      version: increment(1),
    });
  };

  // ==================== Trigger Operations ====================

  const addTrigger = async (
    text: string,
    severity: 1 | 2 | 3 | 4 | 5,
    examples?: string[]
  ): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const newTrigger: any = {
        id: doc(collection(firestore, 'temp')).id, // Generate unique ID
        text,
        severity,
        addedBy: user!.userId,
        addedAt: Timestamp.now(),
      };

      // Only add examples if provided
      if (examples && examples.length > 0) {
        newTrigger.examples = examples;
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        triggers: arrayUnion(newTrigger as Trigger),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error adding trigger:', err);
      setError(err.message || 'Failed to add trigger');
      throw err;
    }
  };

  const updateTrigger = async (
    triggerId: string,
    updates: Partial<Omit<Trigger, 'id' | 'addedBy' | 'addedAt'>>
  ): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      // Find the trigger
      const existingTrigger = manual!.triggers.find(t => t.id === triggerId);
      if (!existingTrigger) {
        throw new Error('Trigger not found');
      }

      // Create updated trigger
      const updatedTrigger: Trigger = {
        ...existingTrigger,
        ...updates,
      };

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      // Remove old, add updated
      await updateDoc(manualRef, {
        triggers: arrayRemove(existingTrigger),
      });

      await updateDoc(manualRef, {
        triggers: arrayUnion(updatedTrigger),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error updating trigger:', err);
      setError(err.message || 'Failed to update trigger');
      throw err;
    }
  };

  const removeTrigger = async (triggerId: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const triggerToRemove = manual!.triggers.find(t => t.id === triggerId);
      if (!triggerToRemove) {
        throw new Error('Trigger not found');
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        triggers: arrayRemove(triggerToRemove),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error removing trigger:', err);
      setError(err.message || 'Failed to remove trigger');
      throw err;
    }
  };

  // ==================== Strategy Operations ====================

  const addStrategy = async (
    text: string,
    effectiveness: 1 | 2 | 3 | 4 | 5,
    context?: string
  ): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const newStrategy: any = {
        id: doc(collection(firestore, 'temp')).id,
        text,
        effectiveness,
        addedBy: user!.userId,
        addedAt: Timestamp.now(),
      };

      // Only add context if provided
      if (context !== undefined && context !== null && context.trim() !== '') {
        newStrategy.context = context;
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        whatWorks: arrayUnion(newStrategy as Strategy),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error adding strategy:', err);
      setError(err.message || 'Failed to add strategy');
      throw err;
    }
  };

  const updateStrategy = async (
    strategyId: string,
    updates: Partial<Omit<Strategy, 'id' | 'addedBy' | 'addedAt'>>
  ): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const existingStrategy = manual!.whatWorks.find(s => s.id === strategyId);
      if (!existingStrategy) {
        throw new Error('Strategy not found');
      }

      const updatedStrategy: Strategy = {
        ...existingStrategy,
        ...updates,
      };

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        whatWorks: arrayRemove(existingStrategy),
      });

      await updateDoc(manualRef, {
        whatWorks: arrayUnion(updatedStrategy),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error updating strategy:', err);
      setError(err.message || 'Failed to update strategy');
      throw err;
    }
  };

  const removeStrategy = async (strategyId: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const strategyToRemove = manual!.whatWorks.find(s => s.id === strategyId);
      if (!strategyToRemove) {
        throw new Error('Strategy not found');
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        whatWorks: arrayRemove(strategyToRemove),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error removing strategy:', err);
      setError(err.message || 'Failed to remove strategy');
      throw err;
    }
  };

  // ==================== Avoid Strategy Operations ====================

  const addAvoidStrategy = async (text: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const newAvoidStrategy: AvoidStrategy = {
        id: doc(collection(firestore, 'temp')).id,
        text,
        addedBy: user!.userId,
        addedAt: Timestamp.now(),
      };

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        whatDoesntWork: arrayUnion(newAvoidStrategy),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error adding avoid strategy:', err);
      setError(err.message || 'Failed to add avoid strategy');
      throw err;
    }
  };

  const removeAvoidStrategy = async (avoidStrategyId: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const avoidStrategyToRemove = manual!.whatDoesntWork.find(s => s.id === avoidStrategyId);
      if (!avoidStrategyToRemove) {
        throw new Error('Avoid strategy not found');
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        whatDoesntWork: arrayRemove(avoidStrategyToRemove),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error removing avoid strategy:', err);
      setError(err.message || 'Failed to remove avoid strategy');
      throw err;
    }
  };

  // ==================== Strength Operations ====================

  const addStrength = async (text: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const newStrength: Strength = {
        id: doc(collection(firestore, 'temp')).id,
        text,
        addedBy: user!.userId,
        addedAt: Timestamp.now(),
      };

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        strengths: arrayUnion(newStrength),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error adding strength:', err);
      setError(err.message || 'Failed to add strength');
      throw err;
    }
  };

  const removeStrength = async (strengthId: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const strengthToRemove = manual!.strengths.find(s => s.id === strengthId);
      if (!strengthToRemove) {
        throw new Error('Strength not found');
      }

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        strengths: arrayRemove(strengthToRemove),
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error removing strength:', err);
      setError(err.message || 'Failed to remove strength');
      throw err;
    }
  };

  // ==================== Context Operations ====================

  const updateContextNotes = async (contextNotes: string): Promise<void> => {
    ensureManual();

    try {
      setError(null);

      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual!.manualId);

      await updateDoc(manualRef, {
        contextNotes,
      });

      await updateManualMetadata(manualRef);
      await refreshManual();

    } catch (err: any) {
      console.error('Error updating context notes:', err);
      setError(err.message || 'Failed to update context notes');
      throw err;
    }
  };

  // ==================== General Operations ====================

  const refreshManual = async (): Promise<void> => {
    if (!manual) {
      return;
    }

    // Validate manual ID before attempting to fetch
    if (!manual.manualId || typeof manual.manualId !== 'string' || manual.manualId.trim() === '') {
      console.error('Invalid manual ID in refreshManual');
      return;
    }

    try {
      const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, manual.manualId);
      const manualDoc = await getDoc(manualRef);

      if (manualDoc.exists()) {
        setManual(manualDoc.data() as ChildManual);
      }
    } catch (err: any) {
      console.error('Error refreshing manual:', err);
      setError(err.message || 'Failed to refresh manual');
    }
  };

  return {
    manual,
    loading,
    error,

    // Trigger operations
    addTrigger,
    updateTrigger,
    removeTrigger,

    // Strategy operations
    addStrategy,
    updateStrategy,
    removeStrategy,

    // Avoid strategy operations
    addAvoidStrategy,
    removeAvoidStrategy,

    // Strength operations
    addStrength,
    removeStrength,

    // Context operations
    updateContextNotes,

    // General operations
    refreshManual,
  };
};
