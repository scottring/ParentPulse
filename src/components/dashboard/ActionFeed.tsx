'use client';

import Link from 'next/link';
import { ActionItem, ActionItemType } from '@/types/action-items';

interface Props {
  items: ActionItem[];
  onDismiss: (id: string) => void;
  maxItems?: number;
  dark?: boolean;
}

const TYPE_STYLES: Record<ActionItemType, { bg: string; border: string; icon: string }> = {
  missing_data:         { bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.15)',  icon: '?' },
  stale_data:           { bg: 'rgba(217,119,6,0.06)',   border: 'rgba(217,119,6,0.15)',   icon: '\u23F0' },
  synthesis_alert:      { bg: 'rgba(124,58,237,0.06)',  border: 'rgba(124,58,237,0.15)',  icon: '\u2728' },
  check_in_due:         { bg: 'rgba(22,163,74,0.06)',   border: 'rgba(22,163,74,0.15)',   icon: '\u2714' },
  contribution_request: { bg: 'rgba(212,165,116,0.08)', border: 'rgba(212,165,116,0.2)',  icon: '\u2709' },
  milestone:            { bg: 'rgba(234,179,8,0.06)',   border: 'rgba(234,179,8,0.15)',   icon: '\u2B50' },
};

export function ActionFeed({ items, onDismiss, maxItems = 5, dark }: Props) {
  const visible = items.slice(0, maxItems);
  if (visible.length === 0) return null;

  const textColor = dark ? 'rgba(255,255,255,0.95)' : '#3A3530';
  const textSecondary = dark ? 'rgba(255,255,255,0.5)' : '#7C7468';
  const textTertiary = dark ? 'rgba(255,255,255,0.35)' : 'rgba(40,40,40,0.3)';

  return (
    <div className="space-y-2">
      <span
        className="block mb-1"
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: textTertiary,
        }}
      >
        Needs attention
      </span>

      {visible.map((item) => {
        const style = TYPE_STYLES[item.type];
        return (
          <div
            key={item.id}
            className="glass-card rounded-xl p-4 transition-all"
            style={{ background: style.bg, border: `1px solid ${style.border}` }}
          >
            <div className="flex items-start gap-3">
              <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <h4
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: textColor,
                  }}
                >
                  {item.title}
                </h4>
                <p
                  className="mt-0.5"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    color: textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  {item.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Link
                    href={item.actionRoute}
                    className="text-[11px] font-medium px-3 py-1 rounded-full text-white hover:opacity-90 transition-opacity"
                    style={{ background: '#7C9082', fontFamily: 'var(--font-parent-body)' }}
                  >
                    Go &rarr;
                  </Link>
                  <button
                    onClick={() => onDismiss(item.id)}
                    className="text-[11px] hover:opacity-70 transition-opacity"
                    style={{ color: textSecondary, fontFamily: 'var(--font-parent-body)' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {items.length > maxItems && (
        <p
          className="text-center pt-1"
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: textSecondary }}
        >
          +{items.length - maxItems} more
        </p>
      )}
    </div>
  );
}
