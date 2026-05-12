'use client';

import type { CSSProperties } from 'react';
import { PinKeypad } from '@/components/privacy/PinKeypad';

export interface BriefIdleLockProps {
  locked: boolean;
  warningActive: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
}

export function BriefIdleLock({ locked, warningActive, onUnlock }: BriefIdleLockProps) {
  if (!locked && !warningActive) return null;
  return (
    <>
      {warningActive && !locked && (
        <div role="status" aria-live="polite" style={warningStyle}>
          Locking soon — tap to stay
        </div>
      )}
      {locked && (
        <div role="dialog" aria-modal="true" style={overlayStyle}>
          <div style={panelStyle}>
            <p style={overlayEyebrowStyle}>Brief locked</p>
            <h2 style={overlayTitleStyle}>Re-enter your PIN to resume.</h2>
            <PinKeypad
              title="Enter your PIN"
              onSubmit={onUnlock}
            />
          </div>
        </div>
      )}
    </>
  );
}

const warningStyle: CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 80,
  padding: '10px 14px',
  background: 'var(--r-leather, #14100C)',
  color: 'var(--r-cream, #FAF8F3)',
  borderRadius: 999,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.18)',
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(20, 16, 12, 0.92)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const panelStyle: CSSProperties = {
  background: 'var(--r-cream, #FAF8F3)',
  borderRadius: 8,
  padding: '36px 40px',
  maxWidth: 360,
  width: '92%',
  textAlign: 'center',
};

const overlayEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 12px',
};

const overlayTitleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 24,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 22px',
};
