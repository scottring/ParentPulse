'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePractice } from '@/hooks/usePractice';
import { AttachmentRow } from '@/components/capture/AttachmentRow';
import { EntryMedia } from '@/components/journal-spread/EntryMedia';
import type { JournalMedia } from '@/types/journal';

export default function PracticeDetailPage() {
  const params = useParams<{ practiceId: string }>();
  const router = useRouter();
  const practiceId = params?.practiceId ?? null;
  const { user, loading: authLoading } = useAuth();
  const {
    practice,
    sessions,
    loading,
    error,
    logSession,
    markDoneThisWeek,
    isDoneThisWeek,
  } = usePractice(practiceId);

  const [body, setBody] = useState('');
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (authLoading || loading) {
    return (
      <main className="shell">
        <p className="empty">Opening the practice…</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (error || !practice) {
    return (
      <main className="shell">
        <p className="empty">{error ?? "That practice isn't here."}</p>
        <p className="back">
          <Link href="/workbook">← back to the workbook</Link>
        </p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  const cadenceLabel =
    practice.cadence === 'weekly'
      ? 'WEEKLY'
      : practice.cadence === 'biweekly'
        ? 'BIWEEKLY'
        : practice.cadence === 'monthly'
          ? 'MONTHLY'
          : 'AD HOC';

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await logSession(body, media.length > 0 ? media : undefined);
      setJustSaved(true);
      setBody('');
      setMedia([]);
      setTimeout(() => setJustSaved(false), 1200);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <div className="page">
        {/* Header band */}
        <section className="header-band">
          <p className="kicker">PRACTICE · {cadenceLabel}</p>
          <h1 className="title">{practice.name}</h1>
          <p className="subtitle">{practice.description}</p>
          <div className="header-actions">
            <button
              type="button"
              className="mark-done"
              disabled={isDoneThisWeek}
              onClick={async () => {
                if (isDoneThisWeek) return;
                await markDoneThisWeek();
              }}
              title={
                isDoneThisWeek
                  ? 'This practice is already marked done for the week'
                  : 'Mark this week done without writing a session'
              }
            >
              {isDoneThisWeek ? 'DONE THIS WEEK' : 'MARK THIS WEEK DONE'}
            </button>
          </div>
        </section>

        {/* The prompt card */}
        <section className="card prompts">
          <p className="card-kicker">THE PRACTICE</p>
          <ol className="prompt-list">
            {practice.prompts.map((p, i) => (
              <li key={i} className="prompt-item">
                <em>{p}</em>
              </li>
            ))}
          </ol>
          <p className="edit-hint">
            You can edit these prompts in{' '}
            <Link href="/settings#practices" className="muted-link">Settings</Link>.
          </p>
        </section>

        {/* The sit-down log */}
        <section className="card log">
          <p className="card-kicker">THIS WEEK&apos;S SIT-DOWN</p>
          {justSaved ? (
            <p className="saved">In the book.</p>
          ) : (
            <>
              <textarea
                className="log-textarea"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write down what came up. What you noticed. What you want to keep."
              />
              {user.familyId && (
                <div style={{ marginTop: 8 }}>
                  <AttachmentRow
                    familyId={user.familyId}
                    media={media}
                    onChange={setMedia}
                    compact
                  />
                </div>
              )}
              <div className="log-actions">
                <button
                  type="button"
                  className="submit"
                  onClick={submit}
                  disabled={!body.trim() || submitting}
                >
                  {submitting ? 'Keeping…' : 'IN THE BOOK.'}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Past sit-downs */}
        {sessions.length > 0 && (
          <section className="past-band">
            <p className="card-kicker">PAST SIT-DOWNS</p>
            <ol className="past-list">
              {sessions.map((s) => {
                const expanded = expandedId === s.sessionId;
                const date = s.createdAt?.toDate?.();
                const label = date
                  ? date.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : s.weekOf;
                const excerpt = s.body.length > 160 ? s.body.slice(0, 160) + '…' : s.body;
                const hasMedia = (s.media?.length ?? 0) > 0;
                return (
                  <li key={s.sessionId} className="past-item">
                    <button
                      type="button"
                      className="past-header"
                      onClick={() =>
                        setExpandedId(expanded ? null : s.sessionId)
                      }
                      aria-expanded={expanded}
                    >
                      <span className="past-date">{label}</span>
                      <span className="past-excerpt">
                        {expanded ? '' : excerpt}
                      </span>
                      {hasMedia && <span className="past-glyph" aria-hidden>✦</span>}
                    </button>
                    {expanded && (
                      <div className="past-body">
                        <p className="past-text">{s.body}</p>
                        <EntryMedia media={s.media} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
  .shell {
    min-height: 100vh;
    background: var(--r-cream, #f7f3ea);
    padding-top: 72px;
    padding-bottom: 96px;
  }
  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 24px 48px;
  }
  .header-band {
    background: var(--r-cream-warm, #f2ebdc);
    border: 1px solid var(--r-rule-4, #e8e1d2);
    border-radius: var(--r-radius-2, 6px);
    padding: 28px 32px;
    margin-bottom: 24px;
  }
  .kicker {
    margin: 0 0 10px 0;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-4, #a89373);
  }
  .title {
    margin: 0 0 8px 0;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 44px;
    line-height: 1.1;
    color: var(--r-ink, #2d2418);
    font-weight: 400;
  }
  .subtitle {
    margin: 0 0 20px 0;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 17px;
    line-height: 1.5;
    color: var(--r-text-3, #6b5d45);
    max-width: 560px;
  }
  .header-actions {
    display: flex;
    justify-content: flex-end;
  }
  .mark-done {
    all: unset;
    cursor: pointer;
    padding: 8px 16px;
    font-family: var(--r-sans, sans-serif);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--r-text-3, #6b5d45);
    border: 1px solid var(--r-rule-3, #d0c4a8);
    border-radius: var(--r-radius-pill, 999px);
    transition: all 150ms ease;
  }
  .mark-done:hover:not(:disabled) {
    background: var(--r-paper, #fff);
    color: var(--r-ink, #2d2418);
  }
  .mark-done:disabled {
    color: var(--r-sage, #5c8064);
    border-color: var(--r-sage, #5c8064);
    background: var(--r-tint-sage, rgba(92,128,100,0.08));
    cursor: default;
  }
  .card {
    background: var(--r-paper, #fff);
    border: 1px solid var(--r-rule-4, #e8e1d2);
    border-radius: var(--r-radius-2, 6px);
    padding: 32px;
    margin-bottom: 24px;
  }
  .card-kicker {
    margin: 0 0 16px 0;
    font-family: var(--r-sans, sans-serif);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-4, #a89373);
  }
  .prompt-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .prompt-item {
    padding: 14px 0;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 18px;
    line-height: 1.5;
    color: var(--r-ink, #2d2418);
    border-bottom: 1px solid var(--r-rule-5, #ece6d7);
  }
  .prompt-item:last-child {
    border-bottom: none;
  }
  .edit-hint {
    margin: 16px 0 0 0;
    font-family: var(--r-sans, sans-serif);
    font-size: 12px;
    color: var(--r-text-4, #a89373);
  }
  .edit-hint :global(.muted-link) {
    color: var(--r-text-3, #6b5d45);
    text-decoration: underline;
  }
  .log-textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    resize: vertical;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 20px;
    line-height: 1.5;
    color: var(--r-ink, #2d2418);
    padding: 8px 0;
  }
  .log-textarea::placeholder {
    color: var(--r-text-4, #a89373);
    font-style: italic;
  }
  .log-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
  .submit {
    all: unset;
    cursor: pointer;
    padding: 10px 20px;
    background: var(--r-leather, #2d2418);
    color: var(--r-ink-reversed, #f7f3ea);
    font-family: var(--r-sans, sans-serif);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--r-radius-3, 6px);
  }
  .submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .saved {
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 22px;
    color: var(--r-sage, #5c8064);
    padding: 16px 0;
    margin: 0;
  }
  .past-band {
    background: var(--r-paper-soft, #faf7f1);
    border: 1px solid var(--r-rule-4, #e8e1d2);
    border-radius: var(--r-radius-2, 6px);
    padding: 24px 28px;
  }
  .past-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .past-item {
    padding: 12px 0;
    border-bottom: 1px solid var(--r-rule-5, #ece6d7);
  }
  .past-item:last-child {
    border-bottom: none;
  }
  .past-header {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: baseline;
    gap: 16px;
    width: 100%;
  }
  .past-date {
    flex: none;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 14px;
    color: var(--r-ink, #2d2418);
    min-width: 180px;
  }
  .past-excerpt {
    flex: 1;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 14px;
    color: var(--r-text-3, #6b5d45);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .past-glyph {
    flex: none;
    font-size: 12px;
    color: var(--r-text-4, #a89373);
  }
  .past-body {
    padding: 12px 0 0 16px;
  }
  .past-text {
    margin: 0;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 15px;
    line-height: 1.55;
    color: var(--r-ink, #2d2418);
    white-space: pre-wrap;
  }
  .empty {
    max-width: 640px;
    margin: 48px auto 0;
    padding: 0 24px;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    color: var(--r-text-4, #a89373);
    text-align: center;
  }
  .back {
    text-align: center;
    margin-top: 12px;
    font-family: var(--r-serif, Georgia, serif);
  }
  .back :global(a) {
    color: var(--r-ink, #2d2418);
    text-decoration: underline;
  }
`;
