'use client';

/* ================================================================
   /therapy/[briefId] — single brief detail.
   Narrative Summary layout: four named sections (Current Emotional
   Landscape / Core Conflict Perspectives / Interpersonal Dynamics /
   Somatic Observations) plus a post-session notes field that gets
   carried into the next brief's prompt.

   Reachable only via the PIN-gated index page; this detail page
   inherits the unlock (usePrivacyLock's `unlocked` state persists
   across routes during the session). In addition, after 10 min of
   idle time the brief auto-locks and requires PIN re-entry.
   ================================================================ */

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTherapyBrief } from '@/hooks/useTherapyBrief';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { useIdleLock } from '@/hooks/useIdleLock';
import { BriefIdleLock } from '@/components/therapy/BriefIdleLock';
import type { TherapyBrief, TherapyBriefTheme, TherapyBriefQuote } from '@/types/therapy';

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
  const [briefLocked, setBriefLocked] = useState(false);
  const scrollPos = useRef(0);

  // Idle auto-lock: 10 min idle, warn at the last 60s. This sits in
  // ADDITION to the entry PIN gate from usePrivacyLock.
  const { warningActive, reset: resetIdleTimer } = useIdleLock({
    idleMs: 10 * 60 * 1000,
    warnAtMs: 60 * 1000,
    onLock: () => {
      scrollPos.current = typeof window !== 'undefined' ? window.scrollY : 0;
      setBriefLocked(true);
    },
  });

  // Reset idle timer on any interaction.
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click'] as const;
    const handler = () => resetIdleTimer();
    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => document.removeEventListener(e, handler));
  }, [resetIdleTimer]);

  // Auth redirect.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Seed session-notes textarea once the brief loads.
  useEffect(() => {
    if (brief?.sessionNotes !== undefined && notesDraft === '') {
      setNotesDraft(brief.sessionNotes ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief?.briefId]);

  const handleUnlock = async (pin: string) => {
    const ok = await lock.verify(pin);
    if (ok) {
      setBriefLocked(false);
      resetIdleTimer();
      setTimeout(() => window.scrollTo(0, scrollPos.current), 0);
    }
    return ok;
  };

  const handleSaveNotes = async () => {
    if (notesSaving) return;
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

  // ─── Loading / gate states ───
  if (authLoading || !user || lock.loading || loading) {
    return (
      <main style={appStyle}>
        <div style={pageStyle}>
          <p style={loadingStyle}>Opening&hellip;</p>
        </div>
      </main>
    );
  }

  // Entry PIN gate. If a PIN is set and not unlocked, bounce back to
  // /therapy where the unlock UI lives.
  if (lock.pinIsSet && !lock.unlocked) {
    return (
      <main style={appStyle}>
        <div style={pageStyle}>
          <p style={loadingStyle}>
            Locked. Go to{' '}
            <Link href="/therapy" style={{ color: 'var(--r-ink, #2B2620)' }}>
              therapy
            </Link>{' '}
            to unlock.
          </p>
        </div>
      </main>
    );
  }

  if (!brief) {
    return (
      <main style={appStyle}>
        <div style={pageStyle}>
          <p style={loadingStyle}>
            <em>This brief is missing.</em>{' '}
            <Link href="/therapy" style={{ color: 'var(--r-ink, #2B2620)' }}>
              ← back to your briefs
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // ─── Render ───
  // TODO: When the Cloud Function is updated to produce the four
  // narrative sections explicitly (emotionalLandscape, coreQuotes,
  // interpersonal, somatic), remove the `(brief as any)` casts below
  // and use typed accessors. For now we map the existing `themes[]`
  // shape onto the four section slots and leave any unfilled section
  // to render nothing.
  type BriefMaybeSections = TherapyBrief & {
    emotionalLandscape?: string;
    coreQuotes?: { label: string; quote: string }[];
    interpersonal?: string;
    somatic?: string;
    windowStart?: { toDate?: () => Date };
    windowEnd?: { toDate?: () => Date };
  };
  const b = brief as BriefMaybeSections;

  const emotionalLandscape = b.emotionalLandscape ?? '';
  const coreQuotes: { label: string; quote: string }[] =
    b.coreQuotes ?? deriveCoreQuotesFromThemes(brief.themes);
  const interpersonal = b.interpersonal ?? '';
  const somatic = b.somatic ?? '';

  // Period line: best-effort from windowStart/windowEnd, falling back
  // to generatedAt.
  const windowStart = b.windowStart?.toDate?.();
  const windowEnd = b.windowEnd?.toDate?.() ?? brief.generatedAt?.toDate?.();
  const periodLine = windowStart && windowEnd
    ? `${formatDay(windowStart)} – ${formatDay(windowEnd)}`
    : windowEnd
      ? `As of ${formatDay(windowEnd)}`
      : '';

  const hasNarrativeContent =
    emotionalLandscape.trim().length > 0 ||
    coreQuotes.length > 0 ||
    interpersonal.trim().length > 0 ||
    somatic.trim().length > 0;
  const hasThemes = Array.isArray(brief.themes) && brief.themes.length > 0;

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Secure Session Brief</p>
          <h1 style={titleStyle}>Narrative Summary</h1>
          {periodLine && <p style={periodStyle}>{periodLine}</p>}
        </header>

        <Section heading="Current Emotional Landscape" body={emotionalLandscape} />
        <Section heading="Core Conflict Perspectives" quotes={coreQuotes} />
        <Section heading="Interpersonal Dynamics" body={interpersonal} />
        <Section heading="Somatic Observations" body={somatic} />

        {/* Fallback: render existing themes as a list when the
            Cloud Function hasn't yet populated the four narrative
            sections above. Remove once the function emits the
            narrative fields directly. */}
        {!hasNarrativeContent && hasThemes && (
          <section style={sectionStyle}>
            <p style={sectionEyebrowStyle}>Themes</p>
            <ul style={listStyle}>
              {brief.themes.map((t, i) => (
                <li key={t.id || i} style={liStyle}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>
                    {t.label ?? `Theme ${i + 1}`}
                  </strong>
                  <span>{t.summary ?? ''}</span>
                  {t.quotes && t.quotes.length > 0 && (
                    <ul style={{ ...listStyle, marginTop: 8 }}>
                      {t.quotes.map((q, qi) => (
                        <li key={qi} style={quoteLiStyle}>
                          <blockquote style={quoteStyle}>
                            &ldquo;{q.snippet}&rdquo;
                          </blockquote>
                          {q.sourceDate && (
                            <p style={quoteLabelStyle}>
                              {new Date(q.sourceDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {q.entryId && (
                                <>
                                  {' · '}
                                  <Link
                                    href={`/journal/${q.entryId}`}
                                    style={{ color: 'var(--r-ember, #C98452)' }}
                                  >
                                    open the entry
                                  </Link>
                                </>
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!hasNarrativeContent && !hasThemes && (
          <section style={sectionStyle}>
            <p style={sectionBodyStyle}>
              <em>Not much to distill yet.</em> The last {brief.daysBack ?? 14}{' '}
              days were light on material. Write a few entries and generate
              another brief when you&rsquo;re ready.
            </p>
          </section>
        )}

        <section style={sectionStyle} aria-label="Post-session notes">
          <p style={sectionEyebrowStyle}>Notes for next time</p>
          <p style={sectionBodyStyle}>
            After the session, jot anything you want carried into next
            week&rsquo;s brief. Short is fine.
          </p>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="e.g. Keep focus on the shoulder pain + workload balance."
            style={textareaStyle}
            rows={5}
          />
          <div style={notesActionsStyle}>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={notesSaving || notesDraft === (brief.sessionNotes ?? '')}
              style={{
                ...notesSaveStyle,
                opacity:
                  notesSaving || notesDraft === (brief.sessionNotes ?? '')
                    ? 0.5
                    : 1,
                cursor:
                  notesSaving || notesDraft === (brief.sessionNotes ?? '')
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {notesSaving ? 'Saving…' : 'Save notes'}
            </button>
            {notesSavedAt && <span style={notesSavedStyle}>Saved.</span>}
          </div>
        </section>

        <footer style={footerStyle}>
          <Link href="/therapy" style={backLinkStyle}>
            ← Back to Therapy
          </Link>
        </footer>
      </div>

      <BriefIdleLock
        locked={briefLocked}
        warningActive={warningActive}
        onUnlock={handleUnlock}
      />
    </main>
  );
}

function Section({
  heading,
  body,
  quotes,
}: {
  heading: string;
  body?: string;
  quotes?: { label: string; quote: string }[];
}) {
  const hasBody = !!body && body.trim().length > 0;
  const hasQuotes = !!quotes && quotes.length > 0;
  if (!hasBody && !hasQuotes) return null;
  return (
    <section style={sectionStyle}>
      <h2 style={sectionHeadingStyle}>{heading}</h2>
      {hasBody && <p style={sectionBodyStyle}>{body}</p>}
      {hasQuotes && (
        <ul style={listStyle}>
          {quotes!.map((q, i) => (
            <li key={i} style={quoteLiStyle}>
              <p style={quoteLabelStyle}>{q.label}</p>
              <blockquote style={quoteStyle}>&ldquo;{q.quote}&rdquo;</blockquote>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Maps the existing TherapyBriefTheme[] shape onto the
// "Core Conflict Perspectives" label/quote pairs the narrative
// layout expects. Each quote becomes one entry, labeled with the
// theme it came from.
function deriveCoreQuotesFromThemes(
  themes: TherapyBriefTheme[] | undefined,
): { label: string; quote: string }[] {
  if (!Array.isArray(themes)) return [];
  const out: { label: string; quote: string }[] = [];
  for (const t of themes) {
    if (!t.quotes) continue;
    for (const q of t.quotes as TherapyBriefQuote[]) {
      if (!q?.snippet) continue;
      out.push({ label: t.label ?? 'Theme', quote: q.snippet });
    }
  }
  return out;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const appStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--r-cream, #F7F5F0)',
};
const pageStyle: CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '64px 32px 96px',
};
const loadingStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  color: 'var(--r-text-4, #6B6254)',
  textAlign: 'center',
  paddingTop: 80,
};
const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: 56,
};
const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 14px',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(36px, 5vw, 48px)',
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 12px',
};
const periodStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: 0,
};
const sectionStyle: CSSProperties = {
  padding: '32px 0',
  borderTop: '1px solid rgba(120,100,70,0.12)',
};
const sectionHeadingStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 24,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 14px',
};
const sectionEyebrowStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 14px',
};
const sectionBodyStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 17,
  lineHeight: 1.65,
  color: 'var(--r-text-2, #3A3530)',
  margin: 0,
  maxWidth: '62ch',
};
const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
};
const liStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--r-text-2, #3A3530)',
  marginBottom: 14,
};
const quoteLiStyle: CSSProperties = { marginBottom: 18 };
const quoteLabelStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  margin: '0 0 6px',
};
const quoteStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 17,
  lineHeight: 1.55,
  color: 'var(--r-ink, #2B2620)',
  margin: 0,
  paddingLeft: 14,
  borderLeft: '2px solid rgba(120,100,70,0.24)',
};
const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 120,
  padding: 14,
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  lineHeight: 1.5,
  color: 'var(--r-ink, #2B2620)',
  background: 'var(--r-paper, #FDFBF6)',
  border: '1px solid rgba(120,100,70,0.18)',
  borderRadius: 6,
  resize: 'vertical',
  marginTop: 12,
  marginBottom: 12,
};
const notesActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};
const notesSaveStyle: CSSProperties = {
  padding: '8px 14px',
  background: 'var(--r-ink, #2B2620)',
  color: 'var(--r-cream, #FAF8F3)',
  border: 'none',
  borderRadius: 4,
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};
const notesSavedStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 13,
  color: 'var(--r-sage, #7C9082)',
};
const footerStyle: CSSProperties = {
  marginTop: 56,
  textAlign: 'center',
};
const backLinkStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-text-4, #6B6254)',
  textDecoration: 'none',
};
