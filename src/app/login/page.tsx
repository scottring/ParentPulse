'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/workbook');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (showSignIn) {
      const t = setTimeout(() => emailRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [showSignIn]);

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
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
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
            href="/"
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
            <button
              onClick={() => setShowSignIn(true)}
              className="press-link-sm"
              style={{ background: 'transparent', cursor: 'pointer', fontSize: 16 }}
            >
              Sign in
            </button>
            <Link
              href="/register"
              className="press-link"
              style={{ fontSize: 16, borderBottomWidth: 1 }}
            >
              Begin a volume
              <span className="arrow">⟶</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ LANDING CONTENT ============ */}
      <div className="pt-[64px]">

        {/* ═══════════════════════════════════════════
            HERO — FRONTISPIECE ILLUSTRATION
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 60,
            paddingBottom: 60,
            maxWidth: 1120,
            margin: '0 auto',
          }}
        >
          {/* Running header */}
          <div className="press-running-header" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <span>Relish</span>
            <span className="sep">·</span>
            <span>A Living Manual</span>
            <span className="sep">·</span>
            <span>Frontispiece</span>
          </div>

          <div
            className="grid gap-16 lg:gap-20 items-center"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr)',
              marginTop: 40,
            }}
          >
            <div className="hero-grid">

              {/* LEFT: the illustration */}
              <div className="flex items-center justify-center">
                <FamilyFrontispiece />
              </div>

              {/* RIGHT: the title and actions */}
              <div className="text-center lg:text-left">
                <span className="press-chapter-label" style={{ display: 'inline-block' }}>
                  A library for
                </span>
                <h1
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: 'clamp(68px, 10vw, 128px)',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: '#3A3530',
                    lineHeight: 0.9,
                    letterSpacing: '-0.035em',
                    margin: '20px 0 16px',
                  }}
                >
                  the people
                  <br />
                  <span style={{ color: '#5C8064' }}>you love</span>
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
                  Build a living operating manual for each person
                  who matters — shaped by what they know about
                  themselves and what you&rsquo;ve noticed from
                  the outside.
                </p>
                <div
                  className="flex flex-col sm:flex-row items-center lg:items-start gap-6"
                  style={{ marginTop: 20 }}
                >
                  <Link
                    href="/register"
                    className="press-link"
                    style={{ fontSize: 22 }}
                  >
                    Begin a volume
                    <span className="arrow">⟶</span>
                  </Link>
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="press-link-sm"
                    style={{ background: 'transparent', cursor: 'pointer', fontSize: 15 }}
                  >
                    or sign in
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="press-asterism" style={{ marginTop: 80, marginBottom: 0 }} />
        </section>

        {/* ═══════════════════════════════════════════
            THE GAP — VENN DIAGRAM SECTION
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 80,
            paddingBottom: 80,
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="press-chapter-label">Chapter I</span>
            <h2
              className="press-display-md mt-3"
              style={{ fontSize: 'clamp(32px, 4.5vw, 44px)' }}
            >
              The magic is in the gap
            </h2>
            <p
              className="press-marginalia mt-3"
              style={{ fontSize: 14, maxWidth: 520, margin: '12px auto 0' }}
            >
              You carry one reading of a person. They carry another.
              Everyone who loves them carries a third. Relish does
              not pick a winner — it holds all of them at once.
            </p>
          </div>

          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
            <PerspectiveVenn />
          </div>

          <div className="press-asterism" style={{ marginTop: 60 }} />
        </section>

        {/* ═══════════════════════════════════════════
            THE THREE ROOMS — WITH MINI MOCKUPS
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 60,
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
              Three rooms in the library
            </h2>
            <p
              className="press-marginalia mt-3"
              style={{ fontSize: 14, maxWidth: 540, margin: '12px auto 0' }}
            >
              The whole app is three pages. Learn them once and you
              know your way around.
            </p>
          </div>

          <div
            className="grid gap-8 sm:gap-12 rooms-grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              alignItems: 'start',
            }}
          >
            <Room
              roman="I"
              label="The Workbook"
              description="One small practice a day, grounded in what your manual already knows. You open the app and do the thing."
              mock={<WorkbookMock />}
            />
            <Room
              roman="II"
              label="The Family Manual"
              description="A constellation of volumes, one per person. The reading room, where you go to understand."
              mock={<FamilyManualMock />}
            />
            <Room
              roman="III"
              label="The Archive"
              description="Reports for therapists, monthly summaries, the full record. Kept in a binder, read on occasion."
              mock={<ReportsMock />}
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
            paddingTop: 80,
            paddingBottom: 80,
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
            &ldquo;Five minutes a day
            <br />
            and the rest takes care
            <br />
            of itself.&rdquo;
          </blockquote>
          <p className="press-marginalia" style={{ fontSize: 15 }}>
            — the promise
          </p>

          <OrnamentDivider style={{ marginTop: 40 }} />
        </section>

        {/* ═══════════════════════════════════════════
            FINAL CTA
            ═══════════════════════════════════════════ */}
        <section
          className="px-6"
          style={{
            paddingTop: 40,
            paddingBottom: 60,
            textAlign: 'center',
          }}
        >
          <Link
            href="/register"
            className="press-link"
            style={{ fontSize: 28 }}
          >
            Begin your first volume
            <span className="arrow">⟶</span>
          </Link>
          <p className="press-marginalia mt-4" style={{ fontSize: 15 }}>
            No credit card. Bring one person, or a whole family.
          </p>

          <div className="press-fleuron" style={{ marginTop: 56, fontSize: 22 }}>❦</div>
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

      {/* ============ SIGN IN DIALOG ============ */}
      {showSignIn && (
        <SignInDialog
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          loading={loading}
          error={error || authError || null}
          emailRef={emailRef}
          onSubmit={handleSubmit}
          onClose={() => setShowSignIn(false)}
        />
      )}

      {/* Inline styles for responsive hero grid */}
      <style jsx>{`
        @media (min-width: 900px) {
          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
            gap: 80px;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}

// ================================================================
// FRONTISPIECE — a family constellation in SVG
// Dominant visual moment of the hero
// ================================================================
function FamilyFrontispiece() {
  // Five nodes arranged in a diamond+crown composition
  const nodes = [
    { id: 'a', x: 260, y: 90, r: 48, fill: '#5C8064', label: 'S', ring: '#7C9082' },
    { id: 'b', x: 120, y: 200, r: 42, fill: '#8888AD', label: 'J', ring: '#9898B8' },
    { id: 'c', x: 400, y: 200, r: 42, fill: '#C09898', label: 'M', ring: '#C8A0A0' },
    { id: 'd', x: 190, y: 340, r: 38, fill: '#6B9878', label: 'K', ring: '#7CA088' },
    { id: 'e', x: 330, y: 340, r: 38, fill: '#4A7050', label: 'E', ring: '#6B8B72' },
  ];

  // Build full mesh of connection lines
  const lines: Array<[number, number, number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      lines.push([nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y]);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 520,
      }}
    >
      {/* Decorative frame — Roman-numeraled corners */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-parent-body)',
          fontSize: 9,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#7A6E5C',
          fontWeight: 600,
        }}
      >
        — A Family —
      </div>

      <svg
        viewBox="0 0 520 460"
        width="100%"
        height="auto"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F7F5F0" stopOpacity="1" />
            <stop offset="70%" stopColor="#F7F5F0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F7F5F0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer decorative double rule frame */}
        <rect
          x="20" y="50"
          width="480" height="380"
          fill="none"
          stroke="#D8D1C3"
          strokeWidth="0.8"
        />
        <rect
          x="26" y="56"
          width="468" height="368"
          fill="none"
          stroke="#D8D1C3"
          strokeWidth="0.4"
        />

        {/* Corner ornaments */}
        {[
          { x: 20, y: 50 },
          { x: 500, y: 50 },
          { x: 20, y: 430 },
          { x: 500, y: 430 },
        ].map((corner, i) => (
          <g key={i}>
            <circle cx={corner.x} cy={corner.y} r="3.5" fill="#D8D1C3" />
          </g>
        ))}

        {/* Soft radial halo behind the composition */}
        <ellipse cx="260" cy="230" rx="230" ry="170" fill="url(#halo)" />

        {/* Connection lines (full mesh) */}
        <g stroke="#D4CCB8" strokeWidth="1" opacity="0.7">
          {lines.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>

        {/* Person nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Outer completeness ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 8}
              fill="none"
              stroke={node.ring}
              strokeWidth="2.5"
              opacity="0.6"
            />
            {/* White gap ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 3}
              fill="#F7F5F0"
            />
            {/* Filled circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={node.fill}
            />
            {/* Italic initial */}
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-parent-display)"
              fontSize={node.r * 0.75}
              fontStyle="italic"
              fontWeight="400"
              fill="#FFFFFF"
              letterSpacing="0.02em"
            >
              {node.label}
            </text>
          </g>
        ))}

        {/* Title label at the top */}
        <text
          x="260"
          y="45"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontSize="14"
          fontStyle="italic"
          fill="#6B6254"
          letterSpacing="0.12em"
        >
          fig. i
        </text>

        {/* Caption at the bottom */}
        <text
          x="260"
          y="450"
          textAnchor="middle"
          fontFamily="var(--font-parent-display)"
          fontSize="13"
          fontStyle="italic"
          fill="#6B6254"
        >
          five people, held together
        </text>
      </svg>
    </div>
  );
}

// ================================================================
// PERSPECTIVE VENN DIAGRAM — three overlapping circles
// Shows self / observer / truth
// ================================================================
function PerspectiveVenn() {
  return (
    <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
      <svg
        viewBox="0 0 560 360"
        width="100%"
        height="auto"
        aria-hidden="true"
      >
        <defs>
          <filter id="blend-multiply">
            <feBlend mode="multiply" />
          </filter>
        </defs>

        {/* Three overlapping circles */}
        <g>
          {/* How you see yourself — sage */}
          <circle
            cx="200"
            cy="160"
            r="110"
            fill="#7C9082"
            fillOpacity="0.28"
            stroke="#5C7566"
            strokeWidth="1.5"
          />
          {/* How others see you — muted purple */}
          <circle
            cx="360"
            cy="160"
            r="110"
            fill="#8888AD"
            fillOpacity="0.28"
            stroke="#6B6B8C"
            strokeWidth="1.5"
          />
          {/* What the app holds — warm amber */}
          <circle
            cx="280"
            cy="250"
            r="110"
            fill="#C4A265"
            fillOpacity="0.28"
            stroke="#9C7F4A"
            strokeWidth="1.5"
          />
        </g>

        {/* Labels — positioned outside each circle */}
        <g
          fontFamily="var(--font-parent-display)"
          fontStyle="italic"
          fill="#3A3530"
        >
          <text
            x="90"
            y="80"
            textAnchor="middle"
            fontSize="18"
          >
            How you
          </text>
          <text
            x="90"
            y="102"
            textAnchor="middle"
            fontSize="18"
          >
            see yourself
          </text>

          <text
            x="470"
            y="80"
            textAnchor="middle"
            fontSize="18"
          >
            How others
          </text>
          <text
            x="470"
            y="102"
            textAnchor="middle"
            fontSize="18"
          >
            see you
          </text>

          <text
            x="280"
            y="350"
            textAnchor="middle"
            fontSize="18"
          >
            What the manual holds
          </text>
        </g>

        {/* Dotted leader lines to circles */}
        <g stroke="#7A6E5C" strokeWidth="1" strokeDasharray="2 3" fill="none">
          <line x1="130" y1="95" x2="178" y2="130" />
          <line x1="430" y1="95" x2="382" y2="130" />
          <line x1="280" y1="332" x2="280" y2="290" />
        </g>

        {/* Central "the gap" label inside the overlap */}
        <g>
          <text
            x="280"
            y="190"
            textAnchor="middle"
            fontFamily="var(--font-parent-body)"
            fontSize="9"
            letterSpacing="0.22em"
            fontWeight="600"
            fill="#3A3530"
            style={{ textTransform: 'uppercase' }}
          >
            The Gap
          </text>
        </g>
      </svg>
    </div>
  );
}

// ================================================================
// MINI PRODUCT MOCKUPS
// ================================================================

// Shared outer frame for a mini mockup
function MockFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '5 / 4',
        background: '#F7F5F0',
        border: '1px solid #E3DED3',
        borderRadius: 3,
        boxShadow:
          '0 1px 0 rgba(60, 48, 28, 0.04), 0 8px 28px rgba(60, 48, 28, 0.08)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// Small ruled hairline used inside mockups
function MockRule({ width = '100%', top }: { width?: string; top?: number }) {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(200, 190, 172, 0.5)',
        width,
        position: top !== undefined ? 'absolute' : 'relative',
        top: top !== undefined ? top : undefined,
        left: top !== undefined ? '6%' : undefined,
        right: top !== undefined ? '6%' : undefined,
      }}
    />
  );
}

// WORKBOOK MOCK — a tiny two-page spread with a featured practice
function WorkbookMock() {
  return (
    <MockFrame>
      {/* Running header */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-parent-body)',
          fontSize: 6,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#7A6E5C',
        }}
      >
        the workbook
      </div>

      {/* Gutter line */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          bottom: 20,
          left: '50%',
          width: 1,
          background: 'rgba(150, 130, 90, 0.18)',
        }}
      />

      {/* LEFT PAGE — chapters */}
      <div style={{ position: 'absolute', top: 22, left: '6%', right: '52%' }}>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 15,
            fontStyle: 'italic',
            color: '#3A3530',
            marginBottom: 6,
          }}
        >
          Chapters
        </div>
        {[
          { r: 'i', title: 'Negative Cycles' },
          { r: 'ii', title: 'Sibling Fairness' },
          { r: 'iii', title: 'Morning Practice' },
        ].map((ch, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 5,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#6B6254',
                marginBottom: 1,
              }}
            >
              chapter {ch.r}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 8,
                fontStyle: 'italic',
                color: '#3A3530',
                lineHeight: 1.2,
              }}
            >
              {ch.title}
            </div>
            <div
              style={{
                height: 0.5,
                background: 'rgba(200, 190, 172, 0.5)',
                width: 24,
                marginTop: 3,
              }}
            />
          </div>
        ))}
      </div>

      {/* RIGHT PAGE — today's featured practice */}
      <div style={{ position: 'absolute', top: 22, left: '52%', right: '6%' }}>
        <div
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 5,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#6B6254',
            marginBottom: 4,
          }}
        >
          Today
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 15,
            fontStyle: 'italic',
            fontWeight: 300,
            color: '#3A3530',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            marginBottom: 8,
          }}
        >
          Five minutes
          <br />
          with Kaleb
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 6.5,
            color: '#5C5347',
            lineHeight: 1.45,
            marginBottom: 10,
          }}
        >
          After the next hard moment, find him alone and listen
          without defending yourself.
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 4.5,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#6B6254',
            marginBottom: 8,
          }}
        >
          V min · for iris
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 7,
            fontStyle: 'italic',
            color: '#2D5F5D',
            borderBottom: '0.5px solid rgba(45,95,93,0.4)',
            display: 'inline-block',
            paddingBottom: 1,
          }}
        >
          Begin this practice →
        </div>
      </div>

      {/* Folios */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: '6%',
          fontFamily: 'var(--font-parent-display)',
          fontStyle: 'italic',
          fontSize: 6,
          color: '#7A6E5C',
        }}
      >
        ix
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          right: '6%',
          fontFamily: 'var(--font-parent-display)',
          fontStyle: 'italic',
          fontSize: 6,
          color: '#7A6E5C',
        }}
      >
        x
      </div>
    </MockFrame>
  );
}

// FAMILY MANUAL MOCK — constellation + volumes catalog
function FamilyManualMock() {
  return (
    <MockFrame>
      {/* Running header */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-parent-body)',
          fontSize: 6,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#7A6E5C',
        }}
      >
        the family manual
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          bottom: 20,
          left: '50%',
          width: 1,
          background: 'rgba(150, 130, 90, 0.18)',
        }}
      />

      {/* LEFT: mini constellation */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          bottom: 12,
          left: '6%',
          right: '52%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 14,
            fontStyle: 'italic',
            color: '#3A3530',
            marginBottom: 6,
          }}
        >
          The atlas
        </div>
        <svg viewBox="0 0 140 100" width="100%" style={{ maxWidth: 120 }}>
          {/* Lines */}
          <g stroke="#D4CCB8" strokeWidth="0.7" opacity="0.7">
            <line x1="70" y1="20" x2="30" y2="60" />
            <line x1="70" y1="20" x2="110" y2="60" />
            <line x1="30" y1="60" x2="110" y2="60" />
            <line x1="30" y1="60" x2="70" y2="85" />
            <line x1="110" y1="60" x2="70" y2="85" />
            <line x1="70" y1="20" x2="70" y2="85" />
          </g>
          {/* Nodes */}
          {[
            { cx: 70, cy: 20, fill: '#5C8064', label: 'S' },
            { cx: 30, cy: 60, fill: '#8888AD', label: 'J' },
            { cx: 110, cy: 60, fill: '#C09898', label: 'M' },
            { cx: 70, cy: 85, fill: '#6B9878', label: 'K' },
          ].map((n, i) => (
            <g key={i}>
              <circle cx={n.cx} cy={n.cy} r={10} fill="#F7F5F0" />
              <circle cx={n.cx} cy={n.cy} r={8} fill={n.fill} />
              <text
                x={n.cx}
                y={n.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--font-parent-display)"
                fontStyle="italic"
                fontSize="7"
                fill="#FFFFFF"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* RIGHT: volumes list */}
      <div style={{ position: 'absolute', top: 22, left: '52%', right: '6%' }}>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 14,
            fontStyle: 'italic',
            color: '#3A3530',
            marginBottom: 6,
          }}
        >
          The volumes
        </div>
        {[
          { n: 'I', name: 'Iris Kaufman', meta: 'Partner · iii days' },
          { n: 'II', name: 'Kaleb Kaufman', meta: 'Child · xii days' },
          { n: 'III', name: 'Ella Kaufman', meta: 'Child · vi days' },
          { n: 'IV', name: 'Scott Kaufman', meta: 'Self · today' },
        ].map((v, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              padding: '3px 0',
              borderBottom: '0.5px solid rgba(200,190,172,0.4)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 4,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#6B6254',
                width: 12,
              }}
            >
              V.{v.n}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 7,
                  fontStyle: 'italic',
                  color: '#3A3530',
                  lineHeight: 1.1,
                }}
              >
                {v.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 5,
                  fontStyle: 'italic',
                  color: '#746856',
                }}
              >
                {v.meta}
              </div>
            </div>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#7C9082',
              }}
            />
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

// REPORTS MOCK — archival index
function ReportsMock() {
  return (
    <MockFrame>
      {/* Running header */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-parent-body)',
          fontSize: 6,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#7A6E5C',
        }}
      >
        the archive
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 16,
            fontStyle: 'italic',
            fontWeight: 300,
            color: '#3A3530',
            letterSpacing: '-0.01em',
          }}
        >
          The Archive
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 5,
            fontStyle: 'italic',
            color: '#746856',
            marginTop: 2,
          }}
        >
          a record of what has shifted
        </div>
      </div>

      {/* Compose action */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 6.5,
            fontStyle: 'italic',
            color: '#2D5F5D',
            borderBottom: '0.5px solid rgba(45,95,93,0.4)',
            display: 'inline-block',
            paddingBottom: 1,
          }}
        >
          Compose a new report →
        </div>
      </div>

      {/* Archive index */}
      <div style={{ position: 'absolute', top: 82, left: '10%', right: '10%', bottom: 10 }}>
        <div
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 4.5,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#6B6254',
            marginBottom: 3,
          }}
        >
          MMXXVI
        </div>
        <div
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: 4,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#746856',
            paddingLeft: 8,
            marginBottom: 2,
          }}
        >
          APRIL
        </div>
        {[
          { n: 'I', title: 'Therapist report, 30 days', date: 'apr 5' },
          { n: 'II', title: 'Monthly summary', date: 'apr 1' },
        ].map((e, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              paddingLeft: 14,
              paddingBottom: 2,
              paddingTop: 2,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: 4,
                fontWeight: 600,
                color: '#6B6254',
                width: 10,
              }}
            >
              {e.n}.
            </div>
            <div
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 7,
                fontStyle: 'italic',
                color: '#3A3530',
                flex: 'none',
              }}
            >
              {e.title}
            </div>
            <div
              style={{
                flex: 1,
                borderBottom: '0.5px dotted #CEC6B8',
                margin: '0 4px 2px',
                minWidth: 4,
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 5,
                fontStyle: 'italic',
                color: '#746856',
              }}
            >
              {e.date}
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

// ================================================================
// ROOM — a column showing a mini mockup + description
// ================================================================
function Room({
  roman,
  label,
  description,
  mock,
}: {
  roman: string;
  label: string;
  description: string;
  mock: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 20 }}>{mock}</div>
      <span
        className="press-chapter-label"
        style={{ display: 'block' }}
      >
        Room {roman}
      </span>
      <h3
        className="press-display-sm mt-2"
        style={{ fontSize: 22 }}
      >
        {label}
      </h3>
      <p
        className="press-marginalia mt-3"
        style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 280, margin: '10px auto 0' }}
      >
        {description}
      </p>
    </div>
  );
}

// ================================================================
// ORNAMENT DIVIDER — decorative typographic horizontal rule
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
// Sign in dialog — press-styled modal
// ================================================================
interface SignInDialogProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  emailRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function SignInDialog({
  email, setEmail, password, setPassword, loading, error, emailRef, onSubmit, onClose,
}: SignInDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(58, 48, 32, 0.4)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="press-volume relative overflow-hidden animate-fade-in-up"
        style={{ maxWidth: 460, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="press-running-header">
          <span>Returning to the library</span>
        </div>

        <div style={{ padding: '20px 48px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span className="press-chapter-label">Welcome back</span>
            <h2
              className="press-display-md mt-2"
              style={{ fontSize: 32 }}
            >
              Sign in
            </h2>
          </div>

          <hr className="press-rule" />

          {error && (
            <div
              style={{
                padding: '12px 16px',
                margin: '20px 0 0',
                borderLeft: '2px solid rgba(192,128,112,0.5)',
                background: 'rgba(192,128,112,0.05)',
              }}
            >
              <p
                className="press-marginalia"
                style={{ fontSize: 15, color: '#C08070' }}
              >
                — {error}
              </p>
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="mt-7">
              <label htmlFor="email" className="press-chapter-label" style={{ display: 'block' }}>
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

            <div className="mt-7">
              <label htmlFor="password" className="press-chapter-label" style={{ display: 'block' }}>
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

            <hr className="press-rule" style={{ marginTop: 32 }} />

            <div
              className="flex items-baseline justify-between"
              style={{ marginTop: 20 }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="press-link-sm"
                style={{
                  background: 'transparent',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.4 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="press-link"
                style={{
                  background: 'transparent',
                  cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                  opacity: loading || !email || !password ? 0.4 : 1,
                }}
              >
                {loading ? 'Opening the library…' : 'Open the library'}
                {!loading && <span className="arrow">⟶</span>}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p className="press-marginalia" style={{ fontSize: 15 }}>
              New here?{' '}
              <Link
                href="/register"
                className="press-link-sm"
                style={{ fontSize: 15 }}
              >
                Begin a volume ⟶
              </Link>
            </p>
          </div>

          <div className="press-fleuron mt-8">❦</div>
        </div>
      </div>
    </div>
  );
}
