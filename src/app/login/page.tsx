'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login, resetPassword, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      router.push('/');
    } catch {
      // error is set in auth context
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch {
      // error is set in auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight heading">Relish</h1>
          <p className="text-stone-500 mt-1">Your family&apos;s coherence stack</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {resetMode ? (
          <form onSubmit={handleReset} className="space-y-4">
            {resetSent ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Check your email for a password reset link.
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); }}
              className="w-full text-sm text-stone-500 hover:text-stone-700"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-stone-500 hover:text-stone-700"
              >
                Forgot password?
              </button>
              <Link href="/register" className="text-stone-500 hover:text-stone-700">
                Create account
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
