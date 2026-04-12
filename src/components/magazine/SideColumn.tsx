'use client';

import type { ReactNode } from 'react';

interface SideColumnProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

// Section header + vertical list — the "Chapters in progress" side of
// the primary row. Renders inside PrimaryRow's aside slot; the border
// and padding live on PrimaryRow, not here.
export default function SideColumn({ eyebrow, title, children }: SideColumnProps) {
  return (
    <>
      <div className="side-header">
        <span className="side-eyebrow">{eyebrow}</span>
        <h2 className="side-title">{title}</h2>
      </div>
      <div className="side-list">{children}</div>

      <style jsx>{`
        .side-header {
          margin-bottom: 22px;
        }
        .side-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a7b5f;
          display: block;
          margin-bottom: 6px;
        }
        .side-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(26px, 3vw, 32px);
          color: #3a3530;
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.008em;
        }
        .side-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
      `}</style>
    </>
  );
}
