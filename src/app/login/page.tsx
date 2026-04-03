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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(170deg, #FAF6F0 0%, #F0E8DD 30%, #E2D9CC 60%, #C8CFC5 100%)' }}
      >
        <div className="w-12 h-12 border-4 border-[#7C9082]/20 border-t-[#7C9082] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #FAF6F0 0%, #F0E8DD 30%, #E2D9CC 60%, #C8CFC5 100%)',
      }}
    >
      {/* Paper texture overlay */}
      <div className="paper-texture fixed inset-0 pointer-events-none" />

      <div className="relative">
        {/* ── NAV BAR ── */}
        <nav
          className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4"
          style={{ borderBottom: '1px solid rgba(124,100,77,0.06)' }}
        >
          <Link href="/login" className="flex items-center gap-3">
            <Image
              src="/relish-logo-new.png"
              alt="Relish"
              width={44}
              height={30}
              className="object-contain"
            />
            <span
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '20px',
                fontWeight: 500,
                color: '#3A3530',
                letterSpacing: '-0.01em',
              }}
            >
              relish
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSignIn(true)}
              className="px-5 py-2 rounded-full transition-all duration-200 hover:bg-white/30"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: '#5C5347',
              }}
            >
              Log In
            </button>
            <Link
              href="/register"
              className="px-6 py-2 rounded-full transition-all duration-200 hover:shadow-lg"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                background: '#7C9082',
              }}
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* ── HERO SECTION ── */}
        <div className="relative z-10 px-6 sm:px-10 flex flex-col items-center">
          <section className="text-center pt-16 sm:pt-24 pb-16 max-w-2xl mx-auto">
            {/* Logo hero */}
            <div
              className="mb-10 flex justify-center animate-fade-in-up"
            >
              <Image
                src="/relish-logo-new.png"
                alt="Relish — The relationship weather station"
                width={220}
                height={150}
                className="object-contain"
                style={{
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.06))',
                }}
                priority
              />
            </div>

            <h1
              className="animate-fade-in-up"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 'clamp(32px, 6vw, 52px)',
                fontWeight: 300,
                color: '#3A3530',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginBottom: '20px',
                animationDelay: '0.1s',
                animationFillMode: 'both',
              }}
            >
              Every person you love<br />
              <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#5C5347' }}>
                deserves to be understood.
              </em>
            </h1>

            <p
              className="animate-fade-in-up"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 'clamp(14px, 2vw, 17px)',
                color: '#5C5347',
                lineHeight: 1.7,
                maxWidth: '460px',
                margin: '0 auto',
                animationDelay: '0.2s',
                animationFillMode: 'both',
              }}
            >
              Relish helps you build a living manual for each relationship&mdash;capturing
              how people see themselves <em>and</em> how others experience them.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <Link
                href="/register"
                className="px-10 py-4 rounded-full transition-all duration-300 hover:shadow-xl hover:translate-y-[-1px]"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: '#7C9082',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 20px rgba(124,144,130,0.3)',
                }}
              >
                Get Started Free
              </Link>
              <button
                onClick={() => setShowSignIn(true)}
                className="px-10 py-4 rounded-full transition-all duration-200 hover:bg-white/40"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#5C5347',
                  border: '1px solid rgba(124,144,130,0.25)',
                  background: 'rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Sign In
              </button>
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section className="w-full max-w-3xl mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'Multiple Perspectives',
                  desc: 'You answer about yourself. Your partner, friends, and kids share what they see. The truth lives in the overlap.',
                  icon: '◈',
                },
                {
                  title: 'AI-Synthesized Manuals',
                  desc: 'Relish merges every perspective into a single, evolving document\u2014highlighting where you align and where you surprise each other.',
                  icon: '◉',
                },
                {
                  title: 'Growth, Not Grades',
                  desc: 'No scorecards. Relish tracks how your relationships grow over time and gently nudges you toward the things that matter.',
                  icon: '◎',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="glass-card rounded-2xl p-7 text-center weather-card"
                >
                  <div
                    className="mb-4"
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '28px',
                      color: '#7C9082',
                      lineHeight: 1,
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '19px',
                      fontWeight: 400,
                      color: '#3A3530',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '13px',
                      color: '#5C5347',
                      lineHeight: 1.65,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── DIVIDER ── */}
          <div
            className="w-24 h-px mx-auto mb-16"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,144,130,0.3), transparent)' }}
          />

          {/* ── THE GAP ── */}
          <section className="w-full max-w-xl mb-20 text-center">
            <h2
              className="mb-6"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '28px',
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#3A3530',
              }}
            >
              The magic is in the gap
            </h2>
            <p
              className="mb-8"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '15px',
                color: '#5C5347',
                lineHeight: 1.7,
              }}
            >
              You think you know how you come across. Your partner has a different read.
              Your kids see someone else entirely. Relish doesn&rsquo;t judge any of
              those&mdash;it holds them side by side so you can finally see the full picture.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {['How you see yourself', 'How your partner sees you', 'How your kids see you'].map((label) => (
                <span
                  key={label}
                  className="px-5 py-2.5 rounded-full"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#3A3530',
                    background: 'rgba(124,144,130,0.1)',
                    border: '1px solid rgba(124,144,130,0.2)',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer
            className="w-full text-center pt-8 pb-6 mb-4"
            style={{ borderTop: '1px solid rgba(124,100,77,0.08)' }}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Image
                src="/relish-logo-new.png"
                alt="Relish"
                width={32}
                height={22}
                className="object-contain opacity-40"
              />
              <span
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#8A8078',
                }}
              >
                relish
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
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
          <div className="absolute inset-0" style={{ background: 'rgba(58,53,48,0.45)', backdropFilter: 'blur(8px)' }} />
          <div
            className="relative w-full max-w-sm animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="glass-card-strong rounded-2xl p-8 relative"
            >
              <button
                onClick={() => setShowSignIn(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-60"
                style={{ color: '#8A8078' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex justify-center mb-5">
                <Image
                  src="/relish-logo-new.png"
                  alt="Relish"
                  width={80}
                  height={55}
                  className="object-contain"
                />
              </div>

              <h3
                className="text-center mb-6"
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
                    border: '1px solid rgba(220, 38, 38, 0.15)',
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
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: focused === 'email' ? '#7C9082' : '#8A8078',
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      border: focused === 'email' ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                      boxShadow: focused === 'email' ? '0 0 0 3px rgba(124,144,130,0.12)' : 'none',
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
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: focused === 'password' ? '#7C9082' : '#8A8078',
                    }}
                  >
                    Password
                  </label>
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      border: focused === 'password' ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                      boxShadow: focused === 'password' ? '0 0 0 3px rgba(124,144,130,0.12)' : 'none',
                      color: '#3A3530',
                    }}
                    placeholder="••••••••" autoComplete="current-password" disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:translate-y-[-1px]"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: '#7C9082',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 500,
                    boxShadow: '0 4px 16px rgba(124,144,130,0.25)',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-6 text-center" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#5C5347' }}>
                New here?{' '}
                <Link href="/register" className="font-medium underline underline-offset-2 transition-colors hover:opacity-70" style={{ color: '#7C9082' }}>
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
