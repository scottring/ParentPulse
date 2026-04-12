'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BookOpenIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefixes: string[];
}

const mobileItems: NavItem[] = [
  { label: 'Home', href: '/', icon: HomeIcon, matchPrefixes: ['/'] },
  { label: 'Manual', href: '/family-manual', icon: BookOpenIcon, matchPrefixes: ['/family-manual', '/people'] },
  { label: 'Journal', href: '/journal', icon: PencilSquareIcon, matchPrefixes: ['/journal'] },
  { label: 'Workbook', href: '/workbook', icon: ArrowPathIcon, matchPrefixes: ['/workbook', '/checkin', '/deepen', '/growth', '/dashboard'] },
  { label: 'Reports', href: '/reports', icon: ClipboardDocumentListIcon, matchPrefixes: ['/reports'] },
];

export default function SideNav() {
  const pathname = usePathname();

  // Don't show on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return null;
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
        borderTop: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.04)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '8px',
      }}
    >
      {mobileItems.map((item) => {
        const isActive = item.matchPrefixes.some(
          (p) => pathname === p || pathname.startsWith(p + '/')
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-0"
          >
            <div style={{ color: isActive ? '#7C9082' : '#5C5347', opacity: isActive ? 1 : 0.45 }}>
              <item.icon className="w-[18px] h-[18px] shrink-0" />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#7C9082' : '#5C5347',
                opacity: isActive ? 1 : 0.5,
                letterSpacing: '0.02em',
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
