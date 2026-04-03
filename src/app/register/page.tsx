'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading, error: authError } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemo(params.get('demo') === 'true');
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/welcome');
    }
  }, [user, authLoading, router]);

  const validateForm = (): boolean => {
    if (!name.trim()) { setError('Please enter your name'); return false; }
    if (!email.trim()) { setError('Please enter your email'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return false; }
    if (!familyName.trim()) { setError('Please enter your family name'); return false; }
    if (!password) { setError('Please enter a password'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        familyName: familyName.trim(),
        password,
        ...(isDemo ? { isDemo: true } : {}),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
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

  const inputStyle = (field: string) => ({
    backgroundColor: 'rgba(255,255,255,0.6)',
    border: focused === field ? '1px solid #7C9082' : '1px solid rgba(124,144,130,0.2)',
    boxShadow: focused === field ? '0 0 0 3px rgba(124,144,130,0.15)' : 'none',
    color: '#3A3530',
  });

  const labelStyle = (field: string) => ({
    color: focused === field ? '#7C9082' : '#8A8078',
  });

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #E8F4F8 0%, #FFF8E7 60%, #F5EDE3 100%)' }}>
        {/* Inner page container */}
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
              <Link
                href="/login"
                className="px-4 py-2 rounded-full transition-colors duration-200"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#5C5347',
                }}
              >
                Log In
              </Link>
              <button
                onClick={() => setShowForm(true)}
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
              </button>
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
                Start understanding<br />the people you love.
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: 'clamp(14px, 2vw, 18px)',
                  color: '#5C5347',
                  lineHeight: 1.65,
                }}
              >
                Create your free account and build your first relationship manual
                in minutes. No grades, no judgement&mdash;just clarity.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setShowForm(true)}
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
                </button>
                <Link
                  href="/login"
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
                </Link>
              </div>
            </section>

            {/* HOW IT WORKS */}
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
                How It Works
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Tell Your Story',
                    desc: 'Answer questions about how you communicate, what you need, and what makes you tick. Five minutes, not fifty.',
                  },
                  {
                    step: '2',
                    title: 'Invite Your People',
                    desc: 'Your partner, best friend, even your kids (8+) share their perspective on you -- and you on them.',
                  },
                  {
                    step: '3',
                    title: 'See the Whole Picture',
                    desc: 'AI weaves every viewpoint into a living manual -- surfacing blind spots, strengths, and the gaps that matter.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl p-6 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(124,144,130,0.15)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: '#7C9082',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: '18px',
                        fontWeight: 400,
                      }}
                    >
                      {item.step}
                    </div>
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

            {/* THE MAGIC */}
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
                The Magic Is in the Gap
              </h3>

              <div
                className="rounded-2xl p-8 sm:p-10 text-center"
                style={{
                  background: 'rgba(255,255,255,0.45)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(124,144,130,0.15)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: 'clamp(14px, 2vw, 17px)',
                    color: '#5C5347',
                    lineHeight: 1.7,
                    maxWidth: '500px',
                    margin: '0 auto 24px',
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
                      className="px-4 py-2 rounded-full"
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#3A3530',
                        background: 'rgba(124,144,130,0.12)',
                        border: '1px solid rgba(124,144,130,0.25)',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </section>


            {/* BOTTOM CTA */}
            <section className="w-full max-w-2xl mb-10">
              <div
                className="rounded-2xl p-8 sm:p-10 text-center"
                style={{
                  background: 'rgba(255,255,255,0.45)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(124,144,130,0.15)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                <h3
                  className="mb-3"
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: 'clamp(22px, 3vw, 30px)',
                    fontWeight: 400,
                    color: '#3A3530',
                  }}
                >
                  Ready to start?
                </h3>
                <p
                  className="mb-6"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '14px',
                    color: '#5C5347',
                    lineHeight: 1.6,
                  }}
                >
                  It takes five minutes to fill out your own manual.
                  The insights last a lifetime.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-10 py-3.5 rounded-full transition-all duration-300 relative overflow-hidden group"
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
                  <span className="relative">Create Your Free Account</span>
                </button>
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

      {/* ============ REGISTER MODAL ============ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowForm(false)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(58,53,48,0.5)', backdropFilter: 'blur(6px)' }} />
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto"
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
                onClick={() => setShowForm(false)}
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
                Create your account
              </h3>

              {isDemo && (
                <div
                  className="mb-5 p-3 rounded-2xl text-center"
                  style={{
                    background: 'rgba(124,144,130,0.1)',
                    border: '1px solid rgba(124,144,130,0.3)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C9082', fontWeight: 500 }}>
                    Demo Mode -- fill buttons will appear on all questions
                  </p>
                </div>
              )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('name'), fontFamily: 'var(--font-parent-body)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                      Your Name
                    </label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('name'), fontFamily: 'var(--font-parent-body)' }} placeholder="Jane" autoComplete="name" disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="familyName" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('familyName'), fontFamily: 'var(--font-parent-body)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                      Family Name
                    </label>
                    <input id="familyName" type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} onFocus={() => setFocused('familyName')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('familyName'), fontFamily: 'var(--font-parent-body)' }} placeholder="The Does" autoComplete="organization" disabled={loading} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('email'), fontFamily: 'var(--font-parent-body)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                    Email
                  </label>
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('email'), fontFamily: 'var(--font-parent-body)' }} placeholder="you@example.com" autoComplete="email" disabled={loading} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-password" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('password'), fontFamily: 'var(--font-parent-body)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                      Password
                    </label>
                    <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('password'), fontFamily: 'var(--font-parent-body)' }} placeholder="••••••••" autoComplete="new-password" disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('confirmPassword'), fontFamily: 'var(--font-parent-body)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                      Confirm
                    </label>
                    <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('confirmPassword'), fontFamily: 'var(--font-parent-body)' }} placeholder="••••••••" autoComplete="new-password" disabled={loading} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full transition-all duration-300 disabled:opacity-50 relative overflow-hidden group mt-2"
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
                    {loading ? 'Creating account...' : 'Create Account'}
                  </span>
                </button>
              </form>

              <p className="mt-5 text-center" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                Already have an account?{' '}
                <Link href="/login" className="font-medium transition-colors duration-200 underline underline-offset-2" style={{ color: '#7C9082' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
