'use client';

interface DinnerPromptTileProps {
  prompt: string;
}

export function DinnerPromptTile({ prompt }: DinnerPromptTileProps) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#3A3530' }}>
      <p
        className="text-[10px] uppercase tracking-[0.12em] mb-1"
        style={{ color: '#8BAF8E' }}
      >
        Tonight at dinner
      </p>
      <p
        className="text-sm leading-snug italic"
        style={{ color: '#F5F0E8' }}
      >
        {prompt}
      </p>
    </div>
  );
}
