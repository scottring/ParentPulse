'use client';

import { useState, useEffect, useMemo } from 'react';
import { Feather } from 'lucide-react';
import type { Entry } from '@/types/entry';
import { EntryBlock } from './EntryBlock';
import { DateBand } from './DateBand';
import { MastheadRow, type MastheadMember } from './MastheadRow';
import { FilterPills, type FilterPillsPerson, type FilterSelection } from './FilterPills';
import { usePageWindow } from './usePageWindow';
import { FLAT_COLORS } from './assets';
import { MarginItem } from './MarginColumn';
import {
  useMarginNotesForJournalEntries,
  useMarginNoteMutations,
} from '@/hooks/useMarginNotes';
import { usePeopleMap } from '@/hooks/usePeopleMap';
import type { MarginNote } from '@/types/marginNote';
import dynamic from 'next/dynamic';

const AskAboutEntrySheet = dynamic(
  () => import('./AskAboutEntrySheet').then((m) => m.AskAboutEntrySheet),
  { ssr: false }
);

const WOOD_DESK_IMG = '/images/overhead-desk.png';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

const PAGE_SIZE = 6; // 3 per page × 2 pages — designed around 800px min-height

export interface JournalSpreadProps {
  entries: Entry[];
  familyName: string;
  volumeLabel: string;
  dateRangeLabel: string;
  members: MastheadMember[];
  people: FilterPillsPerson[];
  onCapture: () => void;
  filter?: FilterSelection;
  onFilterChange?: (next: FilterSelection) => void;
  nameOf?: (personId: string) => string;
  currentUserId?: string;
}

/** Group an array of entries by calendar day (local date string), preserving order */
function groupEntriesByDay(entries: Entry[]): Array<{ dateKey: string; entries: Entry[] }> {
  const groups: Array<{ dateKey: string; entries: Entry[] }> = [];
  let current: { dateKey: string; entries: Entry[] } | null = null;

  for (const entry of entries) {
    const d = entry.createdAt.toDate();
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }

  return groups;
}

/** Render a grouped page: each entry shares a grid row with its margin item
 *  so margin notes align with their entries instead of stacking at the top. */
function PageEntries({
  entries,
  side,
  nameOf,
  currentUserId,
  onAsk,
  onEdit,
  notesByEntry,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  resolveUserName,
}: {
  entries: Entry[];
  side: 'left' | 'right';
  nameOf?: (personId: string) => string;
  currentUserId?: string;
  onAsk?: (entry: Entry, side: 'left' | 'right') => void;
  onEdit?: (entry: Entry, mode: 'edit' | 'append') => void;
  notesByEntry: Map<string, MarginNote[]>;
  onCreateNote: (journalEntryId: string, content: string) => Promise<string>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  resolveUserName: (userId: string) => string;
}) {
  const groups = groupEntriesByDay(entries);
  const handleAsk = onAsk ? (e: Entry) => onAsk(e, side) : undefined;
  return (
    <>
      {groups.map((group) => (
        <div key={group.dateKey} style={{ display: 'contents' }}>
          <div className="date-row">
            <DateBand date={group.entries[0].createdAt} />
          </div>
          {group.entries.map((e) =>
            side === 'left' ? (
              <div key={e.id} style={{ display: 'contents' }}>
                <div className="margin-cell margin-left">
                  <MarginItem
                    entry={e}
                    side={side}
                    notes={notesByEntry.get(e.id) ?? []}
                    currentUserId={currentUserId}
                    resolveUserName={resolveUserName}
                    onCreateNote={onCreateNote}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                  />
                </div>
                <div className="main-cell">
                  <EntryBlock entry={e} nameOf={nameOf} currentUserId={currentUserId} onAsk={handleAsk} onEdit={onEdit} />
                </div>
              </div>
            ) : (
              <div key={e.id} style={{ display: 'contents' }}>
                <div className="main-cell">
                  <EntryBlock entry={e} nameOf={nameOf} currentUserId={currentUserId} onAsk={handleAsk} onEdit={onEdit} />
                </div>
                <div className="margin-cell margin-right">
                  <MarginItem
                    entry={e}
                    side={side}
                    notes={notesByEntry.get(e.id) ?? []}
                    currentUserId={currentUserId}
                    resolveUserName={resolveUserName}
                    onCreateNote={onCreateNote}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                  />
                </div>
              </div>
            )
          )}
        </div>
      ))}
    </>
  );
}

export function JournalSpread({
  entries,
  familyName,
  volumeLabel,
  dateRangeLabel,
  members,
  people,
  onCapture,
  filter,
  onFilterChange,
  nameOf,
  currentUserId,
}: JournalSpreadProps) {
  const [internalFilter, setInternalFilter] = useState<FilterSelection>({ kind: 'everyone' });
  const activeFilter = filter ?? internalFilter;
  const handleFilterChange = (next: FilterSelection) => {
    if (onFilterChange) onFilterChange(next);
    else setInternalFilter(next);
  };

  const { currentEntries, canFlipNewer, canFlipOlder, flipNewer, flipOlder, currentPageIndex, totalPages } =
    usePageWindow(entries, PAGE_SIZE);

  const isMobile = useIsMobile();
  // Within a spread, read chronologically left→right: left = older,
  // right = newer. The incoming list is newest-first, so reverse the
  // current window before splitting.
  const orderedForSpread = [...currentEntries].reverse();
  const half = isMobile ? 0 : Math.ceil(orderedForSpread.length / 2);
  const leftEntries = orderedForSpread.slice(0, half);
  const rightEntries = orderedForSpread.slice(half);

  const annotatableJournalEntryIds = useMemo(
    () =>
      orderedForSpread
        .filter((e) => e.type === 'written' || e.type === 'observation')
        .map((e) => e.id),
    [orderedForSpread]
  );

  const { notesByEntry } = useMarginNotesForJournalEntries(annotatableJournalEntryIds);
  const { createNote, updateNote, deleteNote } = useMarginNoteMutations();
  const { byId: peopleById } = usePeopleMap();

  // userId → display name. Derived from the people map by looking up the
  // person whose linkedUserId matches. Falls back to the userId itself so
  // something is always rendered for unknown users.
  const resolveUserName = useMemo(() => {
    const userIdToName = new Map<string, string>();
    for (const p of Object.values(peopleById)) {
      if (p.linkedUserId) userIdToName.set(p.linkedUserId, p.name);
    }
    return (userId: string) => userIdToName.get(userId) ?? userId;
  }, [peopleById]);

  const [askTarget, setAskTarget] = useState<{ entry: Entry; side: 'left' | 'right' } | null>(null);
  const handleAsk = (entry: Entry, side: 'left' | 'right') => {
    // On mobile the whole spread is the right page, so sheet slides from right.
    setAskTarget({ entry, side: isMobile ? 'right' : side });
  };

  const handleEdit = (entry: Entry, mode: 'edit' | 'append') => {
    window.dispatchEvent(
      new CustomEvent('relish:open-edit', { detail: { entry, mode } })
    );
  };

  return (
    <div className="spread-stage">
      <MastheadRow
        familyName={familyName}
        volumeLabel={volumeLabel}
        dateRangeLabel={dateRangeLabel}
        members={members}
      />
      <FilterPills people={people} active={activeFilter} onChange={handleFilterChange} />
      <div className="book">
        {canFlipNewer && (
          <button type="button" className="flip flip-left" onClick={flipNewer} aria-label="Newer entries">
            ‹
          </button>
        )}
        {canFlipOlder && (
          <button type="button" className="flip flip-right" onClick={flipOlder} aria-label="Older entries">
            ›
          </button>
        )}
        <div className="page page-left">
          <PageEntries
            entries={leftEntries}
            side="left"
            nameOf={nameOf}
            currentUserId={currentUserId}
            onAsk={handleAsk}
            onEdit={handleEdit}
            notesByEntry={notesByEntry}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            resolveUserName={resolveUserName}
          />
        </div>
        <div className="page page-right">
          <PageEntries
            entries={rightEntries}
            side="right"
            nameOf={nameOf}
            currentUserId={currentUserId}
            onAsk={handleAsk}
            onEdit={handleEdit}
            notesByEntry={notesByEntry}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            resolveUserName={resolveUserName}
          />
          {currentEntries.length === 0 && (
            <p className="empty-state">A quiet day. Nothing yet — write the first thing.</p>
          )}
          <div className="doodle-slot" aria-hidden="true">
            <Feather size={20} strokeWidth={1.25} />
          </div>
        </div>
      </div>
      <button type="button" className="capture-btn" onClick={onCapture}>
        + Add an entry
      </button>
      <div className="page-meta">
        Page {currentPageIndex + 1} of {totalPages}
      </div>
      {askTarget && (
        <AskAboutEntrySheet
          entry={askTarget.entry}
          side={askTarget.side}
          nameOf={nameOf}
          onClose={() => setAskTarget(null)}
        />
      )}
      <style jsx>{`
        .spread-stage {
          position: relative;
          min-height: 100vh;
          padding: 32px 28px 72px;
          background-image: url(${WOOD_DESK_IMG});
          background-size: 260%;
          background-position: center 38%;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }
        .spread-stage::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at center,
              transparent 0%,
              transparent 45%,
              rgba(40, 24, 10, 0.22) 85%,
              rgba(30, 18, 8, 0.42) 100%
            );
          z-index: 0;
        }
        .book,
        :global(.spread-stage > *) {
          position: relative;
          z-index: 1;
        }
        .book {
          position: relative;
          max-width: 1288px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 14px;
          background: #2a1f14;
          border-radius: 4px;
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.55),
            0 8px 20px rgba(0, 0, 0, 0.35);
        }
        .page {
          min-height: 800px;
          position: relative;
          background: ${FLAT_COLORS.paper};
          color: ${FLAT_COLORS.ink};
          display: grid;
          grid-auto-rows: min-content;
          align-content: start;
          padding: 30px 0 32px;
        }
        .page-left  {
          border-radius: 2px 0 0 2px;
          grid-template-columns: 140px 1fr;
          padding-right: 40px;
          box-shadow: inset -12px 0 18px -12px rgba(0, 0, 0, 0.25);
        }
        .page-right {
          border-radius: 0 2px 2px 0;
          grid-template-columns: 1fr 140px;
          padding-left: 40px;
          box-shadow: inset 12px 0 18px -12px rgba(0, 0, 0, 0.25);
        }
        .page :global(.date-row) {
          grid-column: 1 / -1;
          padding: 0 14px;
        }
        .page :global(.main-cell) {
          padding: 0 14px;
        }
        .page :global(.margin-cell) {
          padding: 0 14px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
          background: transparent;
        }
        .page-left :global(.margin-cell) {
          text-align: right;
          border-right: 1px dotted #c8b89a;
        }
        .page-right :global(.margin-cell) {
          text-align: left;
          border-left: 1px dotted #c8b89a;
        }
        .flip {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px;
          background: transparent;
          border: none;
          color: #f5ecd8;
          font-size: 32px;
          font-style: italic;
          line-height: 1;
          cursor: pointer;
          z-index: 5;
          opacity: 0.55;
          transition: opacity 0.25s ease, transform 0.25s ease;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
        }
        .flip:hover {
          opacity: 1;
        }
        .flip-left  { left: -56px; }
        .flip-right { right: -56px; }
        .flip-left:hover  { transform: translateY(-50%) translateX(-2px); }
        .flip-right:hover { transform: translateY(-50%) translateX(2px); }
        .capture-btn {
          display: block;
          margin: 26px auto 0;
          background: rgba(20, 12, 4, 0.72);
          color: #f5ecd8;
          padding: 11px 26px;
          border: 1px solid rgba(245, 236, 216, 0.18);
          border-radius: 24px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: -apple-system, sans-serif;
          backdrop-filter: blur(4px);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .capture-btn:hover {
          background: rgba(20, 12, 4, 0.88);
          transform: translateY(-1px);
        }
        .page-meta {
          text-align: center;
          margin-top: 16px;
          font-size: 10px;
          color: rgba(245, 236, 216, 0.5);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-style: italic;
          font-family: -apple-system, sans-serif;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }
        .empty-state {
          grid-column: 1 / -1;
          font-family: Georgia, serif;
          font-style: italic;
          color: ${FLAT_COLORS.inkMuted};
          text-align: center;
          margin-top: 60px;
        }
        .doodle-slot {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          margin: 16px 0 0;
          color: #a89373;
          opacity: 0.45;
        }
        @media (max-width: 640px) {
          .book {
            grid-template-columns: 1fr;
          }
          .page-left {
            display: none;
          }
          .page-right {
            grid-template-columns: 1fr;
            border-radius: 2px;
            box-shadow: none;
          }
          :global(.margin-cell) {
            display: none;
          }
          .flip-left { left: 4px; }
          .flip-right { right: 4px; }
        }
      `}</style>
    </div>
  );
}
