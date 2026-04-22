'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ================================================================
// Login — a small, focused sign-in form on the press-cream
// background. No hero, no illustrations, no marketing content.
// The atmospheric work lives on `/`; this page is the vestibule.
// ================================================================

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/journal');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to sign in. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#F7F5F0' }}
      >
        <p
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            color: '#6B6254',
            fontSize: 20,
          }}
        >
          Opening the library&hellip;
        </p>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Return link */}
      <Link href="/" className="login-back" aria-label="Back to the library">
        <span className="arrow">⟵</span> Back
      </Link>

      {/* Wordmark — small, upper center */}
      <Link href="/" className="login-wordmark">
        Relish
      </Link>

      {/* The form card */}
      <div className="login-card" role="main">
        <div className="login-card-header">
          <span className="press-chapter-label">Welcome back</span>
          <h1 className="login-title">Sign in</h1>
        </div>

        <hr className="press-rule" />

        {error && (
          <div className="login-error" role="alert">
            <p className="press-marginalia" style={{ fontSize: 14, color: '#C08070' }}>
              — {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="email" className="press-chapter-label">
              Your email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              className="login-input"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="press-chapter-label">
              Your password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              className="login-input"
            />
          </div>

          <hr className="press-rule" style={{ marginTop: 32 }} />

          <div className="login-actions">
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="press-link"
              style={{
                background: 'transparent',
                cursor:
                  loading || !email || !password ? 'not-allowed' : 'pointer',
                opacity: loading || !email || !password ? 0.4 : 1,
                border: 0,
              }}
            >
              {loading ? 'Opening the library…' : 'Open the library'}
              {!loading && <span className="arrow">⟶</span>}
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p className="press-marginalia" style={{ fontSize: 14 }}>
            New here?{' '}
            <Link
              href="/register"
              className="press-link-sm"
              style={{ fontSize: 14 }}
            >
              Create an account ⟶
            </Link>
          </p>
        </div>

        <div className="press-fleuron mt-8">❦</div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: #f7f5f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          position: relative;
        }

        :global(.login-back) {
          position: absolute;
          top: 32px;
          left: 36px;
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          color: #6b6254;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        :global(.login-back:hover) {
          color: #3a3530;
        }
        :global(.login-back .arrow) {
          display: inline-block;
          margin-right: 4px;
          transition: transform 0.3s ease;
        }
        :global(.login-back:hover .arrow) {
          transform: translateX(-3px);
        }

        :global(.login-wordmark) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: 36px;
          color: #3a3530;
          text-decoration: none;
          letter-spacing: -0.015em;
          line-height: 1;
          margin-bottom: 36px;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: #fdfbf6;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 4px;
          padding: 32px 48px 44px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 1px 2px rgba(60, 48, 28, 0.04),
            0 12px 44px rgba(60, 48, 28, 0.12);
          position: relative;
        }

        .login-card-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .login-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 32px;
          color: #3a3530;
          margin: 8px 0 0;
          line-height: 1.1;
        }

        .login-error {
          padding: 12px 16px;
          margin: 20px 0 0;
          border-left: 2px solid rgba(192, 128, 112, 0.5);
          background: rgba(192, 128, 112, 0.05);
        }

        .login-form {
          margin-top: 8px;
        }
        .login-field {
          margin-top: 28px;
        }
        :global(.login-input) {
          width: 100%;
          font-family: var(--font-parent-display);
          font-size: 18px;
          font-style: italic;
          color: #3a3530;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(200, 190, 172, 0.6);
          padding: 8px 2px 10px;
          margin-top: 8px;
        }
        :global(.login-input:focus) {
          outline: none;
          border-bottom-color: #7c9082;
        }

        .login-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .login-footer {
          text-align: center;
          margin-top: 32px;
        }

        @media (max-width: 520px) {
          .login-card {
            padding: 28px 28px 36px;
          }
          :global(.login-wordmark) {
            font-size: 30px;
            margin-bottom: 28px;
          }
          .login-title {
            font-size: 26px;
          }
          :global(.login-back) {
            top: 20px;
            left: 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
