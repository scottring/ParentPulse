'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { AIUsageEvent, UsageAggregate } from '@/types/ai-usage';
import { AI_USAGE_COLLECTIONS } from '@/types/ai-usage';

interface UseAIUsageReturn {
  loading: boolean;
  error: string | null;
  // Aggregates for different windows
  today: UsageAggregate;
  last7Days: UsageAggregate;
  currentMonth: UsageAggregate;
  last30Days: UsageAggregate;
  // Raw events for the most recent month (for drill-down if needed)
  recentEvents: AIUsageEvent[];
}

const EMPTY_AGGREGATE: UsageAggregate = Object.freeze({
  totalCostUsd: 0,
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  byFunction: Object.freeze([] as UsageAggregate['byFunction']),
  byModel: Object.freeze([] as UsageAggregate['byModel']),
}) as UsageAggregate;

function isValidEvent(data: unknown): data is AIUsageEvent {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.familyId === 'string' &&
    typeof d.function === 'string' &&
    typeof d.model === 'string' &&
    typeof d.estimatedCostUsd === 'number' &&
    typeof d.inputTokens === 'number' &&
    typeof d.outputTokens === 'number'
  );
}

function aggregate(events: AIUsageEvent[]): UsageAggregate {
  if (events.length === 0) return EMPTY_AGGREGATE;

  const byFunctionMap = new Map<string, { calls: number; costUsd: number }>();
  const byModelMap = new Map<string, { family: string; calls: number; costUsd: number }>();

  let totalCost = 0;
  let totalCalls = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const e of events) {
    totalCost += e.estimatedCostUsd || 0;
    totalCalls += 1;
    totalIn += e.inputTokens || 0;
    totalOut += e.outputTokens || 0;

    const fnKey = e.function;
    const existing = byFunctionMap.get(fnKey) || { calls: 0, costUsd: 0 };
    existing.calls += 1;
    existing.costUsd += e.estimatedCostUsd || 0;
    byFunctionMap.set(fnKey, existing);

    const modelKey = e.model;
    const existingModel = byModelMap.get(modelKey) || {
      family: e.modelFamily || 'other',
      calls: 0,
      costUsd: 0,
    };
    existingModel.calls += 1;
    existingModel.costUsd += e.estimatedCostUsd || 0;
    byModelMap.set(modelKey, existingModel);
  }

  return {
    totalCostUsd: totalCost,
    totalCalls,
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
    byFunction: Array.from(byFunctionMap.entries())
      .map(([func, v]) => ({ function: func, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byModel: Array.from(byModelMap.entries())
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
  };
}

export function useAIUsage(): UseAIUsageReturn {
  const { user } = useAuth();
  const [events, setEvents] = useState<AIUsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    // Query events from the last 35 days — covers last-month + buffer.
    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

    const q = query(
      collection(firestore, AI_USAGE_COLLECTIONS.EVENTS),
      where('familyId', '==', user.familyId),
      where('timestamp', '>=', Timestamp.fromDate(thirtyFiveDaysAgo)),
      orderBy('timestamp', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AIUsageEvent[] = [];
        let skipped = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (isValidEvent(data)) {
            list.push({ ...data, eventId: docSnap.id });
          } else {
            skipped += 1;
          }
        });
        if (skipped > 0) {
          console.warn(`useAIUsage: skipped ${skipped} malformed usage event(s)`);
        }
        setEvents(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('AI usage listener error:', err);
        setError('Failed to load usage data');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.familyId]);

  const aggregates = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const todayEvents: AIUsageEvent[] = [];
    const last7DaysEvents: AIUsageEvent[] = [];
    const currentMonthEvents: AIUsageEvent[] = [];
    const last30DaysEvents: AIUsageEvent[] = [];

    for (const e of events) {
      const ts = e.timestamp?.toDate?.().getTime();
      if (ts === undefined) continue;
      if (ts >= startOfToday) todayEvents.push(e);
      if (ts >= sevenDaysAgo) last7DaysEvents.push(e);
      if (ts >= startOfMonth) currentMonthEvents.push(e);
      if (ts >= thirtyDaysAgo) last30DaysEvents.push(e);
    }

    return {
      today: aggregate(todayEvents),
      last7Days: aggregate(last7DaysEvents),
      currentMonth: aggregate(currentMonthEvents),
      last30Days: aggregate(last30DaysEvents),
    };
  }, [events]);

  return {
    loading,
    error,
    today: aggregates.today,
    last7Days: aggregates.last7Days,
    currentMonth: aggregates.currentMonth,
    last30Days: aggregates.last30Days,
    recentEvents: events,
  };
}
