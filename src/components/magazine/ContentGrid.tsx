'use client';

import type { ReactNode } from 'react';

export type ContentGridVariant = 'practices' | 'readings';

interface ContentGridProps {
  variant?: ContentGridVariant;
  children: ReactNode;
}

// "practices" — a 3-column borderline grid where cards sit snug with
// a rail on the top/right/bottom (the dense newsprint feel).
// "readings" — a 2-column gapped grid for bookplate-style cards that
// want air around them.
export default function ContentGrid({ variant = 'practices', children }: ContentGridProps) {
  return (
    <div className={`magazine-grid magazine-grid--${variant}`}>
      {children}

      <style jsx>{`
        .magazine-grid--practices {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(200, 190, 172, 0.35);
        }
        .magazine-grid--readings {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 32px;
        }
        @media (max-width: 1024px) {
          .magazine-grid--practices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .magazine-grid--practices {
            grid-template-columns: 1fr;
          }
          .magazine-grid--readings {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
      `}</style>
    </div>
  );
}
