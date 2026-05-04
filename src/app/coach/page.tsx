'use client';

// useSearchParams + Next 16 = the route can't be statically prerendered.
// That's fine — the page only matters for authed users anyway.
export const dynamic = 'force-dynamic';

/* ================================================================
   /coach — a standalone surface for the coach chat. Mounts the
   existing CoachChat component so it has a real URL and can be
   reached from the workbook's coach-closure card.

   On close: instead of dumping the user back at the workbook with
   nothing to do with what came up, prompt them to reflect. The
   journal-first vision treats the moment-after-coach as one of the
   highest-leverage capture windows. Two-button choice card:
     - Write a reflection → /  (the cold-open writing surface)
     - Skip — back to Read     → /workbook
   ================================================================ */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CoachChat } from '@/components/coach/CoachChat';

export default function CoachPage() {
  // Wrap the inner content in Suspense — required by Next 16 because
  // CoachInner reads useSearchParams (the page can't be statically
  // prerendered without it).
  return (
    <Suspense fallback={null}>
      <CoachInner />
    </Suspense>
  );
}

function CoachInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  // Optional person scope — if present, the coach chat is filtered to
  // entries about that person, and the chat is framed as "Asking about
  // [name]" rather than general coaching. Reached via /coach?personId=
  // X&name=Y from the home moments list and person pages.
  const askPersonId = params?.get('personId') || undefined;
  const askPersonName = params?.get('name') || undefined;
  const [showReflect, setShowReflect] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="coach-app">
        <div className="coach-page">
          <p className="coach-loading">Opening&hellip;</p>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  if (showReflect) {
    return (
      <main className="coach-app">
        <div className="coach-page">
          <section className="coach-reflect">
            <span className="coach-reflect-eye">From this conversation</span>
            <h2 className="coach-reflect-h">Want to write about what came up?</h2>
            <p className="coach-reflect-p">
              The minute after a conversation is when the journal listens best. Write a
              line — or two — and it&rsquo;ll show back up when it&rsquo;s relevant.
            </p>
            <div className="coach-reflect-actions">
              <button
                type="button"
                className="coach-reflect-cta primary"
                onClick={() => router.push('/')}
              >
                Write a reflection
              </button>
              <button
                type="button"
                className="coach-reflect-cta"
                onClick={() => router.push('/workbook')}
              >
                Skip — back to Read
              </button>
            </div>
          </section>
        </div>
        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="coach-app">
      <div className="coach-page">
        <div className="coach-frame">
          <CoachChat
            personId={askPersonId}
            personName={askPersonName}
            onClose={() => setShowReflect(true)}
          />
        </div>
      </div>
      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
  .coach-app {
    min-height: 100vh;
    background: var(--r-cream, #F7F5F0);
  }
  .coach-page {
    max-width: 880px;
    margin: 0 auto;
    padding: 88px 24px 40px;
  }
  .coach-loading {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    text-align: center;
    color: var(--r-text-4, #8A7B5F);
    padding-top: 80px;
  }
  .coach-frame {
    min-height: 70vh;
    background: rgba(255,255,255,0.65);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.45);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.8) inset,
      0 12px 40px rgba(60, 48, 28, 0.08);
  }

  .coach-reflect {
    margin-top: 80px;
    padding: 40px 44px 36px;
    background: var(--r-paper);
    border: 1px solid var(--r-rule-4);
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 6px 18px rgba(60,50,40,0.05);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .coach-reflect-eye {
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-text-5);
  }
  .coach-reflect-h {
    font-family: var(--r-serif);
    font-style: italic;
    font-weight: 300;
    font-size: 40px;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--r-ink);
    margin: 0;
  }
  .coach-reflect-p {
    font-family: var(--r-serif);
    font-size: 17px;
    line-height: 1.5;
    color: var(--r-text-3);
    margin: 0;
    max-width: 60ch;
  }
  .coach-reflect-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .coach-reflect-cta {
    cursor: pointer;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 12px 22px;
    border-radius: 999px;
    border: 1px solid var(--r-rule-3);
    background: var(--r-paper);
    color: var(--r-ink);
    transition: all 140ms var(--r-ease-ink);
  }
  .coach-reflect-cta:hover {
    border-color: var(--r-ink);
  }
  .coach-reflect-cta.primary {
    background: var(--r-leather);
    color: var(--r-paper);
    border-color: var(--r-leather);
  }
  .coach-reflect-cta.primary:hover {
    background: var(--r-leather-2);
  }
`;
