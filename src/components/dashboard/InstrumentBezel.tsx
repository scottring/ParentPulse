'use client';

interface InstrumentBezelProps {
  title?: string;
  children: React.ReactNode;
  compact?: boolean;
}

export default function InstrumentBezel({ title, children, compact }: InstrumentBezelProps) {
  return (
    <div
      className={`rounded-lg ${compact ? 'p-2' : 'p-3'}`}
      style={{
        background: 'linear-gradient(145deg, #2a2a2a, #1e1e1e)',
        boxShadow: `
          inset 0 1px 2px rgba(255,255,255,0.08),
          inset 0 -1px 2px rgba(0,0,0,0.3),
          0 2px 8px rgba(0,0,0,0.3)
        `,
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {title && (
        <div
          className="text-[10px] font-mono font-bold tracking-widest mb-2 px-1"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {title}
        </div>
      )}
      <div
        className="rounded"
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.03)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
