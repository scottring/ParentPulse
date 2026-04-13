'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  relishColor as C,
  relishFont as F,
  relishType as T,
  relishBorder as B,
} from './tokens';

type Status = 'aligned' | 'mixed' | 'attention' | 'empty';

export interface RelishChapterCardProps {
  href: string;
  title: string;                   // large italic — e.g. person first name or entry title
  chapterNumber?: number | string; // watermark + kicker
  kicker?: ReactNode;              // supplemental (e.g. "Ch. 01 · In alignment")
  status?: Status;                 // controls accent color (default derived from content)
  initials?: string;               // avatar override — if omitted, derived from title
  showAvatar?: boolean;            // default true
  lede: ReactNode;                 // body text — italic serif
  ctaLabel: string;                // e.g. "Read Ella's chapter"
  accentOverride?: string;         // force an accent color
}

export function RelishChapterCard({
  href,
  title,
  chapterNumber,
  kicker,
  status = 'mixed',
  initials,
  showAvatar = true,
  lede,
  ctaLabel,
  accentOverride,
}: RelishChapterCardProps) {
  const accent =
    accentOverride ??
    (status === 'aligned'
      ? C.sage
      : status === 'attention'
        ? C.coral
        : status === 'empty'
          ? C.faint
          : C.gold);

  const watermark =
    chapterNumber !== undefined
      ? typeof chapterNumber === 'number'
        ? String(chapterNumber).padStart(2, '0')
        : chapterNumber
      : null;

  const avatarInitials = initials ?? deriveInitials(title);

  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: C.paper,
        border: B.hairline,
        borderRadius: 16,
        padding: '24px 26px 20px',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 260,
        overflow: 'hidden',
      }}
      className="hover:shadow-sm"
    >
      {/* Top accent strip */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: accent,
          opacity: 0.85,
        }}
      />
      {/* Corner wash */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Watermark */}
      {watermark && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 18,
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 'clamp(72px, 7vw, 104px)',
            fontWeight: 300,
            color: accent,
            opacity: 0.1,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {watermark}
        </span>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
          position: 'relative',
        }}
      >
        {showAvatar && (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 0 0 4px ${accent}1A`,
            }}
          >
            <span
              style={{
                fontFamily: F.serif,
                fontStyle: 'italic',
                fontSize: 18,
                color: '#FFFFFF',
                letterSpacing: '0.05em',
              }}
            >
              {avatarInitials}
            </span>
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: F.serif,
              fontStyle: 'italic',
              fontSize: T.sectionHeading,
              color: C.ink,
              letterSpacing: '-0.01em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
          {kicker && (
            <div
              style={{
                fontFamily: F.serif,
                fontSize: T.caption,
                color: accent,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {kicker}
            </div>
          )}
        </div>
      </div>

      {/* Lede */}
      <div
        style={{
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: T.body,
          color: '#5F564B',
          lineHeight: 1.55,
          margin: 0,
          flex: 1,
          position: 'relative',
        }}
      >
        <span style={{ color: accent, marginRight: 8 }}>{'\u2014'}</span>
        {lede}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: B.soft,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: T.bodySmall,
            color: accent,
          }}
        >
          {ctaLabel}
        </span>
        <span
          style={{
            fontFamily: F.serif,
            fontSize: T.body,
            color: accent,
          }}
        >
          {'\u2192'}
        </span>
      </div>
    </Link>
  );
}

// ================================================================
// Grid wrapper for chapter cards
// ================================================================
export function RelishCardGrid({
  children,
  minWidth = 340,
  gap = 20,
}: {
  children: ReactNode;
  minWidth?: number;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
