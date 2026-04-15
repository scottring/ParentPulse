'use client';

import type { Entry, EntryType } from '@/types/entry';

const KICKERS: Record<EntryType, string> = {
  written: 'Written',
  observation: 'Observation',
  activity: 'Activity',
  synthesis: 'Synthesis',
  nudge: 'One thing to try',
  prompt: 'Question',
  reflection: 'Reflection',
  conversation: 'Conversation',
};

const TYPE_CLASSES: Record<EntryType, string> = {
  written: 'block-written',
  observation: 'block-observation',
  activity: 'block-activity',
  synthesis: 'block-synthesis',
  nudge: 'block-nudge',
  prompt: 'block-prompt',
  reflection: 'block-reflection',
  conversation: 'block-conversation',
};

export function EntryBlock({ entry }: { entry: Entry }) {
  return (
    <article className={`entry-block ${TYPE_CLASSES[entry.type]}`}>
      <div className="entry-kicker">{KICKERS[entry.type]}</div>
      <p className="entry-content">{entry.content}</p>
      <style jsx>{`
        .entry-block {
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 10px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2d2418;
        }
        .entry-kicker {
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .entry-content {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          font-style: italic;
        }
        .block-written  { background: #faf3e2; border: 1px solid rgba(120,90,50,0.3); }
        .block-written  .entry-kicker { color: #8a6f4a; }
        .block-observation { background: #f3e6b8; }
        .block-observation .entry-kicker { color: #7a5f1a; }
        .block-activity { background: #9bb59b; color: #1f3020; }
        .block-activity .entry-kicker { color: #2f5a38; }
        .block-synthesis { background: #e8a17a; color: #3d2518; }
        .block-synthesis .entry-kicker { color: #7a2f1a; }
        .block-nudge    { background: #c487a3; color: #3d1830; }
        .block-nudge    .entry-kicker { color: #591a42; }
        .block-prompt   { background: #efe6cd; }
        .block-prompt   .entry-kicker { color: #8a6f4a; }
        .block-reflection { background: #faf3e2; }
        .block-reflection .entry-kicker { color: #8a6f4a; }
        .block-conversation { background: #6a8aa0; color: #f5ecd8; }
        .block-conversation .entry-kicker { color: #d0e1ea; }
      `}</style>
    </article>
  );
}
