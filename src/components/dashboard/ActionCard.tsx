'use client';

import { GrowthItem } from '@/types/growth';
import InstrumentBezel from './InstrumentBezel';

interface ActionCardProps {
  items: GrowthItem[];
  onReact?: (itemId: string, reaction: string) => void;
  onGenerate?: () => void;
  generating?: boolean;
}

export default function ActionCard({ items, onReact, onGenerate, generating }: ActionCardProps) {
  if (items.length === 0) {
    return (
      <InstrumentBezel title="NEXT MOVE">
        <div className="px-4 py-5 text-center">
          {onGenerate ? (
            <button
              onClick={onGenerate}
              disabled={generating}
              className="font-mono text-[11px] font-bold px-4 py-2 rounded transition-all disabled:opacity-30"
              style={{
                color: '#d97706',
                border: '1px solid rgba(217,119,6,0.3)',
                background: 'rgba(217,119,6,0.1)',
              }}
            >
              {generating ? 'GENERATING...' : 'GENERATE ACTIONS'}
            </button>
          ) : (
            <span
              className="font-mono text-[11px]"
              style={{ color: '#A3A3A3' }}
            >
              ALL CLEAR — NO ACTIONS RIGHT NOW
            </span>
          )}
        </div>
      </InstrumentBezel>
    );
  }

  return (
    <InstrumentBezel title="NEXT MOVE">
      <div className="divide-y divide-slate-200">
        {items.slice(0, 2).map((item) => (
          <div key={item.growthItemId} className="px-4 py-3">
            {/* Header */}
            <div className="flex items-start gap-2 mb-1">
              <span className="text-lg">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <h4
                  className="font-mono text-[12px] font-bold leading-tight"
                  style={{ color: '#2C2C2C' }}
                >
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="font-mono text-[9px] tracking-wider"
                    style={{ color: '#6B6B6B' }}
                  >
                    {item.speed === 'ambient' ? '⚡ TODAY' : '📋 THIS WEEK'}
                  </span>
                  <span
                    className="font-mono text-[9px]"
                    style={{ color: '#A3A3A3' }}
                  >
                    {item.estimatedMinutes}m
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <p
              className="font-mono text-[11px] leading-relaxed mt-1"
              style={{ color: '#6B6B6B' }}
            >
              {item.body}
            </p>

            {/* Quick reaction buttons */}
            {item.status !== 'completed' && onReact && (
              <div className="flex gap-1.5 mt-2">
                {[
                  { emoji: '❤️', key: 'loved_it' },
                  { emoji: '✅', key: 'tried_it' },
                  { emoji: '⏰', key: 'not_now' },
                  { emoji: '❌', key: 'doesnt_fit' },
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => onReact(item.growthItemId, r.key)}
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
          </div>
        ))}
      </div>
    </InstrumentBezel>
  );
}
