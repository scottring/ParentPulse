'use client';
/* ================================================================
   Relish Design System — Controls
   Button, Pill, TextLink, Pen (global capture FAB)
   ================================================================ */

import type { CSSProperties, ReactNode, MouseEvent } from 'react';

// ── Button — paper with hairline border, not a filled rectangle ──
export function Button({
  children,
  onClick,
  href,
  variant = 'default',
  size = 'md',
  reversed = false,
  disabled = false,
  style,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: (e: MouseEvent) => void;
  href?: string;
  variant?: 'default' | 'primary' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
  reversed?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  type?: 'button' | 'submit';
}) {
  const padding =
    size === 'sm' ? '6px 14px'
    : size === 'lg' ? '14px 26px'
    : '10px 20px';
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--r-sans)',
    fontSize,
    fontWeight: 500,
    letterSpacing: '0.005em',
    textDecoration: 'none',
    borderRadius: 'var(--r-radius-3)',
    padding,
    border: '1px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background var(--r-dur-quick) var(--r-ease-ink), color var(--r-dur-quick) var(--r-ease-ink)',
    whiteSpace: 'nowrap',
    ...style,
  };

  let variantStyle: CSSProperties;
  if (variant === 'primary') {
    variantStyle = {
      background: reversed ? 'var(--r-ember-soft)' : 'var(--r-ink)',
      color: reversed ? 'var(--r-leather)' : 'var(--r-paper)',
      borderColor: reversed ? 'var(--r-ember-soft)' : 'var(--r-ink)',
    };
  } else if (variant === 'quiet') {
    variantStyle = {
      background: 'transparent',
      color: reversed ? 'var(--r-text-reversed-2)' : 'var(--r-text-2)',
      borderColor: 'transparent',
    };
  } else {
    variantStyle = {
      background: reversed ? 'transparent' : 'var(--r-paper)',
      color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
      borderColor: reversed ? 'var(--r-rule-reversed)' : 'var(--r-rule-3)',
    };
  }

  const merged = { ...base, ...variantStyle };

  if (href) {
    return (
      <a href={href} style={merged}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={merged}>
      {children}
    </button>
  );
}

// ── Pill — tag / badge. Not a button. ───────────────────────────
export function Pill({
  children,
  tone = 'ink',
  style,
}: {
  children: ReactNode;
  tone?: 'ink' | 'sage' | 'ember' | 'burgundy' | 'amber';
  style?: CSSProperties;
}) {
  const bg =
    tone === 'sage' ? 'var(--r-tint-sage)'
    : tone === 'ember' ? 'var(--r-tint-ember)'
    : tone === 'burgundy' ? 'var(--r-tint-burgundy)'
    : tone === 'amber' ? 'var(--r-tint-amber)'
    : 'var(--r-tint-ink)';
  const fg =
    tone === 'sage' ? '#4F6554'
    : tone === 'ember' ? '#7E4516'
    : tone === 'burgundy' ? '#6D2F24'
    : tone === 'amber' ? '#6A5410'
    : 'var(--r-text-3)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--r-sans)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        padding: '6px 12px',
        borderRadius: 'var(--r-radius-pill)',
        background: bg,
        color: fg,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── TextLink — italic serif underline-on-hover ──────────────────
export function TextLink({
  children,
  href,
  onClick,
  italic = true,
  reversed = false,
  arrow = false,
  style,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  italic?: boolean;
  reversed?: boolean;
  arrow?: boolean;
  style?: CSSProperties;
}) {
  const common: CSSProperties = {
    fontFamily: italic ? 'var(--r-serif)' : 'var(--r-sans)',
    fontStyle: italic ? 'italic' : 'normal',
    fontSize: italic ? 19 : 15,
    fontWeight: italic ? 400 : 500,
    color: reversed ? 'var(--r-text-reversed-2)' : 'var(--r-text-2)',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    transition: 'border-color var(--r-dur-quick), color var(--r-dur-quick)',
    cursor: 'pointer',
    ...style,
  };
  const content = (
    <>
      {children}
      {arrow && <span aria-hidden style={{ marginLeft: 6 }}>⟶</span>}
    </>
  );
  if (href) {
    return (
      <a href={href} style={common} className="r-link">
        {content}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={{ ...common, background: 'none', border: 0, padding: 0 }} className="r-link">
      {content}
    </button>
  );
}

// ── Pen — the global capture FAB ────────────────────────────────
// Floating leather-and-ink circle, bottom-right, always available.
// Click opens the capture sheet (journal entry / observation / question).
export function Pen({
  onClick,
  label = 'Capture',
  style,
}: {
  onClick?: () => void;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'fixed',
        right: 32,
        bottom: 32,
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'var(--r-leather)',
        color: 'var(--r-ember-soft)',
        border: '1px solid var(--r-rule-reversed)',
        boxShadow: 'var(--r-shadow-pen)',
        fontFamily: 'var(--r-serif)',
        fontStyle: 'italic',
        fontSize: 28,
        lineHeight: 1,
        cursor: 'pointer',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform var(--r-dur-quick) var(--r-ease-ink)',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      ✎
    </button>
  );
}
