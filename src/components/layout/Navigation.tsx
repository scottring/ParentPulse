'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { label: 'home', href: '/dashboard' },
  { label: 'people', href: '/people' },
  { label: 'workbook', href: '/workbook' },
  { label: 'check-in', href: '/checkin' },
];

export default function Navigation() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  // Don't show nav on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return null;
  }

  const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || '';

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

        {/* User indicator */}
        <div className="hidden sm:flex items-center gap-2">
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
        </div>

        {/* Mobile: just wordmark centered (handled by flex justify-between with hidden items) */}
      </div>
    </nav>
  );
}
