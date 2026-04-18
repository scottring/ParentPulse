'use client';
/* ================================================================
   Relish · Shell — ShellLayout
   Wraps app pages: TopNav on top, Pen floating, children below.
   Reads user from whatever AuthContext you pass via props so the
   design system stays decoupled from your auth internals.
   ================================================================ */

import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { PenHost } from './PenHost';

export interface ShellLayoutProps {
  children: ReactNode;
  userName?: string;
  onSignOut?: () => void;
  reversed?: boolean;
}

export function ShellLayout({ children, userName, onSignOut, reversed = false }: ShellLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: reversed ? 'var(--r-leather)' : 'var(--r-cream)',
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
      }}
      data-reversed={reversed ? 'true' : undefined}
    >
      <TopNav userName={userName} onSignOut={onSignOut} reversed={reversed} />
      <main style={{ paddingTop: 72 }}>{children}</main>
      <PenHost />
    </div>
  );
}
