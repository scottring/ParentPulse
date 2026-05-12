// src/components/layout/TopChrome.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIncomingFlags } from '@/hooks/useIncomingFlags';
import { shouldHideChrome } from './leftRailItems';

export function TopChrome() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, logout } = useAuth();
  const { flags } = useIncomingFlags();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openFlagCount = flags.length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (shouldHideChrome(pathname)) return null;
  if (!user) return null;

  const first = user.name?.split(' ')[0] ?? '';

  const handleSignOut = async () => {
    setMenuOpen(false);
    try { await logout(); } catch (e) { console.warn('logout failed', e); }
    router.push('/login');
  };

  return (
    <header style={chromeStyle} aria-label="Top chrome">
      <Link href="/" style={wordmarkStyle} aria-label="Relish — home">Relish</Link>
      <span style={{ flex: 1 }} aria-hidden />
      {openFlagCount > 0 && (
        <Link
          href="/"
          style={flagBellStyle}
          aria-label={`${openFlagCount} flagged for you`}
        >
          <span aria-hidden style={flagGlyphStyle}>⚑</span>
          <span aria-hidden style={dotStyle} />
          {openFlagCount > 1 && <span style={countStyle}>{openFlagCount}</span>}
        </Link>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={pipButtonStyle}
        >
          <span aria-hidden style={pipDotStyle} />
          {first}
        </button>
        {menuOpen && (
          <div role="menu" style={menuStyle}>
            <button
              role="menuitem"
              type="button"
              onClick={() => { setMenuOpen(false); router.push('/settings'); }}
              style={menuItemStyle}
            >
              Settings
            </button>
            <hr style={{ border: 0, borderTop: '1px solid rgba(120,100,70,0.12)', margin: '4px 8px' }} aria-hidden />
            <button
              role="menuitem"
              type="button"
              onClick={handleSignOut}
              style={{ ...menuItemStyle, color: '#8C4A3E', fontWeight: 600 }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const chromeStyle: CSSProperties = {
  position: 'fixed',
  top: 'var(--relish-top-offset, 0px)',
  left: 0,
  right: 0,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  padding: '0 28px',
  background: 'var(--r-cream-deep, #F1EDEB)',
  borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
  zIndex: 50,
};

const wordmarkStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 300,
  fontSize: 26,
  letterSpacing: '-0.012em',
  color: 'var(--r-ink, #2B2620)',
  textDecoration: 'none',
};

const pipButtonStyle: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-3, #5C5347)',
};

const pipDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--r-sage, #7C9082)',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 8px)',
  minWidth: 160,
  background: 'var(--r-paper, #FDFBF6)',
  border: '1px solid rgba(120,100,70,0.18)',
  borderRadius: 6,
  boxShadow: '0 4px 18px rgba(60,50,40,0.12)',
  padding: 4,
  zIndex: 60,
};

const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  border: 'none',
  background: 'transparent',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 13,
  color: 'var(--r-text-2, #3A3530)',
};

const flagBellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  width: 32,
  height: 32,
  marginRight: 12,
  textDecoration: 'none',
  cursor: 'pointer',
};

const flagGlyphStyle: CSSProperties = {
  fontSize: 20,
  color: 'var(--r-accent, #6a4b2a)',
  lineHeight: 1,
};

const dotStyle: CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 2,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--r-coral, #b65f3a)',
};

const countStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: -4,
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--r-paper, #FDFBF6)',
  background: 'var(--r-coral, #b65f3a)',
  borderRadius: '50%',
  width: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
