'use client';

import { useState } from 'react';
import type { Entry } from '@/types/entry';

// Approximate character count that fills ~2 lines after the italic lead
// in a ~440px main column at the body font/leading used below. Real data
// varies; the clamp is a hint, not a hard boundary.
const PROSE_CLAMP_CHARS = 180;
const BLOCK_CLAMP_CHARS = 160;

/** Small "read more"/"less" toggle shared by all block variants. */
function ReadMoreToggle({
  expanded,
  onToggle,
  tone = 'muted',
}: {
  expanded: boolean;
  onToggle: () => void;
  tone?: 'muted' | 'coral' | 'pink' | 'slate';
}) {
  const color =
    tone === 'coral'
      ? '#b94a3b'
      : tone === 'pink'
      ? '#7a3060'
      : tone === 'slate'
      ? '#d0e1ea'
      : '#a89373';
  return (
    <button type="button" className="rm-toggle" onClick={onToggle}>
      {expanded ? 'less' : 'read more'}
      <style jsx>{`
        .rm-toggle {
          margin-top: 6px;
          padding: 0;
          background: none;
          border: none;
          color: ${color};
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          cursor: pointer;
          font-style: italic;
          opacity: 0.85;
        }
        .rm-toggle:hover {
          opacity: 1;
        }
      `}</style>
    </button>
  );
}

/** Flowing prose entry — written, observation, reflection, conversation */
function ProseEntry({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel =
    entry.type === 'observation'
      ? 'Observation'
      : entry.type === 'reflection'
      ? 'Reflection'
      : entry.type === 'conversation'
      ? 'Conversation'
      : 'Written';

  // Split content: first sentence becomes italic lead; rest is body
  const dotIndex = entry.content.indexOf('. ');
  const hasMultipleSentences =
    dotIndex !== -1 && dotIndex < entry.content.length - 2;
  const firstLine = hasMultipleSentences
    ? entry.content.slice(0, dotIndex + 1)
    : entry.content;
  const rest = hasMultipleSentences ? entry.content.slice(dotIndex + 2) : '';

  const isOverflowing = rest.length > PROSE_CLAMP_CHARS;
  const shouldClamp = isOverflowing && !expanded;

  return (
    <article className="prose-entry">
      <div className="entry-meta">{typeLabel}</div>
      <p className={`entry-body${shouldClamp ? ' clamped' : ''}`}>
        <span className="first-line">{firstLine}</span>
        {rest && ` ${rest}`}
      </p>
      {isOverflowing && (
        <button
          type="button"
          className="toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'less' : 'read more'}
        </button>
      )}
      <style jsx>{`
        .prose-entry {
          margin-bottom: 26px;
        }
        .entry-meta {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #a89373;
          margin-bottom: 5px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .entry-body {
          font-size: 14px;
          line-height: 1.6;
          color: #2d2418;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .entry-body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .first-line {
          font-style: italic;
        }
        .toggle {
          margin-top: 4px;
          padding: 0;
          background: none;
          border: none;
          color: #a89373;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          cursor: pointer;
          font-style: italic;
        }
        .toggle:hover {
          color: #8a6f4a;
        }
      `}</style>
    </article>
  );
}

/** One-line check item for activity entries */
function ActivityLine({ entry }: { entry: Entry }) {
  return (
    <div className="activity-line">
      <span className="check">✓</span>
      <span className="activity-content">{entry.content}</span>
      <span className="meta">Done</span>
      <style jsx>{`
        .activity-line {
          margin-bottom: 20px;
          font-size: 12.5px;
          color: #5a4628;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .check {
          color: #2f5a38;
          font-size: 14px;
          line-height: 1;
          font-style: normal;
        }
        .activity-content {
          flex: 1;
        }
        .meta {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #a89373;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-style: normal;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}

/** Pull-quote for synthesis about a person */
function SynthesisPull({ entry, nameOf }: { entry: Entry; nameOf?: (personId: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const subject = entry.subjects[0];
  const subjectName =
    subject?.kind === 'person'
      ? (nameOf ? nameOf(subject.personId) : subject.personId)
      : 'them';
  const subjectLabel = `about ${subjectName}`;
  const sourceCount = entry.sourceEntryIds?.length ?? 0;
  const overflowing = entry.content.length > BLOCK_CLAMP_CHARS;
  const clamped = overflowing && !expanded;

  return (
    <div className="synth-pull">
      <div className="label">Synthesis · {subjectLabel}</div>
      <p className={`text${clamped ? ' clamped' : ''}`}>{entry.content}</p>
      {overflowing && (
        <ReadMoreToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} tone="coral" />
      )}
      {sourceCount > 0 && (
        <div className="source">Drawn from {sourceCount} {sourceCount === 1 ? 'entry' : 'entries'}</div>
      )}
      <style jsx>{`
        .synth-pull {
          margin: 8px 0 24px;
          padding: 4px 0 4px 16px;
          border-left: 3px solid #b94a3b;
        }
        .label {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #b94a3b;
          margin-bottom: 6px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }
        .text {
          font-size: 16px;
          line-height: 1.45;
          font-style: italic;
          color: #5a3520;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .text.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .source {
          margin-top: 6px;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b94a3b;
          opacity: 0.75;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
}

/** Full-width slate banner for family synthesis */
function FamilyBanner({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = entry.content.length > BLOCK_CLAMP_CHARS;
  const clamped = overflowing && !expanded;

  return (
    <div className="family-banner">
      <div className="label">Family synthesis</div>
      <p className={`body${clamped ? ' clamped' : ''}`}>{entry.content}</p>
      {overflowing && (
        <ReadMoreToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} tone="slate" />
      )}
      <style jsx>{`
        .family-banner {
          margin: 8px 0 26px;
          padding: 18px 20px;
          background: #6a8aa0;
          color: #f5ecd8;
          border-radius: 4px;
        }
        .label {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #d0e1ea;
          margin-bottom: 6px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }
        .body {
          font-size: 12.5px;
          line-height: 1.5;
          margin: 0;
          color: #e8eef2;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
        }
        .body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

/** Pink-tinted ruled callout for nudge entries */
function NudgeCallout({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = entry.content.length > BLOCK_CLAMP_CHARS;
  const clamped = overflowing && !expanded;

  return (
    <div className="nudge-box">
      <div className="label">One thing to try</div>
      <p className={`body${clamped ? ' clamped' : ''}`}>{entry.content}</p>
      {overflowing && (
        <ReadMoreToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} tone="pink" />
      )}
      <style jsx>{`
        .nudge-box {
          margin: 16px 0 24px;
          background: rgba(196, 135, 163, 0.18);
          border: 1px solid rgba(196, 135, 163, 0.6);
          border-radius: 4px;
          padding: 14px 16px;
        }
        .label {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #7a3060;
          margin-bottom: 6px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }
        .body {
          font-size: 12.5px;
          line-height: 1.5;
          color: #591a42;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
        }
        .body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

/** Quiet inline question for prompt entries */
function PromptInline({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = entry.content.length > BLOCK_CLAMP_CHARS;
  const clamped = overflowing && !expanded;

  return (
    <div className="prompt-inline">
      <div className="kicker">Question</div>
      <p className={`body${clamped ? ' clamped' : ''}`}>{entry.content}</p>
      {overflowing && (
        <ReadMoreToggle expanded={expanded} onToggle={() => setExpanded(v => !v)} />
      )}
      <style jsx>{`
        .prompt-inline {
          margin-bottom: 22px;
        }
        .kicker {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #b0956a;
          margin-bottom: 4px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
        }
        .body {
          font-size: 13px;
          line-height: 1.55;
          font-style: italic;
          color: #9a8060;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ── Discriminated renderer ───────────────────────────────────────────────────

export function EntryBlock({ entry, nameOf }: { entry: Entry; nameOf?: (personId: string) => string }) {
  // synthesis: check subject kind to pick banner vs pull-quote
  if (entry.type === 'synthesis') {
    const firstSubject = entry.subjects[0];
    if (firstSubject?.kind === 'family') {
      return <FamilyBanner entry={entry} />;
    }
    return <SynthesisPull entry={entry} nameOf={nameOf} />;
  }

  if (entry.type === 'nudge') {
    return <NudgeCallout entry={entry} />;
  }

  if (entry.type === 'activity') {
    return <ActivityLine entry={entry} />;
  }

  if (entry.type === 'prompt') {
    return <PromptInline entry={entry} />;
  }

  // written, observation, reflection, conversation all fall through to prose
  return <ProseEntry entry={entry} />;
}
