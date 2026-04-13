'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import {
  relishColor as C,
  relishFont as F,
  relishType as T,
  relishSpace as S,
  relishBorder as B,
  relishRadius as R,
} from './tokens';

// ================================================================
// Page shell
// ================================================================
export function RelishPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: C.cream, minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: S.pageMax,
          margin: '0 auto',
          padding: `0 ${S.pageGutter}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ================================================================
// Masthead — hero title + rule lines + byline
// ================================================================
export function RelishMasthead({
  title,
  byline,
}: {
  title: ReactNode;
  byline?: ReactNode;
}) {
  return (
    <header style={{ textAlign: 'center', padding: '64px 0 40px' }}>
      <div style={{ height: 1, background: C.edge, marginBottom: 28 }} />
      <h1
        style={{
          fontFamily: F.serif,
          fontSize: T.masthead,
          fontStyle: 'italic',
          color: C.ink,
          letterSpacing: '-0.02em',
          lineHeight: 0.95,
          margin: 0,
        }}
      >
        {title}
      </h1>
      {byline && (
        <p
          style={{
            fontFamily: F.serif,
            fontSize: T.kicker,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.32em',
            marginTop: 18,
          }}
        >
          {byline}
        </p>
      )}
      <div style={{ height: 1, background: C.edge, marginTop: 28 }} />
    </header>
  );
}

// ================================================================
// Small labeled headings
// ================================================================
export function RelishKicker({
  children,
  align = 'center',
}: {
  children: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <span
      style={{
        fontFamily: F.serif,
        fontSize: T.kicker,
        fontStyle: 'italic',
        color: C.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.26em',
        display: 'block',
        marginBottom: 18,
        textAlign: align,
      }}
    >
      {children}
    </span>
  );
}

export function RelishSectionHeading({
  children,
  align = 'center',
}: {
  children: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <h2
      style={{
        fontFamily: F.serif,
        fontStyle: 'italic',
        fontSize: T.sectionHeading,
        color: C.ink,
        textAlign: align,
        letterSpacing: '-0.01em',
        marginBottom: 28,
      }}
    >
      {children}
    </h2>
  );
}

// ================================================================
// Card surfaces
// ================================================================
export function RelishCard({
  children,
  padding = 28,
  style,
}: {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.paper,
        border: B.hairline,
        borderRadius: R.card,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function RelishBand({
  children,
  tone = 'sand',
  padding = 32,
}: {
  children: ReactNode;
  tone?: 'sand' | 'cream';
  padding?: number;
}) {
  return (
    <div
      style={{
        background: tone === 'sand' ? C.sand : C.cream,
        border: B.hairline,
        borderRadius: R.card,
        padding,
      }}
    >
      {children}
    </div>
  );
}

// ================================================================
// Inline link — italic serif w/ arrow
// ================================================================
export function RelishLink({
  href,
  children,
  center = false,
  size = 'md',
}: {
  href: string;
  children: ReactNode;
  center?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginTop: 20 }}>
      <Link
        href={href}
        style={{
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: size === 'sm' ? T.bodySmall : T.body,
          color: C.muted,
          textDecoration: 'none',
        }}
      >
        {children}
      </Link>
    </div>
  );
}

// ================================================================
// Pill — outlined action button
// ================================================================
export function RelishPill({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block',
        fontFamily: F.body,
        fontSize: T.bodySmall,
        color: C.ink,
        background: C.paper,
        border: `1px solid ${C.muted}`,
        borderRadius: R.pill,
        padding: '8px 20px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  );
}

// ================================================================
// Section wrapper
// ================================================================
export function RelishSection({
  children,
  marginBottom = S.section,
}: {
  children: ReactNode;
  marginBottom?: number;
}) {
  return <section style={{ marginBottom }}>{children}</section>;
}

// ================================================================
// Contributor chip — avatar + name/role/status
// ================================================================
export function RelishContributorChip({
  name,
  role,
  subline,
  status = 'done',
}: {
  name: string;
  role?: string;
  subline?: string;
  status?: 'done' | 'partial' | 'none';
}) {
  const color = status === 'done' ? C.sage : status === 'partial' ? C.gold : C.faint;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 22px 12px 12px',
        background: C.paper,
        border: B.hairline,
        borderRadius: R.pill,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 17,
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: T.body,
            color: C.ink,
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
        {role && (
          <div
            style={{
              fontFamily: F.body,
              fontSize: T.caption,
              color: C.muted,
              letterSpacing: '0.04em',
            }}
          >
            {role}
          </div>
        )}
        {subline && (
          <div
            style={{
              fontFamily: F.body,
              fontSize: T.caption,
              color: C.faint,
              marginTop: 2,
            }}
          >
            {subline}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Re-export tokens for consumers
// ================================================================
export { relishColor, relishFont, relishType, relishSpace, relishBorder, relishRadius } from './tokens';
