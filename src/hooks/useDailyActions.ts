import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { DailyAction, ActionStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useDailyActions() {
  const { user } = useAuth();
  const [todaysActions, setTodaysActions] = useState<DailyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch today's actions
  const fetchTodaysActions = async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get start and end of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(firestore, 'daily_actions'),
        where('familyId', '==', user.familyId),
        where('targetDate', '>=', Timestamp.fromDate(today)),
        where('targetDate', '<', Timestamp.fromDate(tomorrow)),
        orderBy('targetDate', 'desc'),
        orderBy('priority', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedActions: DailyAction[] = [];

      querySnapshot.forEach((doc) => {
        fetchedActions.push({
          actionId: doc.id,
          ...doc.data(),
        } as DailyAction);
      });

      setTodaysActions(fetchedActions);
    } catch (err: any) {
      console.error('Error fetching daily actions:', err);
      setError(err.message || 'Failed to fetch daily actions');
    } finally {
      setLoading(false);
    }
  };

  // Mark action as completed
  const completeAction = async (actionId: string, notes?: string): Promise<void> => {
    try {
      const actionRef = doc(firestore, 'daily_actions', actionId);

      const updateData: any = {
        status: 'completed' as ActionStatus,
        completedAt: serverTimestamp(),
      };

      if (notes) {
        updateData.parentNotes = notes;
      }

      await updateDoc(actionRef, updateData);

      // Refresh actions list
      await fetchTodaysActions();
    } catch (err: any) {
      console.error('Error completing action:', err);
      throw new Error(err.message || 'Failed to complete action');
    }
  };

  // Mark action as skipped
  const skipAction = async (actionId: string, reason?: string): Promise<void> => {
    try {
      const actionRef = doc(firestore, 'daily_actions', actionId);

      const updateData: any = {
        status: 'skipped' as ActionStatus,
      };

      if (reason) {
        updateData.parentNotes = reason;
      }

      await updateDoc(actionRef, updateData);

      // Refresh actions list
      await fetchTodaysActions();
    } catch (err: any) {
      console.error('Error skipping action:', err);
      throw new Error(err.message || 'Failed to skip action');
    }
  };

  // Manually add an action (for testing or manual creation)
  const addAction = async (action: Omit<DailyAction, 'actionId' | 'generatedAt' | 'familyId'>): Promise<string> => {
    if (!user?.familyId) {
      throw new Error('User must be logged in with a family');
    }

    try {
      const actionData = {
        familyId: user.familyId,
        generatedAt: serverTimestamp(),
        ...action,
        status: 'pending' as ActionStatus,
      };

      const docRef = await addDoc(collection(firestore, 'daily_actions'), actionData);

      // Refresh actions list
      await fetchTodaysActions();

      return docRef.id;
    } catch (err: any) {
      console.error('Error adding action:', err);
      throw new Error(err.message || 'Failed to add action');
    }
  };

  // Load actions on mount
  useEffect(() => {
    if (user?.familyId) {
      fetchTodaysActions();
    }
  }, [user?.familyId]);

  const pendingActions = todaysActions.filter(a => a.status === 'pending');
  const completedActions = todaysActions.filter(a => a.status === 'completed');

  return {
    todaysActions,
    pendingActions,
    completedActions,
    loading,
    error,
    fetchTodaysActions,
    completeAction,
    skipAction,
    addAction,
  };
}
