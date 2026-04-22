'use client';
/* ================================================================
   Relish · Shell — TopNav
   The persistent top chrome. Three rooms (Workbook · Manual ·
   Archive), wordmark home link, user menu. Settings lives in the
   user menu. The Pen is rendered separately by PenHost.
   ================================================================ */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Room = 'workbook' | 'manual' | 'archive';

function useActiveRoom(): Room | null {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/workbook') || pathname.startsWith('/journal')) return 'workbook';
  if (pathname.startsWith('/manual') || pathname.startsWith('/family-manual') || /^\/people\//.test(pathname)) return 'manual';
  if (pathname.startsWith('/archive') || pathname.startsWith('/reports') || pathname.startsWith('/surface')) return 'archive';
  return null;
}

export interface TopNavProps {
  userName?: string;
  onSignOut?: () => void;
  reversed?: boolean;      // dark-room variant
  hideOnRoutes?: string[]; // e.g. ['/', '/login', '/register']
}

export function TopNav({ userName, onSignOut, reversed = false, hideOnRoutes = ['/', '/login', '/register'] }: TopNavProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const active = useActiveRoom();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (hideOnRoutes.some((r) => pathname === r)) return null;

  const bg = reversed ? 'var(--r-leather)' : 'var(--r-cream-deep)';
  const borderBottom = reversed ? '1px solid var(--r-rule-reversed)' : '1px solid rgba(120,100,70,0.12)';
  const inkColor = reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)';
  const quietColor = reversed ? 'var(--r-text-reversed-3)' : 'var(--r-text-3)';

  const firstName = userName?.split(' ')[0] ?? '';

  return (
    <nav
      style={{
        position: 'fixed',
        top: 'var(--relish-top-offset, 0px)',
        left: 0,
        right: 0,
        height: 72,
        background: bg,
        borderBottom,
        zIndex: 50,
        transition: 'top 180ms ease, background 200ms ease',
      }}
      aria-label="Primary"
    >
      <div
        style={{
          height: '100%',
          maxWidth: 'var(--r-page-max)',
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          aria-label="Relish — home"
          style={{
            fontFamily: 'var(--r-serif)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 32,
            letterSpacing: '-0.015em',
            color: inkColor,
            textDecoration: 'none',
            lineHeight: 1,
          }}
        >
          Relish
        </Link>

        {/* Room tabs */}
        <div style={{ display: 'flex', gap: 40, alignItems: 'baseline' }}>
          <RoomLink room="workbook" href="/workbook" active={active === 'workbook'} reversed={reversed}>
            The Workbook
          </RoomLink>
          <RoomLink room="manual" href="/manual" active={active === 'manual'} reversed={reversed}>
            The Family Manual
          </RoomLink>
          <RoomLink room="archive" href="/archive" active={active === 'archive'} reversed={reversed}>
            The Archive
          </RoomLink>
        </div>

        {/* User */}
        {userName ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: 'var(--r-sans)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: quietColor,
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span
                aria-hidden
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--r-sage)' }}
              />
              {firstName}
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 10,
                  minWidth: 160,
                  background: reversed ? 'var(--r-leather-2)' : 'var(--r-paper)',
                  border: reversed ? '1px solid var(--r-rule-reversed)' : '1px solid var(--r-rule-4)',
                  borderRadius: 'var(--r-radius-3)',
                  boxShadow: 'var(--r-shadow-card)',
                  padding: '6px 0',
                  fontFamily: 'var(--r-sans)',
                }}
              >
                <MenuItem reversed={reversed} onClick={() => { setMenuOpen(false); router.push('/settings'); }}>Settings</MenuItem>
                <MenuItem reversed={reversed} onClick={() => { setMenuOpen(false); router.push('/rituals'); }}>Rituals</MenuItem>
                <MenuSep reversed={reversed} />
                <MenuItem reversed={reversed} onClick={() => { setMenuOpen(false); onSignOut?.(); }}>Log out</MenuItem>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
            <Link href="/login" style={authLink(quietColor)}>Sign in</Link>
            <Link href="/register" style={authLink(reversed ? 'var(--r-ember-soft)' : 'var(--r-ink)')}>
              Create an account <span aria-hidden style={{ marginLeft: 4 }}>⟶</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function RoomLink({
  href,
  children,
  active,
  reversed,
}: {
  room: Room;
  href: string;
  children: React.ReactNode;
  active: boolean;
  reversed: boolean;
}) {
  const color = reversed ? 'var(--r-ink-reversed)' : 'var(--r-ink)';
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        fontFamily: 'var(--r-serif)',
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: 18,
        letterSpacing: '-0.005em',
        color,
        textDecoration: 'none',
        position: 'relative',
        paddingBottom: 4,
        opacity: active ? 1 : 0.72,
        borderBottom: active
          ? `1px solid ${reversed ? 'var(--r-ember-soft)' : 'var(--r-ink)'}`
          : '1px solid transparent',
        transition: 'opacity var(--r-dur-quick) var(--r-ease-ink)',
      }}
    >
      {children}
    </Link>
  );
}

function MenuItem({ children, onClick, reversed }: { children: React.ReactNode; onClick: () => void; reversed: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 16px',
        fontSize: 13,
        color: reversed ? 'var(--r-text-reversed-2)' : 'var(--r-text-2)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = reversed ? 'rgba(245,236,216,0.08)' : 'var(--r-cream)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
function MenuSep({ reversed }: { reversed: boolean }) {
  return <div style={{ height: 1, background: reversed ? 'var(--r-rule-reversed)' : 'var(--r-rule-5)', margin: '4px 12px' }} />;
}
function authLink(color: string): CSSProperties {
  return {
    fontFamily: 'var(--r-serif)',
    fontStyle: 'italic',
    fontSize: 17,
    color,
    textDecoration: 'none',
  };
}
