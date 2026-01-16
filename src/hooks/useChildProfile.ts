import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  ChildBaselineProfile,
  ChildChallenge,
  Trigger,
  Strategy,
  COLLECTIONS
} from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useChildProfile(childId?: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ChildBaselineProfile | null>(null);
  const [profiles, setProfiles] = useState<ChildBaselineProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch a single profile by child ID
  useEffect(() => {
    if (!childId || !user?.familyId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(firestore, COLLECTIONS.CHILD_PROFILES),
          where('familyId', '==', user.familyId),
          where('childId', '==', childId)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const profileDoc = querySnapshot.docs[0];
          setProfile({
            profileId: profileDoc.id,
            ...profileDoc.data()
          } as ChildBaselineProfile);
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        console.error('Error fetching child profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [childId, user?.familyId]);

  // Fetch all profiles for the family
  const fetchFamilyProfiles = async () => {
    if (!user?.familyId) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(firestore, COLLECTIONS.CHILD_PROFILES),
        where('familyId', '==', user.familyId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const profilesData = querySnapshot.docs.map(doc => ({
        profileId: doc.id,
        ...doc.data()
      })) as ChildBaselineProfile[];

      setProfiles(profilesData);
    } catch (err: any) {
      console.error('Error fetching family profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new profile
  const createProfile = async (profileData: Omit<ChildBaselineProfile, 'profileId' | 'createdAt' | 'updatedAt' | 'version'>) => {
    if (!user?.familyId) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const now = Timestamp.now();
      const newProfile = {
        ...profileData,
        familyId: user.familyId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        emergingPatterns: [],
        progressNotes: [],
        relatedJournalEntries: [],
        relatedKnowledgeIds: []
      };

      const docRef = await addDoc(
        collection(firestore, COLLECTIONS.CHILD_PROFILES),
        newProfile
      );

      const createdProfile = {
        profileId: docRef.id,
        ...newProfile
      } as ChildBaselineProfile;

      setProfile(createdProfile);
      return createdProfile;
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing profile
  const updateProfile = async (
    profileId: string,
    updates: Partial<Omit<ChildBaselineProfile, 'profileId' | 'familyId' | 'childId' | 'createdAt'>>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const profileRef = doc(firestore, COLLECTIONS.CHILD_PROFILES, profileId);

      // Increment version and update timestamp
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
        version: (profile?.version || 0) + 1
      };

      await updateDoc(profileRef, updateData);

      // Fetch updated profile
      const updatedDoc = await getDoc(profileRef);
      if (updatedDoc.exists()) {
        const updatedProfile = {
          profileId: updatedDoc.id,
          ...updatedDoc.data()
        } as ChildBaselineProfile;
        setProfile(updatedProfile);
        return updatedProfile;
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a profile
  const deleteProfile = async (profileId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(firestore, COLLECTIONS.CHILD_PROFILES, profileId));
      setProfile(null);
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a challenge to the profile
  const addChallenge = async (profileId: string, challenge: Omit<ChildChallenge, 'id' | 'identifiedDate'>) => {
    if (!profile) throw new Error('Profile not loaded');

    const newChallenge: ChildChallenge = {
      id: `challenge_${Date.now()}`,
      ...challenge,
      identifiedDate: Timestamp.now()
    };

    const updatedChallenges = [...profile.challenges, newChallenge];
    return updateProfile(profileId, { challenges: updatedChallenges });
  };

  // Remove a challenge
  const removeChallenge = async (profileId: string, challengeId: string) => {
    if (!profile) throw new Error('Profile not loaded');

    const updatedChallenges = profile.challenges.filter(c => c.id !== challengeId);
    return updateProfile(profileId, { challenges: updatedChallenges });
  };

  // Add a trigger
  const addTrigger = async (profileId: string, trigger: Omit<Trigger, 'id' | 'identifiedDate' | 'confidence'>) => {
    if (!profile) throw new Error('Profile not loaded');

    const newTrigger: Trigger = {
      id: `trigger_${Date.now()}`,
      ...trigger,
      identifiedDate: Timestamp.now(),
      confidence: 'low' // Start with low confidence
    };

    const updatedTriggers = [...profile.triggers, newTrigger];
    return updateProfile(profileId, { triggers: updatedTriggers });
  };

  // Update trigger confidence (as it gets validated through journal entries)
  const updateTriggerConfidence = async (profileId: string, triggerId: string, confidence: 'low' | 'medium' | 'high') => {
    if (!profile) throw new Error('Profile not loaded');

    const updatedTriggers = profile.triggers.map(t =>
      t.id === triggerId ? { ...t, confidence } : t
    );

    return updateProfile(profileId, { triggers: updatedTriggers });
  };

  // Add a strategy (what works or doesn't work)
  const addStrategy = async (
    profileId: string,
    strategy: Omit<Strategy, 'id' | 'addedDate'>,
    type: 'whatWorks' | 'whatDoesntWork'
  ) => {
    if (!profile) throw new Error('Profile not loaded');

    const newStrategy: Strategy = {
      id: `strategy_${Date.now()}`,
      ...strategy,
      addedDate: Timestamp.now()
    };

    const updatedStrategies = type === 'whatWorks'
      ? [...profile.whatWorks, newStrategy]
      : [...profile.whatDoesntWork, newStrategy];

    return updateProfile(profileId, { [type]: updatedStrategies });
  };

  // Update strategy effectiveness
  const updateStrategyEffectiveness = async (
    profileId: string,
    strategyId: string,
    effectiveness: 1 | 2 | 3 | 4 | 5,
    type: 'whatWorks' | 'whatDoesntWork'
  ) => {
    if (!profile) throw new Error('Profile not loaded');

    const strategies = type === 'whatWorks' ? profile.whatWorks : profile.whatDoesntWork;
    const updatedStrategies = strategies.map(s =>
      s.id === strategyId ? { ...s, effectiveness } : s
    );

    return updateProfile(profileId, { [type]: updatedStrategies });
  };

  // Check if a profile exists for a child
  const profileExists = async (childId: string): Promise<boolean> => {
    if (!user?.familyId) return false;

    try {
      const q = query(
        collection(firestore, COLLECTIONS.CHILD_PROFILES),
        where('familyId', '==', user.familyId),
        where('childId', '==', childId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (err) {
      console.error('Error checking profile existence:', err);
      return false;
    }
  };

  return {
    profile,
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchFamilyProfiles,
    addChallenge,
    removeChallenge,
    addTrigger,
    updateTriggerConfidence,
    addStrategy,
    updateStrategyEffectiveness,
    profileExists
  };
}
