'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useFreshness } from '@/hooks/useFreshness';
import Navigation from '@/components/layout/Navigation';
import { ManualChat } from '@/components/manual/ManualChat';
import { computeAge } from '@/utils/age';
import type { Person, PersonManual } from '@/types/person-manual';

const WOOD_DESK_IMG = '/images/overhead-desk.png';

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let r = '';
  let num = n;
  for (const [v, s] of map) while (num >= v) { r += s; num -= v; }
  return r;
}

function relationshipLabel(p: Person): string {
  const type = p.relationshipType;
  const age = p.dateOfBirth ? computeAge(p.dateOfBirth) : null;
  if (type === 'self') return 'You';
  if (type === 'spouse') return age !== null ? `Partner · age ${age}` : 'Partner';
  if (type === 'child') return age !== null ? `Child · age ${age}` : 'Child';
  if (type === 'elderly_parent') return 'Parent';
  if (type === 'sibling') return 'Sibling';
  if (type === 'friend') return 'Friend';
  return 'Of the family';
}

/**
 * The Family Manual — same book-on-desk frame as the Journal, tuned
 * for reference reading. Left page: the volumes. Right page: the
 * selected volume's actual manual content — synthesis, what helps,
 * handle with care, patterns. Deep edits live one click away at
 * /people/[id]/manual.
 */
export default function ManualPage() {
  return (
    <Suspense fallback={null}>
      <ManualPageInner />
    </Suspense>
  );
}

function ManualPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { state, people, manuals, contributions, selfPerson } = useDashboard();
  const { familyCompleteness } = useFreshness({ people, manuals, contributions });

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  const volumes = useMemo(() => {
    const active = people.filter((p) => !p.archived);
    const completeness = new Map(
      familyCompleteness.perPerson.map((p) => [p.personId, p])
    );
    const ordered: Person[] = [];
    if (selfPerson) ordered.push(selfPerson);
    for (const p of active) if (p.personId !== selfPerson?.personId) ordered.push(p);
    return ordered.map((person, idx) => {
      const manual = manuals.find((m) => m.personId === person.personId) ?? null;
      const c = completeness.get(person.personId);
      return {
        person,
        manual,
        volumeNumber: toRoman(idx + 1),
        status: c?.status || 'empty',
      };
    });
  }, [people, manuals, familyCompleteness, selfPerson]);

  const paramId = params.get('v');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedId) return;
    if (paramId && volumes.some((v) => v.person.personId === paramId)) {
      setSelectedId(paramId);
    } else if (volumes.length > 0) {
      setSelectedId(volumes[0].person.personId);
    }
  }, [volumes, paramId, selectedId]);

  const selected = volumes.find((v) => v.person.personId === selectedId) ?? null;
  const loading = authLoading || state === 'loading';

  return (
    <div className="spread-stage">
      <Navigation />

      <header className="masthead-row">
        <h1 className="masthead-title">The Family Manual</h1>
        <div className="masthead-meta">
          <span>A Shared Work</span>
          <span className="sep" aria-hidden="true">·</span>
          <span>Kept by {(user?.name || 'You').split(' ')[0]}</span>
        </div>
      </header>

      <div className="book">
        <span className="ribbon" aria-hidden="true" />
        <div className="page page-left">
          <div className="page-inner">
            <span className="chapter-label">The volumes</span>
            <p className="section-intro">
              One per person. Choose a volume to open it.
            </p>
            <hr className="rule" />

            {loading ? (
              <p className="empty">Opening the book…</p>
            ) : volumes.length === 0 ? (
              <p className="empty">No volumes yet. Add someone to begin a volume.</p>
            ) : (
              <ul className="volume-list">
                {volumes.map((v) => {
                  const isActive = v.person.personId === selectedId;
                  return (
                    <li key={v.person.personId}>
                      <button
                        type="button"
                        className={`volume-row ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedId(v.person.personId)}
                      >
                        <span className="vol-num">Vol. {v.volumeNumber}</span>
                        <span className="vol-main">
                          <span className="vol-name">{v.person.name}</span>
                          <span className="vol-sub">{relationshipLabel(v.person)}</span>
                        </span>
                        <span
                          className={`vol-status status-${v.status}`}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="folio left-folio">i</div>
          </div>
        </div>

        <div className="page page-right">
          <div className="page-inner">
            {!selected ? (
              <p className="empty">No volume selected.</p>
            ) : (
              <VolumeContent vol={selected} />
            )}
            <div className="folio right-folio">ii</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .spread-stage {
          position: relative;
          min-height: 100vh;
          padding: 128px 28px 60px;
          background-image: url(${WOOD_DESK_IMG});
          background-size: 260%;
          background-position: center 38%;
          background-repeat: no-repeat;
          background-attachment: fixed;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .spread-stage::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 45%,
            rgba(40, 24, 10, 0.22) 85%,
            rgba(30, 18, 8, 0.42) 100%
          );
          z-index: 0;
        }

        /* Inner masthead — same structure and type as the Journal's
           MastheadRow, so both publications read as companion volumes. */
        .masthead-row {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0 14px;
          margin: 0 auto 8px;
          max-width: 1440px;
        }
        .masthead-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 22px;
          font-weight: 400;
          color: #2a1f14;
          margin: 0;
          letter-spacing: 0.01em;
        }
        .masthead-meta {
          margin-top: 4px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #7a5f3d;
          display: flex;
          gap: 10px;
          align-items: baseline;
        }
        .masthead-meta .sep { opacity: 0.55; }

        /* Book frame — oxblood leather to differentiate from the
           Journal's warm brown, with a silk ribbon bookmark. */
        .book {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 14px;
          background: linear-gradient(135deg, #4a2020 0%, #3a1818 50%, #2e1010 100%);
          border-radius: 4px;
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.55),
            0 8px 20px rgba(0, 0, 0, 0.35);
        }
        .ribbon {
          position: absolute;
          top: -14px;
          right: 64px;
          width: 22px;
          height: 88px;
          background: linear-gradient(#c49450 0%, #a67736 100%);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          z-index: 2;
        }
        .ribbon::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 0;
          height: 0;
          border-left: 11px solid transparent;
          border-right: 11px solid transparent;
          border-top: 10px solid #a67736;
        }
        .page {
          min-height: 800px;
          position: relative;
          background: #efe5d0;
          color: #3a2b1a;
          padding: 30px 0 32px;
        }
        .page-left {
          border-radius: 2px 0 0 2px;
          box-shadow: inset -12px 0 18px -12px rgba(0, 0, 0, 0.25);
        }
        .page-right {
          border-radius: 0 2px 2px 0;
          box-shadow: inset 12px 0 18px -12px rgba(0, 0, 0, 0.25);
        }
        .page-inner {
          padding: 20px 44px 80px;
          height: 100%;
        }

        .chapter-label {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
          display: block;
        }
        .book-title {
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(36px, 4.2vw, 48px);
          line-height: 1.02;
          letter-spacing: -0.015em;
          color: #4a2020;
          margin: 6px 0 8px;
        }
        .book-sub {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 14px;
          color: #7a6150;
          margin: 0 0 18px;
        }
        .rule.ornament {
          position: relative;
          border: 0;
          height: 14px;
          margin: 18px 0 22px;
        }
        .rule.ornament::before {
          content: '❦';
          display: block;
          text-align: center;
          font-family: Georgia, serif;
          color: #8a6f4a;
          font-size: 14px;
          line-height: 1;
        }
        .mt-6 { margin-top: 24px; }
        .section-intro {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 14px;
          color: #6b5a45;
          margin: 6px 0 18px;
        }
        .rule {
          border: 0;
          border-top: 1px solid rgba(138, 111, 74, 0.35);
          margin: 0 0 18px;
        }
        .empty {
          font-family: Georgia, serif;
          font-style: italic;
          color: #6b5a45;
          text-align: center;
          margin-top: 60px;
        }

        .volume-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .volume-row {
          display: grid;
          grid-template-columns: 64px 1fr auto;
          column-gap: 14px;
          align-items: baseline;
          width: 100%;
          padding: 14px 4px;
          border: 0;
          border-top: 1px solid rgba(138, 111, 74, 0.18);
          background: transparent;
          text-align: left;
          cursor: pointer;
          color: inherit;
          transition: background 140ms ease;
          font-family: inherit;
        }
        .volume-row:last-child {
          border-bottom: 1px solid rgba(138, 111, 74, 0.18);
        }
        .volume-row:hover { background: rgba(138, 111, 74, 0.06); }
        .volume-row.active { background: rgba(138, 111, 74, 0.10); }
        .vol-num {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #8a6f4a;
        }
        .vol-main { display: flex; flex-direction: column; gap: 2px; }
        .vol-name {
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-size: 22px;
          line-height: 1.1;
          color: #2a1f14;
        }
        .vol-sub {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #7a6a52;
        }
        .vol-status {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #c9bba8;
        }
        .status-complete { background: #7C9082; }
        .status-partial  { background: #C4A265; }
        .status-empty    { background: #c9bba8; }
        .status-stale    { background: #C08070; }

        .folio {
          position: absolute;
          bottom: 48px;
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-size: 12px;
          color: rgba(138, 111, 74, 0.5);
        }
        .left-folio  { left: 56px; }
        .right-folio { right: 56px; }

        @media (max-width: 900px) {
          .book { grid-template-columns: 1fr; }
          .page-left { box-shadow: inset 0 -12px 18px -12px rgba(0,0,0,0.25); }
          .page-right { box-shadow: none; }
          .page { min-height: auto; }
        }
      `}</style>
    </div>
  );
}

// ================================================================
// VolumeContent — the selected volume, rendered inline on the right.
// ================================================================
function VolumeContent({
  vol,
}: {
  vol: { person: Person; manual: PersonManual | null; volumeNumber: string };
}) {
  const { person, manual, volumeNumber } = vol;
  const [chatOpen, setChatOpen] = useState(false);
  // Collapse chat when switching volumes.
  useEffect(() => {
    setChatOpen(false);
  }, [person.personId]);
  const synth = manual?.synthesizedContent;
  const topWorks = [...(manual?.whatWorks || [])]
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 4);
  const topTriggers = [...(manual?.triggers || [])]
    .sort((a, b) => {
      const o = { significant: 0, moderate: 1, mild: 2 } as Record<string, number>;
      return (o[a.severity] ?? 3) - (o[b.severity] ?? 3);
    })
    .slice(0, 3);
  const strengths = manual?.coreInfo?.strengths?.slice(0, 6) || [];

  const hasContent =
    Boolean(synth?.overview) ||
    strengths.length > 0 ||
    topWorks.length > 0 ||
    topTriggers.length > 0;

  return (
    <div className="vc">
      <span className="vc-chapter">Volume {volumeNumber} &middot; on</span>
      <h1 className="vc-name">{person.name}</h1>
      <p className="vc-sub">{relationshipLabel(person)}</p>

      <hr className="vc-rule" />

      {!hasContent && (
        <div className="vc-empty">
          <p>
            This volume is still being written. Add a perspective, invite
            someone else to, or let the app observe as entries accumulate.
          </p>
          <Link
            href={`/people/${person.personId}/manual/onboard`}
            className="vc-link"
          >
            Add a perspective <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {synth?.overview && (
        <section className="vc-sect">
          <p className="vc-body">{synth.overview}</p>
        </section>
      )}

      {strengths.length > 0 && (
        <section className="vc-sect">
          <span className="vc-chapter">In their nature</span>
          <p className="vc-body-italic">
            {strengths.slice(0, -1).map((s, i) => (
              <span key={i}>{s.toLowerCase()}, </span>
            ))}
            {strengths.length > 1 && <span>and </span>}
            {strengths[strengths.length - 1].toLowerCase()}.
          </p>
        </section>
      )}

      {topWorks.length > 0 && (
        <section className="vc-sect">
          <span className="vc-chapter">What works</span>
          <ul className="vc-list">
            {topWorks.map((s) => (
              <li key={s.id}>{s.description}</li>
            ))}
          </ul>
        </section>
      )}

      {topTriggers.length > 0 && (
        <section className="vc-sect">
          <span className="vc-chapter">Handle with care</span>
          <ul className="vc-list">
            {topTriggers.map((t) => (
              <li key={t.id}>
                {t.description}
                {t.deescalationStrategy && (
                  <em className="vc-detail"> — {t.deescalationStrategy}</em>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasContent && (
        <div className="vc-footer">
          <Link href={`/people/${person.personId}/manual`} className="vc-link">
            Open the full volume <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {/* Ask the Manual — a companion grounded in this volume */}
      <section className="vc-chat">
        {!chatOpen ? (
          <div className="vc-chat-pitch">
            <span className="vc-chapter">A question</span>
            <h3 className="vc-chat-title">Ask this volume about {person.name}</h3>
            <button
              type="button"
              className="vc-link"
              onClick={() => setChatOpen(true)}
            >
              Open the conversation <span className="arrow">→</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="vc-chat-head">
              <span className="vc-chapter">Ask the manual</span>
              <button
                type="button"
                className="vc-close"
                onClick={() => setChatOpen(false)}
              >
                Close
              </button>
            </div>
            <ManualChat
              key={person.personId}
              personId={person.personId}
              personName={person.name}
              manual={manual}
            />
          </div>
        )}
      </section>

      <style jsx>{`
        .vc { max-width: 560px; }
        .vc-chapter {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
          display: block;
          margin-bottom: 6px;
        }
        .vc-name {
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(40px, 5vw, 54px);
          line-height: 1.0;
          letter-spacing: -0.01em;
          color: #2a1f14;
          margin: 2px 0 8px;
        }
        .vc-sub {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #7a6a52;
          margin: 0 0 20px;
        }
        .vc-rule {
          border: 0;
          border-top: 1px solid rgba(138, 111, 74, 0.35);
          margin: 0 0 22px;
        }
        .vc-sect { margin-bottom: 28px; }
        .vc-body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 16px;
          line-height: 1.65;
          color: #3a2b1a;
          margin: 0;
        }
        .vc-body-italic {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 16px;
          line-height: 1.6;
          color: #3a2b1a;
          margin: 4px 0 0;
        }
        .vc-list {
          list-style: none;
          margin: 4px 0 0;
          padding: 0;
        }
        .vc-list li {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          line-height: 1.55;
          color: #3a2b1a;
          padding: 10px 0;
          border-top: 1px solid rgba(138, 111, 74, 0.2);
        }
        .vc-list li:last-child {
          border-bottom: 1px solid rgba(138, 111, 74, 0.2);
        }
        .vc-detail {
          color: #6b5a45;
          font-size: 13px;
        }
        .vc-empty {
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 15px;
          color: #6b5a45;
          padding: 40px 0;
        }
        .vc-footer {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(138, 111, 74, 0.2);
        }
        .vc-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #2a1f14;
          text-decoration: none;
          padding-bottom: 4px;
          border-bottom: 1px solid #2a1f14;
          transition: gap 180ms ease;
        }
        .vc-link:hover { gap: 16px; }
        .vc-link:disabled { opacity: 0.5; cursor: wait; }
        button.vc-link {
          background: transparent;
          cursor: pointer;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }
        .arrow { transition: transform 160ms ease; }

        .vc-chat {
          margin-top: 32px;
          padding-top: 22px;
          border-top: 1px dashed rgba(138, 111, 74, 0.35);
        }
        .vc-chat-pitch { text-align: center; }
        .vc-chat-title {
          font-family: var(--font-parent-display, Georgia, serif);
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: #2a1f14;
          margin: 8px 0 14px;
        }
        .vc-chat-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .vc-close {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: #7a6a52;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }
        .vc-close:hover { color: #2a1f14; }
      `}</style>
    </div>
  );
}
