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
  // When the user taps the Pen from a person's page (/people/[id]),
  // pass that personId so the sheet pre-selects them in the mentions
  // picker. Everywhere else we leave the payload empty — no
  // assumptions about context.
  const handle = () => {
    setOpen(true);
    if (typeof window === 'undefined') return;
    const personIdMatch = pathname.match(/^\/people\/([^/?#]+)$/);
    const mentionPersonIds = personIdMatch ? [personIdMatch[1]] : undefined;
    if (mentionPersonIds) {
      window.dispatchEvent(
        new CustomEvent('relish:open-capture', {
          detail: { mentionPersonIds },
        }),
      );
    } else {
      window.dispatchEvent(new CustomEvent('relish:pen:open'));
    }
  };

  return <Pen onClick={handle} label={open ? 'Capture open' : 'Capture'} />;
}
