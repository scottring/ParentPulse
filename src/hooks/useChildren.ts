'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Child, AddChildForm } from '../types/child-manual';
import { COLLECTIONS } from '../types';

interface UseChildrenReturn {
  children: Child[];
  loading: boolean;
  error: string | null;

  // Methods
  addChild: (childData: AddChildForm) => Promise<Child>;
  updateChild: (childId: string, updates: Partial<Child>) => Promise<void>;
  deleteChild: (childId: string) => Promise<void>;
  getChild: (childId: string) => Promise<Child | null>;
  refreshChildren: () => Promise<void>;
}

export const useChildren = (): UseChildrenReturn => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch children when user changes
  useEffect(() => {
    if (!user?.familyId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const fetchChildren = async () => {
      try {
        setLoading(true);
        setError(null);

        const childrenQuery = query(
          collection(firestore, COLLECTIONS.CHILDREN),
          where('familyId', '==', user.familyId)
        );

        const querySnapshot = await getDocs(childrenQuery);
        const childrenData: Child[] = [];

        querySnapshot.forEach(doc => {
          childrenData.push(doc.data() as Child);
        });

        setChildren(childrenData);
      } catch (err: any) {
        console.error('Error fetching children:', err);
        setError(err.message || 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [user?.familyId]);

  /**
   * Add a new child
   */
  const addChild = async (childData: AddChildForm): Promise<Child> => {
    if (!user || !user.familyId) {
      throw new Error('User must be logged in');
    }

    if (user.role !== 'parent') {
      throw new Error('Only parents can add children');
    }

    try {
      setError(null);

      const childId = doc(collection(firestore, COLLECTIONS.CHILDREN)).id;
      const childRef = doc(firestore, COLLECTIONS.CHILDREN, childId);

      // Build child object, only including optional fields if they have values
      const newChild: any = {
        childId,
        familyId: user.familyId,
        name: childData.name,
        createdBy: user.userId,
        createdAt: serverTimestamp(),
      };

      // Only add optional fields if they're provided
      if (childData.age !== undefined && childData.age !== null) {
        newChild.age = childData.age;
      }
      if (childData.dateOfBirth) {
        newChild.dateOfBirth = Timestamp.fromDate(new Date(childData.dateOfBirth));
      }
      if (childData.pronouns) {
        newChild.pronouns = childData.pronouns;
      }

      // Clean the object to remove any undefined values
      const cleanedChild = Object.fromEntries(
        Object.entries(newChild).filter(([_, value]) => value !== undefined)
      ) as Partial<Child>;

      await setDoc(childRef, cleanedChild);

      // Refresh children list
      await refreshChildren();

      return newChild as Child;
    } catch (err: any) {
      console.error('Error adding child:', err);
      setError(err.message || 'Failed to add child');
      throw err;
    }
  };

  /**
   * Update child information
   */
  const updateChild = async (
    childId: string,
    updates: Partial<Child>
  ): Promise<void> => {
    if (!user || user.role !== 'parent') {
      throw new Error('Only parents can update child information');
    }

    try {
      setError(null);

      const childRef = doc(firestore, COLLECTIONS.CHILDREN, childId);

      // Don't allow updating these fields
      const { childId: _, familyId: __, createdBy: ___, createdAt: ____, ...safeUpdates } = updates as any;

      await updateDoc(childRef, safeUpdates);

      // Refresh children list
      await refreshChildren();
    } catch (err: any) {
      console.error('Error updating child:', err);
      setError(err.message || 'Failed to update child');
      throw err;
    }
  };

  /**
   * Delete a child (and their manual if it exists)
   */
  const deleteChild = async (childId: string): Promise<void> => {
    if (!user || user.role !== 'parent') {
      throw new Error('Only parents can delete children');
    }

    try {
      setError(null);

      // Get the child to check for manual
      const childRef = doc(firestore, COLLECTIONS.CHILDREN, childId);
      const childDoc = await getDoc(childRef);

      if (!childDoc.exists()) {
        throw new Error('Child not found');
      }

      const childData = childDoc.data() as Child;

      // Delete the manual if it exists and has a valid ID
      if (childData.manualId && typeof childData.manualId === 'string' && childData.manualId.trim() !== '') {
        const manualRef = doc(firestore, COLLECTIONS.CHILD_MANUALS, childData.manualId);
        await deleteDoc(manualRef);
      }

      // Delete the child
      await deleteDoc(childRef);

      // Refresh children list
      await refreshChildren();
    } catch (err: any) {
      console.error('Error deleting child:', err);
      setError(err.message || 'Failed to delete child');
      throw err;
    }
  };

  /**
   * Get a single child by ID
   */
  const getChild = async (childId: string): Promise<Child | null> => {
    try {
      const childRef = doc(firestore, COLLECTIONS.CHILDREN, childId);
      const childDoc = await getDoc(childRef);

      if (childDoc.exists()) {
        return childDoc.data() as Child;
      }

      return null;
    } catch (err: any) {
      console.error('Error getting child:', err);
      return null;
    }
  };

  /**
   * Refresh children list
   */
  const refreshChildren = async (): Promise<void> => {
    if (!user?.familyId) {
      return;
    }

    try {
      const childrenQuery = query(
        collection(firestore, COLLECTIONS.CHILDREN),
        where('familyId', '==', user.familyId)
      );

      const querySnapshot = await getDocs(childrenQuery);
      const childrenData: Child[] = [];

      querySnapshot.forEach(doc => {
        childrenData.push(doc.data() as Child);
      });

      setChildren(childrenData);
    } catch (err: any) {
      console.error('Error refreshing children:', err);
      setError(err.message || 'Failed to refresh children');
    }
  };

  return {
    children,
    loading,
    error,
    addChild,
    updateChild,
    deleteChild,
    getChild,
    refreshChildren,
  };
};
