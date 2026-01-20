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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING SYSTEM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Left side - Getting started guide */}
      <div className="hidden lg:flex lg:w-2/5 p-16 items-center justify-center" style={{ backgroundColor: '#E8DCC8' }}>
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <Image
              src="/relish banner 04b.png"
              alt="Relish - The Operating Manual for Relationships"
              width={400}
              height={150}
              className="object-contain"
              priority
            />
          </div>

          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
              SYSTEM OVERVIEW
            </div>

            <h1 className="font-mono text-3xl font-bold mb-4 text-slate-900">
              Create Your Manual Library
            </h1>

            <p className="font-mono text-sm text-slate-600 mb-6">
              Build personalized operating guides to better understand the important people in your life.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative bg-white border-2 border-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                1
              </div>
              <div className="font-mono text-sm font-bold mb-1 text-slate-900">Create your account</div>
              <div className="font-mono text-xs text-slate-600">Initialize system in minutes</div>
            </div>

            <div className="relative bg-white border-2 border-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-green-600">
                2
              </div>
              <div className="font-mono text-sm font-bold mb-1 text-slate-900">Add people & build manuals</div>
              <div className="font-mono text-xs text-slate-600">Document triggers, strategies, patterns</div>
            </div>

            <div className="relative bg-white border-2 border-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-slate-800">
                3
              </div>
              <div className="font-mono text-sm font-bold mb-1 text-slate-900">Get AI-powered guidance</div>
              <div className="font-mono text-xs text-slate-600">Weekly goals based on manual data</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mb-3 flex justify-center">
              <Image
                src="/Relish-logo.png"
                alt="Relish - The Operating Manual for Relationships"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <p className="font-mono text-xs text-slate-600 uppercase tracking-wider">
              The Operating Manual for Relationships
            </p>
          </div>

          {/* Registration card */}
          <div className="relative bg-white border-4 border-slate-800 p-8 sm:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
              NEW USER REGISTRATION
            </div>

            <h2 className="font-mono text-3xl sm:text-4xl font-bold mb-2 text-slate-900">
              Initialize Account
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6">
              Complete form to access system
            </p>

            {(error || authError) && (
              <div className="mb-6 p-4 border-2 border-red-600 bg-red-50">
                <div className="inline-block px-2 py-1 bg-red-600 text-white font-mono text-xs mb-2">
                  ⚠ ERROR
                </div>
                <p className="font-mono text-sm text-red-900">{error || authError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block font-mono text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Full Name:
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  placeholder="JOHN DOE"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block font-mono text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Email Address:
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  placeholder="USER@EXAMPLE.COM"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="familyName" className="block font-mono text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Family Name:
                </label>
                <input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  placeholder="THE SMITH FAMILY"
                  autoComplete="organization"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block font-mono text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Password:
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <p className="mt-1 font-mono text-xs text-slate-500">MINIMUM 6 CHARACTERS</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block font-mono text-xs font-bold mb-2 text-slate-600 uppercase tracking-wider">
                  Confirm Password:
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-slate-800 text-white font-mono text-sm font-bold uppercase tracking-wider hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    PROCESSING...
                  </span>
                ) : (
                  'CREATE ACCOUNT →'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <p className="text-center font-mono text-xs text-slate-600">
                EXISTING USER?{' '}
                <Link
                  href="/login"
                  className="font-bold text-amber-600 hover:text-slate-800 uppercase tracking-wider"
                >
                  SIGN IN
                </Link>
              </p>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-6 text-center">
            <div className="inline-block px-3 py-1 border border-slate-300 bg-white">
              <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">🔒 SECURE & PRIVATE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
