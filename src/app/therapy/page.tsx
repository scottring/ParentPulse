'use client';

/* ================================================================
   /therapy — the simpler "brief for your therapist" surface.
   PIN-gated. Landing shows a "Prepare a brief" button plus a list
   of past briefs. Tapping a brief opens its detail at
   /therapy/[briefId]. Nothing else.

   Full model (Therapist entity, windows, carry-forward state
   machine) is preserved on origin/therapy-prep for reference —
   see project_therapy_simpler_model.md in memory.
   ================================================================ */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTherapyBriefs } from '@/hooks/useTherapyBriefs';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function TherapyIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { briefs, loading: briefsLoading } = useTherapyBriefs();
  const lock = usePrivacyLock();
  const [generating, setGenerating] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const fn = httpsCallable<{ daysBack?: number }, { briefId: string }>(
        functions,
        'generateTherapyBrief',
      );
      const res = await fn({ daysBack: 14 });
      if (res.data?.briefId) {
        router.push(`/therapy/${res.data.briefId}`);
      }
    } catch (err) {
      console.error('generateTherapyBrief failed:', err);
      alert('Could not prepare a brief. Please try again in a minute.');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || !user || lock.loading) {
    return (
      <main className="th-app">
        <div className="th-page">
          <p className="th-loading">Opening&hellip;</p>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  // ─── No PIN yet → offer setup ───
  if (!lock.pinIsSet) {
    return (
      <main className="th-app">
        <div className="th-page">
          <header className="th-head">
            <span className="th-eyebrow">Therapy</span>
            <h1 className="th-title">A private room.</h1>
            <p className="th-sub">
              This page is for material you&rsquo;d take to a therapist.
              Set a PIN to keep it behind a lock that only you open.
            </p>
          </header>
          <div className="th-actions">
            <button
              type="button"
              className="th-cta"
              onClick={() => setShowPinSetup(true)}
            >
              Set a PIN <span aria-hidden="true">⟶</span>
            </button>
          </div>
        </div>
        {showPinSetup && (
          <PinSetupModal
            onComplete={async (pin) => {
              await lock.setupPin(pin);
              setShowPinSetup(false);
            }}
            onCancel={() => setShowPinSetup(false)}
          />
        )}
        <style jsx global>{styles}</style>
      </main>
    );
  }

  // ─── PIN is set but not unlocked this session → prompt for it ───
  if (!lock.unlocked) {
    return (
      <main className="th-app">
        <div className="th-page">
          <header className="th-head">
            <span className="th-eyebrow">Therapy</span>
            <h1 className="th-title">Locked.</h1>
            <p className="th-sub">Enter your PIN to unlock this room.</p>
          </header>
          <div className="th-unlock">
            <PinKeypad
              title="Enter your PIN"
              error={pinError}
              onSubmit={async (pin) => {
                const ok = await lock.verify(pin);
                if (!ok) {
                  setPinError('Incorrect PIN. Try again.');
                  return false;
                }
                setPinError(null);
                return true;
              }}
            />
          </div>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  // ─── Unlocked → show briefs list + generate button ───
  return (
    <main className="th-app">
      <div className="th-page">
        <header className="th-head">
          <span className="th-eyebrow">Therapy</span>
          <h1 className="th-title">Prepare for your next session.</h1>
          <p className="th-sub">
            Tap below and Relish will compile a one-page brief from the
            last two weeks — themed, with your own words pulled
            through. You can read it, annotate it, bring it in.
          </p>
        </header>

        <div className="th-actions">
          <button
            type="button"
            className="th-cta"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Preparing…' : 'Prepare a brief'}
            {!generating && <span aria-hidden="true"> ⟶</span>}
          </button>
        </div>

        <hr className="th-rule" />

        <section className="th-past" aria-label="Past briefs">
          <h2 className="th-past-title">Past briefs</h2>
          {briefsLoading ? (
            <p className="th-empty">Reading the shelf&hellip;</p>
          ) : briefs.length === 0 ? (
            <p className="th-empty">
              <em>None yet.</em> Your first brief will land here when you
              prepare one.
            </p>
          ) : (
            <ul className="th-brief-list">
              {briefs.map((b) => {
                const date = b.generatedAt?.toDate?.();
                const dateStr = date
                  ? date.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';
                const themeLabels = (b.themes || [])
                  .slice(0, 3)
                  .map((t) => t.label)
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={b.briefId}>
                    <Link href={`/therapy/${b.briefId}`} className="th-brief-row">
                      <span className="th-brief-date">{dateStr}</span>
                      <span className="th-brief-themes">
                        {themeLabels ||
                          (b.themes?.length
                            ? `${b.themes.length} themes`
                            : 'No themes')}
                      </span>
                      <span className="th-brief-arrow">⟶</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <button
          type="button"
          className="th-lock"
          onClick={() => lock.lock()}
        >
          Lock this room
        </button>
      </div>
      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
  .th-app {
    min-height: 100vh;
    background: var(--r-cream, #F7F5F0);
  }
  .th-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 104px 40px 80px;
  }
  .th-loading {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    text-align: center;
    color: var(--r-text-4, #8A7B5F);
    padding-top: 80px;
  }
  .th-head {
    text-align: center;
    margin-bottom: 36px;
  }
  .th-eyebrow {
    display: block;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
    margin-bottom: 14px;
  }
  .th-title {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(38px, 5vw, 54px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--r-ink, #3A3530);
    margin: 0 0 14px;
  }
  .th-sub {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 15px;
    line-height: 1.6;
    color: var(--r-text-3, #5A5247);
    margin: 0 auto;
    max-width: 480px;
  }
  .th-actions {
    display: flex;
    justify-content: center;
    margin: 28px 0 40px;
  }
  .th-cta {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 26px;
    border-radius: 999px;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-paper, #FDFBF6);
    background: var(--r-leather, #14100C);
    border: 1px solid var(--r-leather, #14100C);
    transition: opacity 120ms ease;
  }
  .th-cta:hover:not(:disabled) { opacity: 0.88; }
  .th-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .th-unlock {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 32px;
  }
  .th-error {
    margin-top: 16px;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 13px;
    color: #9E4A38;
  }
  .th-rule {
    border: 0;
    border-top: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    margin: 40px 0 28px;
  }
  .th-past-title {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: 24px;
    color: var(--r-ink, #3A3530);
    margin: 0 0 18px;
  }
  .th-empty {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 14px;
    color: var(--r-text-4, #8A7B5F);
  }
  .th-empty em {
    font-style: italic;
    color: var(--r-ink, #3A3530);
  }
  .th-brief-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .th-brief-row {
    display: grid;
    grid-template-columns: 160px 1fr 20px;
    gap: 16px;
    align-items: baseline;
    padding: 14px 0;
    border-top: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    text-decoration: none;
    color: inherit;
    transition: background 120ms ease;
  }
  .th-brief-list li:last-child .th-brief-row {
    border-bottom: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
  }
  .th-brief-row:hover {
    background: rgba(124,144,130,0.05);
  }
  .th-brief-date {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
  }
  .th-brief-themes {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 16px;
    color: var(--r-ink, #3A3530);
    line-height: 1.4;
  }
  .th-brief-arrow {
    font-family: var(--r-serif, Georgia, serif);
    font-size: 14px;
    color: var(--r-text-4, #8A7B5F);
  }
  .th-lock {
    all: unset;
    display: block;
    margin: 48px auto 0;
    cursor: pointer;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
  }
  .th-lock:hover { color: var(--r-ink, #3A3530); }
`;
