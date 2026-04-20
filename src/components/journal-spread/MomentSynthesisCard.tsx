'use client';

import type { JournalEntry } from '@/types/journal';
import type { Moment } from '@/types/moment';

interface MomentSynthesisCardProps {
  moment: Moment;
  views: JournalEntry[];
  // Map of userId → display name (author initial fallback if absent).
  userNames?: Record<string, string>;
}

const MAX_GLYPHS = 4;

function pickSynthesisLine(moment: Moment): { text: string; label: string } | null {
  const synth = moment.synthesis;
  if (!synth) return null;
  if (synth.divergenceLine) return { text: synth.divergenceLine, label: 'divergence' };
  if (synth.emergentLine) return { text: synth.emergentLine, label: 'emergent' };
  if (synth.agreementLine) return { text: synth.agreementLine, label: 'agreement' };
  return null;
}

function initialFor(userId: string, userNames?: Record<string, string>): string {
  const name = userNames?.[userId];
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  return userId.slice(0, 1).toUpperCase();
}

function oneLineExcerpt(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

/**
 * MomentSynthesisCard — renders the stack of views on a moment with
 * its cached synthesis above the stack. Solo moments (1 view) still
 * render cleanly; the synthesis strip hides until there's something
 * to say.
 */
export function MomentSynthesisCard({ moment, views, userNames }: MomentSynthesisCardProps) {
  const sorted = [...views].sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs; // newest first
  });

  const viewCount = moment.viewCount ?? views.length;
  const line = pickSynthesisLine(moment);
  const hasDivergence = !!moment.synthesis?.divergenceLine;
  const metaLabel = viewCount === 1
    ? 'one view'
    : `${viewCount} views · ${hasDivergence ? 'divergence' : 'no divergence'}`;

  const pendingSynth = !moment.synthesis && viewCount >= 2;
  const updatedAt = moment.synthesisUpdatedAt?.toDate?.();

  return (
    <article className="moment-card" aria-label="Moment synthesis">
      <header className="moment-header">
        <span className="eyes" aria-hidden="true">
          {Array.from({ length: Math.min(viewCount, MAX_GLYPHS) }).map((_, i) => (
            <span key={i} className="eye-dot" />
          ))}
          {viewCount > MAX_GLYPHS && (
            <span className="eye-plus">+{viewCount - MAX_GLYPHS}</span>
          )}
        </span>
        <span className="meta">{metaLabel}</span>
      </header>

      {line && (
        <p className={`synthesis-line synthesis-${line.label}`}>
          <span className="tag">{line.label}</span>
          <span className="text">{line.text}</span>
        </p>
      )}

      {!line && pendingSynth && (
        <p className="synthesis-pending">
          <em>synthesis pending…</em>
          {updatedAt && (
            <span className="pending-time"> · last read {updatedAt.toLocaleDateString()}</span>
          )}
        </p>
      )}

      <ol className="view-stack">
        {sorted.map((v) => {
          const initial = initialFor(v.authorId, userNames);
          const when = v.createdAt?.toDate?.();
          const whenLabel = when
            ? when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
            : '';
          return (
            <li key={v.entryId} className="view-item">
              <span className="view-initial" aria-hidden="true">{initial}</span>
              <div className="view-body">
                <p className="view-excerpt">{oneLineExcerpt(v.text)}</p>
                <span className="view-when">{whenLabel}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <style jsx>{`
        .moment-card {
          background: #faf7f1;
          border: 1px solid #e8e1d2;
          border-radius: 4px;
          padding: 18px 22px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2d2418;
        }
        .moment-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #a89373;
        }
        .eyes {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .eye-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a89373;
          opacity: 0.85;
        }
        .eye-plus {
          font-size: 10px;
          font-family: Georgia, serif;
          color: #a89373;
          margin-left: 2px;
        }
        .synthesis-line {
          margin: 14px 0 6px 0;
          font-size: 16px;
          line-height: 1.55;
          font-style: italic;
          color: #2d2418;
        }
        .synthesis-line .tag {
          display: inline-block;
          font-style: normal;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a89373;
          margin-right: 10px;
          vertical-align: 2px;
        }
        .synthesis-divergence .tag { color: #b94a3b; }
        .synthesis-emergent .tag { color: #8a6a9a; }
        .synthesis-agreement .tag { color: #6a8a6a; }
        .synthesis-pending {
          margin: 14px 0 6px 0;
          font-size: 14px;
          color: #a89373;
        }
        .pending-time {
          font-style: normal;
        }
        .view-stack {
          list-style: none;
          margin: 14px 0 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .view-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding-top: 12px;
          border-top: 1px solid #ece6d7;
        }
        .view-item:first-child {
          border-top: none;
          padding-top: 0;
        }
        .view-initial {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #e8e1d2;
          color: #2d2418;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 13px;
          flex-shrink: 0;
        }
        .view-body {
          flex: 1;
          min-width: 0;
        }
        .view-excerpt {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #3d3a34;
        }
        .view-when {
          display: block;
          margin-top: 3px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #a89373;
        }
      `}</style>
    </article>
  );
}
