'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, Target, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Left side - Technical manual hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-16 items-center justify-center border-r-4 border-slate-800">
        {/* Corner brackets */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
        <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-amber-600"></div>
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-amber-600"></div>

        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 max-w-lg">
          {/* Technical header */}
          <div className="mb-8 pb-4 border-b-2 border-slate-800">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
              SYSTEM ACCESS • VERSION 2.0
            </div>
            <div className="inline-block">
              <Image
                src="/relish banner 04b.png"
                alt="Relish - The Operating Manual for Relationships"
                width={380}
                height={140}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Technical specs list */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-slate-800 flex items-center justify-center shrink-0 border-2 border-amber-600">
                <Zap className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-1">MODULE 01</div>
                <div className="font-semibold mb-1">Triggers & Strategies</div>
                <div className="text-sm text-slate-600">
                  Document behavioral patterns and effective responses
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-slate-800 flex items-center justify-center shrink-0 border-2 border-amber-600">
                <Target className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-1">MODULE 02</div>
                <div className="font-semibold mb-1">Weekly Action Plans</div>
                <div className="text-sm text-slate-600">
                  AI-generated behavioral goals and tracking
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 bg-slate-800 flex items-center justify-center shrink-0 border-2 border-amber-600">
                <BarChart3 className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-1">MODULE 03</div>
                <div className="font-semibold mb-1">Pattern Analysis</div>
                <div className="text-sm text-slate-600">
                  Historical data and relationship insights
                </div>
              </div>
            </div>
          </div>

          {/* Technical footer */}
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wider pt-4 border-t border-slate-300">
            Operating Manual System • Confidential
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-16 relative">
        {/* Corner accents */}
        <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-amber-600"></div>
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-amber-600"></div>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mb-4 flex justify-center">
              <Image
                src="/Relish-logo.png"
                alt="Relish - The Operating Manual for Relationships"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider">
              Operating Manual System
            </div>
          </div>

          {/* Login card - Technical style */}
          <div className="bg-white border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 sm:p-10 relative">
            {/* Top corner detail */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-600"></div>

            {/* Header */}
            <div className="mb-6 pb-4 border-b-2 border-slate-800">
              <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-2">
                USER AUTHENTICATION
              </div>
              <h2 className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
                System Access
              </h2>
            </div>

            {(error || authError) && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-600">
                <div className="flex items-start gap-2">
                  <div className="text-red-600 font-bold">⚠</div>
                  <p className="text-sm font-mono text-red-900">{error || authError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-xs uppercase tracking-wider text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-800 bg-white font-mono text-sm focus:outline-none focus:border-amber-600 focus:shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] transition-all"
                  placeholder="user@example.com"
                  autoComplete="email"
                  disabled={loading}
                  data-testid="email-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block font-mono text-xs uppercase tracking-wider text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/reset-password-custom"
                    className="font-mono text-xs text-amber-600 hover:text-amber-700 uppercase tracking-wider"
                  >
                    Reset
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-800 bg-white font-mono text-sm focus:outline-none focus:border-amber-600 focus:shadow-[2px_2px_0px_0px_rgba(217,119,6,1)] transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  data-testid="password-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-800 text-white font-mono text-sm font-bold uppercase tracking-wider border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-600 hover:border-amber-600 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-8"
                data-testid="login-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </span>
                ) : (
                  '→ Initiate Login'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t-2 border-slate-800">
              <p className="text-center font-mono text-xs text-slate-600 uppercase tracking-wider">
                New User?{' '}
                <Link
                  href="/register"
                  className="text-amber-600 hover:text-amber-700 font-bold"
                >
                  Register Account →
                </Link>
              </p>
            </div>

            {/* Bottom corner detail */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-600"></div>
          </div>

          {/* Security notice */}
          <div className="mt-6 p-4 bg-white border-2 border-slate-300 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <p className="font-mono text-xs text-slate-600 uppercase tracking-wider">
                Secure Connection • Data Encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
