'use client';

import AuraPhaseIndicator from '@/components/layout/AuraPhaseIndicator';
import type { AssessmentNeed } from '@/lib/assessment-needs-engine';

interface DeepenCardProps {
  need: AssessmentNeed;
  onStart: () => void;
  onDismiss: () => void;
}

export function DeepenCard({ need, onStart, onDismiss }: DeepenCardProps) {
  return (
    <div
      className="glass-card-strong p-5"
      style={{
        border: '1px solid rgba(15,110,86,0.2)',
        background: 'rgba(15,110,86,0.04)',
      }}
    >
      {/* Phase indicator */}
      <div className="mb-3">
        <AuraPhaseIndicator phase="assess" compact />
      </div>

      {/* Context message */}
      <h3
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: '16px',
          fontWeight: 500,
          color: 'var(--parent-text)',
          lineHeight: 1.35,
        }}
      >
        {need.contextMessage}
      </h3>

      {/* Subtitle */}
      <p
        className="mt-1"
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '12.5px',
          color: 'var(--parent-text-light)',
        }}
      >
        {need.promptCount} quick question{need.promptCount === 1 ? '' : 's'} &middot; ~2 minutes
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onStart}
          className="inline-flex items-center px-5 py-2 rounded-full text-[12.5px] font-medium text-white hover:opacity-90 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--aura-assess)',
          }}
        >
          Sharpen the picture
        </button>
        <button
          onClick={onDismiss}
          className="text-[12px] hover:opacity-70 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontWeight: 500,
            color: 'var(--parent-text-light)',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
