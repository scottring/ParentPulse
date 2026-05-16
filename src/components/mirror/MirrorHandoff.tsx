'use client';

export function MirrorHandoff({
  nextLabel,
  onReady,
}: {
  nextLabel: string;
  onReady: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--parent-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        textAlign: 'center',
        zIndex: 50,
      }}
    >
      <p style={{ fontFamily: 'var(--font-parent-display)', fontSize: 26 }}>
        Hand the iPad to {nextLabel}.
      </p>
      <p style={{ color: 'var(--parent-text-light)' }}>
        The first answer is hidden. No peeking.
      </p>
      <button
        onClick={onReady}
        style={{
          padding: '14px 24px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--parent-accent)',
          color: '#fff',
          fontSize: 17,
        }}
      >
        I’m {nextLabel}. I’m ready.
      </button>
    </div>
  );
}
