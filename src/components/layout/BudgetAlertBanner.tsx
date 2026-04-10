'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useAIUsage } from '@/hooks/useAIUsage';
import { DEFAULT_BUDGET } from '@/types/ai-usage';

/**
 * Global banner shown when the family's current-month AI spend crosses
 * one of the configured budget thresholds (50% / 80% / 100%).
 *
 * Dismissing the banner bumps `lastAlertedThreshold` on the family doc so
 * the same threshold isn't shown again — the banner only reappears when a
 * higher threshold is crossed, or when the month rolls over and spend drops.
 */
export default function BudgetAlertBanner() {
  const { user } = useAuth();
  const { family } = useFamily();
  const { currentMonth, loading, error } = useAIUsage();

  // Parents only — kids shouldn't see billing alerts.
  const isParent = user?.role === 'parent';

  const budget = family?.aiBudget ?? DEFAULT_BUDGET;
  const [dismissing, setDismissing] = useState(false);
  const [sessionDismissedThreshold, setSessionDismissedThreshold] = useState<number | null>(null);

  const { crossedThreshold, message, tone } = useMemo(() => {
    if (!budget.monthlyLimitUsd || budget.monthlyLimitUsd <= 0) {
      return { crossedThreshold: null as number | null, message: '', tone: 'info' as const };
    }
    const pct = currentMonth.totalCostUsd / budget.monthlyLimitUsd;

    // Find the highest threshold that current spend has crossed.
    const sorted = [...budget.thresholds].sort((a, b) => a - b);
    let crossed: number | null = null;
    for (const t of sorted) {
      if (pct >= t) crossed = t;
    }

    if (crossed === null) {
      return { crossedThreshold: null, message: '', tone: 'info' as const };
    }

    const pctLabel = Math.round(crossed * 100);
    const spentLabel = `$${currentMonth.totalCostUsd.toFixed(2)}`;
    const limitLabel = `$${budget.monthlyLimitUsd.toFixed(2)}`;

    if (crossed >= 1) {
      return {
        crossedThreshold: crossed,
        message: `You're over your AI budget for this month — ${spentLabel} spent of ${limitLabel}.`,
        tone: 'danger' as const,
      };
    }
    return {
      crossedThreshold: crossed,
      message: `You've used ${pctLabel}% of your monthly AI budget (${spentLabel} of ${limitLabel}).`,
      tone: crossed >= 0.8 ? ('warning' as const) : ('info' as const),
    };
  }, [currentMonth.totalCostUsd, budget.monthlyLimitUsd, budget.thresholds]);

  const lastAlerted = budget.lastAlertedThreshold ?? 0;
  const effectiveDismissed = Math.max(lastAlerted, sessionDismissedThreshold ?? 0);

  const shouldShow =
    isParent &&
    !loading &&
    !error &&
    crossedThreshold !== null &&
    crossedThreshold > effectiveDismissed;

  const handleDismiss = useCallback(async () => {
    if (!user?.familyId || crossedThreshold === null) return;
    setSessionDismissedThreshold(crossedThreshold);
    setDismissing(true);
    try {
      await updateDoc(doc(firestore, 'families', user.familyId), {
        'aiBudget.lastAlertedThreshold': crossedThreshold,
      });
    } catch (err) {
      console.error('Failed to persist budget alert dismissal:', err);
      // Session dismiss still applies; user won't be re-nagged this session.
    } finally {
      setDismissing(false);
    }
  }, [user?.familyId, crossedThreshold]);

  if (!shouldShow) return null;

  const palette =
    tone === 'danger'
      ? { bg: '#FEE2E2', border: '#F5B5B5', text: '#991B1B', icon: '#C62828' }
      : tone === 'warning'
        ? { bg: '#FEF3E2', border: '#F5D9B5', text: '#7A4A10', icon: '#D4822A' }
        : { bg: '#E8F0E9', border: '#C5D6C8', text: '#2F5A3A', icon: '#7C9082' };

  return (
    <div
      className="w-full border-b"
      style={{
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3" style={{ maxWidth: 1440 }}>
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
          style={{ background: palette.icon, color: 'white' }}
          aria-hidden
        >
          !
        </span>
        <p className="flex-1 text-sm" style={{ fontFamily: 'var(--font-parent-body)' }}>
          {message}{' '}
          <Link
            href="/settings"
            className="underline font-semibold"
            style={{ color: palette.text }}
          >
            Review usage
          </Link>
        </p>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="text-xs font-medium px-3 py-1 rounded transition-opacity disabled:opacity-50 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.5)',
            color: palette.text,
            border: `1px solid ${palette.border}`,
          }}
          aria-label="Dismiss budget alert"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
