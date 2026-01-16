/**
 * useRelationshipProfile Hook
 *
 * Generic hook for managing relationship profiles across all types:
 * - Children (ChildBaselineProfile)
 * - Spouse (SpouseProfile)
 * - Parent (ParentProfile)
 * - Friend (FriendProfile)
 * - Professional (ProfessionalProfile)
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
import {
  RelationshipProfile,
  RelationType,
  BaseRelationshipProfile,
  SpouseProfile,
  ParentProfile,
  FriendProfile,
  ProfessionalProfile,
  ChildBaselineProfile,
  Trigger,
  Strategy,
  Pattern,
  ProgressNote,
  COLLECTIONS
} from '@/types';

interface UseRelationshipProfileReturn<T extends RelationshipProfile = RelationshipProfile> {
  profile: T | null;
  loading: boolean;
  error: string | null;

  // CRUD operations
  createProfile: (profileData: Omit<T, 'profileId' | 'createdAt' | 'updatedAt' | 'version' | 'emergingPatterns' | 'progressNotes' | 'relatedJournalEntries' | 'relatedKnowledgeIds'>) => Promise<string>;
  updateProfile: (profileId: string, updates: Partial<T>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;

  // Common operations (work across all profile types)
  addTrigger: (profileId: string, trigger: Omit<Trigger, 'id' | 'identifiedDate'>) => Promise<void>;
  removeTrigger: (profileId: string, triggerId: string) => Promise<void>;
  updateTriggerConfidence: (profileId: string, triggerId: string, confidence: 'low' | 'medium' | 'high') => Promise<void>;

  addStrategy: (profileId: string, strategy: Omit<Strategy, 'id' | 'addedDate'>, worksOrNot: 'works' | 'doesnt') => Promise<void>;
  removeStrategy: (profileId: string, strategyId: string, worksOrNot: 'works' | 'doesnt') => Promise<void>;
  updateStrategyEffectiveness: (profileId: string, strategyId: string, effectiveness: 1 | 2 | 3 | 4 | 5) => Promise<void>;

  addProgressNote: (profileId: string, note: Omit<ProgressNote, 'id' | 'date'>) => Promise<void>;

  // Utility
  profileExists: (relationshipMemberId: string) => Promise<boolean>;
  fetchByMemberId: (relationshipMemberId: string) => Promise<void>;
}

export function useRelationshipProfile<T extends RelationshipProfile = RelationshipProfile>(
  relationshipMemberId?: string
): UseRelationshipProfileReturn<T> {
  const { user } = useAuth();
  const [profile, setProfile] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile by relationship member ID
  const fetchByMemberId = async (memberId: string) => {
    if (!user?.familyId) return;

    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(firestore, COLLECTIONS.RELATIONSHIP_PROFILES),
        where('familyId', '==', user.familyId),
        where('relationshipMemberId', '==', memberId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const profileDoc = querySnapshot.docs[0];
        setProfile({
          profileId: profileDoc.id,
          ...profileDoc.data()
        } as T);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching relationship profile:', err);
      setError('Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if relationshipMemberId provided
  useEffect(() => {
    if (relationshipMemberId && user?.familyId) {
      fetchByMemberId(relationshipMemberId);
    } else {
      setLoading(false);
    }
  }, [relationshipMemberId, user?.familyId]);

  // Check if profile exists
  const profileExists = async (memberId: string): Promise<boolean> => {
    if (!user?.familyId) return false;

    try {
      const q = query(
        collection(firestore, COLLECTIONS.RELATIONSHIP_PROFILES),
        where('familyId', '==', user.familyId),
        where('relationshipMemberId', '==', memberId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (err) {
      console.error('Error checking profile existence:', err);
      return false;
    }
  };

  // Create new profile
  const createProfile = async (
    profileData: Omit<T, 'profileId' | 'createdAt' | 'updatedAt' | 'version' | 'emergingPatterns' | 'progressNotes' | 'relatedJournalEntries' | 'relatedKnowledgeIds'>
  ): Promise<string> => {
    if (!user?.familyId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newProfile = {
        ...profileData,
        familyId: user.familyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        version: 1,
        emergingPatterns: [],
        progressNotes: [],
        relatedJournalEntries: [],
        relatedKnowledgeIds: []
      };

      const docRef = await addDoc(
        collection(firestore, COLLECTIONS.RELATIONSHIP_PROFILES),
        newProfile
      );

      setProfile({
        profileId: docRef.id,
        ...newProfile
      } as unknown as T);

      return docRef.id;
    } catch (err) {
      console.error('Error creating relationship profile:', err);
      throw new Error('Failed to create profile');
    }
  };

  // Update profile
  const updateProfile = async (
    profileId: string,
    updates: Partial<T>
  ): Promise<void> => {
    try {
      const profileRef = doc(firestore, COLLECTIONS.RELATIONSHIP_PROFILES, profileId);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        version: profile ? profile.version + 1 : 1
      };

      await updateDoc(profileRef, updateData);

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          ...updateData
        } as T);
      }
    } catch (err) {
      console.error('Error updating relationship profile:', err);
      throw new Error('Failed to update profile');
    }
  };

  // Delete profile
  const deleteProfile = async (profileId: string): Promise<void> => {
    try {
      const profileRef = doc(firestore, COLLECTIONS.RELATIONSHIP_PROFILES, profileId);
      await deleteDoc(profileRef);
      setProfile(null);
    } catch (err) {
      console.error('Error deleting relationship profile:', err);
      throw new Error('Failed to delete profile');
    }
  };

  // Add trigger
  const addTrigger = async (
    profileId: string,
    trigger: Omit<Trigger, 'id' | 'identifiedDate'>
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const newTrigger: Trigger = {
      id: `trigger_${Date.now()}`,
      ...trigger,
      identifiedDate: Timestamp.now()
    };

    const updatedTriggers = [...profile.triggers, newTrigger];
    await updateProfile(profileId, { triggers: updatedTriggers } as Partial<T>);
  };

  // Remove trigger
  const removeTrigger = async (profileId: string, triggerId: string): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const updatedTriggers = profile.triggers.filter(t => t.id !== triggerId);
    await updateProfile(profileId, { triggers: updatedTriggers } as Partial<T>);
  };

  // Update trigger confidence
  const updateTriggerConfidence = async (
    profileId: string,
    triggerId: string,
    confidence: 'low' | 'medium' | 'high'
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const updatedTriggers = profile.triggers.map(t =>
      t.id === triggerId ? { ...t, confidence } : t
    );

    await updateProfile(profileId, { triggers: updatedTriggers } as Partial<T>);
  };

  // Add strategy
  const addStrategy = async (
    profileId: string,
    strategy: Omit<Strategy, 'id' | 'addedDate'>,
    worksOrNot: 'works' | 'doesnt'
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const newStrategy: Strategy = {
      id: `strategy_${Date.now()}`,
      ...strategy,
      addedDate: Timestamp.now()
    };

    if (worksOrNot === 'works') {
      const updatedStrategies = [...profile.whatWorks, newStrategy];
      await updateProfile(profileId, { whatWorks: updatedStrategies } as Partial<T>);
    } else {
      const updatedStrategies = [...profile.whatDoesntWork, newStrategy];
      await updateProfile(profileId, { whatDoesntWork: updatedStrategies } as Partial<T>);
    }
  };

  // Remove strategy
  const removeStrategy = async (
    profileId: string,
    strategyId: string,
    worksOrNot: 'works' | 'doesnt'
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    if (worksOrNot === 'works') {
      const updatedStrategies = profile.whatWorks.filter(s => s.id !== strategyId);
      await updateProfile(profileId, { whatWorks: updatedStrategies } as Partial<T>);
    } else {
      const updatedStrategies = profile.whatDoesntWork.filter(s => s.id !== strategyId);
      await updateProfile(profileId, { whatDoesntWork: updatedStrategies } as Partial<T>);
    }
  };

  // Update strategy effectiveness
  const updateStrategyEffectiveness = async (
    profileId: string,
    strategyId: string,
    effectiveness: 1 | 2 | 3 | 4 | 5
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const updatedWhatWorks = profile.whatWorks.map(s =>
      s.id === strategyId ? { ...s, effectiveness } : s
    );

    await updateProfile(profileId, { whatWorks: updatedWhatWorks } as Partial<T>);
  };

  // Add progress note
  const addProgressNote = async (
    profileId: string,
    note: Omit<ProgressNote, 'id' | 'date'>
  ): Promise<void> => {
    if (!profile) {
      throw new Error('Profile not loaded');
    }

    const newNote: ProgressNote = {
      id: `note_${Date.now()}`,
      date: Timestamp.now(),
      ...note
    };

    const updatedNotes = [...profile.progressNotes, newNote];
    await updateProfile(profileId, { progressNotes: updatedNotes } as Partial<T>);
  };

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    addTrigger,
    removeTrigger,
    updateTriggerConfidence,
    addStrategy,
    removeStrategy,
    updateStrategyEffectiveness,
    addProgressNote,
    profileExists,
    fetchByMemberId
  };
}

/**
 * Type-safe hooks for specific relationship types
 */

export function useSpouseProfile(relationshipMemberId?: string) {
  return useRelationshipProfile<SpouseProfile>(relationshipMemberId);
}

export function useParentProfile(relationshipMemberId?: string) {
  return useRelationshipProfile<ParentProfile>(relationshipMemberId);
}

export function useFriendProfile(relationshipMemberId?: string) {
  return useRelationshipProfile<FriendProfile>(relationshipMemberId);
}

export function useProfessionalProfile(relationshipMemberId?: string) {
  return useRelationshipProfile<ProfessionalProfile>(relationshipMemberId);
}

export function useChildProfile(relationshipMemberId?: string) {
  return useRelationshipProfile<ChildBaselineProfile>(relationshipMemberId);
}
