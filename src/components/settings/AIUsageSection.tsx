'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useAIUsage } from '@/hooks/useAIUsage';
import { DEFAULT_BUDGET, type BudgetConfig, type UsageAggregate } from '@/types/ai-usage';

function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '<$0.01';
  return `$${amount.toFixed(2)}`;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: 'var(--parent-bg)',
        border: '1px solid var(--parent-border)',
      }}
    >
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--parent-text-light)' }}>
        {label}
      </div>
      <div className="text-2xl font-semibold" style={{ color: 'var(--parent-text)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--parent-text-light)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function BudgetBar({
  spent,
  limit,
  thresholds,
}: {
  spent: number;
  limit: number;
  thresholds: number[];
}) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const overBudget = spent > limit;
  const nearLimit = pct >= 80;

  const barColor = overBudget
    ? '#C62828'
    : nearLimit
      ? '#D4822A'
      : 'var(--parent-accent)';

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-semibold" style={{ color: 'var(--parent-text)' }}>
            {formatUsd(spent)}
          </span>
          <span className="text-sm ml-2" style={{ color: 'var(--parent-text-light)' }}>
            of {formatUsd(limit)} budget
          </span>
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: overBudget ? '#C62828' : 'var(--parent-text-light)' }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{ background: '#E8E4DD' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: barColor }}
        />
        {thresholds.map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${Math.min(100, t * 100)}%`,
              background: 'rgba(58,53,48,0.3)',
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  cost,
  maxCost,
}: {
  label: string;
  count: number;
  cost: number;
  maxCost: number;
}) {
  const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between text-sm">
        <span style={{ color: 'var(--parent-text)' }} className="font-medium truncate pr-2">
          {label}
        </span>
        <span style={{ color: 'var(--parent-text-light)' }} className="whitespace-nowrap">
          {formatCount(count)} calls · {formatUsd(cost)}
        </span>
      </div>
      <div
        className="relative h-1 rounded-full mt-1"
        style={{ background: '#E8E4DD' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: 'var(--parent-accent)',
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

function prettyFunctionName(fn: string): string {
  // camelCase → Title Case with spaces
  return fn
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function Breakdown({ aggregate }: { aggregate: UsageAggregate }) {
  const topFunctions = aggregate.byFunction.slice(0, 8);
  const maxFnCost = topFunctions[0]?.costUsd ?? 0;
  const maxModelCost = aggregate.byModel[0]?.costUsd ?? 0;

  if (aggregate.totalCalls === 0) {
    return (
      <div className="text-sm italic py-4" style={{ color: 'var(--parent-text-light)' }}>
        No AI activity in this period.
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--parent-text-light)' }}>
          By Function
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--parent-border)' }}>
          {topFunctions.map((row) => (
            <BreakdownRow
              key={row.function}
              label={prettyFunctionName(row.function)}
              count={row.calls}
              cost={row.costUsd}
              maxCost={maxFnCost}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--parent-text-light)' }}>
          By Model
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--parent-border)' }}>
          {aggregate.byModel.map((row) => (
            <BreakdownRow
              key={row.model}
              label={row.model}
              count={row.calls}
              cost={row.costUsd}
              maxCost={maxModelCost}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type WindowKey = 'currentMonth' | 'last30Days' | 'last7Days' | 'today';

export default function AIUsageSection() {
  const { user } = useAuth();
  const { family } = useFamily();
  const { loading, error, today, last7Days, currentMonth, last30Days } = useAIUsage();

  // Optimistic override so saves are reflected before useFamily refetches.
  const [localBudget, setLocalBudget] = useState<BudgetConfig | null>(null);
  const budget: BudgetConfig = localBudget ?? family?.aiBudget ?? DEFAULT_BUDGET;

  const [draftLimit, setDraftLimit] = useState<string>(String(budget.monthlyLimitUsd));
  const [savingBudget, setSavingBudget] = useState(false);
  const [window, setWindow] = useState<WindowKey>('currentMonth');

  // Sync draft when the authoritative budget changes (e.g., family doc loaded).
  useEffect(() => {
    setDraftLimit(String(budget.monthlyLimitUsd));
  }, [budget.monthlyLimitUsd]);

  const activeAggregate: UsageAggregate = useMemo(() => {
    switch (window) {
      case 'today':
        return today;
      case 'last7Days':
        return last7Days;
      case 'last30Days':
        return last30Days;
      case 'currentMonth':
      default:
        return currentMonth;
    }
  }, [window, today, last7Days, currentMonth, last30Days]);

  const handleSaveBudget = useCallback(async () => {
    if (!user?.familyId) return;
    const parsed = Number(draftLimit);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSavingBudget(true);
    try {
      const next: BudgetConfig = {
        ...budget,
        monthlyLimitUsd: parsed,
        thresholds: budget.thresholds ?? DEFAULT_BUDGET.thresholds,
      };
      await updateDoc(doc(firestore, 'families', user.familyId), {
        aiBudget: next,
      });
      setLocalBudget(next);
    } catch (err) {
      console.error('Failed to save AI budget:', err);
    } finally {
      setSavingBudget(false);
    }
  }, [user?.familyId, draftLimit, budget]);

  return (
    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
      <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
        AI Usage & Cost
      </h2>

      <div className="parent-card p-6 space-y-6">
        <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
          Track your Claude API spend. Each chat, manual synthesis, and story generation
          consumes tokens — this panel shows where they go and keeps you under budget.
        </p>

        {/* Budget bar */}
        <div>
          <BudgetBar
            spent={currentMonth.totalCostUsd}
            limit={budget.monthlyLimitUsd}
            thresholds={budget.thresholds}
          />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Today"
            value={formatUsd(today.totalCostUsd)}
            sub={`${formatCount(today.totalCalls)} calls`}
          />
          <StatTile
            label="Last 7 Days"
            value={formatUsd(last7Days.totalCostUsd)}
            sub={`${formatCount(last7Days.totalCalls)} calls`}
          />
          <StatTile
            label="This Month"
            value={formatUsd(currentMonth.totalCostUsd)}
            sub={`${formatCount(currentMonth.totalCalls)} calls`}
          />
          <StatTile
            label="Last 30 Days"
            value={formatUsd(last30Days.totalCostUsd)}
            sub={`${formatCount(last30Days.totalCalls)} calls`}
          />
        </div>

        {/* Window tabs + breakdown */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(
              [
                ['currentMonth', 'This Month'],
                ['last30Days', 'Last 30 Days'],
                ['last7Days', 'Last 7 Days'],
                ['today', 'Today'],
              ] as Array<[WindowKey, string]>
            ).map(([key, label]) => {
              const isActive = window === key;
              return (
                <button
                  key={key}
                  onClick={() => setWindow(key)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: isActive ? 'var(--parent-accent)' : 'transparent',
                    color: isActive ? 'white' : 'var(--parent-text-light)',
                    border: `1px solid ${isActive ? 'var(--parent-accent)' : 'var(--parent-border)'}`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="text-sm italic py-4" style={{ color: 'var(--parent-text-light)' }}>
              Loading usage…
            </div>
          ) : error ? (
            <div
              className="text-sm p-3 rounded-lg"
              style={{ background: '#FEE2E2', color: '#991B1B' }}
            >
              {error}
            </div>
          ) : (
            <Breakdown aggregate={activeAggregate} />
          )}
        </div>

        {/* Budget config */}
        <div
          className="pt-5 border-t"
          style={{ borderColor: 'var(--parent-border)' }}
        >
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label
                className="block text-sm font-semibold mb-1"
                style={{ color: 'var(--parent-text)' }}
              >
                Monthly budget (USD)
              </label>
              <div className="text-xs mb-2" style={{ color: 'var(--parent-text-light)' }}>
                You&apos;ll be alerted at {budget.thresholds.map((t) => `${Math.round(t * 100)}%`).join(', ')} of this limit.
              </div>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--parent-text-light)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draftLimit}
                  onChange={(e) => setDraftLimit(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'white',
                    color: 'var(--parent-text)',
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleSaveBudget}
              disabled={
                savingBudget ||
                Number(draftLimit) === budget.monthlyLimitUsd ||
                !Number.isFinite(Number(draftLimit))
              }
              className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {savingBudget ? 'Saving…' : 'Save Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
