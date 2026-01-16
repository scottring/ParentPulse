import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { User } from '@/types';
import { useAuth } from '@/context/AuthContext';

export interface CreateChildData {
  name: string;
  dateOfBirth: Date;
  avatar?: File;
  username?: string;
  pin?: string;
}

export function useChildren() {
  const { user } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all children in the family
  const fetchChildren = async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, 'users'),
        where('familyId', '==', user.familyId),
        where('role', '==', 'child')
      );

      const querySnapshot = await getDocs(q);
      const fetchedChildren: User[] = [];

      querySnapshot.forEach((doc) => {
        fetchedChildren.push({
          userId: doc.id,
          ...doc.data(),
        } as User);
      });

      // Sort by date of birth (youngest first)
      fetchedChildren.sort((a, b) => {
        if (!a.dateOfBirth || !b.dateOfBirth) return 0;
        return b.dateOfBirth.toDate().getTime() - a.dateOfBirth.toDate().getTime();
      });

      setChildren(fetchedChildren);
    } catch (err: any) {
      console.error('Error fetching children:', err);
      setError(err.message || 'Failed to fetch children');
    } finally {
      setLoading(false);
    }
  };

  // Create new child account
  const createChild = async (data: CreateChildData): Promise<string> => {
    if (!user?.familyId) {
      throw new Error('User must be logged in with a family');
    }

    try {
      // Upload avatar if provided
      let avatarUrl: string | undefined;
      if (data.avatar) {
        const avatarRef = ref(
          storage,
          `families/${user.familyId}/children/${Date.now()}_${data.avatar.name}`
        );
        await uploadBytes(avatarRef, data.avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      // Create child user document
      const childData = {
        familyId: user.familyId,
        role: 'child' as const,
        name: data.name,
        email: '', // Children don't have email
        dateOfBirth: data.dateOfBirth,
        avatarUrl: avatarUrl || null,
        username: data.username || null,
        pin: data.pin || null,
        chipBalance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'users'), childData);

      // Update family document to include child ID
      const familyRef = doc(db, 'families', user.familyId);
      const familyDoc = await getDocs(query(collection(db, 'families'), where('__name__', '==', user.familyId)));

      if (!familyDoc.empty) {
        const currentChildIds = familyDoc.docs[0].data().childIds || [];
        await updateDoc(familyRef, {
          childIds: [...currentChildIds, docRef.id],
          updatedAt: serverTimestamp(),
        });
      }

      // Refresh children list
      await fetchChildren();

      return docRef.id;
    } catch (err: any) {
      console.error('Error creating child:', err);
      throw new Error(err.message || 'Failed to create child account');
    }
  };

  // Update child information
  const updateChild = async (
    childId: string,
    updates: Partial<CreateChildData>
  ): Promise<void> => {
    try {
      const childRef = doc(db, 'users', childId);

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.dateOfBirth !== undefined) updateData.dateOfBirth = updates.dateOfBirth;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.pin !== undefined) updateData.pin = updates.pin;

      // Handle avatar upload if provided
      if (updates.avatar) {
        const avatarRef = ref(
          storage,
          `families/${user?.familyId}/children/${childId}_${updates.avatar.name}`
        );
        await uploadBytes(avatarRef, updates.avatar);
        const avatarUrl = await getDownloadURL(avatarRef);
        updateData.avatarUrl = avatarUrl;
      }

      await updateDoc(childRef, updateData);

      // Refresh children list
      await fetchChildren();
    } catch (err: any) {
      console.error('Error updating child:', err);
      throw new Error(err.message || 'Failed to update child');
    }
  };

  // Delete child account
  const deleteChild = async (childId: string): Promise<void> => {
    if (!user?.familyId) {
      throw new Error('User must be logged in with a family');
    }

    try {
      const childRef = doc(db, 'users', childId);

      // Remove child ID from family document
      const familyRef = doc(db, 'families', user.familyId);
      const familyDoc = await getDocs(query(collection(db, 'families'), where('__name__', '==', user.familyId)));

      if (!familyDoc.empty) {
        const currentChildIds = familyDoc.docs[0].data().childIds || [];
        await updateDoc(familyRef, {
          childIds: currentChildIds.filter((id: string) => id !== childId),
          updatedAt: serverTimestamp(),
        });
      }

      // Delete child user document
      await deleteDoc(childRef);

      // TODO: Also delete child's check-ins and transactions
      // This should be done in a Cloud Function for data consistency

      // Refresh children list
      await fetchChildren();
    } catch (err: any) {
      console.error('Error deleting child:', err);
      throw new Error(err.message || 'Failed to delete child');
    }
  };

  // Award chips to a child
  const awardChips = async (childId: string, amount: number, reason: string): Promise<void> => {
    try {
      const childRef = doc(db, 'users', childId);
      const child = children.find((c) => c.userId === childId);

      if (!child) {
        throw new Error('Child not found');
      }

      const newBalance = (child.chipBalance || 0) + amount;

      await updateDoc(childRef, {
        chipBalance: newBalance,
        updatedAt: serverTimestamp(),
      });

      // Create transaction record
      await addDoc(collection(db, 'chip_transactions'), {
        familyId: user?.familyId,
        childId,
        type: 'earn',
        amount,
        reason,
        balanceAfter: newBalance,
        createdAt: serverTimestamp(),
      });

      // Refresh children list
      await fetchChildren();
    } catch (err: any) {
      console.error('Error awarding chips:', err);
      throw new Error(err.message || 'Failed to award chips');
    }
  };

  // Load children on mount
  useEffect(() => {
    if (user?.familyId) {
      fetchChildren();
    }
  }, [user?.familyId]);

  return {
    children,
    loading,
    error,
    fetchChildren,
    createChild,
    updateChild,
    deleteChild,
    awardChips,
  };
}
