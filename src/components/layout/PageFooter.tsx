'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';

// Short persistent footer identifying the current family + publication.
// Format: "The {Family Name} · {Book Name}"
// Hidden on unauthenticated routes.

const HIDDEN_PATHS = ['/', '/login', '/register'];

function bookNameForPath(pathname: string): string | null {
  if (
    pathname.startsWith('/manual') ||
    pathname.startsWith('/family-manual') ||
    /^\/people\/[^/]+\/manual/.test(pathname)
  ) {
    return 'Family Manual';
  }
  if (pathname.startsWith('/journal')) return 'Journal';
  if (pathname.startsWith('/workbook')) return 'Workbook';
  if (pathname.startsWith('/people')) return 'People';
  return null;
}

export default function PageFooter() {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const { family } = useFamily();

  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (!user) return null;

  const bookName = bookNameForPath(pathname);
  const familyName = family?.name?.trim();

  // If we can't identify a book, don't render — a half-labeled footer
  // is worse than none.
  if (!bookName) return null;

  return (
    <footer
      role="contentinfo"
      style={{
        padding: '10px 16px 14px',
        textAlign: 'center',
        fontFamily: 'var(--font-parent-display)',
        fontStyle: 'italic',
        fontSize: 12,
        color: '#8a7b5f',
        letterSpacing: '0.04em',
        opacity: 0.85,
      }}
    >
      {familyName ? `The ${familyName} Family` : 'Relish'}
      <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
      <span style={{ color: '#3A3530' }}>{bookName}</span>
    </footer>
  );
}
