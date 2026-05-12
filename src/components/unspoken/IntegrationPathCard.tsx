'use client';

import type { CSSProperties } from 'react';

export interface IntegrationPathSlot {
  label: string;     // e.g., "Next session" or "Upcoming ritual"
  value: string;     // e.g., "Oct 28 · 10:00 AM" or "Full Moon Reflection"
}

export function IntegrationPathCard({ slots }: { slots: IntegrationPathSlot[] }) {
  return (
    <section style={cardStyle} aria-label="Integration path">
      <p style={eyebrowStyle}>Integration Path</p>
      <p style={bodyStyle}>
        Your unspoken words are held here until you choose to bring them forward.
        They wait — without pressure — for the next ritual, session, or moment of
        readiness.
      </p>
      {slots.length > 0 && (
        <div style={slotRowStyle}>
          {slots.map((s, i) => (
            <div key={i} style={slotStyle}>
              <span style={slotLabelStyle}>{s.label}</span>
              <span style={slotValueStyle}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const cardStyle: CSSProperties = { background: 'var(--r-leather, #14100C)', color: 'var(--r-cream, #FAF8F3)', borderRadius: 8, padding: '24px 28px', margin: '32px 0' };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250, 248, 243, 0.72)', margin: '0 0 12px' };
const bodyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 15, lineHeight: 1.55, color: 'rgba(250, 248, 243, 0.88)', margin: '0 0 18px', maxWidth: '52ch' };
const slotRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 };
const slotStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const slotLabelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250, 248, 243, 0.6)' };
const slotValueStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--r-cream, #FAF8F3)' };
