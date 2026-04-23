'use client';

/* ================================================================
   /therapy/[briefId] — single brief detail.
   Themed clusters with verbatim quotes, plus a post-session notes
   field that gets carried into the next brief's prompt.

   Reachable only via the PIN-gated index page; this detail page
   inherits the unlock (usePrivacyLock's `unlocked` state persists
   across routes during the session).
   ================================================================ */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTherapyBrief } from '@/hooks/useTherapyBrief';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';

export default function TherapyBriefDetailPage({
  params,
}: {
  params: Promise<{ briefId: string }>;
}) {
  const { briefId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lock = usePrivacyLock();
  const { brief, loading, saveSessionNotes } = useTherapyBrief(briefId);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Seed the session-notes textarea once the brief loads.
  useEffect(() => {
    if (brief?.sessionNotes !== undefined && notesDraft === '') {
      setNotesDraft(brief.sessionNotes ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief?.briefId]);

  if (authLoading || !user || lock.loading || loading) {
    return (
      <main className="tb-app">
        <div className="tb-page"><p className="tb-loading">Opening&hellip;</p></div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  // If the user hasn't unlocked the room this session, send them
  // back through the gate.
  if (lock.pinIsSet && !lock.unlocked) {
    router.replace('/therapy');
    return null;
  }

  if (!brief) {
    return (
      <main className="tb-app">
        <div className="tb-page">
          <p className="tb-missing">
            <em>This brief is missing.</em>{' '}
            <Link href="/therapy">← back to your briefs</Link>
          </p>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  const generatedDate = brief.generatedAt?.toDate?.();
  const dateStr = generatedDate
    ? generatedDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await saveSessionNotes(notesDraft.trim());
      setNotesSavedAt(Date.now());
    } catch (err) {
      console.error('saveSessionNotes failed:', err);
      alert('Could not save your notes. Try again.');
    } finally {
      setNotesSaving(false);
    }
  };

  return (
    <main className="tb-app">
      <div className="tb-page">
        <div className="tb-backbar">
          <Link href="/therapy" className="tb-back">← Back to briefs</Link>
          <button
            type="button"
            className="tb-print"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>

        <header className="tb-head">
          <span className="tb-eyebrow">A therapy brief</span>
          <h1 className="tb-title">
            {dateStr ? `For session · ${dateStr}` : 'Your brief'}
          </h1>
          <p className="tb-sub">
            Compiled from the last {brief.daysBack ?? 14} days of your
            writing. Quotes are verbatim.
          </p>
        </header>

        {brief.themes.length === 0 ? (
          <section className="tb-empty">
            <p>
              <em>Not much to distill yet.</em> The last{' '}
              {brief.daysBack ?? 14} days were light on material. Write a
              few entries and generate another brief when you&rsquo;re
              ready.
            </p>
          </section>
        ) : (
          <section className="tb-themes">
            {brief.themes.map((t, i) => (
              <article key={t.id || i} className="tb-theme">
                <span className="tb-theme-number">{i + 1}</span>
                <h2 className="tb-theme-label">{t.label}</h2>
                <p className="tb-theme-summary">{t.summary}</p>
                {t.quotes.length > 0 && (
                  <ul className="tb-quotes">
                    {t.quotes.map((q, qi) => (
                      <li key={qi}>
                        <blockquote className="tb-quote">
                          &ldquo;{q.snippet}&rdquo;
                        </blockquote>
                        {q.sourceDate && (
                          <span className="tb-quote-meta">
                            {new Date(q.sourceDate).toLocaleDateString(
                              'en-GB',
                              { day: 'numeric', month: 'short' },
                            )}
                            {q.entryId && (
                              <>
                                {' · '}
                                <Link
                                  href={`/journal/${q.entryId}`}
                                  className="tb-quote-link"
                                >
                                  open the entry
                                </Link>
                              </>
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        )}

        <hr className="tb-rule" />

        <section className="tb-notes" aria-label="Post-session notes">
          <h2 className="tb-notes-title">Notes for next time</h2>
          <p className="tb-notes-sub">
            After the session, jot anything you want carried into next
            week&rsquo;s brief. Short is fine.
          </p>
          <textarea
            className="tb-notes-input"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="e.g. Keep focus on the shoulder pain + workload balance."
            rows={5}
          />
          <div className="tb-notes-actions">
            <button
              type="button"
              className="tb-notes-save"
              onClick={handleSaveNotes}
              disabled={notesSaving || notesDraft === (brief.sessionNotes ?? '')}
            >
              {notesSaving ? 'Saving…' : 'Save notes'}
            </button>
            {notesSavedAt && (
              <span className="tb-notes-saved">Saved.</span>
            )}
          </div>
        </section>
      </div>
      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
  .tb-app {
    min-height: 100vh;
    background: var(--r-cream, #F7F5F0);
  }
  .tb-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 80px 40px 80px;
  }
  .tb-loading,
  .tb-missing {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    text-align: center;
    color: var(--r-text-4, #8A7B5F);
    padding-top: 40px;
  }
  .tb-missing a { color: var(--r-ink, #3A3530); text-decoration: underline; }
  .tb-backbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }
  .tb-back {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
    text-decoration: none;
  }
  .tb-back:hover { color: var(--r-ink, #3A3530); }
  .tb-print {
    all: unset;
    cursor: pointer;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
  }
  .tb-print:hover { color: var(--r-ink, #3A3530); }
  .tb-head { margin-bottom: 40px; }
  .tb-eyebrow {
    display: block;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-4, #8A7B5F);
    margin-bottom: 12px;
  }
  .tb-title {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(34px, 4.5vw, 48px);
    line-height: 1.05;
    letter-spacing: -0.015em;
    color: var(--r-ink, #3A3530);
    margin: 0 0 10px;
  }
  .tb-sub {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 14px;
    color: var(--r-text-3, #5A5247);
    margin: 0;
  }
  .tb-empty {
    margin: 40px 0;
    padding: 28px;
    background: var(--r-paper, #FDFBF6);
    border: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    border-radius: 3px;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 16px;
    line-height: 1.55;
    color: var(--r-text-2, #4A4238);
  }
  .tb-themes { margin: 0; }
  .tb-theme {
    padding: 28px 32px 30px;
    background: var(--r-paper, #FDFBF6);
    border: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    border-radius: 3px;
    margin-bottom: 18px;
    position: relative;
  }
  .tb-theme-number {
    position: absolute;
    top: 22px;
    right: 28px;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 28px;
    color: var(--r-text-5, #887C68);
    opacity: 0.6;
  }
  .tb-theme-label {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: var(--r-ink, #3A3530);
    margin: 0 0 10px;
  }
  .tb-theme-summary {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 15px;
    line-height: 1.55;
    color: var(--r-text-2, #4A4238);
    margin: 0 0 16px;
  }
  .tb-quotes {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tb-quotes li {
    padding: 12px 0;
    border-top: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
  }
  .tb-quotes li:first-child { border-top: none; padding-top: 4px; }
  .tb-quote {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 16px;
    line-height: 1.55;
    color: var(--r-ink, #3A3530);
    margin: 0 0 6px;
    padding-left: 16px;
    border-left: 2px solid var(--r-sage, #7C9082);
  }
  .tb-quote-meta {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--r-text-5, #887C68);
  }
  .tb-quote-link {
    color: var(--r-ember, #C98452);
    text-decoration: none;
    border-bottom: 1px solid currentColor;
  }
  .tb-rule {
    border: 0;
    border-top: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    margin: 40px 0 28px;
  }
  .tb-notes-title {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-weight: 300;
    font-size: 22px;
    color: var(--r-ink, #3A3530);
    margin: 0 0 6px;
  }
  .tb-notes-sub {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 13px;
    color: var(--r-text-4, #8A7B5F);
    margin: 0 0 12px;
  }
  .tb-notes-input {
    width: 100%;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 15px;
    line-height: 1.55;
    color: var(--r-ink, #3A3530);
    background: var(--r-paper, #FDFBF6);
    border: 1px solid var(--r-rule-5, rgba(200,190,172,0.6));
    border-radius: 3px;
    padding: 14px 16px;
    resize: vertical;
  }
  .tb-notes-input:focus {
    outline: none;
    border-color: var(--r-sage, #7C9082);
  }
  .tb-notes-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 14px;
  }
  .tb-notes-save {
    all: unset;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 999px;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-paper, #FDFBF6);
    background: var(--r-leather, #14100C);
    border: 1px solid var(--r-leather, #14100C);
  }
  .tb-notes-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .tb-notes-saved {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 13px;
    color: var(--r-sage, #7C9082);
  }

  @media print {
    .tb-backbar, .tb-notes, .tb-rule { display: none; }
    .tb-app { background: white; }
    .tb-theme { border: none; background: white; }
  }
`;
