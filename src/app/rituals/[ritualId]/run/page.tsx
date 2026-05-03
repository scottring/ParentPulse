'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRitual, closeRitualRun } from '@/hooks/useRitual';
import { useWeeklyBrief } from '@/hooks/useWeeklyBrief';
import type { JournalEntry } from '@/types/journal';
import type { Moment } from '@/types/moment';

type Step = 'read' | 'respond' | 'close';

const RITUAL_KIND_LABEL: Record<string, string> = {
  solo_weekly: 'Solo weekly',
  partner_biweekly: 'Partner biweekly',
  family_monthly: 'Family monthly',
  repair: 'Repair',
};

export default function RitualRunPage() {
  const params = useParams<{ ritualId: string }>();
  const ritualId = params?.ritualId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { ritual, loading, notFound, error } = useRitual(ritualId);

  const [step, setStep] = useState<Step>('read');
  const [sinceEntries, setSinceEntries] = useState<JournalEntry[] | null>(null);
  const [divergentMoments, setDivergentMoments] = useState<Moment[] | null>(null);
  const { brief } = useWeeklyBrief();
  const [responseText, setResponseText] = useState('');
  const [closingText, setClosingText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isParticipant = useMemo(() => {
    if (!ritual || !user) return false;
    return ritual.participantUserIds.includes(user.userId);
  }, [ritual, user]);

  // Fetch entries visible to the user since the last run (or since
  // ritual creation if this is the first run).
  useEffect(() => {
    if (!ritual || !user?.familyId || !user?.userId) return;

    const sinceTs = ritual.lastRunAt ?? ritual.createdAt;
    const run = async () => {
      try {
        const q = query(
          collection(firestore, 'journal_entries'),
          where('familyId', '==', user.familyId),
          where('visibleToUserIds', 'array-contains', user.userId),
          where('createdAt', '>', sinceTs),
          orderBy('createdAt', 'desc'),
          limit(20),
        );
        const snap = await getDocs(q);
        const arr: JournalEntry[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<JournalEntry, 'entryId'>),
          entryId: d.id,
        } as JournalEntry));
        setSinceEntries(arr);
      } catch (err) {
        console.error('ritual runner: since-query failed', err);
        setSinceEntries([]);
      }
    };
    void run();
  }, [ritual, user?.familyId, user?.userId]);

  // Fetch divergent moments since last run — moments the user is a
  // participant in that have a cached divergenceLine and have not yet
  // been closed by any ritual. These are the raw material the ritual
  // exists to metabolize.
  useEffect(() => {
    if (!ritual || !user?.familyId || !user?.userId) return;

    const sinceTs = ritual.lastRunAt ?? ritual.createdAt;
    const run = async () => {
      try {
        const q = query(
          collection(firestore, 'moments'),
          where('familyId', '==', user.familyId),
          where('participantUserIds', 'array-contains', user.userId),
          where('createdAt', '>', sinceTs),
          orderBy('createdAt', 'desc'),
          limit(30),
        );
        const snap = await getDocs(q);
        const arr: Moment[] = snap.docs
          .map((d) => ({
            ...(d.data() as Omit<Moment, 'momentId'>),
            momentId: d.id,
          }))
          .filter((m) => !!m.synthesis?.divergenceLine)
          .slice(0, 6);
        setDivergentMoments(arr);
      } catch (err) {
        console.error('ritual runner: divergent-moments query failed', err);
        setDivergentMoments([]);
      }
    };
    void run();
  }, [ritual, user?.familyId, user?.userId]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <main className="shell">
        <p className="empty">Opening the ritual…</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (!user || !ritual) {
    return (
      <main className="shell">
        <p className="empty">{notFound || error ? 'Ritual not found.' : '—'}</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (!isParticipant) {
    return (
      <main className="shell">
        <p className="empty">You&apos;re not a participant in this ritual.</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  const kindLabel = RITUAL_KIND_LABEL[ritual.kind] ?? ritual.kind;

  async function submitClose() {
    if (!user || !ritual) return;
    const trimmed = closingText.trim();
    if (trimmed.length < 3) {
      setSubmitError('Say a little more before closing.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const now = Timestamp.now();

      // Step A: create the moment doc so the reflection has something
      // to attach to. Solo participant = single-view moment at start.
      const momentRef = await addDoc(collection(firestore, 'moments'), {
        familyId: user.familyId,
        createdByUserId: user.userId,
        title: `${kindLabel} · ${now.toDate().toLocaleDateString()}`,
        dimensions: [],
        tags: ['ritual', ritual.kind],
        participantUserIds: [user.userId],
        viewCount: 1,
        lastViewAddedAt: now,
        createdAt: now,
      });

      // Step B: write the reflection entry with momentId + ritualId.
      // Shared with all other participants (they may not have been
      // in the session yet but they should see the close).
      const others = ritual.participantUserIds.filter((u) => u !== user.userId);
      const visibleToUserIds = Array.from(new Set([user.userId, ...others]));
      const entryRef = await addDoc(collection(firestore, 'journal_entries'), {
        familyId: user.familyId,
        authorId: user.userId,
        text: trimmed,
        title: `Ritual close · ${kindLabel}`,
        category: 'reflection',
        tags: ['ritual', ritual.kind],
        visibleToUserIds,
        sharedWithUserIds: others,
        personMentions: [],
        subjectType: 'self',
        ritualId: ritual.ritualId,
        momentId: momentRef.id,
        context: {timeOfDay: 'evening'},
        createdAt: now,
      });

      // Step C: bump ritual counters and compute the next run.
      await closeRitualRun({
        ritualId: ritual.ritualId,
        momentId: momentRef.id,
        ranAt: now.toDate(),
        cadence: ritual.cadence,
      });

      router.push(`/journal/${entryRef.id}`);
    } catch (err) {
      console.error('ritual close failed', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to close the ritual',
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <article className="page">
        <header className="masthead">
          <p className="kicker">{kindLabel} ritual</p>
          <h1 className="title">A quiet moment to take stock</h1>
          <nav className="steps" aria-label="Progress">
            <button
              type="button"
              className={`step ${step === 'read' ? 'current' : ''}`}
              onClick={() => setStep('read')}
              aria-current={step === 'read' ? 'step' : undefined}
            >
              <span className="step-num">1</span>
              <span className="step-label">Read</span>
            </button>
            <button
              type="button"
              className={`step ${step === 'respond' ? 'current' : ''}`}
              onClick={() => setStep('respond')}
              aria-current={step === 'respond' ? 'step' : undefined}
            >
              <span className="step-num">2</span>
              <span className="step-label">Respond</span>
            </button>
            <button
              type="button"
              className={`step ${step === 'close' ? 'current' : ''}`}
              onClick={() => setStep('close')}
              aria-current={step === 'close' ? 'step' : undefined}
            >
              <span className="step-num">3</span>
              <span className="step-label">Close</span>
            </button>
          </nav>
        </header>

        {step === 'read' && (
          <section className="step-card">
            <h2 className="section-heading">Since your last ritual</h2>
            <p className="step-help">
              A few minutes to read back through what you&rsquo;ve written. No
              pressure to act on any of it — just notice what stands out.
            </p>
            {sinceEntries === null && <p className="muted">Loading entries…</p>}
            {sinceEntries && sinceEntries.length === 0 && (
              <p className="muted">Nothing new since last time.</p>
            )}
            {sinceEntries && sinceEntries.length > 0 && (
              <ol className="since-list">
                {sinceEntries.map((e) => (
                  <li key={e.entryId} className="since-item">
                    <Link href={`/journal/${e.entryId}`} className="since-link">
                      <span className="since-title">{e.title || 'an entry'}</span>
                      <span className="since-text">{e.text.slice(0, 140)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => setStep('respond')}
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {step === 'respond' && (
          <section className="step-card">
            <h2 className="section-heading">Anything you want to say?</h2>
            <p className="step-help">
              A few sentences in your own words. Pull in any of the prompts
              below if they help — or just write what&rsquo;s on your mind.
            </p>
            {ritual.intention && (
              <p className="intention">
                <span className="intention-label">Intention</span>{' '}
                {ritual.intention}
              </p>
            )}
            {brief && brief.topics.length > 0 && (
              <div className="brief-block">
                <p className="brief-label">From this week&rsquo;s brief</p>
                <ul className="brief-list">
                  {brief.topics.map((t, i) => (
                    <li key={i} className="brief-item">
                      <p className="brief-title">{t.title}</p>
                      {t.framing && (
                        <p className="brief-framing">{t.framing}</p>
                      )}
                      <button
                        type="button"
                        className="divergent-bring"
                        onClick={() => {
                          const add =
                            `${t.title} — ${t.framing || ''}`.trim();
                          setResponseText((prev) => {
                            const existing = prev.trim();
                            if (!existing) return `${add}\n\n`;
                            if (existing.includes(t.title)) return prev;
                            return `${existing}\n\n${add}\n\n`;
                          });
                        }}
                      >
                        Add to response
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {divergentMoments && divergentMoments.length > 0 && (
              <div className="divergent-block">
                <p className="divergent-label">Where views diverged</p>
                <ul className="divergent-list">
                  {divergentMoments.map((m) => (
                    <li key={m.momentId} className="divergent-item">
                      <p className="divergent-line">
                        &ldquo;{m.synthesis?.divergenceLine}&rdquo;
                      </p>
                      <div className="divergent-actions">
                        <Link
                          href={`/moments/${m.momentId}`}
                          className="divergent-link"
                        >
                          Open the moment
                        </Link>
                        <button
                          type="button"
                          className="divergent-bring"
                          onClick={() => {
                            const line = m.synthesis?.divergenceLine;
                            if (!line) return;
                            setResponseText((prev) => {
                              const existing = prev.trim();
                              const add = `On this: "${line}" —`;
                              if (!existing) return `${add} `;
                              if (existing.includes(line)) return prev;
                              return `${existing}\n\n${add} `;
                            });
                          }}
                        >
                          Add to response
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              className="textarea"
              rows={8}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="A few sentences. Specific, not profound."
            />
            <div className="actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setStep('read')}
              >
                ← back
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setClosingText(responseText);
                  setStep('close');
                }}
                disabled={responseText.trim().length < 3}
              >
                continue to close →
              </button>
            </div>
          </section>
        )}

        {step === 'close' && (
          <section className="step-card">
            <h2 className="section-heading">The single act to carry forward</h2>
            <p className="close-help">
              One sentence the book should remember. This becomes a new entry.
            </p>
            <textarea
              className="textarea"
              rows={5}
              value={closingText}
              onChange={(e) => setClosingText(e.target.value)}
              placeholder="The one thing to take into next week."
            />
            {submitError && <p className="error">{submitError}</p>}
            <div className="actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setStep('respond')}
                disabled={submitting}
              >
                ← back
              </button>
              <button
                type="button"
                className="btn"
                onClick={submitClose}
                disabled={submitting || closingText.trim().length < 3}
              >
                {submitting ? 'closing…' : 'close this ritual'}
              </button>
            </div>
          </section>
        )}
      </article>
      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
  .shell {
    min-height: 100vh;
    background: var(--r-cream, #f7f3ea);
    padding-bottom: 80px;
  }
  .page {
    max-width: 640px;
    margin: 0 auto;
    /* 72px clears the fixed GlobalNav; +32px breathing room. */
    padding: 104px 24px 48px;
  }
  .masthead {
    margin-bottom: 28px;
  }
  .kicker {
    margin: 0 0 6px 0;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a89373;
  }
  .title {
    margin: 0 0 14px 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    line-height: 1.25;
    color: #2d2418;
  }
  .steps {
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0;
  }
  .step {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid var(--r-rule-3, #c0b49f);
    border-radius: 999px;
    font-family: var(--r-sans, -apple-system, 'Helvetica Neue', sans-serif);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--r-text-5, #887c68);
    background: transparent;
    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
  }
  .step:hover {
    color: var(--r-ink, #2d2418);
    border-color: var(--r-rule-2, #b5a99a);
  }
  .step.current {
    color: var(--r-ink, #2d2418);
    background: var(--r-paper, #fbf8f2);
    border-color: var(--r-rule-2, #b5a99a);
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--r-rule-4, #d8d3ca);
    color: var(--r-text-3, #5f564b);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0;
  }
  .step.current .step-num {
    background: var(--r-ember, #c9864c);
    color: var(--r-paper, #fbf8f2);
  }
  .step-card {
    background: #faf7f1;
    border: 1px solid #e8e1d2;
    border-radius: 4px;
    padding: 24px;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .section-heading {
    margin: 0 0 12px 0;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 22px;
    line-height: 1.25;
    color: var(--r-ink, #2d2418);
  }
  .step-help {
    margin: 0 0 16px 0;
    font-family: var(--r-serif, Georgia, serif);
    font-size: 14px;
    line-height: 1.55;
    color: var(--r-text-3, #5f564b);
    font-style: italic;
  }
  .intention-label {
    font-family: var(--r-sans, -apple-system, sans-serif);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--r-text-5, #887c68);
    margin-right: 6px;
  }
  .muted {
    color: #a89373;
    font-style: italic;
  }
  .intention {
    background: #f2ebdc;
    border-left: 2px solid #a89373;
    padding: 8px 12px;
    font-size: 14px;
    color: #6b5d45;
  }
  .brief-block {
    margin: 16px 0 14px 0;
    padding: 14px 16px 12px;
    background: #2d2418;
    border-radius: 3px;
    color: #f2ebdc;
  }
  .brief-label {
    margin: 0 0 10px 0;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #c89b3b;
  }
  .brief-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .brief-item {
    padding: 10px 12px;
    background: rgba(242, 235, 220, 0.06);
    border: 1px solid rgba(242, 235, 220, 0.18);
    border-radius: 3px;
  }
  .brief-title {
    margin: 0 0 4px 0;
    font-family: Georgia, serif;
    font-size: 15px;
    font-weight: 500;
    color: #f2ebdc;
  }
  .brief-framing {
    margin: 0 0 8px 0;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: #d0c4a8;
  }
  .brief-item .divergent-bring {
    color: #f2ebdc;
    border-color: #c89b3b;
  }
  .brief-item .divergent-bring:hover {
    background: #c89b3b;
    color: #2d2418;
  }
  .divergent-block {
    margin: 16px 0 18px 0;
    padding: 14px 16px 12px;
    background: #f2ebdc;
    border: 1px solid #e0d4b8;
    border-radius: 3px;
  }
  .divergent-label {
    margin: 0 0 10px 0;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8a7452;
  }
  .divergent-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .divergent-item {
    padding: 10px 12px;
    background: #faf7f1;
    border: 1px solid #e8e1d2;
    border-radius: 3px;
  }
  .divergent-line {
    margin: 0 0 8px 0;
    font-family: Georgia, serif;
    font-size: 14px;
    line-height: 1.55;
    color: #2d2418;
    font-style: italic;
  }
  .divergent-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .divergent-link {
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 12px;
    color: #6b5d45;
    text-decoration: underline;
    text-decoration-color: #d0c4a8;
  }
  .divergent-bring {
    padding: 6px 12px;
    background: transparent;
    color: #2d2418;
    border: 1px solid #a89373;
    border-radius: 999px;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 12px;
    cursor: pointer;
  }
  .divergent-bring:hover {
    background: #2d2418;
    color: #f7f3ea;
  }
  .since-list {
    list-style: none;
    padding: 0;
    margin: 0 0 18px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .since-item :global(a) {
    display: block;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #e8e1d2;
    border-radius: 3px;
    text-decoration: none;
    color: #2d2418;
  }
  .since-title {
    display: block;
    font-size: 14px;
    margin-bottom: 3px;
  }
  .since-text {
    display: block;
    font-size: 13px;
    color: #6b5d45;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .textarea {
    width: 100%;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #d0c4a8;
    border-radius: 3px;
    font-family: Georgia, serif;
    font-size: 15px;
    line-height: 1.6;
    color: #2d2418;
    resize: vertical;
    box-sizing: border-box;
  }
  .textarea:focus {
    outline: 2px solid #a89373;
    outline-offset: -1px;
  }
  .close-help {
    margin: 0 0 12px 0;
    font-style: italic;
    color: #6b5d45;
    font-size: 14px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    gap: 12px;
  }
  .btn {
    padding: 10px 18px;
    background: #2d2418;
    color: #f7f3ea;
    border: none;
    border-radius: 999px;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 14px;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-ghost {
    padding: 10px 18px;
    background: transparent;
    color: #6b5d45;
    border: 1px solid #d0c4a8;
    border-radius: 999px;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 14px;
    cursor: pointer;
  }
  .btn-ghost:disabled {
    opacity: 0.5;
  }
  .error {
    margin: 12px 0 0 0;
    color: #b94a3b;
    font-size: 13px;
  }
  .empty {
    max-width: 640px;
    margin: 48px auto 0;
    padding: 0 24px;
    font-family: Georgia, serif;
    font-style: italic;
    color: #a89373;
    text-align: center;
  }
`;
