'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen parent-page flex">
      {/* Left side - Welcome message with manual aesthetic */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-16 items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C9082] via-[#98B4A0] to-[#D4A574] opacity-10"></div>
        <div className="paper-texture absolute inset-0"></div>

        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <div className="mb-8">
            <div className="inline-block animate-float">
              <div className="text-8xl mb-4">📖</div>
            </div>
          </div>

          <h1 className="parent-heading text-6xl mb-6" style={{ color: 'var(--parent-accent)' }}>
            Relish
          </h1>

          <p className="text-2xl leading-relaxed mb-4" style={{ color: 'var(--parent-text)' }}>
            Operating manuals for the people you love
          </p>

          <p className="text-lg leading-relaxed mb-12" style={{ color: 'var(--parent-text-light)' }}>
            Create personalized guides to understand and support your children, spouse,
            friends, and family members. Think of it as an owner's manual for relationships.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚡</div>
              <div>
                <div className="font-semibold mb-1">Triggers & Strategies</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Document what causes stress and what actually works
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <div className="font-semibold mb-1">Weekly Goals</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  AI-generated action plans based on your manual
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <div className="font-semibold mb-1">Patterns & Insights</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Track progress and discover what makes each person unique
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-16">
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-5xl mb-3 animate-bounce-gentle">📖</div>
            <h1 className="parent-heading text-3xl" style={{ color: 'var(--parent-accent)' }}>
              Relish
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
              Operating manuals for the people you love
            </p>
          </div>

          {/* Login card */}
          <div className="parent-card p-8 sm:p-10 paper-texture">
            <h2 className="parent-heading text-3xl sm:text-4xl mb-2" style={{ color: 'var(--parent-text)' }}>
              Welcome back
            </h2>
            <p className="mb-8" style={{ color: 'var(--parent-text-light)' }}>
              Sign in to access your manuals
            </p>

            {(error || authError) && (
              <div
                className="mb-6 p-4 rounded-lg animate-fade-in-up"
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B'
                }}
              >
                <p className="text-sm font-medium">{error || authError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--parent-text)' }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                  data-testid="email-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                    style={{ color: 'var(--parent-text)' }}
                  >
                    Password
                  </label>
                  <Link
                    href="#"
                    className="text-sm font-medium hover:underline"
                    style={{ color: 'var(--parent-accent)' }}
                  >
                    Forgot?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                  data-testid="password-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  transform: loading ? 'scale(0.98)' : 'scale(1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#234946'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--parent-accent)'}
                data-testid="login-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--parent-border)' }}>
              <p className="text-center text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--parent-accent)' }}
                >
                  Create one now
                </Link>
              </p>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 text-center text-sm" style={{ color: 'var(--parent-text-light)' }}>
            <p>Your data is private and secure 🔒</p>
          </div>
        </div>
      </div>
    </div>
  );
}
