'use client';

import type { ReactNode } from 'react';

interface SurfaceLayoutProps {
  hero: ReactNode;
  grid: ReactNode;
  gridTileCount: number;
}

export function SurfaceLayout({ hero, grid, gridTileCount }: SurfaceLayoutProps) {
  const layoutMode =
    gridTileCount === 0
      ? 'full-width'
      : gridTileCount <= 2
        ? 'wide-hero'
        : 'standard';

  return (
    <div
      className={`surface-layout ${layoutMode}`}
      style={{
        display: 'grid',
        minHeight: 'calc(100vh - var(--relish-top-offset, 0px) - 88px)',
        ...(layoutMode === 'full-width'
          ? { gridTemplateColumns: '1fr' }
          : layoutMode === 'wide-hero'
            ? { gridTemplateColumns: '60% 1fr' }
            : { gridTemplateColumns: '40% 1fr' }),
      }}
    >
      <div className="surface-hero">{hero}</div>
      {grid && <div className="surface-grid overflow-y-auto">{grid}</div>}

      <style jsx>{`
        @media (max-width: 768px) {
          .surface-layout {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .surface-grid {
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
