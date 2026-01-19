'use client';

import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Family, PendingInvite } from '../types/child-manual';
import { COLLECTIONS } from '../types';

interface UseFamilyReturn {
  family: Family | null;
  loading: boolean;
  error: string | null;

  // Methods
  inviteParent: (email: string) => Promise<void>;
  removeInvite: (email: string) => Promise<void>;
  refreshFamily: () => Promise<void>;
}

export const useFamily = (): UseFamilyReturn => {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch family data
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchFamily = async () => {
      try {
        setLoading(true);
        setError(null);

        const familyRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);
        const familyDoc = await getDoc(familyRef);

        if (familyDoc.exists()) {
          const familyData = familyDoc.data() as any;

          // Ensure new fields exist (backwards compatibility)
          const normalizedFamily: Family = {
            familyId: familyData.familyId,
            createdBy: familyData.createdBy || familyData.parentIds?.[0] || user.userId,
            members: familyData.members || [user.userId],
            pendingInvites: familyData.pendingInvites || [],
            createdAt: familyData.createdAt,
          };

          // Update the family document if fields were missing
          if (!familyData.members || !familyData.pendingInvites) {
            try {
              await updateDoc(familyRef, {
                members: normalizedFamily.members,
                pendingInvites: normalizedFamily.pendingInvites,
                createdBy: normalizedFamily.createdBy,
              });
            } catch (updateErr) {
              console.warn('Failed to update family with new fields:', updateErr);
            }
          }

          setFamily(normalizedFamily);
        } else {
          setError('Family not found');
        }
      } catch (err: any) {
        console.error('Error fetching family:', err);
        setError(err.message || 'Failed to load family');
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
  }, [user?.familyId, user?.userId]);

  /**
   * Invite a co-parent to join the family
   */
  const inviteParent = async (email: string): Promise<void> => {
    if (!user || !user.familyId) {
      throw new Error('User must be logged in');
    }

    if (user.role !== 'parent') {
      throw new Error('Only parents can invite other parents');
    }

    try {
      setError(null);

      // Check if email is already invited
      if (family?.pendingInvites?.some(invite => invite.email === email)) {
        throw new Error('This email has already been invited');
      }

      const pendingInvite: PendingInvite = {
        email,
        role: 'parent',
        sentAt: Timestamp.now(),
        invitedBy: user.userId,
      };

      const familyRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);

      await updateDoc(familyRef, {
        pendingInvites: arrayUnion(pendingInvite),
      });

      // Refresh family data
      await refreshFamily();

      // TODO: Send email invitation via Cloud Function
      // For now, the invitee needs to register with this email and they'll be added to family

    } catch (err: any) {
      console.error('Error inviting parent:', err);
      setError(err.message || 'Failed to send invitation');
      throw err;
    }
  };

  /**
   * Remove a pending invitation
   */
  const removeInvite = async (email: string): Promise<void> => {
    if (!user || !user.familyId) {
      throw new Error('User must be logged in');
    }

    if (user.role !== 'parent') {
      throw new Error('Only parents can remove invitations');
    }

    try {
      setError(null);

      // Find the invite to remove
      const inviteToRemove = family?.pendingInvites?.find(
        invite => invite.email === email
      );

      if (!inviteToRemove) {
        throw new Error('Invitation not found');
      }

      const familyRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);

      await updateDoc(familyRef, {
        pendingInvites: arrayRemove(inviteToRemove),
      });

      // Refresh family data
      await refreshFamily();

    } catch (err: any) {
      console.error('Error removing invite:', err);
      setError(err.message || 'Failed to remove invitation');
      throw err;
    }
  };

  /**
   * Refresh family data
   */
  const refreshFamily = async (): Promise<void> => {
    if (!user?.familyId) {
      return;
    }

    try {
      const familyRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);
      const familyDoc = await getDoc(familyRef);

      if (familyDoc.exists()) {
        setFamily(familyDoc.data() as Family);
      }
    } catch (err: any) {
      console.error('Error refreshing family:', err);
      setError(err.message || 'Failed to refresh family');
    }
  };

  return {
    family,
    loading,
    error,
    inviteParent,
    removeInvite,
    refreshFamily,
  };
};
