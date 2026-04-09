'use client';

import { useState } from 'react';
import { GrowthItem, DepthTier } from '@/types/growth';
import { GrowthStage } from '@/types/growth-arc';
import { EXERCISE_TYPES } from '@/config/exercise-types';
import InstrumentBezel from './InstrumentBezel';

interface ActionCardProps {
  items: GrowthItem[];
  onReact?: (itemId: string, reaction: string) => void;
  onSwapDepth?: (itemId: string, depth: DepthTier) => void;
  onGenerate?: () => void;
  generating?: boolean;
  domainStage?: { domain: string; stage: GrowthStage } | null;
}

const DEPTH_LABELS: Record<DepthTier, { label: string; color: string }> = {
  light: { label: 'Light', color: '#7C9082' },
  moderate: { label: 'Mod', color: '#65a30d' },
  deep: { label: 'Deep', color: '#16a34a' },
};

const DOMAIN_LABELS: Record<string, string> = {
  self: 'SELF',
  couple: 'COUPLE',
  parent_child: 'PARENT',
};

const STAGE_LABELS: Record<GrowthStage, string> = {
  learning: 'LEARNING',
  growing: 'GROWING',
  mastering: 'MASTERING',
  assimilating: 'ASSIMILATING',
};

export default function ActionCard({
  items,
  onReact,
  onSwapDepth,
  onGenerate,
  generating,
  domainStage,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <InstrumentBezel title="NEXT MOVE">
        <div className="px-4 py-5 text-center">
          {onGenerate ? (
            <button
              onClick={onGenerate}
              disabled={generating}
              className="text-[11px] font-bold px-4 py-2 rounded transition-all disabled:opacity-30"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#7C9082',
                border: '1px solid rgba(124,144,130,0.3)',
                background: 'rgba(124,144,130,0.1)',
              }}
            >
              {generating ? 'GENERATING...' : 'GENERATE ACTIONS'}
            </button>
          ) : (
            <span
              className="text-[11px]"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
            >
              ALL CLEAR — NO ACTIONS RIGHT NOW
            </span>
          )}
        </div>
      </InstrumentBezel>
    );
  }

  const primaryItem = items[0];
  const remainingItems = items.slice(1);
  const exerciseType = EXERCISE_TYPES[primaryItem.type];

  return (
    <InstrumentBezel title="NEXT MOVE">
      <div className="px-4 py-3">
        {/* Domain + Stage label */}
        {domainStage && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#4A4238',
                background: 'rgba(44,44,44,0.04)',
                border: '1px solid #E8E3DC',
              }}
            >
              {DOMAIN_LABELS[domainStage.domain] || domainStage.domain.toUpperCase()}
            </span>
            <span
              className="text-[8px] tracking-widest"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
            >
              {STAGE_LABELS[domainStage.stage]}
            </span>
          </div>
        )}

        {/* Depth toggle */}
        {primaryItem.alternatives && onSwapDepth && (
          <div className="flex gap-1 mb-2.5">
            {(['light', 'moderate', 'deep'] as DepthTier[]).map((depth) => {
              const isActive = (primaryItem.depthTier || 'moderate') === depth;
              const hasAlt = depth === (primaryItem.depthTier || 'moderate') ||
                primaryItem.alternatives?.[depth];
              const info = DEPTH_LABELS[depth];

              return (
                <button
                  key={depth}
                  onClick={() => onSwapDepth(primaryItem.growthItemId, depth)}
                  disabled={!hasAlt}
                  className="text-[9px] font-bold px-2.5 py-1 rounded transition-all disabled:opacity-20"
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

        {/* Primary item */}
        <div className="flex items-start gap-2 mb-1">
          <span className="text-lg">{primaryItem.emoji}</span>
          <div className="flex-1 min-w-0">
            <h4
              className="text-[12px] font-bold leading-tight"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#2C2C2C' }}
            >
              {primaryItem.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[9px] tracking-wider"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#4A4238' }}
              >
                {primaryItem.speed === 'ambient' ? '⚡ TODAY' : '📋 THIS WEEK'}
              </span>
              <span
                className="text-[9px]"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
              >
                {primaryItem.estimatedMinutes}m
              </span>
              {exerciseType && (
                <span
                  className="text-[8px] tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: '#5F564B',
                    background: 'rgba(44,44,44,0.04)',
                  }}
                >
                  {exerciseType.label.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <p
          className="text-[11px] leading-relaxed mt-1"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#4A4238' }}
        >
          {primaryItem.body}
        </p>

        {/* Quick reaction buttons */}
        {primaryItem.status !== 'completed' && onReact && (
          <div className="flex gap-1.5 mt-2">
            {[
              { emoji: '❤️', key: 'loved_it' },
              { emoji: '✅', key: 'tried_it' },
              { emoji: '⏰', key: 'not_now' },
              { emoji: '❌', key: 'doesnt_fit' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => onReact(primaryItem.growthItemId, r.key)}
                className="px-2 py-1 rounded text-sm transition-all hover:scale-110"
                style={{
                  background: 'rgba(44,44,44,0.04)',
                  border: '1px solid #E8E3DC',
                }}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        {/* More available */}
        {remainingItems.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 pt-2 text-[9px] tracking-wider transition-colors"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#5F564B',
              borderTop: '1px dashed #E8E3DC',
            }}
          >
            {expanded
              ? '— hide —'
              : `┈ ${remainingItems.length} more available ┈`}
          </button>
        )}

        {/* Expanded items */}
        {expanded && remainingItems.map((item) => (
          <div
            key={item.growthItemId}
            className="mt-2 pt-2"
            style={{ borderTop: '1px solid #F0EBE4' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <h4
                  className="text-[11px] font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-parent-body)', color: '#2C2C2C' }}
                >
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[8px]"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
                  >
                    {item.estimatedMinutes}m
                  </span>
                  {EXERCISE_TYPES[item.type] && (
                    <span
                      className="text-[8px] tracking-wider"
                      style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
                    >
                      {EXERCISE_TYPES[item.type].label.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p
              className="text-[10px] leading-relaxed mt-1"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#9A9A9A' }}
            >
              {item.body}
            </p>
            {item.status !== 'completed' && onReact && (
              <div className="flex gap-1 mt-1.5">
                {[
                  { emoji: '❤️', key: 'loved_it' },
                  { emoji: '✅', key: 'tried_it' },
                  { emoji: '⏰', key: 'not_now' },
                  { emoji: '❌', key: 'doesnt_fit' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => onReact(item.growthItemId, r.key)}
                    className="px-1.5 py-0.5 rounded text-xs transition-all hover:scale-110"
                    style={{
                      background: 'rgba(44,44,44,0.04)',
                      border: '1px solid #E8E3DC',
                    }}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </InstrumentBezel>
  );
}
