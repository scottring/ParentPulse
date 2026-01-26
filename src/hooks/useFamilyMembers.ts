'use client';

/**
 * useFamilyMembers Hook
 *
 * Fetches user details for all members in a family
 * Used for tagging questions and collaborative features
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';

export interface FamilyMember {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: 'parent' | 'child';
}

interface UseFamilyMembersReturn {
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
  getMemberById: (userId: string) => FamilyMember | undefined;
  getMemberName: (userId: string) => string;
  otherMembers: FamilyMember[]; // All members except current user
}

export function useFamilyMembers(): UseFamilyMembersReturn {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          collection(firestore, COLLECTIONS.USERS),
          where('familyId', '==', user.familyId)
        );

        const snapshot = await getDocs(q);
        const fetchedMembers: FamilyMember[] = snapshot.docs.map(doc => ({
          userId: doc.id,
          name: doc.data().name || 'Unknown',
          email: doc.data().email,
          avatarUrl: doc.data().avatarUrl,
          role: doc.data().role || 'parent',
        }));

        setMembers(fetchedMembers);
      } catch (err) {
        console.error('Error fetching family members:', err);
        setError('Failed to load family members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.familyId]);

  const getMemberById = (userId: string): FamilyMember | undefined => {
    return members.find(m => m.userId === userId);
  };

  const getMemberName = (userId: string): string => {
    const member = getMemberById(userId);
    return member?.name || 'Unknown';
  };

  const otherMembers = members.filter(m => m.userId !== user?.userId);

  return {
    members,
    loading,
    error,
    getMemberById,
    getMemberName,
    otherMembers,
  };
}
