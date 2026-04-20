'use client';
/* ================================================================
   Relish · Shell — ShellLayout
   Wraps app pages: TopNav on top, Pen floating, children below.
   Reads user from whatever AuthContext you pass via props so the
   design system stays decoupled from your auth internals.
   ================================================================ */

import type { ReactNode } from 'react';
import { PenHost } from './PenHost';

export interface ShellLayoutProps {
  children: ReactNode;
  userName?: string;        // kept for backwards compat; unused
  onSignOut?: () => void;   // kept for backwards compat; unused
  reversed?: boolean;
}

// TopNav is now mounted once at the root via GlobalNav, so this
// wrapper only styles the page shell and mounts the Pen. Two-nav
// duplication was the old world — see P0.1 in the flows audit.
export function ShellLayout({ children, reversed = false }: ShellLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: reversed ? 'var(--r-leather)' : 'var(--r-cream)',
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
      }}
      data-reversed={reversed ? 'true' : undefined}
    >
      <main style={{ paddingTop: 72 }}>{children}</main>
      <PenHost />
    </div>
  );
}
