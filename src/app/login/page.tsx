'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: '#FFF8F0' }}
    >
      {/* Ambient background rings — echoing the dashboard diagram */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '900px',
            height: '900px',
            border: '1px solid rgba(217, 119, 6, 0.06)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '700px',
            height: '700px',
            border: '1px solid rgba(217, 119, 6, 0.08)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            border: '1px solid rgba(217, 119, 6, 0.05)',
          }}
        />
        {/* Warm radial glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/relish banner 04b.png"
            alt="Relish"
            width={300}
            height={110}
            className="object-contain"
            priority
          />
        </div>

        {/* Tagline */}
        <p
          className="text-center mb-8"
          style={{
            fontFamily: 'var(--font-parent-heading)',
            fontSize: '15px',
            color: '#8B7B6B',
            letterSpacing: '0.04em',
          }}
        >
          The Operating Manual for Relationships
        </p>

        {/* Card */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 32px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(217, 119, 6, 0.12)',
          }}
        >
          {/* Error */}
          {(error || authError) && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{
                background: 'rgba(220, 38, 38, 0.06)',
                border: '1px solid rgba(220, 38, 38, 0.15)',
              }}
            >
              <p className="text-sm font-mono text-red-800">{error || authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs uppercase tracking-wider mb-2 transition-colors duration-200"
                style={{ color: focused === 'email' ? '#d97706' : '#9B8B7B' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                className="w-full px-4 py-3.5 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                style={{
                  backgroundColor: '#FAF5EE',
                  border: focused === 'email' ? '2px solid #d97706' : '2px solid #E8E3DC',
                  boxShadow: focused === 'email' ? '0 0 0 3px rgba(217, 119, 6, 0.1)' : 'none',
                  color: '#2C2C2C',
                }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs uppercase tracking-wider mb-2 transition-colors duration-200"
                style={{ color: focused === 'password' ? '#d97706' : '#9B8B7B' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                className="w-full px-4 py-3.5 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                style={{
                  backgroundColor: '#FAF5EE',
                  border: focused === 'password' ? '2px solid #d97706' : '2px solid #E8E3DC',
                  boxShadow: focused === 'password' ? '0 0 0 3px rgba(217, 119, 6, 0.1)' : 'none',
                  color: '#2C2C2C',
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-mono text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                boxShadow: '0 2px 12px rgba(30, 41, 59, 0.2)',
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                }}
              />
              <span className="relative">
                {loading ? 'Signing in...' : 'Sign In'}
              </span>
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-8 text-center" style={{ fontFamily: 'var(--font-parent-heading)', fontSize: '14px', color: '#8B7B6B' }}>
          New here?{' '}
          <Link href="/register" className="font-bold transition-colors duration-200" style={{ color: '#d97706' }}>
            Create your account
          </Link>
        </p>

        {/* Bottom decorative line */}
        <div className="flex items-center justify-center mt-8 gap-3">
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.3))' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(217, 119, 6, 0.3)' }} />
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.3), transparent)' }} />
        </div>
      </div>
    </div>
  );
}
