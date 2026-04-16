'use client';

import { useState } from 'react';
import { Compass, Link2, Unlink2, Eye, Sparkles, Users, MessageCircleQuestion, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Entry } from '@/types/entry';

// Approximate character count that fills ~2 lines after the italic lead
// in a ~440px main column at the body font/leading used below. Real data
// varies; the clamp is a hint, not a hard boundary.
const PROSE_CLAMP_CHARS = 180;
const BLOCK_CLAMP_CHARS = 160;

type SynthesisBucket = 'overview' | 'alignments' | 'gaps' | 'blindSpots';

const BUCKET_COLORS: Record<SynthesisBucket, { rule: string; label: string }> = {
  overview:   { rule: '#8a6a9a', label: 'Synthesis' },
  alignments: { rule: '#6a8a6a', label: 'Alignment' },
  gaps:       { rule: '#b94a3b', label: 'Gap' },
  blindSpots: { rule: '#c89b3b', label: 'Blind spot' },
};

const BUCKET_ICONS: Record<SynthesisBucket, typeof Compass> = {
  overview:   Compass,
  alignments: Link2,
  gaps:       Unlink2,
  blindSpots: Eye,
};

const BUCKET_KEYS: SynthesisBucket[] = ['overview', 'alignments', 'gaps', 'blindSpots'];

function pickBucket(tags: string[]): SynthesisBucket {
  for (const t of tags) {
    if (BUCKET_KEYS.includes(t as SynthesisBucket)) return t as SynthesisBucket;
  }
  return 'gaps'; // fallback
}

function splitLead(content: string): { lead: string; body: string } {
  const dot = content.indexOf('. ');
  if (dot === -1 || dot >= content.length - 2) return { lead: content, body: '' };
  return { lead: content.slice(0, dot + 1), body: content.slice(dot + 2) };
}

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
function ProseEntry({ entry, currentUserId }: { entry: Entry; currentUserId?: string }) {
  const [expanded, setExpanded] = useState(false);

  const isPrivate =
    currentUserId !== undefined &&
    entry.visibleToUserIds.length === 1 &&
    entry.visibleToUserIds[0] === currentUserId;

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
      <div className="entry-meta">
        {typeLabel}
        {isPrivate && <span className="lock" aria-label="Private">🔒</span>}
      </div>
      <p className={`entry-body${shouldClamp ? ' clamped' : ''}`}>
        <span className="first-line">{firstLine}</span>
        {rest && (rest.startsWith('\n') ? rest : ` ${rest}`)}
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
        .lock {
          margin-left: 6px;
          opacity: 0.55;
          font-size: 10px;
        }
        .entry-body {
          font-size: 14px;
          line-height: 1.6;
          color: #2d2418;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          white-space: pre-wrap;
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
function SynthesisPull({
  entry,
  nameOf,
}: {
  entry: Entry;
  nameOf?: (personId: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bucket = pickBucket(entry.tags);
  const { rule, label } = BUCKET_COLORS[bucket];

  const subject = entry.subjects[0];
  const subjectName =
    subject?.kind === 'person'
      ? (nameOf ? nameOf(subject.personId) : subject.personId)
      : 'them';
  const subjectInitial = subjectName.charAt(0).toUpperCase();
  const subjectLabel = subject?.kind === 'person' ? `${label} · about ${subjectName}` : label;

  const { lead, body } = splitLead(entry.content);
  const hasBody = body.length > 0;

  return (
    <div className="synth-pull">
      <div className="meta">
        {subject?.kind === 'person' && (
          <span className="avatar" aria-hidden="true">{subjectInitial}</span>
        )}
        <span className="icon-wrap" style={{ color: rule }} aria-hidden="true">
          {(() => {
            const Icon = BUCKET_ICONS[bucket];
            return <Icon size={14} strokeWidth={1.5} />;
          })()}
        </span>
        <span className="label" style={{ color: rule }}>{subjectLabel}</span>
      </div>
      <p className="lead" style={{ color: rule === '#c89b3b' ? '#6a4a1a' : '#5a3520' }}>{lead}</p>
      {hasBody && expanded && <p className="body">{body}</p>}
      {hasBody && (
        <ReadMoreToggle expanded={expanded} onToggle={() => setExpanded((v) => !v)} tone="muted" />
      )}
      <style jsx>{`
        .synth-pull {
          margin: 8px 0 24px;
          padding: 4px 0 4px 0;
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
        }
        .icon-wrap {
          display: inline-flex;
          align-items: center;
          opacity: 0.65;
        }
        .avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #d4b483;
          color: #3d2f1f;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          border: 2px solid #f5ecd8;
        }
        .label {
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
        }
        .lead {
          font-size: 16px;
          line-height: 1.45;
          font-style: italic;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          white-space: pre-wrap;
        }
        .body {
          font-size: 13px;
          line-height: 1.55;
          color: #5a4628;
          margin: 8px 0 0;
          font-family: Georgia, 'Times New Roman', serif;
          white-space: pre-wrap;
        }
        .body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .source {
          margin-top: 8px;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
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
      <div className="label">
        <span className="icon-wrap" style={{ color: '#d0e1ea' }} aria-hidden="true">
          <Users size={14} strokeWidth={1.5} />
        </span>
        Family synthesis
      </div>
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
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .icon-wrap {
          display: inline-flex;
          align-items: center;
          opacity: 0.65;
        }
        .body {
          font-size: 12.5px;
          line-height: 1.5;
          margin: 0;
          color: #e8eef2;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          white-space: pre-wrap;
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
      <div className="label">
        <span className="icon-wrap" style={{ color: '#7a3060' }} aria-hidden="true">
          <Sparkles size={14} strokeWidth={1.5} />
        </span>
        One thing to try
      </div>
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
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .icon-wrap {
          display: inline-flex;
          align-items: center;
          opacity: 0.65;
        }
        .body {
          font-size: 12.5px;
          line-height: 1.5;
          color: #591a42;
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          white-space: pre-wrap;
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
          white-space: pre-wrap;
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

function renderEntryBody(
  entry: Entry,
  nameOf?: (personId: string) => string,
  currentUserId?: string
) {
  if (entry.type === 'synthesis') {
    const firstSubject = entry.subjects[0];
    if (firstSubject?.kind === 'family') return <FamilyBanner entry={entry} />;
    return <SynthesisPull entry={entry} nameOf={nameOf} />;
  }
  if (entry.type === 'nudge')    return <NudgeCallout entry={entry} />;
  if (entry.type === 'activity') return <ActivityLine entry={entry} />;
  if (entry.type === 'prompt')   return <PromptInline entry={entry} />;
  return <ProseEntry entry={entry} currentUserId={currentUserId} />;
}

const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isEditableType(entry: Entry): boolean {
  return (
    entry.author.kind === 'person' &&
    (entry.type === 'written' ||
      entry.type === 'observation' ||
      entry.type === 'reflection' ||
      entry.type === 'activity')
  );
}

export function EntryBlock({
  entry,
  nameOf,
  currentUserId,
  onAsk,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  nameOf?: (personId: string) => string;
  currentUserId?: string;
  onAsk?: (entry: Entry) => void;
  onEdit?: (entry: Entry, mode: 'edit' | 'append') => void;
  onDelete?: (entry: Entry) => void;
}) {
  const canEdit = onEdit && isEditableType(entry);
  const ageMs = canEdit
    ? Date.now() - (entry.createdAt?.toDate?.().getTime() ?? 0)
    : 0;
  const editMode: 'edit' | 'append' = ageMs < EDIT_WINDOW_MS ? 'edit' : 'append';

  const isMine =
    entry.author.kind === 'person' &&
    currentUserId !== undefined &&
    entry.author.personId === currentUserId;
  const canDelete = !!onDelete && isMine && isEditableType(entry);

  return (
    <div className="entry-wrap">
      {renderEntryBody(entry, nameOf, currentUserId)}
      <div className="entry-actions">
        {canEdit && (
          <button
            type="button"
            className="action-btn edit-btn"
            onClick={(ev) => {
              ev.stopPropagation();
              onEdit!(entry, editMode);
            }}
            aria-label={editMode === 'edit' ? 'Edit entry' : 'Add to entry'}
          >
            {editMode === 'edit' ? (
              <Pencil size={13} strokeWidth={1.5} />
            ) : (
              <Plus size={13} strokeWidth={1.5} />
            )}
            <span>{editMode === 'edit' ? 'Edit' : 'Add'}</span>
          </button>
        )}
        {onAsk && (
          <button
            type="button"
            className="action-btn ask-btn"
            onClick={(ev) => {
              ev.stopPropagation();
              onAsk(entry);
            }}
            aria-label="Ask about this entry"
          >
            <MessageCircleQuestion size={13} strokeWidth={1.5} />
            <span>Ask</span>
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="action-btn delete-btn"
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete!(entry);
            }}
            aria-label="Delete this entry"
          >
            <Trash2 size={13} strokeWidth={1.5} />
            <span>Delete</span>
          </button>
        )}
      </div>
      <style jsx>{`
        .entry-wrap {
          position: relative;
        }
        .entry-actions {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          gap: 4px;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          opacity: 0;
          transition: opacity 160ms ease, background 160ms ease;
        }
        .edit-btn {
          color: #6a8a6a;
        }
        .ask-btn {
          color: #8a6a9a;
        }
        .entry-wrap:hover .action-btn,
        .action-btn:focus-visible {
          opacity: 0.85;
        }
        .edit-btn:hover {
          opacity: 1;
          background: rgba(106, 138, 106, 0.1);
          border-color: rgba(106, 138, 106, 0.3);
        }
        .ask-btn:hover {
          opacity: 1;
          background: rgba(138, 106, 154, 0.1);
          border-color: rgba(138, 106, 154, 0.3);
        }
        .delete-btn {
          color: #b94a3b;
        }
        .delete-btn:hover {
          opacity: 1;
          background: rgba(185, 74, 59, 0.08);
          border-color: rgba(185, 74, 59, 0.3);
        }
      `}</style>
    </div>
  );
}
