'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { label: 'home', href: '/dashboard' },
  { label: 'people', href: '/people' },
  { label: 'workbook', href: '/workbook' },
  { label: 'check-in', href: '/checkin' },
  { label: 'reports', href: '/reports' },
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
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: 60,
        borderBottom: '1px solid rgba(124,100,77,0.08)',
      }}
    >
      <div className="h-full px-6 sm:px-8 flex items-center justify-between max-w-5xl mx-auto">
        {/* Wordmark */}
        <Link
          href="/dashboard"
          className="hover:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 19,
            fontWeight: 500,
            color: '#5C5347',
            letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}
        >
          relish
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: '0.04em',
                  color: '#5C5347',
                  opacity: isActive ? 1 : 0.45,
                  textDecoration: 'none',
                  paddingBottom: 4,
                  borderBottom: isActive ? '1.5px solid #7C9082' : '1.5px solid transparent',
                  transition: 'opacity 0.2s ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User indicator with dropdown */}
        <div className="hidden sm:block relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#7C9082',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 11,
                fontWeight: 400,
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
                  fontSize: 12,
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
                  fontSize: 12,
                  color: '#8A8078',
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
