'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-slate-800 shadow-[0_4px_0px_0px_rgba(0,0,0,0.1)]">
      {/* Corner accent brackets */}
      <div className="absolute top-0 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-600"></div>
      <div className="absolute top-0 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo - Relish brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/Relish-logo.png"
              alt="Relish - The Operating Manual for Relationships"
              width={50}
              height={50}
              className="object-contain"
              priority
            />
            <div className="hidden sm:block">
              <div className="font-mono text-xl font-bold text-slate-900 tracking-tight">
                Relish
              </div>
              <div className="font-mono text-xs text-slate-500 tracking-wider">
                The Operating Manual for Relationships
              </div>
            </div>
          </Link>

          {/* User Menu - Technical style */}
          <div className="flex items-center gap-4">
            {/* User info badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="font-mono text-xs text-slate-700 uppercase tracking-wide">
                {user.email}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-amber-600 transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Bottom detail line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent opacity-50"></div>
    </nav>
  );
}
