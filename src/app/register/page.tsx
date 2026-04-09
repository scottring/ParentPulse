'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading, error: authError } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemo(params.get('demo') === 'true');
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (authLoading || user) {
    return (
      <div className="relish-page">
        <div className="press-loading">Opening the library&hellip;</div>
      </div>
    );
  }

  return (
    <div className="relish-page" style={{ minHeight: '100vh' }}>

      {/* ============ MINIMAL NAV ============ */}
      <nav
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          height: 64,
          background: '#ECEAE5',
          borderBottom: '1px solid rgba(120, 100, 70, 0.12)',
        }}
      >
        <div className="h-full px-6 sm:px-10 flex items-center justify-between mx-auto" style={{ maxWidth: 1280 }}>
          <Link
            href="/login"
            className="hover:opacity-80 transition-opacity"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 26,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#3A3530',
              letterSpacing: '-0.015em',
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            Relish
          </Link>

          <div className="flex items-center" style={{ gap: 28 }}>
            <Link
              href="/login"
              className="press-link-sm"
              style={{ fontSize: 16 }}
            >
              Sign in
            </Link>
            <button
              onClick={scrollToForm}
              className="press-link"
              style={{
                fontSize: 16,
                borderBottomWidth: 1,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Begin a volume
              <span className="arrow">⟶</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-[64px]">

        {/* ═══════════════════════════════════════════
            HERO — A WAITING VOLUME
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 60,
            paddingBottom: 40,
            maxWidth: 1120,
            margin: '0 auto',
          }}
        >
          <div className="press-running-header" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <span>Relish</span>
            <span className="sep">·</span>
            <span>A Volume Waiting to Be Written</span>
            <span className="sep">·</span>
            <span>Chapter I</span>
          </div>

          <div className="hero-grid" style={{ marginTop: 40 }}>

            {/* LEFT: the "waiting volume" illustration */}
            <div className="flex items-center justify-center">
              <WaitingVolume />
            </div>

            {/* RIGHT: title + copy + CTA */}
            <div className="text-center lg:text-left">
              <span className="press-chapter-label" style={{ display: 'inline-block' }}>
                Begin
              </span>
              <h1
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 'clamp(60px, 9vw, 116px)',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  color: '#3A3530',
                  lineHeight: 0.92,
                  letterSpacing: '-0.035em',
                  margin: '20px 0 16px',
                }}
              >
                A blank
                <br />
                <span style={{ color: '#8B7B5E' }}>volume</span>
                <br />
                awaits.
              </h1>
              <p
                className="press-body-italic"
                style={{
                  fontSize: 'clamp(17px, 2vw, 21px)',
                  lineHeight: 1.55,
                  maxWidth: 440,
                  color: '#5C5347',
                  marginBottom: 36,
                }}
              >
                Five minutes of your own words and you&rsquo;ll have
                the first pages of a living manual for the people you
                love. Everything you add is kept. Nothing is graded.
              </p>
              <div
                className="flex flex-col sm:flex-row items-center lg:items-start gap-6"
                style={{ marginTop: 20 }}
              >
                <button
                  onClick={scrollToForm}
                  className="press-link"
                  style={{
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 22,
                  }}
                >
                  Begin your volume
                  <span className="arrow">⟶</span>
                </button>
                <Link
                  href="/login"
                  className="press-link-sm"
                  style={{ fontSize: 15 }}
                >
                  or sign in instead
                </Link>
              </div>
            </div>

          </div>

          <div className="press-asterism" style={{ marginTop: 80, marginBottom: 0 }} />
        </section>

        {/* ═══════════════════════════════════════════
            HOW IT BUILDS — THREE-STEP CONSTELLATION
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 80,
            paddingBottom: 80,
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="press-chapter-label">Chapter II</span>
            <h2
              className="press-display-md mt-3"
              style={{ fontSize: 'clamp(32px, 4.5vw, 44px)' }}
            >
              How a manual is built
            </h2>
            <p
              className="press-marginalia mt-3"
              style={{ fontSize: 14, maxWidth: 540, margin: '12px auto 0' }}
            >
              A volume begins alone and fills out over time, one
              perspective at a time.
            </p>
          </div>

          <div
            className="progression-grid"
            style={{
              display: 'grid',
              gap: 32,
              alignItems: 'start',
            }}
          >
            <Stage
              figure="fig. i"
              roman="I"
              title="You begin"
              description="Tell the volume about yourself, or about one person you love. A handful of questions, written in your own words. Nothing else required."
              illustration={<StageOne />}
            />
            <StageDivider />
            <Stage
              figure="fig. ii"
              roman="II"
              title="Others answer"
              description="Invite your partner, your children, your closest friends. Each adds what they see from where they stand. The volume holds every perspective at once."
              illustration={<StageTwo />}
            />
            <StageDivider />
            <Stage
              figure="fig. iii"
              roman="III"
              title="The manual emerges"
              description="The synthesis engine reads every perspective and assembles a single living document — one where gaps, strengths, and patterns become visible at a glance."
              illustration={<StageThree />}
            />
          </div>

          <div className="press-asterism" style={{ marginTop: 80 }} />
        </section>

        {/* ═══════════════════════════════════════════
            EPIGRAPH
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 60,
            paddingBottom: 60,
            maxWidth: 760,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <OrnamentDivider />

          <blockquote
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#3A3530',
              lineHeight: 1.3,
              letterSpacing: '-0.005em',
              margin: '40px auto 20px',
              maxWidth: 620,
            }}
          >
            &ldquo;Every person you love
            <br />
            deserves to be understood
            <br />
            in their own right.&rdquo;
          </blockquote>
          <p className="press-marginalia" style={{ fontSize: 15 }}>
            — a quiet ambition
          </p>

          <OrnamentDivider style={{ marginTop: 40 }} />
        </section>

        {/* ═══════════════════════════════════════════
            THE FORM — INLINE, BOOK-SPREAD STYLED
            ═══════════════════════════════════════════ */}
        <section
          ref={formRef}
          className="px-6"
          style={{
            paddingTop: 60,
            paddingBottom: 80,
            maxWidth: 760,
            margin: '0 auto',
            scrollMarginTop: 80,
          }}
        >
          <div className="press-volume relative overflow-hidden">

            <div className="press-running-header">
              <span>Chapter III</span>
              <span className="sep">·</span>
              <span>The Volume Opens</span>
            </div>

            <div style={{ padding: '28px 56px 48px' }}>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <span className="press-chapter-label">Write your first pages</span>
                <h2
                  className="press-display-md mt-2"
                  style={{ fontSize: 'clamp(32px, 4vw, 42px)' }}
                >
                  Begin your volume
                </h2>
                <p className="press-marginalia mt-3" style={{ fontSize: 14 }}>
                  No credit card. Keep anything you write. Delete it anytime.
                </p>
              </div>

              <hr className="press-rule" />

              {isDemo && (
                <div
                  style={{
                    padding: '12px 18px',
                    margin: '22px 0 0',
                    borderLeft: '2px solid rgba(124,144,130,0.5)',
                    background: 'rgba(124,144,130,0.05)',
                  }}
                >
                  <p className="press-marginalia" style={{ fontSize: 15 }}>
                    <span className="press-sc" style={{ fontSize: 14 }}>DEMO</span>
                    {' '}— fill buttons will appear on every question to speed the walkthrough.
                  </p>
                </div>
              )}

              {(error || authError) && (
                <div
                  style={{
                    padding: '12px 18px',
                    margin: '22px 0 0',
                    borderLeft: '2px solid rgba(192,128,112,0.5)',
                    background: 'rgba(192,128,112,0.05)',
                  }}
                >
                  <p
                    className="press-marginalia"
                    style={{ fontSize: 15, color: '#C08070' }}
                  >
                    — {error || authError}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
                {/* Row 1: name + family name */}
                <div className="form-row">
                  <PressField
                    label="Your name"
                    id="name"
                    type="text"
                    placeholder="Jane"
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                    disabled={loading}
                  />
                  <PressField
                    label="Your family name"
                    id="familyName"
                    type="text"
                    placeholder="The Kaufman Family"
                    value={familyName}
                    onChange={setFamilyName}
                    autoComplete="organization"
                    disabled={loading}
                  />
                </div>

                {/* Row 2: email */}
                <div style={{ marginTop: 28 }}>
                  <PressField
                    label="Your email"
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                {/* Row 3: passwords */}
                <div className="form-row" style={{ marginTop: 28 }}>
                  <PressField
                    label="Choose a password"
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <PressField
                    label="Confirm"
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>

                <hr className="press-rule" style={{ marginTop: 40 }} />

                {/* Actions */}
                <div
                  className="flex items-baseline justify-between"
                  style={{ marginTop: 24 }}
                >
                  <Link href="/login" className="press-link-sm">
                    Already have a volume? Sign in
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="press-link"
                    style={{
                      background: 'transparent',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                      fontSize: 22,
                    }}
                  >
                    {loading ? 'Opening the volume…' : 'Open the volume'}
                    {!loading && <span className="arrow">⟶</span>}
                  </button>
                </div>
              </form>

              <div className="press-fleuron mt-12">❦</div>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer
          style={{
            borderTop: '1px solid rgba(200,190,172,0.5)',
            padding: '32px 16px 48px',
            textAlign: 'center',
          }}
        >
          <p
            className="press-marginalia"
            style={{ fontSize: 14, color: '#7A6E5C', lineHeight: 1.7 }}
          >
            <em>Relish</em> &middot; a library for the people you love
            <br />
            built with care for the ones who matter
          </p>
        </footer>
      </div>

      {/* Responsive grid styles */}
      <style jsx>{`
        @media (min-width: 900px) {
          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
            gap: 80px;
            align-items: center;
          }
          .progression-grid {
            grid-template-columns: 1fr auto 1fr auto 1fr;
            gap: 40px;
          }
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
        }
      `}</style>
    </div>
  );
}

// ================================================================
// PressField — underline-only input with small-caps label
// ================================================================
function PressField({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  label: string;
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="press-chapter-label" style={{ display: 'block' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full focus:outline-none mt-2"
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: 20,
          fontStyle: 'italic',
          color: '#3A3530',
          background: 'transparent',
          border: 0,
          borderBottom: '1px solid rgba(200,190,172,0.6)',
          padding: '8px 2px 10px',
        }}
      />
    </div>
  );
}

// ================================================================
// ORNAMENT DIVIDER — matches login page
// ================================================================
function OrnamentDivider({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#7C6F5D',
        ...style,
      }}
      aria-hidden="true"
    >
      <div style={{ flex: 1, maxWidth: 140, height: 1, background: '#CEC6B8' }} />
      <span
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: 18,
          color: '#7C6F5D',
          letterSpacing: '0.2em',
        }}
      >
        ❦ · ❦ · ❦
      </span>
      <div style={{ flex: 1, maxWidth: 140, height: 1, background: '#CEC6B8' }} />
    </div>
  );
}

// ================================================================
// STAGE — one panel of the three-step progression
// ================================================================
function Stage({
  figure,
  roman,
  title,
  description,
  illustration,
}: {
  figure: string;
  roman: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>{illustration}</div>
      <div
        className="press-marginalia"
        style={{ fontSize: 15, color: '#7A6E5C', marginBottom: 10 }}
      >
        {figure}
      </div>
      <span className="press-chapter-label" style={{ display: 'block' }}>
        Step {roman}
      </span>
      <h3
        className="press-display-sm mt-2"
        style={{ fontSize: 24 }}
      >
        {title}
      </h3>
      <p
        className="press-marginalia mt-3"
        style={{ fontSize: 15, lineHeight: 1.6, margin: '12px auto 0' }}
      >
        {description}
      </p>
    </div>
  );
}

// ================================================================
// StageDivider — subtle ornament between progression stages
// ================================================================
function StageDivider() {
  return (
    <div
      className="stage-divider"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CEC6B8',
        fontFamily: 'var(--font-parent-display)',
        fontSize: 22,
        letterSpacing: '0.2em',
        alignSelf: 'center',
        marginTop: 40,
      }}
      aria-hidden="true"
    >
      <style jsx>{`
        @media (max-width: 899px) {
          .stage-divider { display: none; }
        }
      `}</style>
      ⟶
    </div>
  );
}

// ================================================================
// WAITING VOLUME — the hero illustration
// A stylized closed book seen head-on, like a book-plate frontispiece
// ================================================================
function WaitingVolume() {
  return (
    <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
      <svg
        viewBox="0 0 400 520"
        width="100%"
        height="auto"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="spineShadow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3D2F1E" stopOpacity="0.6" />
            <stop offset="10%" stopColor="#3D2F1E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3D2F1E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="deskFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6B5B3E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#6B5B3E" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Desk shadow beneath the book */}
        <ellipse
          cx="200"
          cy="480"
          rx="130"
          ry="10"
          fill="#3D2F1E"
          opacity="0.13"
        />
        <ellipse
          cx="200"
          cy="485"
          rx="100"
          ry="6"
          fill="#3D2F1E"
          opacity="0.08"
        />

        {/* Book back edge (pages) — tiny offset to suggest depth */}
        <rect
          x="78"
          y="62"
          width="244"
          height="410"
          fill="#EDE5D0"
          stroke="#C8BFA5"
          strokeWidth="0.8"
        />
        {/* Page edge striations */}
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1="78"
            y1={68 + i * 2}
            x2="322"
            y2={68 + i * 2}
            stroke="#C8BFA5"
            strokeWidth="0.5"
          />
        ))}

        {/* Book cover */}
        <rect
          x="80"
          y="60"
          width="240"
          height="410"
          fill="#8B7B5E"
          stroke="#5E4F33"
          strokeWidth="1.2"
        />

        {/* Spine shadow on the left side of cover */}
        <rect
          x="80"
          y="60"
          width="36"
          height="410"
          fill="url(#spineShadow)"
        />

        {/* Inner decorative frame — double rule */}
        <rect
          x="100"
          y="82"
          width="200"
          height="366"
          fill="none"
          stroke="#D4C89E"
          strokeWidth="1.2"
        />
        <rect
          x="106"
          y="88"
          width="188"
          height="354"
          fill="none"
          stroke="#D4C89E"
          strokeWidth="0.6"
        />

        {/* Corner ornaments */}
        {[
          { x: 100, y: 82 },
          { x: 300, y: 82 },
          { x: 100, y: 448 },
          { x: 300, y: 448 },
        ].map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill="#D4C89E" />
            <circle cx={c.x} cy={c.y} r="1.4" fill="#8B7B5E" />
          </g>
        ))}

        {/* Top decorative ornament */}
        <g transform="translate(200, 120)">
          <text
            textAnchor="middle"
            fontFamily="var(--font-parent-display)"
            fontSize="28"
            fill="#D4C89E"
            letterSpacing="0.3em"
          >
            ❦
          </text>
        </g>

        {/* Main stamped title — RELISH */}
        <text
          x="200"
          y="200"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontSize="42"
          fontStyle="italic"
          fontWeight="400"
          fill="#EDE5D0"
          letterSpacing="0.01em"
        >
          Relish
        </text>

        {/* Subtitle rule */}
        <line
          x1="130"
          y1="228"
          x2="270"
          y2="228"
          stroke="#D4C89E"
          strokeWidth="0.8"
        />

        {/* Subtitle text */}
        <text
          x="200"
          y="252"
          textAnchor="middle"
          fontFamily="var(--font-parent-body)"
          fontSize="9"
          letterSpacing="0.26em"
          fill="#D4C89E"
          fontWeight="500"
        >
          A LIVING MANUAL
        </text>
        <text
          x="200"
          y="268"
          textAnchor="middle"
          fontFamily="var(--font-parent-body)"
          fontSize="9"
          letterSpacing="0.26em"
          fill="#D4C89E"
          fontWeight="500"
        >
          FOR THE PEOPLE YOU LOVE
        </text>

        {/* Central cartouche with "Vol. I" */}
        <g transform="translate(200, 320)">
          <rect
            x="-52"
            y="-22"
            width="104"
            height="44"
            fill="none"
            stroke="#D4C89E"
            strokeWidth="0.8"
          />
          <rect
            x="-48"
            y="-18"
            width="96"
            height="36"
            fill="none"
            stroke="#D4C89E"
            strokeWidth="0.4"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-parent-display)"
            fontStyle="italic"
            fontSize="20"
            fill="#EDE5D0"
          >
            Vol. I
          </text>
        </g>

        {/* "A Volume For _____" blank line for a name */}
        <text
          x="200"
          y="388"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="13"
          fill="#D4C89E"
        >
          a volume for
        </text>
        <line
          x1="130"
          y1="410"
          x2="270"
          y2="410"
          stroke="#D4C89E"
          strokeWidth="0.8"
          strokeDasharray="3 2"
        />

        {/* Bottom fleuron */}
        <g transform="translate(200, 434)">
          <text
            textAnchor="middle"
            fontFamily="var(--font-parent-display)"
            fontSize="14"
            fill="#D4C89E"
            letterSpacing="0.3em"
          >
            ❦ · ❦ · ❦
          </text>
        </g>

        {/* Caption below book */}
        <text
          x="200"
          y="507"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontSize="13"
          fontStyle="italic"
          fill="#6B6254"
        >
          a book waiting to be written
        </text>
      </svg>
    </div>
  );
}

// ================================================================
// STAGE ONE — a single node (you begin)
// ================================================================
function StageOne() {
  return (
    <div style={{ width: '100%', maxWidth: 220, margin: '0 auto' }}>
      <svg viewBox="0 0 220 180" width="100%" height="auto" aria-hidden="true">
        {/* Frame */}
        <rect
          x="10"
          y="10"
          width="200"
          height="160"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.8"
        />
        <rect
          x="16"
          y="16"
          width="188"
          height="148"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.4"
        />

        {/* Single central node — alone, at the beginning */}
        <circle
          cx="110"
          cy="90"
          r="34"
          fill="none"
          stroke="#7C9082"
          strokeWidth="2"
          opacity="0.7"
        />
        <circle
          cx="110"
          cy="90"
          r="28"
          fill="#F7F5F0"
        />
        <circle
          cx="110"
          cy="90"
          r="24"
          fill="#5C8064"
        />
        <text
          x="110"
          y="90"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="18"
          fill="#FFFFFF"
        >
          S
        </text>

        {/* Tiny label below the node */}
        <text
          x="110"
          y="148"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="11"
          fill="#6B6254"
        >
          just you
        </text>
      </svg>
    </div>
  );
}

// ================================================================
// STAGE TWO — central node + empty invitations radiating
// ================================================================
function StageTwo() {
  const invites = [
    { cx: 50, cy: 55 },
    { cx: 170, cy: 55 },
    { cx: 40, cy: 130 },
    { cx: 180, cy: 130 },
  ];
  return (
    <div style={{ width: '100%', maxWidth: 220, margin: '0 auto' }}>
      <svg viewBox="0 0 220 180" width="100%" height="auto" aria-hidden="true">
        {/* Frame */}
        <rect
          x="10"
          y="10"
          width="200"
          height="160"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.8"
        />
        <rect
          x="16"
          y="16"
          width="188"
          height="148"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.4"
        />

        {/* Dashed connection lines — invitations being sent */}
        <g stroke="#7A6E5C" strokeWidth="1" strokeDasharray="3 3" fill="none">
          {invites.map((inv, i) => (
            <line
              key={i}
              x1="110"
              y1="90"
              x2={inv.cx}
              y2={inv.cy}
            />
          ))}
        </g>

        {/* Central node — you */}
        <circle
          cx="110"
          cy="90"
          r="30"
          fill="none"
          stroke="#7C9082"
          strokeWidth="2"
          opacity="0.6"
        />
        <circle cx="110" cy="90" r="24" fill="#F7F5F0" />
        <circle cx="110" cy="90" r="20" fill="#5C8064" />
        <text
          x="110"
          y="90"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="15"
          fill="#FFFFFF"
        >
          S
        </text>

        {/* Invited (empty) nodes — dashed rings, no fill */}
        {invites.map((inv, i) => (
          <g key={i}>
            <circle
              cx={inv.cx}
              cy={inv.cy}
              r="16"
              fill="none"
              stroke="#746856"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <text
              x={inv.cx}
              y={inv.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-parent-display)"
              fontStyle="italic"
              fontSize="12"
              fill="#7A6E5C"
            >
              ?
            </text>
          </g>
        ))}

        {/* Label */}
        <text
          x="110"
          y="148"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="11"
          fill="#6B6254"
        >
          invitations sent
        </text>
      </svg>
    </div>
  );
}

// ================================================================
// STAGE THREE — full constellation, all connected
// ================================================================
function StageThree() {
  const nodes = [
    { cx: 110, cy: 40, fill: '#5C8064', label: 'S' },
    { cx: 50, cy: 85, fill: '#8888AD', label: 'J' },
    { cx: 170, cy: 85, fill: '#C09898', label: 'M' },
    { cx: 80, cy: 138, fill: '#6B9878', label: 'K' },
    { cx: 140, cy: 138, fill: '#4A7050', label: 'E' },
  ];
  const lines: Array<[number, number, number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      lines.push([nodes[i].cx, nodes[i].cy, nodes[j].cx, nodes[j].cy]);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 220, margin: '0 auto' }}>
      <svg viewBox="0 0 220 180" width="100%" height="auto" aria-hidden="true">
        {/* Frame */}
        <rect
          x="10"
          y="10"
          width="200"
          height="160"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.8"
        />
        <rect
          x="16"
          y="16"
          width="188"
          height="148"
          fill="none"
          stroke="#D4CCB8"
          strokeWidth="0.4"
        />

        {/* Connection lines — solid now */}
        <g stroke="#D4CCB8" strokeWidth="1" opacity="0.85">
          {lines.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>

        {/* Filled nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle
              cx={n.cx}
              cy={n.cy}
              r="17"
              fill="none"
              stroke={n.fill}
              strokeWidth="1.5"
              opacity="0.55"
            />
            <circle cx={n.cx} cy={n.cy} r="13" fill="#F7F5F0" />
            <circle cx={n.cx} cy={n.cy} r="11" fill={n.fill} />
            <text
              x={n.cx}
              y={n.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-parent-display)"
              fontStyle="italic"
              fontSize="9"
              fill="#FFFFFF"
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* Label */}
        <text
          x="110"
          y="164"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fontSize="11"
          fill="#6B6254"
        >
          the manual, alive
        </text>
      </svg>
    </div>
  );
}
