'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
  { label: 'Household', href: '/household', icon: HomeModernIcon },
  { label: 'People', href: '/people', icon: UsersIcon },
  { label: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function SideNav() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't show sidenav on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    return null;
  }

  return (
    <>
      {/* Desktop Sidenav */}
      <aside
        className={`hidden lg:block fixed left-0 top-20 bottom-0 bg-white border-r-4 border-slate-800 transition-all duration-300 z-40 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-600"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-600"></div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-slate-800 border-2 border-amber-600 text-white flex items-center justify-center hover:bg-amber-600 transition-colors z-50"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-xs">{isCollapsed ? '→' : '←'}</span>
        </button>

        {/* Navigation header */}
        <div className="p-6 border-b-2 border-slate-200">
          {!isCollapsed && (
            <div className="space-y-1">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                NAVIGATION
              </div>
              <div className="font-mono text-sm font-bold text-slate-900">
                Main Menu
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="text-center">
              <div className="font-mono text-xs text-slate-500">≡</div>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="p-4 space-y-2">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative block transition-all group
                  ${isCollapsed ? 'p-3' : 'p-4'}
                  ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                  }
                  border-2 border-slate-300
                  ${isActive ? 'border-amber-600' : 'hover:border-slate-400'}
                `}
              >
                {/* Item number badge */}
                <div
                  className={`
                    absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center border
                    font-mono text-xs font-bold
                    ${
                      isActive
                        ? 'bg-amber-600 text-white border-slate-800'
                        : 'bg-slate-800 text-white border-slate-600'
                    }
                  `}
                >
                  {index + 1}
                </div>

                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-700'}`} />
                  {!isCollapsed && (
                    <div className="flex-1">
                      <div className={`font-mono text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {item.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* Active indicator line */}
                {isActive && !isCollapsed && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-600"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom detail */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-30"></div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-14 h-14 bg-slate-800 border-4 border-amber-600 text-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-600 transition-all"
        >
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Mobile Overlay Menu */}
      {!isCollapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsCollapsed(true)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l-4 border-slate-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6 pb-4 border-b-2 border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                    NAVIGATION
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900">
                    Main Menu
                  </div>
                </div>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="w-8 h-8 bg-slate-800 text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mobile nav items */}
            <nav className="space-y-3">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsCollapsed(true)}
                    className={`
                      relative block p-4 transition-all
                      ${
                        isActive
                          ? 'bg-slate-800 text-white shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]'
                      }
                      border-2 border-slate-300
                      ${isActive ? 'border-amber-600' : 'hover:border-slate-400'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          w-8 h-8 flex items-center justify-center border
                          font-mono text-xs font-bold
                          ${
                            isActive
                              ? 'bg-amber-600 text-white border-slate-800'
                              : 'bg-slate-800 text-white border-slate-600'
                          }
                        `}
                      >
                        {index + 1}
                      </div>
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-700'}`} />
                      <div className="flex-1">
                        <div className={`font-mono text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
