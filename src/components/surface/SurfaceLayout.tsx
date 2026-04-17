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

  const gridCols =
    layoutMode === 'full-width'
      ? '1fr'
      : layoutMode === 'wide-hero'
        ? '60% 1fr'
        : '40% 1fr';

  return (
    <div
      className={`surface-layout ${layoutMode}`}
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        height: 'calc(100vh - var(--relish-top-offset, 0px) - 88px)',
        overflow: 'hidden',
      }}
    >
      <div className="surface-hero" style={{ overflow: 'hidden' }}>{hero}</div>
      {grid && (
        <div className="surface-grid" style={{ overflowY: 'auto', padding: '16px' }}>
          {grid}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .surface-layout {
            grid-template-columns: 1fr !important;
            height: auto !important;
            overflow: visible !important;
          }
          .surface-hero {
            overflow: visible !important;
          }
          .surface-grid {
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
