'use client';
/* ================================================================
   Relish Design System — Surfaces
   Card, Band, Rule, DottedList, Spread, Room
   ================================================================ */

import type { CSSProperties, ReactNode } from 'react';

// ── Card — the default paper-on-cream block ──────────────────────
export function Card({
  children,
  padding = 24,
  tone = 'paper',
  hairline = true,
  lift = false,
  style,
}: {
  children: ReactNode;
  padding?: number | string;
  tone?: 'paper' | 'cream' | 'warm' | 'leather';
  hairline?: boolean;
  lift?: boolean;
  style?: CSSProperties;
}) {
  const bg =
    tone === 'paper' ? 'var(--r-paper)'
    : tone === 'cream' ? 'var(--r-paper-soft)'
    : tone === 'warm' ? 'var(--r-cream-warm)'
    : 'var(--r-leather)';
  const borderColor =
    tone === 'leather' ? 'var(--r-rule-reversed)' : 'var(--r-rule-4)';
  return (
    <div
      style={{
        background: bg,
        border: hairline ? `1px solid ${borderColor}` : 'none',
        borderRadius: 'var(--r-radius-2)',
        padding,
        boxShadow: lift ? 'var(--r-shadow-card)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Band — full-width tinted section divider ─────────────────────
export function Band({
  children,
  tone = 'cream',
  padding = '40px 32px',
  style,
}: {
  children: ReactNode;
  tone?: 'cream' | 'paper' | 'warm';
  padding?: string | number;
  style?: CSSProperties;
}) {
  const bg =
    tone === 'cream' ? 'var(--r-cream)'
    : tone === 'paper' ? 'var(--r-paper-soft)'
    : 'var(--r-cream-warm)';
  return (
    <div
      style={{
        background: bg,
        borderTop: '1px solid var(--r-rule-5)',
        borderBottom: '1px solid var(--r-rule-5)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Rule — hairline, single / triple / asterism ──────────────────
export function Rule({
  variant = 'hairline',
  weight = 'default',
  reversed = false,
  style,
}: {
  variant?: 'hairline' | 'triple' | 'asterism' | 'fleuron';
  weight?: 'quiet' | 'default' | 'prominent';
  reversed?: boolean;
  style?: CSSProperties;
}) {
  const color = reversed
    ? 'var(--r-rule-reversed)'
    : weight === 'prominent' ? 'var(--r-rule-1)'
    : weight === 'quiet' ? 'var(--r-rule-5)'
    : 'var(--r-rule-3)';

  if (variant === 'hairline') {
    return <hr style={{ border: 0, height: 1, background: color, margin: 0, ...style }} />;
  }
  if (variant === 'triple') {
    return (
      <div style={{ position: 'relative', height: 11, margin: 0, ...style }} aria-hidden>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: color }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 5, height: 3, background: color }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: color }} />
      </div>
    );
  }
  if (variant === 'asterism') {
    return (
      <div
        aria-hidden
        style={{
          textAlign: 'center',
          fontFamily: 'var(--r-serif)',
          color,
          fontSize: 18,
          letterSpacing: '0.4em',
          lineHeight: 1,
          ...style,
        }}
      >
        ⁂
      </div>
    );
  }
  return (
    <div
      aria-hidden
      style={{
        textAlign: 'center',
        fontFamily: 'var(--r-serif)',
        color,
        fontSize: 22,
        lineHeight: 1,
        ...style,
      }}
    >
      ❦
    </div>
  );
}

// ── DottedList — the Archive's index with dotted leaders ─────────
// Layout: [roman] [title] ................. [page/date]
export function DottedList({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, ...style }}>{children}</ol>
  );
}

export function DottedListItem({
  index,
  title,
  trailing,
  href,
  onClick,
}: {
  index?: ReactNode;       // "i.", "ii.", etc.
  title: ReactNode;
  trailing?: ReactNode;    // page number or date
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: index ? 'auto 1fr auto' : '1fr auto',
        alignItems: 'baseline',
        gap: 14,
        padding: '12px 0',
        borderBottom: '1px dotted var(--r-rule-4)',
        fontFamily: 'var(--r-serif)',
        fontSize: 19,
        color: 'var(--r-ink)',
      }}
    >
      {index && (
        <span style={{ fontStyle: 'italic', color: 'var(--r-text-5)', minWidth: 32 }}>{index}</span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {trailing && (
        <span style={{ fontStyle: 'italic', color: 'var(--r-text-5)', fontSize: 15 }}>
          {trailing}
        </span>
      )}
    </div>
  );
  if (href) {
    return (
      <li>
        <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          {content}
        </a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button
          onClick={onClick}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'block',
            width: '100%',
          }}
        >
          {content}
        </button>
      </li>
    );
  }
  return <li>{content}</li>;
}

// ── PageSpread — two-page book spread with gutter ────────────────
// Use as the outer layout for /workbook, /manual (atlas+index),
// and any volume page that should feel like an open book.
//
// - On >= 1024px: side-by-side pages with a subtle gutter shadow
// - On < 1024px: stacked, no gutter.
//
// `ratio` controls the column split: 'even' (default), 'narrow-left' (1:2)
export function PageSpread({
  left,
  right,
  ratio = 'even',
  tone = 'paper',
  style,
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: 'even' | 'narrow-left' | 'wide-left';
  tone?: 'paper' | 'cream';
  style?: CSSProperties;
}) {
  const bg = tone === 'paper' ? 'var(--r-paper)' : 'var(--r-paper-soft)';
  const cols =
    ratio === 'narrow-left' ? '1fr 2fr'
    : ratio === 'wide-left' ? '2fr 1fr'
    : '1fr 1fr';
  return (
    <div
      className="r-spread"
      data-ratio={ratio}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: cols,
        background: bg,
        border: '1px solid var(--r-rule-5)',
        borderRadius: 'var(--r-radius-2)',
        boxShadow: 'var(--r-shadow-page)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ padding: '40px 48px' }}>{left}</div>
      <div style={{ padding: '40px 48px', background: 'var(--r-paper-soft)' }}>{right}</div>
      {/* gutter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: ratio === 'narrow-left' ? '33.333%' : ratio === 'wide-left' ? '66.666%' : '50%',
          width: 48,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          background:
            'linear-gradient(to right, transparent 0%, rgba(90,70,40,0.025) 40%, rgba(90,70,40,0.05) 50%, rgba(90,70,40,0.025) 60%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ── Room — the outermost container for a page (workbook/manual/archive) ──
// Sets the background tone + appropriate data attribute.
export function Room({
  children,
  name,
  tone = 'cream',
  style,
}: {
  children: ReactNode;
  name: 'workbook' | 'manual' | 'archive';
  tone?: 'cream' | 'leather';
  style?: CSSProperties;
}) {
  return (
    <div
      data-room={name}
      style={{
        background: tone === 'leather' ? 'var(--r-leather)' : 'var(--r-cream)',
        color: tone === 'leather' ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        minHeight: '100vh',
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: 'var(--r-page-max)',
          margin: '0 auto',
          padding: `0 var(--r-gutter)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
