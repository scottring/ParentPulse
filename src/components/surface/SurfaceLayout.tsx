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
        position: 'fixed',
        top: 'calc(var(--relish-top-offset, 0px) + 88px)',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'grid',
        gridTemplateColumns: gridCols,
        background: '#F5F0E8',
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
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            grid-template-columns: 1fr !important;
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
