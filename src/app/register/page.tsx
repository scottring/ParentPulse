'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ================================================================
// Register — a small, focused account creation form on the
// press-cream background. No multi-stage wizard, no illustrations,
// no marketing content. Single form, collect the essentials,
// create the account.
// ================================================================

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemo(params.get('demo') === 'true');
    // Prefill email when the user arrives from an invite email link
    // (sendFamilyInvite puts ?email=... on the registerUrl).
    const invitedEmail = params.get('email');
    if (invitedEmail) setEmail(invitedEmail);
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/welcome');
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
      setError('Please enter your family name');
      return false;
    }
    if (!password) {
      setError('Please enter a password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create account. Please try again.',
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
    <div className="register-page">
      {/* Return link */}
      <Link
        href="/"
        className="register-back"
        aria-label="Back to the library"
      >
        <span className="arrow">⟵</span> Back
      </Link>

      {/* Wordmark */}
      <Link href="/" className="register-wordmark">
        Relish
      </Link>

      <div className="register-card" role="main">
        <div className="register-card-header">
          <span className="press-chapter-label">
            {isDemo ? 'A demonstration' : 'Create an account'}
          </span>
          <h1 className="register-title">Create your library</h1>
          <p className="register-subtitle">
            A handful of details to get you started. You can change
            any of them later.
          </p>
        </div>

        <hr className="press-rule" />

        {error && (
          <div className="register-error" role="alert">
            <p
              className="press-marginalia"
              style={{ fontSize: 14, color: '#C08070' }}
            >
              — {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="name" className="press-chapter-label">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Appleseed"
              autoComplete="name"
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="register-field">
            <label htmlFor="family" className="press-chapter-label">
              Your family name
            </label>
            <input
              id="family"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="The Appleseeds"
              autoComplete="family-name"
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="register-field">
            <label htmlFor="email" className="press-chapter-label">
              Your email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="register-field">
            <label htmlFor="password" className="press-chapter-label">
              A password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least six characters"
              autoComplete="new-password"
              disabled={loading}
              className="register-input"
            />
          </div>

          <div className="register-field">
            <label htmlFor="confirm" className="press-chapter-label">
              And again
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
              className="register-input"
            />
          </div>

          <hr className="press-rule" style={{ marginTop: 32 }} />

          <div className="register-actions">
            <button
              type="submit"
              disabled={loading}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                border: 0,
              }}
            >
              {loading ? 'Creating your account…' : 'Create account'}
              {!loading && <span className="arrow">⟶</span>}
            </button>
          </div>
        </form>

        <div className="register-footer">
          <p className="press-marginalia" style={{ fontSize: 14 }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="press-link-sm"
              style={{ fontSize: 14 }}
            >
              Sign in ⟶
            </Link>
          </p>
        </div>

        <div className="press-fleuron mt-8">❦</div>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          background: #f7f5f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          position: relative;
        }

        :global(.register-back) {
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
        :global(.register-back:hover) {
          color: #3a3530;
        }
        :global(.register-back .arrow) {
          display: inline-block;
          margin-right: 4px;
          transition: transform 0.3s ease;
        }
        :global(.register-back:hover .arrow) {
          transform: translateX(-3px);
        }

        :global(.register-wordmark) {
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

        .register-card {
          width: 100%;
          max-width: 480px;
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

        .register-card-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .register-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 32px;
          color: #3a3530;
          margin: 8px 0 12px;
          line-height: 1.1;
        }
        .register-subtitle {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 16px;
          color: #6b6254;
          margin: 0 auto;
          max-width: 320px;
          line-height: 1.45;
        }

        .register-error {
          padding: 12px 16px;
          margin: 20px 0 0;
          border-left: 2px solid rgba(192, 128, 112, 0.5);
          background: rgba(192, 128, 112, 0.05);
        }

        .register-form {
          margin-top: 8px;
        }
        .register-field {
          margin-top: 24px;
        }
        :global(.register-input) {
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
        :global(.register-input:focus) {
          outline: none;
          border-bottom-color: #7c9082;
        }

        .register-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .register-footer {
          text-align: center;
          margin-top: 32px;
        }

        @media (max-width: 520px) {
          .register-card {
            padding: 28px 28px 36px;
          }
          :global(.register-wordmark) {
            font-size: 30px;
            margin-bottom: 28px;
          }
          .register-title {
            font-size: 26px;
          }
          .register-subtitle {
            font-size: 14px;
          }
          :global(.register-back) {
            top: 20px;
            left: 20px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
