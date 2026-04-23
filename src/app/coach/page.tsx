'use client';

/* ================================================================
   /coach — a standalone surface for the coach chat. Mounts the
   existing CoachChat component so it has a real URL and can be
   reached from the workbook's coach-closure card. Closing the chat
   returns to the workbook.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CoachChat } from '@/components/coach/CoachChat';

export default function CoachPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  return (
    <main className="coach-app">
      <div className="coach-page">
        <div className="coach-frame">
          <CoachChat onClose={() => router.push('/workbook')} />
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
`;
