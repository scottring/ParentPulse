// src/components/layout/LeftRail.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { LEFT_RAIL_ITEMS, shouldHideChrome } from './leftRailItems';

const RAIL_WIDTH_DESKTOP = 200;
const RAIL_WIDTH_MOBILE = 56;
const MOBILE_BREAKPOINT = 860;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LeftRail() {
  const pathname = usePathname() ?? '';
  if (shouldHideChrome(pathname)) return null;

  return (
    <>
      <nav style={railStyle} aria-label="Primary destinations">
        <div style={headerStyle} className="rail-header">
          <p style={headerTitleStyle} className="rail-label">Collections</p>
          <p style={headerSubtitleStyle} className="rail-label">Private Sanctuary</p>
        </div>
        <ul style={listStyle}>
          {LEFT_RAIL_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const showSeparatorBefore = item.key === 'archive';
            return (
              <li key={item.key}>
                {showSeparatorBefore && <hr style={sepStyle} aria-hidden />}
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  style={linkStyle(active)}
                  data-rail-item={item.key}
                >
                  <span className="rail-label">{item.label}</span>
                  {item.pinGated && (
                    <span aria-hidden style={{ marginLeft: 6, opacity: 0.6 }}>🔒</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div style={footerStyle}>
          <Link
            href="/?focus=write"
            style={newEntryStyle}
            data-rail-action="new-entry"
            aria-label="New entry"
          >
            <span className="rail-label">New Entry</span>
          </Link>
        </div>
      </nav>
      <style>{`
        @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
          nav[aria-label="Primary destinations"] {
            width: ${RAIL_WIDTH_MOBILE}px !important;
          }
          nav[aria-label="Primary destinations"] .rail-label {
            font-size: 9px !important;
            letter-spacing: 0.06em !important;
          }
          nav[aria-label="Primary destinations"] .rail-header {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </>
  );
}

const railStyle: CSSProperties = {
  position: 'fixed',
  top: 'var(--relish-top-offset, 60px)',
  left: 0,
  bottom: 0,
  width: RAIL_WIDTH_DESKTOP,
  borderRight: '1px solid rgba(120, 100, 70, 0.12)',
  background: 'var(--r-cream-deep, #F1EDEB)',
  padding: '24px 0',
  zIndex: 40,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: CSSProperties = {
  padding: '0 20px 16px',
  borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
  marginBottom: 12,
};

const headerTitleStyle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
  lineHeight: 1.1,
};

const headerSubtitleStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--r-text-5, #887C68)',
  margin: '4px 0 0',
};

const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0, flex: 1 };

const footerStyle: CSSProperties = {
  padding: '20px 20px 8px',
  marginTop: 'auto',
};

const newEntryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 16px',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#FBF8F2',
  background: '#14100C',
  border: '1px solid #14100C',
  borderRadius: 999,
  textDecoration: 'none',
  textAlign: 'center',
};

const sepStyle: CSSProperties = {
  border: 0,
  borderTop: '1px solid rgba(120, 100, 70, 0.12)',
  margin: '12px 16px',
};

function linkStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: active ? 'var(--r-ink, #2B2620)' : 'var(--r-text-3, #5C5347)',
    textDecoration: 'none',
    borderLeft: active ? '2px solid var(--r-leather, #14100C)' : '2px solid transparent',
  };
}
