'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Please enter your name');
      return false;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!familyName.trim()) {
      setError('Please enter your family name (e.g., "The Smith Family")');
      return false;
    }

    if (!password) {
      setError('Please enter a password');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

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
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page flex">
      {/* Left side - Getting started guide */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden p-16 items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4A574] via-[#B8956F] to-[#7C9082] opacity-10"></div>
        <div className="paper-texture absolute inset-0"></div>

        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <div className="mb-8">
            <div className="text-7xl mb-6 animate-float">📋</div>
          </div>

          <h1 className="parent-heading text-5xl mb-6" style={{ color: 'var(--parent-accent)' }}>
            Create Your Manual Library
          </h1>

          <p className="text-xl leading-relaxed mb-8" style={{ color: 'var(--parent-text-light)' }}>
            Build personalized guides to better understand the important people in your life.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--parent-primary)' }}>
                <span className="text-xl">1</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Create your account</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>Set up your manual library in minutes</div>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--parent-secondary)' }}>
                <span className="text-xl">2</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Add people & build manuals</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>Document triggers, strategies, and what works</div>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--parent-accent)' }}>
                <span className="text-xl text-white">3</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Get AI-powered guidance</div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>Weekly goals and insights based on your manuals</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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

          {/* Registration card */}
          <div className="parent-card p-8 sm:p-10 paper-texture">
            <h2 className="parent-heading text-3xl sm:text-4xl mb-2" style={{ color: 'var(--parent-text)' }}>
              Create your account
            </h2>
            <p className="mb-6" style={{ color: 'var(--parent-text-light)' }}>
              Start building your manual library
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
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
                />
              </div>

              <div>
                <label htmlFor="familyName" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Family Name
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="The Smith Family"
                  autoComplete="organization"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--parent-text-light)' }}>At least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
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
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--parent-border)' }}>
              <p className="text-center text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--parent-accent)' }}
                >
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-6 text-center text-xs" style={{ color: 'var(--parent-text-light)' }}>
            <p>Your data is private and secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
