/**
 * useRelationshipMembers Hook
 *
 * Universal hook for managing all relationship members (children, spouse, parents, friends, professional)
 * Replaces child-specific logic with relationship-type-agnostic CRUD operations
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
  RelationshipMember,
  RelationType,
  COLLECTIONS,
  ChildMood
} from '@/types';

interface UseRelationshipMembersReturn {
  members: RelationshipMember[];
  loading: boolean;
  error: string | null;

  // Filtered getters
  getByType: (type: RelationType) => RelationshipMember[];
  getById: (memberId: string) => RelationshipMember | undefined;

  // CRUD operations
  addMember: (memberData: Omit<RelationshipMember, 'memberId' | 'familyId' | 'addedAt' | 'addedByUserId'>) => Promise<string>;
  updateMember: (memberId: string, updates: Partial<RelationshipMember>) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;

  // Profile management
  linkProfile: (memberId: string, profileId: string) => Promise<void>;
  unlinkProfile: (memberId: string) => Promise<void>;

  // Plan management
  linkActivePlan: (memberId: string, planId: string) => Promise<void>;
  unlinkActivePlan: (memberId: string) => Promise<void>;

  // Type-specific helpers
  updateChildData: (memberId: string, childData: Partial<RelationshipMember['childData']>) => Promise<void>;
  updateSpouseData: (memberId: string, spouseData: Partial<RelationshipMember['spouseData']>) => Promise<void>;
  updateParentData: (memberId: string, parentData: Partial<RelationshipMember['parentData']>) => Promise<void>;
  updateFriendData: (memberId: string, friendData: Partial<RelationshipMember['friendData']>) => Promise<void>;
  updateProfessionalData: (memberId: string, professionalData: Partial<RelationshipMember['professionalData']>) => Promise<void>;

  // Statistics
  totalCount: number;
  countByType: Record<RelationType, number>;
}

export function useRelationshipMembers(): UseRelationshipMembersReturn {
  const { user } = useAuth();
  const [members, setMembers] = useState<RelationshipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all relationship members for the family
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(firestore, COLLECTIONS.RELATIONSHIP_MEMBERS),
          where('familyId', '==', user.familyId),
          orderBy('addedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedMembers = querySnapshot.docs.map(doc => ({
          memberId: doc.id,
          ...doc.data()
        } as RelationshipMember));

        setMembers(fetchedMembers);
      } catch (err) {
        console.error('Error fetching relationship members:', err);
        setError('Failed to load relationship members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.familyId]);

  // Filter members by relationship type
  const getByType = (type: RelationType): RelationshipMember[] => {
    return members.filter(member => member.relationshipType === type);
  };

  // Get member by ID
  const getById = (memberId: string): RelationshipMember | undefined => {
    return members.find(member => member.memberId === memberId);
  };

  // Add new relationship member
  const addMember = async (
    memberData: Omit<RelationshipMember, 'memberId' | 'familyId' | 'addedAt' | 'addedByUserId'>
  ): Promise<string> => {
    if (!user?.familyId || !user?.userId) {
      throw new Error('User must be authenticated');
    }

    try {
      const newMember: Omit<RelationshipMember, 'memberId'> = {
        ...memberData,
        familyId: user.familyId,
        addedAt: Timestamp.now(),
        addedByUserId: user.userId,
        hasProfile: false,
        hasActivePlan: false
      };

      const docRef = await addDoc(
        collection(firestore, COLLECTIONS.RELATIONSHIP_MEMBERS),
        newMember
      );

      // Update local state
      setMembers(prev => [{
        memberId: docRef.id,
        ...newMember
      } as RelationshipMember, ...prev]);

      return docRef.id;
    } catch (err) {
      console.error('Error adding relationship member:', err);
      throw new Error('Failed to add relationship member');
    }
  };

  // Update relationship member
  const updateMember = async (
    memberId: string,
    updates: Partial<RelationshipMember>
  ): Promise<void> => {
    try {
      const memberRef = doc(firestore, COLLECTIONS.RELATIONSHIP_MEMBERS, memberId);
      await updateDoc(memberRef, updates);

      // Update local state
      setMembers(prev =>
        prev.map(member =>
          member.memberId === memberId
            ? { ...member, ...updates }
            : member
        )
      );
    } catch (err) {
      console.error('Error updating relationship member:', err);
      throw new Error('Failed to update relationship member');
    }
  };

  // Delete relationship member
  const deleteMember = async (memberId: string): Promise<void> => {
    try {
      const memberRef = doc(firestore, COLLECTIONS.RELATIONSHIP_MEMBERS, memberId);
      await deleteDoc(memberRef);

      // Update local state
      setMembers(prev => prev.filter(member => member.memberId !== memberId));
    } catch (err) {
      console.error('Error deleting relationship member:', err);
      throw new Error('Failed to delete relationship member');
    }
  };

  // Link profile to member
  const linkProfile = async (memberId: string, profileId: string): Promise<void> => {
    await updateMember(memberId, {
      hasProfile: true,
      profileId
    });
  };

  // Unlink profile from member
  const unlinkProfile = async (memberId: string): Promise<void> => {
    await updateMember(memberId, {
      hasProfile: false,
      profileId: undefined
    });
  };

  // Link active plan to member
  const linkActivePlan = async (memberId: string, planId: string): Promise<void> => {
    await updateMember(memberId, {
      hasActivePlan: true,
      activePlanId: planId
    });
  };

  // Unlink active plan from member
  const unlinkActivePlan = async (memberId: string): Promise<void> => {
    await updateMember(memberId, {
      hasActivePlan: false,
      activePlanId: undefined
    });
  };

  // Type-specific data updaters
  const updateChildData = async (
    memberId: string,
    childData: Partial<RelationshipMember['childData']>
  ): Promise<void> => {
    const member = getById(memberId);
    if (!member || member.relationshipType !== 'children') {
      throw new Error('Member is not a child');
    }

    await updateMember(memberId, {
      childData: {
        ...member.childData,
        ...childData
      } as RelationshipMember['childData']
    });
  };

  const updateSpouseData = async (
    memberId: string,
    spouseData: Partial<RelationshipMember['spouseData']>
  ): Promise<void> => {
    const member = getById(memberId);
    if (!member || member.relationshipType !== 'spouse') {
      throw new Error('Member is not a spouse');
    }

    await updateMember(memberId, {
      spouseData: {
        ...member.spouseData,
        ...spouseData
      } as RelationshipMember['spouseData']
    });
  };

  const updateParentData = async (
    memberId: string,
    parentData: Partial<RelationshipMember['parentData']>
  ): Promise<void> => {
    const member = getById(memberId);
    if (!member || member.relationshipType !== 'parent') {
      throw new Error('Member is not a parent');
    }

    await updateMember(memberId, {
      parentData: {
        ...member.parentData,
        ...parentData
      } as RelationshipMember['parentData']
    });
  };

  const updateFriendData = async (
    memberId: string,
    friendData: Partial<RelationshipMember['friendData']>
  ): Promise<void> => {
    const member = getById(memberId);
    if (!member || member.relationshipType !== 'friend') {
      throw new Error('Member is not a friend');
    }

    await updateMember(memberId, {
      friendData: {
        ...member.friendData,
        ...friendData
      } as RelationshipMember['friendData']
    });
  };

  const updateProfessionalData = async (
    memberId: string,
    professionalData: Partial<RelationshipMember['professionalData']>
  ): Promise<void> => {
    const member = getById(memberId);
    if (!member || member.relationshipType !== 'professional') {
      throw new Error('Member is not a professional contact');
    }

    await updateMember(memberId, {
      professionalData: {
        ...member.professionalData,
        ...professionalData
      } as RelationshipMember['professionalData']
    });
  };

  // Statistics
  const totalCount = members.length;

  const countByType: Record<RelationType, number> = {
    children: getByType('children').length,
    spouse: getByType('spouse').length,
    parent: getByType('parent').length,
    friend: getByType('friend').length,
    professional: getByType('professional').length
  };

  return {
    members,
    loading,
    error,
    getByType,
    getById,
    addMember,
    updateMember,
    deleteMember,
    linkProfile,
    unlinkProfile,
    linkActivePlan,
    unlinkActivePlan,
    updateChildData,
    updateSpouseData,
    updateParentData,
    updateFriendData,
    updateProfessionalData,
    totalCount,
    countByType
  };
}

/**
 * Hook for a single relationship member
 */
export function useRelationshipMember(memberId?: string) {
  const { members, loading, error, updateMember } = useRelationshipMembers();
  const [member, setMember] = useState<RelationshipMember | null>(null);

  useEffect(() => {
    if (!memberId) {
      setMember(null);
      return;
    }

    const foundMember = members.find(m => m.memberId === memberId);
    setMember(foundMember || null);
  }, [memberId, members]);

  return {
    member,
    loading,
    error,
    updateMember: (updates: Partial<RelationshipMember>) =>
      memberId ? updateMember(memberId, updates) : Promise.reject('No member ID'),
    exists: !!member
  };
}
