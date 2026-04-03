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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(170deg, #FAF6F0 0%, #F0E8DD 30%, #E2D9CC 60%, #C8CFC5 100%)' }}
      >
        <div className="w-12 h-12 border-4 border-[#7C9082]/20 border-t-[#7C9082] rounded-full animate-spin" />
      </div>
    );
  }

  const inputStyle = (field: string) => ({
    backgroundColor: 'rgba(255,255,255,0.5)',
    border: focused === field ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
    boxShadow: focused === field ? '0 0 0 3px rgba(124,144,130,0.12)' : 'none',
    color: '#3A3530',
  });

  const labelStyle = (field: string) => ({
    color: focused === field ? '#7C9082' : '#8A8078',
  });

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
            <Link
              href="/login"
              className="px-5 py-2 rounded-full transition-all duration-200 hover:bg-white/30"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '13px',
                fontWeight: 500,
                color: '#5C5347',
              }}
            >
              Log In
            </Link>
            <button
              onClick={() => setShowForm(true)}
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
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <div className="relative z-10 px-6 sm:px-10 flex flex-col items-center">
          <section className="text-center pt-16 sm:pt-24 pb-16 max-w-2xl mx-auto">
            {/* Logo hero */}
            <div className="mb-10 flex justify-center animate-fade-in-up">
              <Image
                src="/relish-logo-new.png"
                alt="Relish"
                width={200}
                height={140}
                className="object-contain"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.06))' }}
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
              Start understanding<br />
              <em style={{ fontWeight: 300, fontStyle: 'italic', color: '#5C5347' }}>
                the people you love.
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
              Create your free account and build your first relationship manual
              in minutes. No grades, no judgement&mdash;just clarity.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in-up"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              <button
                onClick={() => setShowForm(true)}
                className="px-10 py-4 rounded-full transition-all duration-300 hover:shadow-xl hover:translate-y-[-1px]"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: '#7C9082',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(124,144,130,0.3)',
                }}
              >
                Get Started Free
              </button>
              <Link
                href="/login"
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
              </Link>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="w-full max-w-3xl mb-20">
            <h2
              className="text-center mb-10"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '28px',
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#3A3530',
              }}
            >
              How it works
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { step: '1', title: 'Tell Your Story', desc: 'Answer questions about how you communicate, what you need, and what makes you tick. Five minutes, not fifty.' },
                { step: '2', title: 'Invite Your People', desc: 'Your partner, best friend, even your kids (8+) share their perspective on you\u2014and you on them.' },
                { step: '3', title: 'See the Whole Picture', desc: 'AI weaves every viewpoint into a living manual\u2014surfacing blind spots, strengths, and the gaps that matter.' },
              ].map((item) => (
                <div
                  key={item.step}
                  className="glass-card rounded-2xl p-7 text-center weather-card"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: 'rgba(124,144,130,0.15)',
                      color: '#7C9082',
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    {item.step}
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

          {/* ── BOTTOM CTA ── */}
          <section className="w-full max-w-xl mb-16 text-center">
            <div className="glass-card rounded-2xl p-10">
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  fontWeight: 300,
                  fontStyle: 'italic',
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
                className="px-10 py-3.5 rounded-full transition-all duration-300 hover:shadow-xl hover:translate-y-[-1px]"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  background: '#7C9082',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(124,144,130,0.3)',
                }}
              >
                Create Your Free Account
              </button>
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

      {/* ============ REGISTER MODAL ============ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowForm(false)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(58,53,48,0.45)', backdropFilter: 'blur(8px)' }} />
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card-strong rounded-2xl p-7 sm:p-8 relative">
              <button
                onClick={() => setShowForm(false)}
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
                  width={72}
                  height={50}
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
                Create your account
              </h3>

              {isDemo && (
                <div
                  className="mb-5 p-3 rounded-2xl text-center"
                  style={{
                    background: 'rgba(124,144,130,0.1)',
                    border: '1px solid rgba(124,144,130,0.2)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C9082', fontWeight: 500 }}>
                    Demo Mode &mdash; fill buttons will appear on all questions
                  </p>
                </div>
              )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('name'), fontFamily: 'var(--font-parent-body)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                      Your Name
                    </label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('name'), fontFamily: 'var(--font-parent-body)' }} placeholder="Jane" autoComplete="name" disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="familyName" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('familyName'), fontFamily: 'var(--font-parent-body)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                      Family Name
                    </label>
                    <input id="familyName" type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} onFocus={() => setFocused('familyName')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('familyName'), fontFamily: 'var(--font-parent-body)' }} placeholder="The Does" autoComplete="organization" disabled={loading} />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('email'), fontFamily: 'var(--font-parent-body)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                    Email
                  </label>
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('email'), fontFamily: 'var(--font-parent-body)' }} placeholder="you@example.com" autoComplete="email" disabled={loading} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-password" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('password'), fontFamily: 'var(--font-parent-body)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                      Password
                    </label>
                    <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('password'), fontFamily: 'var(--font-parent-body)' }} placeholder="••••••••" autoComplete="new-password" disabled={loading} />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block mb-1.5 transition-colors duration-200" style={{ ...labelStyle('confirmPassword'), fontFamily: 'var(--font-parent-body)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                      Confirm
                    </label>
                    <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)} className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none" style={{ ...inputStyle('confirmPassword'), fontFamily: 'var(--font-parent-body)' }} placeholder="••••••••" autoComplete="new-password" disabled={loading} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:translate-y-[-1px] mt-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: '#7C9082',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 500,
                    boxShadow: '0 4px 16px rgba(124,144,130,0.25)',
                  }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="mt-6 text-center" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#5C5347' }}>
                Already have an account?{' '}
                <Link href="/login" className="font-medium underline underline-offset-2 transition-colors hover:opacity-70" style={{ color: '#7C9082' }}>
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
