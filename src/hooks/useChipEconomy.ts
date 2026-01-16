import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Task, Reward, ChipTransaction, TransactionType } from '@/types';

interface AddTaskData {
  title: string;
  description: string;
  chipValue: number;
  childId?: string; // If specified, task is for specific child only
  recurring?: boolean;
  category?: string;
}

interface AddRewardData {
  title: string;
  description: string;
  chipCost: number;
  category?: string;
  available: boolean;
}

export function useChipEconomy() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<ChipTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks
  useEffect(() => {
    if (!user || !user.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'tasks'),
      where('familyId', '==', user.familyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taskList: Task[] = snapshot.docs.map((doc) => ({
          taskId: doc.id,
          ...doc.data(),
        } as Task));
        setTasks(taskList);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError('Failed to load tasks');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch rewards
  useEffect(() => {
    if (!user || !user.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'rewards'),
      where('familyId', '==', user.familyId),
      orderBy('chipCost', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rewardList: Reward[] = snapshot.docs.map((doc) => ({
          rewardId: doc.id,
          ...doc.data(),
        } as Reward));
        setRewards(rewardList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rewards:', err);
        setError('Failed to load rewards');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch transactions for a specific child
  const fetchChildTransactions = (childId: string) => {
    if (!user || !user.familyId) return;

    const q = query(
      collection(firestore, 'chip_transactions'),
      where('familyId', '==', user.familyId),
      where('childId', '==', childId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const txList: ChipTransaction[] = snapshot.docs.map((doc) => ({
          transactionId: doc.id,
          ...doc.data(),
        } as ChipTransaction));
        setTransactions(txList);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
      }
    );
  };

  // Add new task
  const addTask = async (data: AddTaskData): Promise<string> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      const taskData: any = {
        familyId: user.familyId,
        title: data.title,
        description: data.description,
        chipValue: data.chipValue,
        recurring: data.recurring || false,
        active: true,
        createdAt: Timestamp.now(),
      };

      if (data.childId) taskData.childId = data.childId;
      if (data.category) taskData.category = data.category;

      const docRef = await addDoc(collection(firestore, 'tasks'), taskData);
      return docRef.id;
    } catch (err) {
      console.error('Error adding task:', err);
      throw new Error('Failed to add task');
    }
  };

  // Add new reward
  const addReward = async (data: AddRewardData): Promise<string> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      const rewardData: any = {
        familyId: user.familyId,
        title: data.title,
        description: data.description,
        chipCost: data.chipCost,
        available: data.available !== undefined ? data.available : true,
        createdAt: Timestamp.now(),
      };

      if (data.category) rewardData.category = data.category;

      const docRef = await addDoc(collection(firestore, 'rewards'), rewardData);
      return docRef.id;
    } catch (err) {
      console.error('Error adding reward:', err);
      throw new Error('Failed to add reward');
    }
  };

  // Award chips for completing a task
  const awardChips = async (
    childId: string,
    amount: number,
    taskId?: string,
    taskName?: string
  ): Promise<void> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      const batch = writeBatch(firestore);

      // Update child's chip balance
      const childRef = doc(firestore, 'users', childId);
      const childDoc = await getDoc(childRef);
      const currentBalance = childDoc.data()?.chipBalance || 0;
      const newBalance = currentBalance + amount;

      batch.update(childRef, {
        chipBalance: newBalance,
        lastChipUpdate: Timestamp.now(),
      });

      // Record transaction
      const transactionRef = doc(collection(firestore, 'chip_transactions'));
      const transactionData: any = {
        familyId: user.familyId,
        childId,
        timestamp: Timestamp.now(),
        type: 'earn' as TransactionType,
        amount,
        balanceAfter: newBalance,
      };

      if (taskId) transactionData.taskId = taskId;
      if (taskName) transactionData.taskName = taskName;

      batch.set(transactionRef, transactionData);

      await batch.commit();
    } catch (err) {
      console.error('Error awarding chips:', err);
      throw new Error('Failed to award chips');
    }
  };

  // Spend chips on a reward
  const spendChips = async (
    childId: string,
    amount: number,
    rewardId: string,
    rewardName: string
  ): Promise<void> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      const batch = writeBatch(firestore);

      // Check and update child's chip balance
      const childRef = doc(firestore, 'users', childId);
      const childDoc = await getDoc(childRef);
      const currentBalance = childDoc.data()?.chipBalance || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient chips');
      }

      const newBalance = currentBalance - amount;

      batch.update(childRef, {
        chipBalance: newBalance,
        lastChipUpdate: Timestamp.now(),
      });

      // Record transaction
      const transactionRef = doc(collection(firestore, 'chip_transactions'));
      batch.set(transactionRef, {
        familyId: user.familyId,
        childId,
        timestamp: Timestamp.now(),
        type: 'spend' as TransactionType,
        amount: -amount,
        rewardId,
        rewardName,
        balanceAfter: newBalance,
      });

      await batch.commit();
    } catch (err) {
      console.error('Error spending chips:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to spend chips');
    }
  };

  // Manual chip adjustment (parent can add/remove chips)
  const adjustChips = async (
    childId: string,
    amount: number,
    reason: string
  ): Promise<void> => {
    if (!user || !user.familyId) {
      throw new Error('User not authenticated');
    }

    try {
      const batch = writeBatch(firestore);

      // Update child's chip balance
      const childRef = doc(firestore, 'users', childId);
      const childDoc = await getDoc(childRef);
      const currentBalance = childDoc.data()?.chipBalance || 0;
      const newBalance = currentBalance + amount;

      batch.update(childRef, {
        chipBalance: newBalance,
        lastChipUpdate: Timestamp.now(),
      });

      // Record transaction
      const transactionRef = doc(collection(firestore, 'chip_transactions'));
      batch.set(transactionRef, {
        familyId: user.familyId,
        childId,
        timestamp: Timestamp.now(),
        type: 'manual' as TransactionType,
        amount,
        reason,
        adjustedByParentId: user.userId,
        balanceAfter: newBalance,
      });

      await batch.commit();
    } catch (err) {
      console.error('Error adjusting chips:', err);
      throw new Error('Failed to adjust chips');
    }
  };

  // Delete task
  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'tasks', taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw new Error('Failed to delete task');
    }
  };

  // Delete reward
  const deleteReward = async (rewardId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'rewards', rewardId));
    } catch (err) {
      console.error('Error deleting reward:', err);
      throw new Error('Failed to delete reward');
    }
  };

  // Update task
  const updateTask = async (taskId: string, updates: Partial<AddTaskData>): Promise<void> => {
    try {
      const docRef = doc(firestore, 'tasks', taskId);
      await updateDoc(docRef, updates as any);
    } catch (err) {
      console.error('Error updating task:', err);
      throw new Error('Failed to update task');
    }
  };

  // Update reward
  const updateReward = async (rewardId: string, updates: Partial<AddRewardData>): Promise<void> => {
    try {
      const docRef = doc(firestore, 'rewards', rewardId);
      await updateDoc(docRef, updates as any);
    } catch (err) {
      console.error('Error updating reward:', err);
      throw new Error('Failed to update reward');
    }
  };

  return {
    tasks,
    rewards,
    transactions,
    loading,
    error,
    addTask,
    addReward,
    awardChips,
    spendChips,
    adjustChips,
    deleteTask,
    deleteReward,
    updateTask,
    updateReward,
    fetchChildTransactions,
  };
}
