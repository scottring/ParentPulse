'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  addDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useMoment } from '@/hooks/useMoment';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { useMomentInvite } from '@/hooks/useMomentInvite';
import { MomentSynthesisCard } from '@/components/journal-spread/MomentSynthesisCard';
import { ClosingActionCard } from '@/components/open-threads/ClosingActionCard';
import { InviteViewSheet } from '@/components/moments/InviteViewSheet';
import type { JournalEntry } from '@/types/journal';

export default function MomentDetailPage() {
  const params = useParams<{ momentId: string }>();
  const momentId = params?.momentId;
  const { user } = useAuth();
  const { moment, views, loading, notFound, error } = useMoment(momentId);
  const { threads } = useOpenThreads();
  const {
    pendingForMe,
    sentByMe,
    answerInvite,
  } = useMomentInvite();

  const selfThread = momentId
    ? threads.find((t) => t.kind === 'moment' && t.id === momentId)
    : undefined;

  // My pending invite FOR this moment (I'm the recipient).
  const myInviteForThisMoment = useMemo(
    () => pendingForMe.find((i) => i.momentId === momentId),
    [pendingForMe, momentId],
  );

  // Invites I've SENT for this moment that are still pending.
  const sentPendingForThisMoment = useMemo(
    () =>
      sentByMe.filter(
        (i) => i.momentId === momentId && i.status === 'pending',
      ),
    [sentByMe, momentId],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="shell">
        <p className="empty">Sign in to view this moment.</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="empty">Loading the moment…</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (notFound || !moment) {
    return (
      <main className="shell">
        <p className="empty">We couldn&apos;t find that moment.</p>
        <p className="back"><Link href="/journal">← back to the journal</Link></p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell">
        <p className="empty">{error}</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  const title = moment.title?.trim() || 'A moment';
  const existingViewerUserIds = Array.from(
    new Set(views.map((v) => v.authorId)),
  );

  // Blind-mode gate: recipient with a blind pending invite shouldn't
  // see the existing views until they submit. Anchored invites (or
  // no invite) render the views normally.
  const isBlindRecipient =
    myInviteForThisMoment?.mode === 'blind';

  async function submitResponse() {
    if (!user || !moment || !myInviteForThisMoment) return;
    const trimmed = responseText.trim();
    if (trimmed.length < 3) {
      setSubmitError('Say a little more before submitting.');
      return;
    }
    setSubmittingResponse(true);
    setSubmitError(null);
    try {
      const now = Timestamp.now();
      // Inherit sharedWithUserIds from the sender so they can read
      // the view that answers them.
      const sharedWithUserIds = Array.from(
        new Set([myInviteForThisMoment.fromUserId]),
      );
      const visibleToUserIds = Array.from(
        new Set([user.userId, ...sharedWithUserIds]),
      );
      const entryRef = await addDoc(
        collection(firestore, 'journal_entries'),
        {
          familyId: user.familyId,
          authorId: user.userId,
          text: trimmed,
          category: 'moment',
          tags: ['moment', 'invited-view'],
          visibleToUserIds,
          sharedWithUserIds,
          personMentions: [],
          subjectType: 'self',
          momentId: moment.momentId,
          createdAt: now,
        },
      );
      await answerInvite(myInviteForThisMoment.inviteId, entryRef.id);
      setResponseText('');
    } catch (err) {
      console.error('submitResponse failed', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit your view',
      );
    } finally {
      setSubmittingResponse(false);
    }
  }

  return (
    <main className="shell">
      <article className="page">
        <header className="masthead">
          <p className="kicker">Moment</p>
          <h1 className="title">{title}</h1>
        </header>

        {/* Pending invite I've received (recipient path) */}
        {myInviteForThisMoment && (
          <section className="invite-banner" aria-label="Pending invite">
            <p className="ib-kicker">
              Someone asked what you saw · mode: {myInviteForThisMoment.mode}
            </p>
            {myInviteForThisMoment.prompt && (
              <p className="ib-prompt">
                <em>&ldquo;{myInviteForThisMoment.prompt}&rdquo;</em>
              </p>
            )}
            {isBlindRecipient && (
              <p className="ib-note">
                Write your view first. You&rsquo;ll see the other views once
                you submit.
              </p>
            )}
            <textarea
              className="ib-textarea"
              rows={5}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="What did you see? A few sentences."
            />
            {submitError && <p className="ib-error">{submitError}</p>}
            <div className="ib-actions">
              <button
                type="button"
                className="ib-submit"
                onClick={submitResponse}
                disabled={submittingResponse || responseText.trim().length < 3}
              >
                {submittingResponse ? 'Submitting…' : 'Submit your view'}
              </button>
            </div>
          </section>
        )}

        {selfThread && <ClosingActionCard thread={selfThread} />}

        {/* Hide synthesis + views if blind recipient hasn't submitted yet */}
        {!isBlindRecipient && (
          <MomentSynthesisCard moment={moment} views={views} />
        )}

        {!isBlindRecipient && views.length > 0 && (
          <section className="views-section" aria-label="All views">
            <h2 className="section-heading">
              {views.length === 1 ? 'One view' : `${views.length} views`} on this moment
              {sentPendingForThisMoment.length > 0 && (
                <span className="meta">
                  {' · '}{sentPendingForThisMoment.length}{' '}
                  {sentPendingForThisMoment.length === 1
                    ? 'requested'
                    : 'requested views'}{' '}
                  pending
                </span>
              )}
            </h2>
            <ol className="views-list">
              {views.map((v: JournalEntry) => (
                <li key={v.entryId} className="view-row">
                  <Link href={`/journal/${v.entryId}`} className="view-link">
                    <span className="view-author">
                      {v.authorId === user.userId ? 'You' : v.authorId}
                    </span>
                    <span className="view-text">{v.text}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Floating invite CTA (hidden if you're the blind recipient) */}
        {!isBlindRecipient && (
          <button
            type="button"
            className="invite-cta"
            onClick={() => setSheetOpen(true)}
          >
            invite a view
          </button>
        )}

        {sheetOpen && (
          <InviteViewSheet
            moment={moment}
            existingViewerUserIds={existingViewerUserIds}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </article>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
  .shell {
    min-height: 100vh;
    background: #f7f3ea;
    padding-bottom: 80px;
    padding-top: 80px;
  }
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px 48px;
  }
  .masthead { margin-bottom: 28px; }
  .kicker {
    margin: 0 0 6px 0;
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-5, #a89373);
  }
  .title {
    margin: 0;
    font-family: var(--r-serif, Georgia, serif);
    font-style: italic;
    font-size: 32px;
    line-height: 1.2;
    color: var(--r-ink, #2d2418);
  }

  .invite-banner {
    background: var(--r-leather, #14100C);
    color: var(--r-paper, #FBF8F2);
    border-radius: 4px;
    padding: 22px 24px 20px;
    margin-bottom: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ib-kicker {
    font-family: var(--r-sans);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--r-amber, #C9A84C);
    margin: 0;
  }
  .ib-prompt {
    margin: 0;
    font-family: var(--r-serif);
    font-size: 19px;
    line-height: 1.35;
    color: var(--r-paper);
  }
  .ib-note {
    margin: 0;
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 14px;
    color: rgba(245,236,216,0.7);
  }
  .ib-textarea {
    width: 100%;
    margin-top: 6px;
    padding: 12px 14px;
    background: rgba(245,236,216,0.06);
    border: 1px solid rgba(245,236,216,0.18);
    border-radius: 3px;
    font-family: var(--r-serif);
    font-size: 16px;
    line-height: 1.5;
    color: var(--r-paper);
    resize: vertical;
    outline: none;
  }
  .ib-textarea::placeholder { color: rgba(245,236,216,0.45); font-style: italic; }
  .ib-error {
    margin: 0;
    color: var(--r-ember-soft, #D4A872);
    font-family: var(--r-serif);
    font-size: 13px;
  }
  .ib-actions { display: flex; justify-content: flex-end; }
  .ib-submit {
    all: unset;
    cursor: pointer;
    padding: 10px 18px;
    background: var(--r-amber, #C9A84C);
    color: var(--r-leather, #14100C);
    border-radius: 999px;
    font-family: var(--r-sans);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .ib-submit:disabled { opacity: 0.4; cursor: not-allowed; }

  .views-section { margin-top: 32px; }
  .section-heading {
    margin: 0 0 14px 0;
    font-family: var(--r-sans);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-5);
    font-weight: 500;
  }
  .section-heading .meta { color: var(--r-text-5); font-weight: 400; }
  .views-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
  .view-row :global(a) {
    display: block;
    padding: 14px 16px;
    background: var(--r-paper-soft, #faf7f1);
    border: 1px solid var(--r-rule-5, #e8e1d2);
    border-radius: 4px;
    color: var(--r-ink);
    text-decoration: none;
  }
  .view-row :global(a:hover) { background: var(--r-cream-warm, #f2ebdc); }
  .view-author {
    display: block;
    font-family: var(--r-sans);
    font-size: 11px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--r-text-5);
    margin-bottom: 4px;
  }
  .view-text {
    display: block;
    font-family: var(--r-serif);
    font-size: 14px;
    line-height: 1.55;
    color: var(--r-text-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .invite-cta {
    position: fixed;
    right: 24px;
    bottom: 24px;
    padding: 12px 18px;
    background: var(--r-leather);
    color: var(--r-paper);
    border: none;
    border-radius: 999px;
    font-family: var(--r-serif);
    font-style: italic;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(45, 36, 24, 0.18);
    cursor: pointer;
  }
  .invite-cta:hover { background: var(--r-leather-2, #1a1610); }

  .empty {
    max-width: 640px;
    margin: 48px auto 0;
    padding: 0 24px;
    font-family: var(--r-serif);
    font-style: italic;
    color: var(--r-text-5);
    text-align: center;
  }
  .back { text-align: center; margin-top: 12px; font-family: var(--r-serif); }
  .back :global(a) { color: var(--r-ink); text-decoration: underline; }
`;
