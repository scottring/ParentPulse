'use client';

import type { ReactNode } from 'react';

interface VolumeProps {
  masthead: ReactNode;
  children: ReactNode;
}

// The outer "paper" — press-volume is defined globally in globals.css.
// Masthead lives above the body; everything else flows inside the padded
// article. Both /journal and /workbook render through this shell so the
// magazine chrome stays consistent as we fork their content.
export default function Volume({ masthead, children }: VolumeProps) {
  return (
    <div className="press-volume mt-6 relative overflow-hidden">
      {masthead}
      <article className="magazine-body">{children}</article>

      <style jsx>{`
        .magazine-body {
          padding: 32px 40px 48px;
        }
        @media (max-width: 720px) {
          .magazine-body {
            padding: 24px 20px 36px;
          }
        }
      `}</style>
    </div>
  );
}
