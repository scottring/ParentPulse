'use client';

import { BookOpen } from 'lucide-react';
import { useWalkthrough } from './WalkthroughContext';

// ────────────────────────────────────────────────────────────
// WalkthroughTrigger
//
// A small floating help button anchored to the bottom-left of
// the viewport (the capture pen lives bottom-right). Tapping
// it launches the guided tour.
// ────────────────────────────────────────────────────────────

export default function WalkthroughTrigger() {
  const { isActive, start } = useWalkthrough();

  // Hidden while the tour is already running.
  if (isActive) return null;

  return (
    <button
      type="button"
      onClick={() => start(0)}
      aria-label="Start guided tour"
      className="fixed z-40 transition-all duration-300 hover:scale-105 active:scale-95"
      style={{
        bottom: 24,
        left: 24,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(247, 245, 240, 0.92)',
        backdropFilter: 'blur(12px)',
        boxShadow:
          '0 2px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        border: '1px solid rgba(120, 100, 70, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B6254',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <BookOpen size={16} strokeWidth={1.8} />
    </button>
  );
}
