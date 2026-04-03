'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GrowthItem, DepthTier } from '@/types/growth';
import { EXERCISE_TYPES } from '@/config/exercise-types';

export interface NextStep {
  type: 'growth_item' | 'start_arc' | 'complete_portrait' | 'generate_items' | 'add_person' | 'analyze';
  title: string;
  body: string;
  emoji?: string;
  estimatedMinutes?: number;
  ctaLabel: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  growthItem?: GrowthItem;
}

interface NextStepCardProps {
  step: NextStep | null;
  onReact?: (itemId: string, reaction: string) => void;
  onSwapDepth?: (itemId: string, depth: DepthTier) => void;
  generating?: boolean;
}

const DEPTH_LABELS: Record<DepthTier, { label: string; color: string }> = {
  light: { label: 'Light', color: '#7C9082' },
  moderate: { label: 'Mod', color: '#65a30d' },
  deep: { label: 'Deep', color: '#16a34a' },
};

export function NextStepCard({ step, onReact, onSwapDepth, generating }: NextStepCardProps) {
  if (!step) return null;

  const item = step.growthItem;
  const exerciseType = item ? EXERCISE_TYPES[item.type] : null;

  return (
    <div
      className="rounded-2xl bg-white p-6 md:p-8"
      style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      {/* Header */}
      <p
        className="text-xs font-medium tracking-wide uppercase mb-4"
        style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', letterSpacing: '0.08em' }}
      >
        Your next step
      </p>

      {/* Depth toggle for growth items */}
      {item?.alternatives && onSwapDepth && (
        <div className="flex gap-1.5 mb-4">
          {(['light', 'moderate', 'deep'] as DepthTier[]).map((depth) => {
            const isActive = (item.depthTier || 'moderate') === depth;
            const hasAlt = depth === (item.depthTier || 'moderate') || item.alternatives?.[depth];
            const info = DEPTH_LABELS[depth];
            return (
              <button
                key={depth}
                onClick={() => onSwapDepth(item.growthItemId, depth)}
                disabled={!hasAlt}
                className="text-xs font-medium px-3 py-1 rounded-full transition-all disabled:opacity-20"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: isActive ? '#FFFFFF' : info.color,
                  background: isActive ? info.color : 'transparent',
                  border: `1px solid ${isActive ? info.color : info.color + '40'}`,
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex items-start gap-4">
        {step.emoji && (
          <span className="text-2xl shrink-0 mt-0.5">{step.emoji}</span>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-semibold leading-snug"
            style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
          >
            {step.title}
          </h3>

          {/* Metadata row */}
          {(step.estimatedMinutes || exerciseType) && (
            <div className="flex items-center gap-3 mt-1.5">
              {step.estimatedMinutes && (
                <span
                  className="text-xs"
                  style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
                >
                  {step.estimatedMinutes} min
                </span>
              )}
              {exerciseType && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: 'var(--parent-text-light)',
                    background: 'rgba(44,44,44,0.04)',
                  }}
                >
                  {exerciseType.label}
                </span>
              )}
            </div>
          )}

          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            {step.body}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step.ctaHref ? (
          <Link
            href={step.ctaHref}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
          >
            {step.ctaLabel}
          </Link>
        ) : step.ctaOnClick ? (
          <button
            onClick={step.ctaOnClick}
            disabled={generating}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
          >
            {generating ? 'Working...' : step.ctaLabel}
          </button>
        ) : null}

        {/* Quick reactions for growth items */}
        {item && item.status !== 'completed' && onReact && (
          <div className="flex gap-1.5">
            {[
              { emoji: '\u2764\ufe0f', key: 'loved_it', label: 'Loved it' },
              { emoji: '\u2705', key: 'tried_it', label: 'Tried it' },
              { emoji: '\u23f0', key: 'not_now', label: 'Not now' },
              { emoji: '\u274c', key: 'doesnt_fit', label: 'Doesn\u2019t fit' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => onReact(item.growthItemId, r.key)}
                className="px-2.5 py-1.5 rounded-lg text-sm transition-all hover:scale-105"
                style={{
                  background: 'rgba(44,44,44,0.04)',
                  border: '1px solid var(--parent-border)',
                }}
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
