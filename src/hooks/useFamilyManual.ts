/**
 * useFamilyManual Hook
 *
 * Manages the family-level manual with house rules, values, routines, and traditions
 * This is separate from person-centric manuals and contains family-wide content
 */

'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  FamilyManual,
  FamilyHouseRule,
  FamilyValue,
  FamilyRoutine,
  FamilyTradition
} from '@/types/person-manual';

interface UseFamilyManualReturn {
  familyManual: FamilyManual | null;
  loading: boolean;
  error: string | null;

  // Manual management
  createFamilyManual: () => Promise<void>;

  // House Rules
  addHouseRule: (rule: Omit<FamilyHouseRule, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateHouseRule: (ruleId: string, updates: Partial<FamilyHouseRule>) => Promise<void>;
  removeHouseRule: (ruleId: string) => Promise<void>;

  // Family Values
  addFamilyValue: (value: Omit<FamilyValue, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateFamilyValue: (valueId: string, updates: Partial<FamilyValue>) => Promise<void>;
  removeFamilyValue: (valueId: string) => Promise<void>;

  // Routines
  addRoutine: (routine: Omit<FamilyRoutine, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateRoutine: (routineId: string, updates: Partial<FamilyRoutine>) => Promise<void>;
  removeRoutine: (routineId: string) => Promise<void>;

  // Traditions
  addTradition: (tradition: Omit<FamilyTradition, 'id' | 'addedDate' | 'addedBy'>) => Promise<void>;
  updateTradition: (traditionId: string, updates: Partial<FamilyTradition>) => Promise<void>;
  removeTradition: (traditionId: string) => Promise<void>;
}

export function useFamilyManual(): UseFamilyManualReturn {
  const { user } = useAuth();
  const [familyManual, setFamilyManual] = useState<FamilyManual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch family manual
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchFamilyManual = async () => {
      try {
        setLoading(true);
        setError(null);

        const docRef = doc(firestore, 'families', user.familyId, 'family_manual', 'data');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setFamilyManual(docSnap.data() as FamilyManual);
        } else {
          setFamilyManual(null);
        }
      } catch (err) {
        console.error('Error fetching family manual:', err);
        setError('Failed to load family manual');
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyManual();
  }, [user?.familyId]);

  // Create family manual
  const createFamilyManual = async (): Promise<void> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newManual: FamilyManual = {
        familyId: user.familyId,
        houseRules: [],
        familyValues: [],
        routines: [],
        traditions: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        lastEditedBy: user.userId
      };

      const docRef = doc(firestore, 'families', user.familyId, 'family_manual', 'data');
      await setDoc(docRef, newManual);

      setFamilyManual(newManual);
    } catch (err) {
      console.error('Error creating family manual:', err);
      throw new Error('Failed to create family manual');
    }
  };

  // Helper to update manual
  const updateManual = async (updates: Partial<FamilyManual>): Promise<void> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    if (!familyManual) {
      throw new Error('Family manual does not exist');
    }

    try {
      const docRef = doc(firestore, 'families', user.familyId, 'family_manual', 'data');
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: familyManual.version + 1
      };

      await updateDoc(docRef, updateData);

      setFamilyManual(prev => ({
        ...prev!,
        ...updateData
      }));
    } catch (err) {
      console.error('Error updating family manual:', err);
      throw new Error('Failed to update family manual');
    }
  };

  // ==================== House Rules ====================

  const addHouseRule = async (rule: Omit<FamilyHouseRule, 'id' | 'addedDate' | 'addedBy'>): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');
    if (!familyManual) throw new Error('Family manual does not exist');

    const newRule: FamilyHouseRule = {
      id: `rule_${Date.now()}`,
      ...rule,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual({
      houseRules: [...familyManual.houseRules, newRule]
    });
  };

  const updateHouseRule = async (ruleId: string, updates: Partial<FamilyHouseRule>): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    const updatedRules = familyManual.houseRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );

    await updateManual({
      houseRules: updatedRules
    });
  };

  const removeHouseRule = async (ruleId: string): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    await updateManual({
      houseRules: familyManual.houseRules.filter(rule => rule.id !== ruleId)
    });
  };

  // ==================== Family Values ====================

  const addFamilyValue = async (value: Omit<FamilyValue, 'id' | 'addedDate' | 'addedBy'>): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');
    if (!familyManual) throw new Error('Family manual does not exist');

    const newValue: FamilyValue = {
      id: `value_${Date.now()}`,
      ...value,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual({
      familyValues: [...familyManual.familyValues, newValue]
    });
  };

  const updateFamilyValue = async (valueId: string, updates: Partial<FamilyValue>): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    const updatedValues = familyManual.familyValues.map(value =>
      value.id === valueId ? { ...value, ...updates } : value
    );

    await updateManual({
      familyValues: updatedValues
    });
  };

  const removeFamilyValue = async (valueId: string): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    await updateManual({
      familyValues: familyManual.familyValues.filter(value => value.id !== valueId)
    });
  };

  // ==================== Routines ====================

  const addRoutine = async (routine: Omit<FamilyRoutine, 'id' | 'addedDate' | 'addedBy'>): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');
    if (!familyManual) throw new Error('Family manual does not exist');

    const newRoutine: FamilyRoutine = {
      id: `routine_${Date.now()}`,
      ...routine,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual({
      routines: [...familyManual.routines, newRoutine]
    });
  };

  const updateRoutine = async (routineId: string, updates: Partial<FamilyRoutine>): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    const updatedRoutines = familyManual.routines.map(routine =>
      routine.id === routineId ? { ...routine, ...updates } : routine
    );

    await updateManual({
      routines: updatedRoutines
    });
  };

  const removeRoutine = async (routineId: string): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    await updateManual({
      routines: familyManual.routines.filter(routine => routine.id !== routineId)
    });
  };

  // ==================== Traditions ====================

  const addTradition = async (tradition: Omit<FamilyTradition, 'id' | 'addedDate' | 'addedBy'>): Promise<void> => {
    if (!user?.userId) throw new Error('User must be authenticated');
    if (!familyManual) throw new Error('Family manual does not exist');

    const newTradition: FamilyTradition = {
      id: `tradition_${Date.now()}`,
      ...tradition,
      addedDate: Timestamp.now(),
      addedBy: user.userId
    };

    await updateManual({
      traditions: [...familyManual.traditions, newTradition]
    });
  };

  const updateTradition = async (traditionId: string, updates: Partial<FamilyTradition>): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    const updatedTraditions = familyManual.traditions.map(tradition =>
      tradition.id === traditionId ? { ...tradition, ...updates } : tradition
    );

    await updateManual({
      traditions: updatedTraditions
    });
  };

  const removeTradition = async (traditionId: string): Promise<void> => {
    if (!familyManual) throw new Error('Family manual does not exist');

    await updateManual({
      traditions: familyManual.traditions.filter(tradition => tradition.id !== traditionId)
    });
  };

  return {
    familyManual,
    loading,
    error,
    createFamilyManual,
    addHouseRule,
    updateHouseRule,
    removeHouseRule,
    addFamilyValue,
    updateFamilyValue,
    removeFamilyValue,
    addRoutine,
    updateRoutine,
    removeRoutine,
    addTradition,
    updateTradition,
    removeTradition
  };
}
