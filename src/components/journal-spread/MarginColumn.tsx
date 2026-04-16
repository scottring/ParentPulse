'use client';

import { useState } from 'react';
import type { Entry } from '@/types/entry';
import type { MarginNote } from '@/types/marginNote';
import { UserMarginNote } from './UserMarginNote';
import { MarginNoteComposer } from './MarginNoteComposer';

export interface MarginColumnProps {
  /** Entries shown on this page; marginalia derive from their tags/source refs. */
  entries: Entry[];
  /** Which side the margin sits on — affects text alignment. */
  side: 'left' | 'right';
}

/**
 * The margin column. For each entry on the page, emits 0+ small italic
 * notes derived ONLY from data already present on the entry:
 *
 *  - Synthesis entries with sourceEntryIds → "↑ from N entries"
 *  - Entries with non-internal tags → small "#tag" lines
 *
 * Intentionally minimal. Plan 3 will add real marginalia (AI annotations,
 * spouse reactions, user notes). This component reserves the visual
 * space and proves the layout with real data.
 */
export function MarginColumn({ entries, side }: MarginColumnProps) {
  return (
    <div className={`margin-col margin-${side}`}>
      {entries.map((e) => (
        <MarginItem key={e.id} entry={e} side={side} />
      ))}
      <style jsx>{`
        .margin-col {
          font-family: Georgia, 'Times New Roman', serif;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
        }
        .margin-left  { text-align: right; }
        .margin-right { text-align: left; }
      `}</style>
    </div>
  );
}

const SYNTHESIS_BUCKET_TAGS = new Set(['overview', 'alignments', 'gaps', 'blindSpots']);

const ANNOTATABLE_ENTRY_TYPES = new Set(['written', 'observation']);

export interface MarginItemProps {
  entry: Entry;
  side?: 'left' | 'right';
  notes?: MarginNote[];
  currentUserId?: string;
  /**
   * userId → display name resolver (e.g., from the people map, resolved
   * by Person.linkedUserId). Separate from the personId-based `nameOf`
   * used elsewhere — margin note authors are identified by userId.
   */
  resolveUserName?: (userId: string) => string;
  onCreateNote?: (journalEntryId: string, content: string) => Promise<unknown> | void;
  onUpdateNote?: (noteId: string, content: string) => Promise<unknown> | void;
  onDeleteNote?: (noteId: string) => Promise<unknown> | void;
}

export function MarginItem({
  entry,
  side = 'right',
  notes = [],
  currentUserId,
  resolveUserName,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: MarginItemProps) {
  const [composing, setComposing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const externalTags = entry.tags.filter(
    (t) => !t.startsWith('_') && !t.includes(':') && !SYNTHESIS_BUCKET_TAGS.has(t)
  );
  const hasSynthesisDate =
    entry.type === 'synthesis' && typeof entry.createdAt?.toDate === 'function';
  const synthDate = hasSynthesisDate
    ? entry.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  const viewerCanSeeEntry =
    !!currentUserId && entry.visibleToUserIds.includes(currentUserId);
  const isAnnotatable = ANNOTATABLE_ENTRY_TYPES.has(entry.type);
  const canAuthor = isAnnotatable && viewerCanSeeEntry && !!onCreateNote;

  // For journal-derived entries, Entry.author.personId actually holds
  // the journal entry's authorId, which in this codebase is a userId
  // (see src/lib/entries/adapter.ts:journalEntryToEntry). This naming
  // is a legacy quirk — for margin notes (userId-keyed) the comparison
  // against note.authorUserId is correct.
  const entryAuthorUserId =
    entry.author.kind === 'person' ? entry.author.personId : '';

  const hasAny =
    notes.length > 0 ||
    externalTags.length > 0 ||
    hasSynthesisDate ||
    canAuthor;
  if (!hasAny) return null;

  const resolveName = resolveUserName ?? ((uid: string) => uid.charAt(0));

  return (
    <div className="item">
      {notes.map((n) =>
        editingNoteId === n.id && onUpdateNote ? (
          <MarginNoteComposer
            key={n.id}
            side={side}
            initialValue={n.content}
            onCommit={async (content) => {
              await onUpdateNote(n.id, content);
              setEditingNoteId(null);
            }}
            onCancel={() => setEditingNoteId(null)}
            onDelete={
              onDeleteNote
                ? async () => {
                    await onDeleteNote(n.id);
                    setEditingNoteId(null);
                  }
                : undefined
            }
          />
        ) : (
          <UserMarginNote
            key={n.id}
            note={n}
            entryAuthorUserId={entryAuthorUserId}
            currentUserId={currentUserId ?? ''}
            side={side}
            authorName={resolveName(n.authorUserId)}
            onStartEdit={
              onUpdateNote && n.authorUserId === currentUserId
                ? () => setEditingNoteId(n.id)
                : undefined
            }
          />
        )
      )}
      {composing && onCreateNote && (
        <MarginNoteComposer
          side={side}
          initialValue=""
          onCommit={async (content) => {
            await onCreateNote(entry.id, content);
            setComposing(false);
          }}
          onCancel={() => setComposing(false)}
        />
      )}
      {!composing && canAuthor && (
        <button
          type="button"
          className="add-trigger"
          aria-label="Add margin note"
          onClick={() => setComposing(true)}
        >
          note
        </button>
      )}
      {externalTags.map((t) => (
        <div key={t} className="tag">#{t}</div>
      ))}
      {hasSynthesisDate && (
        <div className="date">synthesized {synthDate}</div>
      )}
      <style jsx>{`
        .item { margin-bottom: 34px; font-style: italic; opacity: 0.75; }
        .tag {
          color: #5a4628; font-style: normal; font-size: 10px;
          letter-spacing: 0.1em; text-transform: lowercase;
        }
        .date { color: #8a6f4a; font-size: 10px; font-style: italic; }
        .add-trigger {
          appearance: none; background: transparent; border: none;
          font: inherit; color: #8a6f4a; cursor: pointer;
          opacity: 0.35; padding: 2px 0;
          font-size: 10px; letter-spacing: 0.12em;
        }
        .add-trigger:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
