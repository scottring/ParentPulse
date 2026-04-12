'use client';

import type { ReactNode } from 'react';

interface PrimaryRowProps {
  featured: ReactNode;
  aside?: ReactNode;
}

// The primary 2-column row below the masthead: a wide featured slot and
// an optional narrow aside (e.g. SideColumn). Responsive — collapses to
// a single column on tablet and below.
export default function PrimaryRow({ featured, aside }: PrimaryRowProps) {
  return (
    <div className="magazine-primary">
      <div className="magazine-featured-col">{featured}</div>
      {aside && <aside className="magazine-aside-col">{aside}</aside>}

      <style jsx>{`
        .magazine-primary {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
          gap: 56px;
          align-items: start;
        }
        .magazine-featured-col {
          min-width: 0;
        }
        .magazine-aside-col {
          min-width: 0;
          padding-left: 40px;
          border-left: 1px solid rgba(200, 190, 172, 0.45);
        }
        @media (max-width: 1024px) {
          .magazine-primary {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .magazine-aside-col {
            padding-left: 0;
            padding-top: 40px;
            border-left: 0;
            border-top: 1px solid rgba(200, 190, 172, 0.45);
          }
        }
        @media (max-width: 720px) {
          .magazine-primary {
            gap: 36px;
          }
          .magazine-aside-col {
            padding-top: 32px;
          }
        }
      `}</style>
    </div>
  );
}
