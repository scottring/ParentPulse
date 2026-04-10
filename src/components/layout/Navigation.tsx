'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CaptureSheet from '@/components/capture/CaptureSheet';

const navLinks = [
  { label: 'workbook', href: '/workbook', matchPrefixes: ['/workbook', '/dashboard', '/checkin', '/deepen'] },
  { label: 'family manual', href: '/family-manual', matchPrefixes: ['/family-manual', '/people'] },
  { label: 'reports', href: '/reports', matchPrefixes: ['/reports'] },
];

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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

  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
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

  return (
    <>
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: 64,
        background: '#ECEAE5',
        borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
      }}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between mx-auto" style={{ maxWidth: 1440 }}>
        {/* Wordmark — italic Cormorant, like a book's half-title */}
        <Link
          href="/workbook"
          className="hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 24,
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

        {/* Desktop nav links — italic Cormorant, like chapter entries */}
        <div className="hidden sm:flex items-center" style={{ gap: 32 }}>
          {navLinks.map((link) => {
            const isActive = link.matchPrefixes.some(
              (p) => pathname === p || pathname.startsWith(p + '/')
            );
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 15,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  letterSpacing: '0.005em',
                  color: isActive ? '#3A3530' : '#6B6254',
                  textDecoration: 'none',
                  paddingBottom: 3,
                  borderBottom: isActive ? '1px solid #3A3530' : '1px solid transparent',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User indicator with dropdown — italic name, small caps feel */}
        <div className="hidden sm:block relative" ref={menuRef}>
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
