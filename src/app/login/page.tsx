'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

/* ── reusable decorative pieces ── */
const RuledHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 w-full max-w-3xl mx-auto mb-10">
    <div className="flex-1 flex flex-col gap-[3px]">
      <div className="h-[2px]" style={{ background: 'rgba(160, 100, 40, 0.35)' }} />
      <div className="h-[1px]" style={{ background: 'rgba(160, 100, 40, 0.18)' }} />
    </div>
    <h3
      style={{
        fontFamily: 'var(--font-parent-heading)',
        fontSize: 'clamp(20px, 3vw, 28px)',
        fontWeight: 700,
        color: '#5C2D06',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </h3>
    <div className="flex-1 flex flex-col gap-[3px]">
      <div className="h-[2px]" style={{ background: 'rgba(160, 100, 40, 0.35)' }} />
      <div className="h-[1px]" style={{ background: 'rgba(160, 100, 40, 0.18)' }} />
    </div>
  </div>
);

const VintageCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`relative rounded-2xl ${className}`}
    style={{
      background: '#FDF6EC',
      border: '2px solid #C9A96E',
      boxShadow: '0 4px 16px rgba(100, 70, 30, 0.1), inset 0 0 0 4px #FDF6EC, inset 0 0 0 5px rgba(180, 140, 80, 0.2)',
    }}
  >
    {['top-2 left-2', 'top-2 right-2 rotate-90', 'bottom-2 left-2 -rotate-90', 'bottom-2 right-2 rotate-180'].map((pos) => (
      <div key={pos} className={`absolute ${pos} w-4 h-4 pointer-events-none`}>
        <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
          <path d="M0 0L6 0L6 2L2 2L2 6L0 6Z" fill="rgba(180, 130, 60, 0.4)" />
        </svg>
      </div>
    ))}
    {children}
  </div>
);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EDE3D0' }}>
        <div className="w-12 h-12 border-4 border-amber-800/20 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#EDE3D0' }}>
        <div className="relative">

          {/* Paper texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
            }}
          />

          {/* ── NAV BAR ── */}
          <nav
            className="relative z-20 flex items-center justify-between px-6 py-3"
            style={{
              background: '#EDE3D0',
              borderBottom: '2px solid rgba(180, 140, 80, 0.25)',
            }}
          >
            <Link href="/login" className="flex items-center gap-2">
              <svg width="22" height="20" viewBox="0 0 18 16" fill="none">
                <path d="M9 16L0.34 6.5C-1.5 4.5 0 1 3 0.5C5.5 0 7.5 1.5 9 3.5C10.5 1.5 12.5 0 15 0.5C18 1 19.5 4.5 17.66 6.5L9 16Z" fill="#C2773A" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#5C2D06',
                }}
              >
                Relish
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSignIn(true)}
                className="px-4 py-2 rounded-lg transition-colors duration-200"
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#6B4D2E',
                }}
              >
                Log In
              </button>
              <Link
                href="/register"
                className="px-5 py-2 rounded-lg transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFF8EE',
                  background: '#C2773A',
                  border: '1px solid #A3510B',
                }}
              >
                Get Started
              </Link>
            </div>
          </nav>

          {/* ── BANNER ── */}
          <div className="relative" style={{ borderBottom: '2px solid rgba(180, 140, 80, 0.25)' }}>
            <Image
              src="/relish banner 04b.png"
              alt="Relish — The Operating Manual for Relationships"
              width={960}
              height={540}
              className="w-full h-auto block"
              style={{ filter: 'saturate(1.35) contrast(1.05)' }}
              priority
            />
            <div
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: 'linear-gradient(transparent, #EDE3D0)' }}
            />
          </div>

          {/* ── PAGE CONTENT ── */}
          <div className="relative z-10 px-6 sm:px-10 py-10 flex flex-col items-center">

            {/* HERO */}
            <section className="text-center mb-14 max-w-2xl">
              <h2
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: 'clamp(28px, 5vw, 44px)',
                  fontWeight: 700,
                  color: '#3D2010',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  marginBottom: '16px',
                }}
              >
                Every person you love<br />deserves to be understood.
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: 'clamp(16px, 2vw, 20px)',
                  color: '#6B5540',
                  lineHeight: 1.65,
                }}
              >
                Relish helps you build a living manual for each relationship&mdash;capturing
                how people see themselves <em>and</em> how others experience them.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <Link
                  href="/register"
                  className="px-8 py-3.5 font-bold uppercase tracking-widest rounded-xl transition-all duration-300 relative overflow-hidden group"
                  style={{
                    fontFamily: 'var(--font-parent-heading)',
                    background: 'linear-gradient(135deg, #A3510B, #D97706)',
                    color: '#FFF8EE',
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    border: '2px solid #8B4513',
                    boxShadow: '0 4px 16px rgba(140, 60, 10, 0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #7C3A0A, #A3510B)' }}
                  />
                  <span className="relative">Get Started Free</span>
                </Link>
                <button
                  onClick={() => setShowSignIn(true)}
                  className="px-8 py-3.5 font-bold uppercase tracking-widest rounded-xl transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-parent-heading)',
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    color: '#6B4D2E',
                    border: '2px solid #C9A96E',
                    background: 'transparent',
                  }}
                >
                  Sign In
                </button>
              </div>
            </section>

            {/* FEATURES */}
            <section className="w-full max-w-3xl mb-14">
              <RuledHeader>What Makes Relish Different</RuledHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Multiple Perspectives',
                    desc: 'You answer about yourself. Your partner, friends, and kids share what they see. The truth lives in the overlap.',
                  },
                  {
                    title: 'AI-Synthesized Manuals',
                    desc: 'Relish merges every perspective into a single, evolving document\u2014highlighting where you align and where you surprise each other.',
                  },
                  {
                    title: 'Growth, Not Grades',
                    desc: 'No scorecards. Relish tracks how your relationships grow over time and gently nudges you toward the things that matter.',
                  },
                ].map((item) => (
                  <VintageCard key={item.title} className="p-6 text-center">
                    <h4
                      className="mb-2"
                      style={{
                        fontFamily: 'var(--font-parent-heading)',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#3D2010',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontFamily: 'var(--font-parent-heading)',
                        fontSize: '15px',
                        color: '#6B5540',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.desc}
                    </p>
                  </VintageCard>
                ))}
              </div>
            </section>


            {/* FOOTER */}
            <footer
              className="w-full text-center pt-6 pb-4"
              style={{ borderTop: '2px solid rgba(180, 140, 80, 0.25)' }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg width="16" height="14" viewBox="0 0 18 16" fill="none">
                  <path d="M9 16L0.34 6.5C-1.5 4.5 0 1 3 0.5C5.5 0 7.5 1.5 9 3.5C10.5 1.5 12.5 0 15 0.5C18 1 19.5 4.5 17.66 6.5L9 16Z" fill="#C2773A" fillOpacity="0.4" />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--font-parent-heading)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#8B7B6B',
                  }}
                >
                  Relish
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-parent-heading)', fontSize: '13px', color: '#A09080' }}>
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
          <div className="absolute inset-0" style={{ background: 'rgba(40, 30, 15, 0.6)', backdropFilter: 'blur(6px)' }} />
          <div
            className="relative w-full max-w-sm"
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <VintageCard className="p-7 sm:p-8">
              <button
                onClick={() => setShowSignIn(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 z-10"
                style={{ color: '#8B7B6B' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <h3
                className="text-center mb-5"
                style={{
                  fontFamily: 'var(--font-parent-heading)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#3D2010',
                }}
              >
                Welcome back
              </h3>

              {(error || authError) && (
                <div
                  className="mb-5 p-3.5 rounded-xl"
                  style={{
                    background: 'rgba(220, 38, 38, 0.06)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                  }}
                >
                  <p className="text-sm text-red-800" style={{ fontFamily: 'var(--font-parent-heading)' }}>{error || authError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200" style={{ fontFamily: 'var(--font-parent-heading)', fontWeight: 600, color: focused === 'email' ? '#A3510B' : '#8B7B6B' }}>
                    Email
                  </label>
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-heading)',
                      backgroundColor: '#FDF6EC',
                      border: focused === 'email' ? '2px solid #C2773A' : '2px solid #D4C4A8',
                      boxShadow: focused === 'email' ? '0 0 0 3px rgba(194, 119, 58, 0.15)' : 'none',
                      color: '#2A1F14',
                    }}
                    placeholder="you@example.com" autoComplete="email" disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200" style={{ fontFamily: 'var(--font-parent-heading)', fontWeight: 600, color: focused === 'password' ? '#A3510B' : '#8B7B6B' }}>
                    Password
                  </label>
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'var(--font-parent-heading)',
                      backgroundColor: '#FDF6EC',
                      border: focused === 'password' ? '2px solid #C2773A' : '2px solid #D4C4A8',
                      boxShadow: focused === 'password' ? '0 0 0 3px rgba(194, 119, 58, 0.15)' : 'none',
                      color: '#2A1F14',
                    }}
                    placeholder="••••••••" autoComplete="current-password" disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 font-bold uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    fontFamily: 'var(--font-parent-heading)',
                    background: 'linear-gradient(135deg, #A3510B, #D97706)',
                    color: '#FFF8EE',
                    fontSize: '14px',
                    letterSpacing: '0.1em',
                    border: '2px solid #8B4513',
                    boxShadow: '0 4px 16px rgba(140, 60, 10, 0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #7C3A0A, #A3510B)' }}
                  />
                  <span className="relative">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </span>
                </button>
              </form>

              <p className="mt-5 text-center" style={{ fontFamily: 'var(--font-parent-heading)', fontSize: '15px', color: '#6B5540' }}>
                New here?{' '}
                <Link href="/register" className="font-bold transition-colors duration-200 underline underline-offset-2" style={{ color: '#A3510B' }}>
                  Create your account
                </Link>
              </p>
            </VintageCard>
          </div>
        </div>
      )}
    </div>
  );
}
