'use client';

import { useState, useEffect } from 'react';
import { Feather } from 'lucide-react';
import type { Entry } from '@/types/entry';
import { EntryBlock } from './EntryBlock';
import { DateBand } from './DateBand';
import { MastheadRow, type MastheadMember } from './MastheadRow';
import { FilterPills, type FilterPillsPerson, type FilterSelection } from './FilterPills';
import { usePageWindow } from './usePageWindow';
import { BOOK_ASSETS, BOOK_ASSETS_AVAILABLE, FLAT_COLORS } from './assets';
import { MarginItem } from './MarginColumn';

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
}: {
  entries: Entry[];
  side: 'left' | 'right';
  nameOf?: (personId: string) => string;
  currentUserId?: string;
}) {
  const groups = groupEntriesByDay(entries);
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
                  <MarginItem entry={e} />
                </div>
                <div className="main-cell">
                  <EntryBlock entry={e} nameOf={nameOf} currentUserId={currentUserId} />
                </div>
              </div>
            ) : (
              <div key={e.id} style={{ display: 'contents' }}>
                <div className="main-cell">
                  <EntryBlock entry={e} nameOf={nameOf} currentUserId={currentUserId} />
                </div>
                <div className="margin-cell margin-right">
                  <MarginItem entry={e} />
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
  const half = isMobile ? 0 : Math.ceil(currentEntries.length / 2);
  const leftEntries = currentEntries.slice(0, half);
  const rightEntries = currentEntries.slice(half);

  const bgStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#1f160e' };
  const paperLeftStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.paperLeft})`, backgroundSize: 'cover' }
    : { backgroundColor: FLAT_COLORS.paper };
  const paperRightStyle = BOOK_ASSETS_AVAILABLE
    ? { backgroundImage: `url(${BOOK_ASSETS.paperRight})`, backgroundSize: 'cover' }
    : { backgroundColor: FLAT_COLORS.paper };

  return (
    <div className="spread-stage" style={bgStyle}>
      <FilterPills people={people} active={activeFilter} onChange={handleFilterChange} />
      <MastheadRow
        familyName={familyName}
        volumeLabel={volumeLabel}
        dateRangeLabel={dateRangeLabel}
        members={members}
      />
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
        <div className="page page-left" style={paperLeftStyle}>
          <PageEntries entries={leftEntries} side="left" nameOf={nameOf} currentUserId={currentUserId} />
        </div>
        <div className="page page-right" style={paperRightStyle}>
          <PageEntries entries={rightEntries} side="right" nameOf={nameOf} currentUserId={currentUserId} />
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
      <style jsx>{`
        .spread-stage { padding: 30px 20px 60px; min-height: 100vh; }
        .book {
          position: relative;
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: ${BOOK_ASSETS_AVAILABLE ? 'transparent' : FLAT_COLORS.spineDark};
          padding: 16px;
          border-radius: 4px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .page {
          min-height: 800px;
          position: relative;
          color: ${FLAT_COLORS.ink};
          display: grid;
          grid-auto-rows: min-content;
          align-content: start;
          padding: 30px 0 32px;
        }
        .page-left  {
          border-radius: 2px 0 0 2px;
          grid-template-columns: 160px 1fr;
        }
        .page-right {
          border-radius: 0 2px 2px 0;
          grid-template-columns: 1fr 160px;
        }
        .page :global(.date-row) {
          grid-column: 1 / -1;
          padding: 0 28px;
        }
        .page :global(.main-cell) {
          padding: 0 28px;
        }
        .page :global(.margin-cell) {
          padding: 0 16px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #8a6f4a;
          font-size: 11px;
          line-height: 1.5;
        }
        .page-left :global(.margin-cell) {
          text-align: right;
        }
        .page-right :global(.margin-cell) {
          text-align: left;
        }
        .flip {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 32px; height: 56px;
          background: rgba(245,236,216,0.12);
          border: 1px solid rgba(245,236,216,0.3);
          color: #f5ecd8;
          font-size: 22px;
          font-style: italic;
          cursor: pointer;
          z-index: 5;
        }
        .flip-left  { left: -38px; border-radius: 3px 0 0 3px; }
        .flip-right { right: -38px; border-radius: 0 3px 3px 0; }
        .capture-btn {
          display: block;
          margin: 18px auto 0;
          background: ${FLAT_COLORS.spineDark};
          color: #f5ecd8;
          padding: 10px 22px;
          border: none;
          border-radius: 22px;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: -apple-system, sans-serif;
        }
        .page-meta {
          text-align: center;
          margin-top: 14px;
          font-size: 10px;
          color: ${FLAT_COLORS.inkMuted};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-style: italic;
          font-family: -apple-system, sans-serif;
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
          .page-left, .page-right {
            grid-template-columns: 1fr;
          }
          :global(.margin-cell) {
            display: none;
          }
          .page-right {
            border-radius: 2px;
          }
          .flip-left { left: 4px; }
          .flip-right { right: 4px; }
        }
      `}</style>
    </div>
  );
}
