'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import {
  GrowthItem,
  GrowthFeedback,
  FeedbackReaction,
  ImpactRating,
  DepthTier,
  GROWTH_COLLECTIONS,
} from '@/types/growth';
import { GrowthArc, ARC_COLLECTIONS } from '@/types/growth-arc';

export interface ArcGroup {
  arc: GrowthArc;
  activeItems: GrowthItem[];
  completedItems: GrowthItem[];
  progress: number; // 0-100
}

interface UseGrowthFeedReturn {
  // Arc-grouped items
  arcGroups: ArcGroup[];
  // Standalone items (not part of any arc)
  standaloneActiveItems: GrowthItem[];
  standaloneCompletedItems: GrowthItem[];
  // All items (flat)
  activeItems: GrowthItem[];
  completedItems: GrowthItem[];
  loading: boolean;
  error: string | null;

  // Actions
  swapDepth: (itemId: string, newDepth: DepthTier) => Promise<void>;
  submitFeedback: (
    itemId: string,
    reaction: FeedbackReaction,
    impactRating?: ImpactRating,
    note?: string,
    forUserId?: string,
  ) => Promise<void>;
  markSeen: (itemId: string) => Promise<void>;
  generateBatch: () => Promise<{ success: boolean; itemCount?: number }>;
  seedAssessments: () => Promise<{ success: boolean; assessmentCount?: number }>;
  generateArc: (dimensionId?: string) => Promise<{ success: boolean; arcId?: string }>;
  processAcuteEvent: (freeText: string) => Promise<{
    success: boolean;
    eventId?: string;
    analysis?: {
      recommendation: string;
      reasoning: string;
      suggestedActions: string[];
    };
  }>;
  generating: boolean;
}

export function useGrowthFeed(): UseGrowthFeedReturn {
  const { user } = useAuth();
  const [activeItems, setActiveItems] = useState<GrowthItem[]>([]);
  const [completedItems, setCompletedItems] = useState<GrowthItem[]>([]);
  const [arcs, setArcs] = useState<GrowthArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Real-time listener for growth items
  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const itemsRef = collection(firestore, GROWTH_COLLECTIONS.GROWTH_ITEMS);
    const q = query(
      itemsRef,
      where('familyId', '==', user.familyId),
      where('assignedToUserId', '==', user.userId),
      orderBy('scheduledDate', 'asc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date();
        const active: GrowthItem[] = [];
        const completed: GrowthItem[] = [];

        snapshot.forEach((docSnap) => {
          const item = { ...docSnap.data(), growthItemId: docSnap.id } as GrowthItem;

          // Auto-expire items past their expiry
          const expiresAt = item.expiresAt?.toDate?.() || new Date(0);
          if (
            (item.status === 'active' || item.status === 'seen') &&
            expiresAt < now
          ) {
            updateDoc(doc(firestore, GROWTH_COLLECTIONS.GROWTH_ITEMS, item.growthItemId), {
              status: 'expired',
              statusUpdatedAt: Timestamp.now(),
            }).catch(() => {});
            return;
          }

          // Only show items whose scheduledDate has passed
          const scheduledDate = item.scheduledDate?.toDate?.() || new Date(0);
          if (scheduledDate > now && item.status === 'active') {
            return;
          }

          if (item.status === 'completed' || item.status === 'skipped') {
            completed.push(item);
          } else if (item.status === 'active' || item.status === 'seen') {
            active.push(item);
          }
        });

        // Sort: arc items by sequence, then standalone by speed
        active.sort((a, b) => {
          // Arc items come first, sorted by sequence
          if (a.arcId && b.arcId && a.arcId === b.arcId) {
            return (a.arcSequence || 0) - (b.arcSequence || 0);
          }
          if (a.arcId && !b.arcId) return -1;
          if (!a.arcId && b.arcId) return 1;
          if (a.speed !== b.speed) return a.speed === 'ambient' ? -1 : 1;
          return 0;
        });

        completed.sort((a, b) => {
          const aTime = b.statusUpdatedAt?.toDate?.()?.getTime() || 0;
          const bTime = a.statusUpdatedAt?.toDate?.()?.getTime() || 0;
          return aTime - bTime;
        });

        setActiveItems(active);
        setCompletedItems(completed.slice(0, 10));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Growth feed listener error:', err);
        setError('Failed to load growth feed');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.familyId, user?.userId]);

  // Real-time listener for active arcs
  useEffect(() => {
    if (!user?.familyId) return;

    const arcsRef = collection(firestore, ARC_COLLECTIONS.GROWTH_ARCS);
    const q = query(
      arcsRef,
      where('familyId', '==', user.familyId),
      where('status', '==', 'active'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeArcs: GrowthArc[] = [];
      snapshot.forEach((docSnap) => {
        activeArcs.push({ ...docSnap.data(), arcId: docSnap.id } as GrowthArc);
      });
      setArcs(activeArcs);
    });

    return () => unsubscribe();
  }, [user?.familyId]);

  // Build arc groups
  const arcGroups: ArcGroup[] = arcs.map((arc) => {
    const arcActive = activeItems.filter((i) => i.arcId === arc.arcId);
    const arcCompleted = completedItems.filter((i) => i.arcId === arc.arcId);
    const total = arc.totalItemCount || 1;
    const done = arc.completedItemCount || arcCompleted.length;
    return {
      arc,
      activeItems: arcActive,
      completedItems: arcCompleted,
      progress: Math.round((done / total) * 100),
    };
  });

  const standaloneActiveItems = activeItems.filter((i) => !i.arcId);
  const standaloneCompletedItems = completedItems.filter((i) => !i.arcId);

  // Submit feedback — writes per-user feedback + legacy feedback field
  const submitFeedback = useCallback(
    async (
      itemId: string,
      reaction: FeedbackReaction,
      impactRating?: ImpactRating,
      note?: string,
      forUserId?: string,
    ) => {
      const respondingUserId = forUserId || user?.userId;
      if (!respondingUserId) return;

      const feedbackEntry: GrowthFeedback = {
        reaction,
        respondedAt: Timestamp.now(),
        ...(impactRating && { impactRating }),
        ...(note && { note }),
      };

      const updates: Record<string, unknown> = {
        // Per-user feedback (new)
        [`feedbackByUser.${respondingUserId}`]: feedbackEntry,
        // Legacy single feedback (for backward compat with Cloud Functions)
        feedback: feedbackEntry,
        statusUpdatedAt: Timestamp.now(),
      };

      if (reaction === 'not_now') {
        // "Not now" for one person doesn't complete the item
        // Only reschedule if it's a single-person item
        const item = activeItems.find((i) => i.growthItemId === itemId);
        const isCouple = item?.relationalLevel === 'couple';

        if (!isCouple) {
          const newDate = new Date();
          newDate.setDate(newDate.getDate() + 2);
          updates.scheduledDate = Timestamp.fromDate(newDate);
          const newExpiry = new Date(newDate);
          newExpiry.setDate(newExpiry.getDate() + 1);
          updates.expiresAt = Timestamp.fromDate(newExpiry);
          updates.feedback = null;
          updates[`feedbackByUser.${respondingUserId}`] = feedbackEntry; // still track the "not now"
        }
        updates.status = 'active';
      } else {
        updates.status = 'completed';
      }

      await updateDoc(
        doc(firestore, GROWTH_COLLECTIONS.GROWTH_ITEMS, itemId),
        updates,
      );
    },
    [user?.userId, activeItems],
  );

  const markSeen = useCallback(async (itemId: string) => {
    await updateDoc(
      doc(firestore, GROWTH_COLLECTIONS.GROWTH_ITEMS, itemId),
      { status: 'seen', statusUpdatedAt: Timestamp.now() },
    );
  }, []);

  const generateBatch = useCallback(async () => {
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, 'generateGrowthBatch');
      const result = await fn({});
      return result.data as { success: boolean; itemCount?: number };
    } catch (err) {
      console.error('Failed to generate growth batch:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const seedAssessments = useCallback(async () => {
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, 'seedDimensionAssessments');
      const result = await fn({});
      return result.data as { success: boolean; assessmentCount?: number };
    } catch (err) {
      console.error('Failed to seed assessments:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const generateArc = useCallback(async (dimensionId?: string) => {
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, 'generateGrowthArc');
      const result = await fn({ dimensionId });
      return result.data as { success: boolean; arcId?: string };
    } catch (err) {
      console.error('Failed to generate arc:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Swap an item's depth tier (updates body/type/estimatedMinutes from alternatives)
  const swapDepth = useCallback(async (itemId: string, newDepth: DepthTier) => {
    const item = activeItems.find((i) => i.growthItemId === itemId);
    if (!item?.alternatives) return;

    const alt = item.alternatives[newDepth];
    if (!alt) return;

    await updateDoc(
      doc(firestore, GROWTH_COLLECTIONS.GROWTH_ITEMS, itemId),
      {
        body: alt.body,
        estimatedMinutes: alt.estimatedMinutes,
        type: alt.type,
        depthTier: newDepth,
        statusUpdatedAt: Timestamp.now(),
      },
    );
  }, [activeItems]);

  const processAcuteEvent = useCallback(async (freeText: string) => {
    try {
      const fn = httpsCallable(functions, 'processAcuteEvent');
      const result = await fn({ freeText });
      return result.data as {
        success: boolean;
        eventId?: string;
        analysis?: {
          recommendation: string;
          reasoning: string;
          suggestedActions: string[];
        };
      };
    } catch (err) {
      console.error('Failed to process acute event:', err);
      throw err;
    }
  }, []);

  return {
    arcGroups,
    standaloneActiveItems,
    standaloneCompletedItems,
    activeItems,
    completedItems,
    loading,
    error,
    swapDepth,
    submitFeedback,
    markSeen,
    generateBatch,
    seedAssessments,
    generateArc,
    processAcuteEvent,
    generating,
  };
}
