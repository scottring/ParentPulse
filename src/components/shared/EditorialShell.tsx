'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import type { AssessmentShellProps, SaveStatus } from './AssessmentShell';

/**
 * EditorialShell — journal-style questionnaire shell.
 *
 * Matches the Surface aesthetic: off-white page, italic Georgia serif,
 * hairline rules, centered single-question focus. One question at a
 * time. No progress bars, no dense chrome. Reads like a notebook page
 * being filled in, not a form being completed.
 *
 * API mirrors AssessmentShell so callers can swap the import.
 */
export default function EditorialShell(props: AssessmentShellProps) {
  const {
    personName,
    sectionName,
    sectionDescription,
    currentSection,
    totalSections,
    currentQuestion,
    totalQuestions,
    answeredQuestions,
    saveStatus = 'saved',
    children,
    navigationSlot,
    demoBannerSlot,
    firstQuestionHint,
    onSaveAndExit,
    onSkipSection,
    canSkip = false,
    flowTitle,
  } = props;

  const isFirstQuestion =
    currentSection === 0 && currentQuestion === 0 && answeredQuestions === 0;

  return (
    <main className="edshell">
      {/* ── Chrome ─────────────────────────────────────────────── */}
      <header className="chrome">
        <Link href="/" className="wordmark" aria-label="Relish home">
          Relish
        </Link>
        <span className="meta">
          {flowTitle || `About ${personName}`}
        </span>
      </header>

      {/* ── Running context ────────────────────────────────────── */}
      <div className="context">
        <button
          type="button"
          onClick={onSaveAndExit}
          className="link-back"
        >
          ← Save & close
        </button>
        <span className="section-crumb">
          {sectionName}
          <span className="sep" aria-hidden="true">·</span>
          <span className="count">
            {answeredQuestions} of {totalQuestions}
          </span>
        </span>
      </div>

      {demoBannerSlot && <div className="demo-slot">{demoBannerSlot}</div>}

      {/* ── Page body ──────────────────────────────────────────── */}
      <section className="page">
        {isFirstQuestion && firstQuestionHint && (
          <p className="hint">{firstQuestionHint}</p>
        )}

        <div className="question">{children}</div>

        <div className="nav-slot">{navigationSlot}</div>

        {canSkip && onSkipSection && (
          <div className="skip">
            <button type="button" onClick={onSkipSection} className="link-skip">
              Skip this section
            </button>
          </div>
        )}
      </section>

      {/* ── Footer: save status + subtle progress ──────────────── */}
      <footer className="foot">
        <span className={`save save-${saveStatus}`}>
          {saveStatusLabel(saveStatus)}
        </span>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: totalSections }).map((_, i) => (
            <span
              key={i}
              className={
                i < currentSection
                  ? 'dot dot-done'
                  : i === currentSection
                  ? 'dot dot-active'
                  : 'dot'
              }
            />
          ))}
        </div>
      </footer>

      <style jsx>{`
        .edshell {
          min-height: 100vh;
          background: #fafaf7;
          color: #0f0f0d;
          display: grid;
          grid-template-rows: auto auto auto 1fr auto;
          padding: 28px 48px 24px;
          font-family: Georgia, 'Times New Roman', serif;
        }

        /* ─── Chrome ───────────────────────────────────────── */
        .chrome {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #1a1a18;
        }
        .wordmark {
          font-style: italic;
          font-size: 22px;
          color: #0f0f0d;
          text-decoration: none;
        }
        .meta {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #6b6b68;
        }

        /* ─── Context strip ────────────────────────────────── */
        .context {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 14px 0 10px;
        }
        .link-back {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #6b6b68;
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: 0;
          transition: color 160ms ease;
        }
        .link-back:hover {
          color: #0a0a08;
        }
        .section-crumb {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #6b6b68;
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
        }
        .sep {
          color: #c8c8c0;
        }
        .count {
          color: #0a0a08;
        }

        .demo-slot {
          padding: 8px 0;
        }

        /* ─── Page body ────────────────────────────────────── */
        .page {
          align-self: center;
          justify-self: center;
          max-width: 720px;
          width: 100%;
          padding: 48px 0;
        }
        .hint {
          font-style: italic;
          font-size: 15px;
          line-height: 1.55;
          color: #6b6b68;
          text-align: center;
          max-width: 560px;
          margin: 0 auto 28px;
        }
        .question {
          /* Question content renders its own heading; this just scopes
             the area so it reads like a page in a journal. */
        }
        .question :global(h2) {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(28px, 3.4vw, 40px);
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: #0a0a08;
          text-align: center;
          margin: 0 0 14px;
        }
        .question :global(p) {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          line-height: 1.55;
          color: #3d3d39;
          text-align: center;
          max-width: 520px;
          margin: 0 auto 28px;
        }
        .question :global(textarea),
        .question :global(input[type='text']) {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 18px;
          line-height: 1.55;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(10, 10, 8, 0.2);
          border-radius: 0;
          padding: 12px 0;
          color: #0a0a08;
          width: 100%;
          transition: border-color 160ms ease;
        }
        .question :global(textarea:focus),
        .question :global(input[type='text']:focus) {
          outline: none;
          border-bottom-color: #0a0a08;
        }
        .question :global(textarea) {
          min-height: 120px;
          resize: vertical;
        }

        .nav-slot {
          margin-top: 32px;
        }
        .skip {
          margin-top: 12px;
          text-align: right;
        }
        .link-skip {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #6b6b68;
          background: transparent;
          border: 0;
          cursor: pointer;
          padding: 0;
        }
        .link-skip:hover {
          color: #0a0a08;
        }

        /* ─── Footer ───────────────────────────────────────── */
        .foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #1a1a18;
        }
        .save {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }
        .save-saved { color: #7C9082; }
        .save-saving { color: #C4A265; }
        .save-error { color: #C08070; }
        .save-unsaved { color: #7A6E5C; }

        .dots {
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(10, 10, 8, 0.12);
        }
        .dot-done {
          background: rgba(10, 10, 8, 0.45);
        }
        .dot-active {
          background: #0a0a08;
        }

        @media (max-width: 820px) {
          .edshell {
            padding: 22px 20px 18px;
          }
          .page {
            padding: 28px 0;
          }
        }
      `}</style>
    </main>
  );
}

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'saved':
      return 'Saved';
    case 'saving':
      return 'Saving…';
    case 'error':
      return 'Save failed — retrying';
    default:
      return 'Unsaved';
  }
}
