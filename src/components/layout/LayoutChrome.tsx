// src/components/layout/LayoutChrome.tsx
'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { TopChrome } from './TopChrome';
import { LeftRail } from './LeftRail';
import { shouldHideChrome } from './leftRailItems';

export function LayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const hidden = shouldHideChrome(pathname);

  const offsetStyle: CSSProperties = hidden
    ? { paddingLeft: 0, paddingTop: 0 }
    : {
        paddingLeft: 'var(--relish-rail-offset, 200px)',
        paddingTop: 'var(--relish-chrome-offset, 60px)',
      };

  return (
    <>
      <TopChrome />
      <LeftRail />
      <div style={offsetStyle}>{children}</div>
    </>
  );
}
