'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CaptureSheet from '@/components/capture/CaptureSheet';

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  if (!user) return null;
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || '';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Determine which page we're on for highlighting
  const onManual =
    pathname.startsWith('/manual') ||
    pathname.startsWith('/family-manual') ||
    /^\/people\/[^/]+\/manual/.test(pathname);
  const onJournal = pathname.startsWith('/journal');
  const onSurface = pathname.startsWith('/surface');
  const onRituals = pathname.startsWith('/rituals');

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-parent-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 16,
    color: '#3A3530',
    textDecoration: 'none',
    letterSpacing: '0.005em',
    opacity: active ? 0.5 : 1,
    pointerEvents: active ? 'none' as const : 'auto' as const,
  });

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-50"
        style={{
          top: 'var(--relish-top-offset, 0px)',
          height: 88,
          paddingTop: 20,
          background: '#ECEAE5',
          borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
          transition: 'top 180ms ease',
          boxSizing: 'content-box',
        }}
      >
        <div className="h-full px-4 sm:px-6 flex items-center justify-between mx-auto" style={{ maxWidth: 1440 }}>
          {/* Wordmark — always links home */}
          <Link
            href="/"
            className="hover:opacity-80 transition-opacity"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 34,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#3A3530',
              letterSpacing: '-0.015em',
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            Relish
          </Link>

          {/* Cross-nav: all main sections always visible */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <Link href="/journal" className="hover:opacity-70 transition-opacity" style={linkStyle(onJournal)}>
              The Journal
            </Link>
            <Link href="/manual" className="hover:opacity-70 transition-opacity" style={linkStyle(onManual)}>
              The Manual
            </Link>
            <Link href="/surface" className="hover:opacity-70 transition-opacity" style={linkStyle(onSurface)}>
              What&rsquo;s New
            </Link>
            <Link href="/rituals" className="hover:opacity-70 transition-opacity" style={linkStyle(onRituals)}>
              Rituals
            </Link>
          </div>

          {/* User indicator with dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#7C9082',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#5C5347',
                }}
              >
                {firstName}
              </span>
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 rounded-xl py-1 min-w-[140px]"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                }}
              >
                <Link
                  href="/settings"
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 transition-colors hover:bg-black/5"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: 13,
                    color: '#5C5347',
                    textDecoration: 'none',
                  }}
                >
                  Settings
                </Link>
                <div className="h-px mx-3 my-1" style={{ background: 'rgba(0,0,0,0.06)' }} />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 transition-colors hover:bg-black/5"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: 13,
                    color: '#6B6254',
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <CaptureSheet />
    </>
  );
}
