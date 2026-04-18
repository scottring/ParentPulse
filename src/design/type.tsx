'use client';
/* ================================================================
   Relish Design System — Type primitives
   Every typographic element in the app flows through these.
   Reference: TYPOGRAPHY.md + deck slides 17-18.
   ================================================================ */

import type { CSSProperties, ReactNode, ElementType } from 'react';

// ── Wordmark ──────────────────────────────────────────────────────
// The "Relish" mark in the nav and cover contexts. Italic serif, 300wt.
export function Wordmark({
  size = 34,
  reversed = false,
  as: As = 'span',
  style,
}: {
  size?: number;
  reversed?: boolean;
  as?: ElementType;
  style?: CSSProperties;
}) {
  return (
    <As
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: 'italic',
        fontWeight: 300,
        fontSize: size,
        letterSpacing: '-0.015em',
        lineHeight: 1,
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        ...style,
      }}
    >
      Relish
    </As>
  );
}

// ── Eyebrow / Kicker ──────────────────────────────────────────────
// Small-caps letterspacing above a title. e.g. "PART TWO · THE DIAGNOSIS"
export function Eyebrow({
  children,
  reversed = false,
  ornament = false,
  style,
}: {
  children: ReactNode;
  reversed?: boolean;
  ornament?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: ornament ? 'flex' : 'inline-block',
        alignItems: 'center',
        gap: 14,
        fontFamily: 'var(--r-sans)',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: reversed ? 'var(--r-text-reversed-3)' : 'var(--r-text-4)',
        ...style,
      }}
    >
      {ornament && (
        <span
          aria-hidden
          style={{
            width: 36,
            height: 1,
            background: reversed ? 'var(--r-text-reversed-3)' : 'var(--r-text-4)',
          }}
        />
      )}
      {children}
    </span>
  );
}

// ── Chapter label ─────────────────────────────────────────────────
// "I. In Progress" — section headings inside volumes.
export function Chapter({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: 'var(--r-sans)',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--r-text-3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Folio ─────────────────────────────────────────────────────────
// The page number. Italic serif, quiet.
export function Folio({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: 'italic',
        fontSize: 16,
        color: 'var(--r-text-5)',
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── Display 1 — the big chapter opener ────────────────────────────
// Used on cover, /workbook today-practice, /manual volume title pages.
export function Display1({
  children,
  as: As = 'h1',
  italic = true,
  reversed = false,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  italic?: boolean;
  reversed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <As
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 300,
        fontSize: 'var(--r-type-display-1)',
        lineHeight: 0.98,
        letterSpacing: '-0.015em',
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        margin: 0,
        textWrap: 'pretty' as CSSProperties['textWrap'],
        ...style,
      }}
    >
      {children}
    </As>
  );
}

// ── Display 2 — page titles ───────────────────────────────────────
export function Display2({
  children,
  as: As = 'h1',
  italic = true,
  reversed = false,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  italic?: boolean;
  reversed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <As
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 300,
        fontSize: 'var(--r-type-display-2)',
        lineHeight: 1.02,
        letterSpacing: '-0.01em',
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        margin: 0,
        textWrap: 'pretty' as CSSProperties['textWrap'],
        ...style,
      }}
    >
      {children}
    </As>
  );
}

// ── H1 / H2 ───────────────────────────────────────────────────────
export function H1({
  children,
  italic = true,
  reversed = false,
  style,
}: {
  children: ReactNode;
  italic?: boolean;
  reversed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <h2
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 400,
        fontSize: 'var(--r-type-h1)',
        lineHeight: 1.08,
        letterSpacing: '-0.005em',
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        margin: 0,
        textWrap: 'pretty' as CSSProperties['textWrap'],
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function H2({
  children,
  italic = true,
  reversed = false,
  style,
}: {
  children: ReactNode;
  italic?: boolean;
  reversed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <h3
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: 400,
        fontSize: 'var(--r-type-h2)',
        lineHeight: 1.15,
        color: reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)',
        margin: 0,
        textWrap: 'pretty' as CSSProperties['textWrap'],
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

// ── Lede ──────────────────────────────────────────────────────────
// The italic serif paragraph that sits under a title. Usually one sentence.
export function Lede({
  children,
  reversed = false,
  style,
}: {
  children: ReactNode;
  reversed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: 'italic',
        fontWeight: 300,
        fontSize: 'var(--r-type-lede)',
        lineHeight: 1.35,
        color: reversed ? 'var(--r-text-reversed-2)' : 'var(--r-text-2)',
        maxWidth: '44ch',
        margin: 0,
        textWrap: 'pretty' as CSSProperties['textWrap'],
        ...style,
      }}
    >
      {children}
    </p>
  );
}

// ── Body ──────────────────────────────────────────────────────────
export function Body({
  children,
  size = 'default',
  reversed = false,
  as: As = 'p',
  style,
}: {
  children: ReactNode;
  size?: 'default' | 'lg' | 'sm';
  reversed?: boolean;
  as?: ElementType;
  style?: CSSProperties;
}) {
  const fs =
    size === 'lg' ? 18 : size === 'sm' ? 15 : 'var(--r-type-body)';
  const lh = size === 'lg' ? 1.7 : 'var(--r-leading-body)';
  return (
    <As
      style={{
        fontFamily: 'var(--r-sans)',
        fontSize: fs,
        lineHeight: lh,
        color: reversed ? 'var(--r-text-reversed-2)' : 'var(--r-text-2)',
        maxWidth: '62ch',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </As>
  );
}

// ── Small — captions, meta, footnotes ─────────────────────────────
export function Small({
  children,
  reversed = false,
  as: As = 'span',
  style,
}: {
  children: ReactNode;
  reversed?: boolean;
  as?: ElementType;
  style?: CSSProperties;
}) {
  return (
    <As
      style={{
        fontFamily: 'var(--r-sans)',
        fontSize: 14,
        lineHeight: 1.55,
        color: reversed ? 'var(--r-text-reversed-4)' : 'var(--r-text-4)',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </As>
  );
}

// ── Drop cap ──────────────────────────────────────────────────────
// Wraps a paragraph whose first letter should drop three lines.
// Used on the Workbook's "today" card and volume openers.
export function DropCap({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      className="r-drop-cap"
      style={{
        fontFamily: 'var(--r-serif)',
        fontSize: 22,
        fontWeight: 400,
        lineHeight: 1.5,
        color: 'var(--r-ink)',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

// Name aliases so overlay consumers match the token spec
// (Display/BodySerif/Caption) against the canonical exports.
export const Display = Display1;
export const BodySerif = Body;
export const Caption = Small;
