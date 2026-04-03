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
  const [showSignIn, setShowSignIn] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #E8F4F8 0%, #FFF8E7 100%)' }}>
        <div className="w-12 h-12 border-4 border-[#7C9082]/20 border-t-[#7C9082] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #E8F4F8 0%, #FFF8E7 60%, #F5EDE3 100%)' }}>
        <div className="relative">

          {/* ── NAV BAR ── */}
          <nav
            className="relative z-20 flex items-center justify-between px-6 py-3"
            style={{
              background: 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(124,144,130,0.15)',
            }}
          >
            <Link href="/login" className="flex items-center gap-2">
              <svg width="22" height="20" viewBox="0 0 18 16" fill="none">
                <path d="M9 16L0.34 6.5C-1.5 4.5 0 1 3 0.5C5.5 0 7.5 1.5 9 3.5C10.5 1.5 12.5 0 15 0.5C18 1 19.5 4.5 17.66 6.5L9 16Z" fill="#7C9082" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '22px',
                  fontWeight: 400,
                  color: '#3A3530',
                }}
              >
                Relish
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSignIn(true)}
                className="px-4 py-2 rounded-full transition-colors duration-200"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#5C5347',
                }}
              >
                Log In
              </button>
              <Link
                href="/register"
                className="px-5 py-2 rounded-full transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  background: '#7C9082',
                  border: '1px solid rgba(124,144,130,0.6)',
                }}
              >
                Get Started
              </Link>
            </div>
          </nav>

          {/* ── BANNER ── */}
          <div className="relative" style={{ borderBottom: '1px solid rgba(124,144,130,0.15)' }}>
            <Image
              src="/relish banner 04b.png"
              alt="Relish -- The Operating Manual for Relationships"
              width={960}
              height={540}
              className="w-full h-auto block"
              style={{ filter: 'saturate(1.35) contrast(1.05)' }}
              priority
            />
            <div
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: 'linear-gradient(transparent, #F5EDE3)' }}
            />
          </div>

          {/* ── PAGE CONTENT ── */}
          <div className="relative z-10 px-6 sm:px-10 py-10 flex flex-col items-center">

            {/* HERO */}
            <section className="text-center mb-14 max-w-2xl">
              <h2
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(28px, 5vw, 44px)',
                  fontWeight: 400,
                  color: '#3A3530',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  marginBottom: '16px',
                }}
              >
                Every person you love<br />deserves to be understood.
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  color: '#5C5347',
                  lineHeight: 1.65,
                }}
              >
                Relish helps you build a living manual for each relationship&mdash;capturing
                how people see themselves <em>and</em> how others experience them.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-full transition-all duration-300 relative overflow-hidden group"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: '#7C9082',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    boxShadow: '0 4px 16px rgba(124,144,130,0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: '#6B7F72' }}
                  />
                  <span className="relative">Get Started Free</span>
                </Link>
                <button
                  onClick={() => setShowSignIn(true)}
                  className="px-8 py-3.5 rounded-full transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#5C5347',
                    border: '1px solid rgba(124,144,130,0.3)',
                    background: 'rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  Sign In
                </button>
              </div>
            </section>

            {/* FEATURES */}
            <section className="w-full max-w-3xl mb-14">
              <h3
                className="text-center mb-10"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '32px',
                  fontWeight: 400,
                  color: '#3A3530',
                }}
              >
                What Makes Relish Different
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Multiple Perspectives',
                    desc: 'You answer about yourself. Your partner, friends, and kids share what they see. The truth lives in the overlap.',
                  },
                  {
                    title: 'AI-Synthesized Manuals',
                    desc: 'Relish merges every perspective into a single, evolving document -- highlighting where you align and where you surprise each other.',
                  },
                  {
                    title: 'Growth, Not Grades',
                    desc: 'No scorecards. Relish tracks how your relationships grow over time and gently nudges you toward the things that matter.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl p-6 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(124,144,130,0.15)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    }}
                  >
                    <h4
                      className="mb-2"
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: '18px',
                        fontWeight: 400,
                        color: '#3A3530',
                      }}
                    >
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '14px',
                        color: '#5C5347',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>


            {/* FOOTER */}
            <footer
              className="w-full text-center pt-6 pb-4"
              style={{ borderTop: '1px solid rgba(124,144,130,0.15)' }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg width="16" height="14" viewBox="0 0 18 16" fill="none">
                  <path d="M9 16L0.34 6.5C-1.5 4.5 0 1 3 0.5C5.5 0 7.5 1.5 9 3.5C10.5 1.5 12.5 0 15 0.5C18 1 19.5 4.5 17.66 6.5L9 16Z" fill="#7C9082" fillOpacity="0.4" />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#8A8078',
                  }}
                >
                  Relish
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#8A8078' }}>
                Built for the people who matter most.
              </p>
            </footer>
          </div>
        </div>

      {/* ============ SIGN IN MODAL ============ */}
      {showSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowSignIn(false)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(58,53,48,0.5)', backdropFilter: 'blur(6px)' }} />
          <div
            className="relative w-full max-w-sm"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl p-7 sm:p-8 relative"
              style={{
                background: 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(124,144,130,0.2)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              <button
                onClick={() => setShowSignIn(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 z-10"
                style={{ color: '#8A8078' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <h3
                className="text-center mb-5"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '26px',
                  fontWeight: 400,
                  color: '#3A3530',
                }}
              >
                Welcome back
              </h3>

              {(error || authError) && (
                <div
                  className="mb-5 p-3.5 rounded-2xl"
                  style={{
                    background: 'rgba(220, 38, 38, 0.06)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                  }}
                >
                  <p className="text-sm text-red-800" style={{ fontFamily: 'var(--font-parent-body)' }}>{error || authError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-1.5 transition-colors duration-200"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '10px',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: focused === 'email' ? '#7C9082' : '#8A8078',
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      border: focused === 'email' ? '1px solid #7C9082' : '1px solid rgba(124,144,130,0.2)',
                      boxShadow: focused === 'email' ? '0 0 0 3px rgba(124,144,130,0.15)' : 'none',
                      color: '#3A3530',
                    }}
                    placeholder="you@example.com" autoComplete="email" disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block mb-1.5 transition-colors duration-200"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '10px',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: focused === 'password' ? '#7C9082' : '#8A8078',
                    }}
                  >
                    Password
                  </label>
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      border: focused === 'password' ? '1px solid #7C9082' : '1px solid rgba(124,144,130,0.2)',
                      boxShadow: focused === 'password' ? '0 0 0 3px rgba(124,144,130,0.15)' : 'none',
                      color: '#3A3530',
                    }}
                    placeholder="••••••••" autoComplete="current-password" disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: '#7C9082',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    boxShadow: '0 4px 16px rgba(124,144,130,0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: '#6B7F72' }}
                  />
                  <span className="relative">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </span>
                </button>
              </form>

              <p className="mt-5 text-center" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                New here?{' '}
                <Link href="/register" className="font-medium transition-colors duration-200 underline underline-offset-2" style={{ color: '#7C9082' }}>
                  Create your account
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
