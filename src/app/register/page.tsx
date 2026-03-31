'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading, error: authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

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
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
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

  const inputStyle = (field: string) => ({
    backgroundColor: '#FAF5EE',
    border: focused === field ? '2px solid #d97706' : '2px solid #E8E3DC',
    boxShadow: focused === field ? '0 0 0 3px rgba(217, 119, 6, 0.1)' : 'none',
    color: '#2C2C2C',
  });

  const labelStyle = (field: string) => ({
    color: focused === field ? '#d97706' : '#9B8B7B',
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ backgroundColor: '#FFF8F0' }}
    >
      {/* Ambient background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '1000px',
            height: '1000px',
            border: '1px solid rgba(217, 119, 6, 0.05)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '780px',
            height: '780px',
            border: '1px solid rgba(217, 119, 6, 0.07)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '560px',
            height: '560px',
            border: '1px solid rgba(217, 119, 6, 0.04)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(217, 119, 6, 0.03) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/relish banner 04b.png"
            alt="Relish"
            width={280}
            height={100}
            className="object-contain"
            priority
          />
        </div>

        {/* Tagline */}
        <p
          className="text-center mb-6"
          style={{
            fontFamily: 'var(--font-parent-heading)',
            fontSize: '15px',
            color: '#8B7B6B',
            letterSpacing: '0.04em',
          }}
        >
          Begin your journey together
        </p>

        {/* Card */}
        <div
          className="rounded-2xl p-8 sm:p-9"
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
              className="mb-5 p-4 rounded-xl"
              style={{
                background: 'rgba(220, 38, 38, 0.06)',
                border: '1px solid rgba(220, 38, 38, 0.15)',
              }}
            >
              <p className="text-sm font-mono text-red-800">{error || authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name & Email side by side on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block font-mono text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200"
                  style={labelStyle('name')}
                >
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                  style={inputStyle('name')}
                  placeholder="Jane"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="familyName"
                  className="block font-mono text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200"
                  style={labelStyle('familyName')}
                >
                  Family Name
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onFocus={() => setFocused('familyName')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                  style={inputStyle('familyName')}
                  placeholder="The Does"
                  autoComplete="organization"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200"
                style={labelStyle('email')}
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
                className="w-full px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                style={inputStyle('email')}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password fields side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="password"
                  className="block font-mono text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200"
                  style={labelStyle('password')}
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
                  className="w-full px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                  style={inputStyle('password')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block font-mono text-xs uppercase tracking-wider mb-1.5 transition-colors duration-200"
                  style={labelStyle('confirmPassword')}
                >
                  Confirm
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocused('confirmPassword')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 outline-none"
                  style={inputStyle('confirmPassword')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-mono text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 disabled:opacity-50 relative overflow-hidden group mt-2"
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
                {loading ? 'Creating account...' : 'Create Account'}
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center" style={{ fontFamily: 'var(--font-parent-heading)', fontSize: '14px', color: '#8B7B6B' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-bold transition-colors duration-200" style={{ color: '#d97706' }}>
            Sign in
          </Link>
        </p>

        {/* Bottom accent */}
        <div className="flex items-center justify-center mt-8 gap-3">
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.3))' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(217, 119, 6, 0.3)' }} />
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.3), transparent)' }} />
        </div>
      </div>
    </div>
  );
}
