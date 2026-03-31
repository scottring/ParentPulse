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
        background: '#FFFFFF',
        boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
        border: '2px solid #2C2C2C',
      }}
    >
      {title && (
        <div
          className="text-[10px] font-mono font-bold tracking-widest mb-2 px-1"
          style={{ color: '#6B6B6B' }}
        >
          {title}
        </div>
      )}
      <div
        className="rounded"
        style={{
          background: '#FAF8F5',
          border: '1px solid #E8E3DC',
        }}
      >
        {children}
      </div>
    </div>
  );
}
