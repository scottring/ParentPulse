'use client';

import type { PrescriptionDraft } from '@/types/obstacle';

export interface PrescriptionCardProps {
  draft: PrescriptionDraft;
  busy?: boolean;
  onConfirm: () => void;
  onRefine: () => void;
  onNotYet: () => void;
}

const SHAPE_LABEL: Record<PrescriptionDraft['shape'], string> = {
  atomic: 'A single move',
  sequence: 'A short sequence',
  experiment: 'An experiment to try',
  'illustrated-story': 'A story to share',
};

export function PrescriptionCard({
  draft,
  busy,
  onConfirm,
  onRefine,
  onNotYet,
}: PrescriptionCardProps) {
  return (
    <aside
      role="region"
      aria-label="Proposed move"
      style={{
        marginTop: 32,
        padding: 24,
        border: '1px solid rgba(120,100,70,0.22)',
        borderRadius: 6,
        background: 'var(--r-paper, #FDFBF6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--r-text-5, #887C68)',
          margin: 0,
        }}
      >
        {SHAPE_LABEL[draft.shape]}
      </p>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 22,
          lineHeight: 1.4,
          color: 'var(--r-ink, #2B2620)',
          margin: 0,
        }}
      >
        {draft.body}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={primaryButton(busy)}
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onRefine}
          disabled={busy}
          style={secondaryButton(busy)}
        >
          Refine
        </button>
        <button
          type="button"
          onClick={onNotYet}
          disabled={busy}
          style={secondaryButton(busy)}
        >
          Not yet
        </button>
      </div>
    </aside>
  );
}

function primaryButton(disabled?: boolean) {
  return {
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: '#FBF8F2',
    background: disabled ? 'rgba(20,16,12,0.4)' : '#14100C',
    border: '1px solid currentColor',
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryButton(disabled?: boolean) {
  return {
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'var(--r-ink, #2B2620)',
    background: 'transparent',
    border: '1px solid rgba(120,100,70,0.4)',
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
