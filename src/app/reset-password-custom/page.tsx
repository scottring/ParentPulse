'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { TechnicalButton, TechnicalCard } from '@/components/technical';
import { ArrowLeftIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <TechnicalCard shadowSize="md" className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 border-2 border-green-400 flex items-center justify-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-mono text-xl font-bold text-slate-800 mb-2">
            Check Your Email
          </h1>
          <p className="font-mono text-sm text-slate-600 mb-6">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
            Check your inbox (and spam folder).
          </p>
          <TechnicalButton
            variant="primary"
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Back to Login
          </TechnicalButton>
        </TechnicalCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <TechnicalCard shadowSize="md" className="max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
            <EnvelopeIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="font-mono text-xl font-bold text-slate-800 mb-2">
            Reset Password
          </h1>
          <p className="font-mono text-sm text-slate-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 mb-4 font-mono text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block font-mono text-sm font-medium text-slate-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border-2 border-slate-300 font-mono text-sm focus:border-amber-500 focus:outline-none"
              disabled={loading}
            />
          </div>

          <TechnicalButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </TechnicalButton>
        </form>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-mono text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </TechnicalCard>
    </div>
  );
}
