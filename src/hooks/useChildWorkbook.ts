/**
 * Hook for managing ChildWorkbook CRUD operations
 *
 * Provides real-time subscription to child workbook data
 * and methods for tracking story progress and completing activities
 */

import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ChildWorkbook } from '@/types/child-workbook';

interface UseChildWorkbookResult {
  workbook: ChildWorkbook | null;
  loading: boolean;
  error: string | null;
  markDayAsRead: (dayNumber: number) => Promise<void>;
  completeActivity: (activityId: string) => Promise<void>;
  updateCurrentDay: (dayNumber: number) => Promise<void>;
  refreshWorkbook: () => Promise<void>;
}

/**
 * Get active child workbook for a specific person
 */
export function useChildWorkbook(personId: string): UseChildWorkbookResult {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<ChildWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkbook = async () => {
    if (!user?.familyId || !personId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query for active child workbook
      const workbooksRef = collection(firestore, 'child_workbooks');
      const q = query(
        workbooksRef,
        where('familyId', '==', user.familyId),
        where('personId', '==', personId),
        where('status', '==', 'active'),
        orderBy('startDate', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const workbookData = snapshot.docs[0].data() as ChildWorkbook;
        setWorkbook(workbookData);
      } else {
        setWorkbook(null);
      }
    } catch (err) {
      console.error('Error fetching child workbook:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbook();
  }, [user?.familyId, personId]);

  /**
   * Mark a story day as read
   */
  const markDayAsRead = async (dayNumber: number): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    if (dayNumber < 1 || dayNumber > 7) {
      throw new Error('Invalid day number (must be 1-7)');
    }

    const workbookRef = doc(firestore, 'child_workbooks', workbook.workbookId);
    const parentWorkbookRef = doc(firestore, 'parent_workbooks', workbook.parentWorkbookId);

    // Update daysRead array
    const updatedDaysRead = [...workbook.storyProgress.daysRead];
    updatedDaysRead[dayNumber - 1] = true;

    const storiesReadCount = updatedDaysRead.filter(Boolean).length;
    const completionPercent = Math.round((storiesReadCount / 7) * 100);

    // Update child workbook
    await updateDoc(workbookRef, {
      'storyProgress.daysRead': updatedDaysRead,
      'storyProgress.lastReadAt': Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update parent workbook's child progress summary
    await updateDoc(parentWorkbookRef, {
      'childProgressSummary.storiesRead': storiesReadCount,
      'childProgressSummary.lastActiveDate': Timestamp.now(),
      'childProgressSummary.storyCompletionPercent': completionPercent,
      updatedAt: Timestamp.now(),
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  /**
   * Complete an activity
   */
  const completeActivity = async (activityId: string): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    const workbookRef = doc(firestore, 'child_workbooks', workbook.workbookId);
    const parentWorkbookRef = doc(firestore, 'parent_workbooks', workbook.parentWorkbookId);

    // Add activity to completed list
    const updatedActivitiesCompleted = [
      ...workbook.storyProgress.activitiesCompleted,
      activityId,
    ];

    // Update child workbook
    await updateDoc(workbookRef, {
      'storyProgress.activitiesCompleted': updatedActivitiesCompleted,
      updatedAt: Timestamp.now(),
    });

    // Update parent workbook's child progress summary
    await updateDoc(parentWorkbookRef, {
      'childProgressSummary.activitiesCompleted': updatedActivitiesCompleted.length,
      'childProgressSummary.lastActiveDate': Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  /**
   * Update current day in story progress
   */
  const updateCurrentDay = async (dayNumber: number): Promise<void> => {
    if (!workbook || !user) {
      throw new Error('Workbook or user not found');
    }

    if (dayNumber < 1 || dayNumber > 7) {
      throw new Error('Invalid day number (must be 1-7)');
    }

    const workbookRef = doc(firestore, 'child_workbooks', workbook.workbookId);

    await updateDoc(workbookRef, {
      'storyProgress.currentDay': dayNumber,
      updatedAt: Timestamp.now(),
    });

    // Refresh workbook
    await fetchWorkbook();
  };

  return {
    workbook,
    loading,
    error,
    markDayAsRead,
    completeActivity,
    updateCurrentDay,
    refreshWorkbook: fetchWorkbook,
  };
}

/**
 * Get all active child workbooks for the family
 */
export function useActiveChildWorkbooks() {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<ChildWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const fetchWorkbooks = async () => {
      try {
        setLoading(true);
        setError(null);

        const workbooksRef = collection(firestore, 'child_workbooks');
        const q = query(
          workbooksRef,
          where('familyId', '==', user.familyId),
          where('status', '==', 'active'),
          orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const workbooksData = snapshot.docs.map((doc) => doc.data() as ChildWorkbook);

        setWorkbooks(workbooksData);
      } catch (err) {
        console.error('Error fetching active child workbooks:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch workbooks');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkbooks();
  }, [user?.familyId]);

  return { workbooks, loading, error };
}

/**
 * Get child workbook history for a specific person
 */
export function useChildWorkbookHistory(personId: string, weekCount: number = 4) {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<ChildWorkbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId || !personId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const workbooksRef = collection(firestore, 'child_workbooks');
        const q = query(
          workbooksRef,
          where('familyId', '==', user.familyId),
          where('personId', '==', personId),
          orderBy('startDate', 'desc'),
          limit(weekCount)
        );

        const snapshot = await getDocs(q);
        const workbooksData = snapshot.docs.map((doc) => doc.data() as ChildWorkbook);

        setWorkbooks(workbooksData);
      } catch (err) {
        console.error('Error fetching child workbook history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.familyId, personId, weekCount]);

  return { workbooks, loading, error };
}

/**
 * Get child workbook by weekId (for linking parent and child views)
 */
export function useChildWorkbookByWeekId(weekId: string) {
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState<ChildWorkbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId || !weekId) {
      setLoading(false);
      return;
    }

    const fetchWorkbook = async () => {
      try {
        setLoading(true);
        setError(null);

        const workbooksRef = collection(firestore, 'child_workbooks');
        const q = query(
          workbooksRef,
          where('familyId', '==', user.familyId),
          where('weekId', '==', weekId),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const workbookData = snapshot.docs[0].data() as ChildWorkbook;
          setWorkbook(workbookData);
        } else {
          setWorkbook(null);
        }
      } catch (err) {
        console.error('Error fetching child workbook by weekId:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch workbook');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkbook();
  }, [user?.familyId, weekId]);

  return { workbook, loading, error };
}
