'use client';
/* ================================================================
   Relish · Shell — PenHost
   Renders the global capture FAB. Hooks into the existing
   CaptureSheet component. Hidden on auth routes.
   ================================================================ */

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Pen } from '../controls';

export function PenHost({ hideOnRoutes = ['/', '/login', '/register'] }: { hideOnRoutes?: string[] } = {}) {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  if (hideOnRoutes.some((r) => pathname === r)) return null;

  // Emit a window event so the existing CaptureSheet can listen.
  // When Chunk 3 lands we'll wire directly into the sheet's store.
  const handle = () => {
    setOpen(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('relish:pen:open'));
    }
  };

  return <Pen onClick={handle} label={open ? 'Capture open' : 'Capture'} />;
}
