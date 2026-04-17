'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useEntries } from '@/hooks/useEntries';
import { usePeopleMap } from '@/hooks/usePeopleMap';
import { JournalSpread } from '@/components/journal-spread/JournalSpread';
import type { FilterSelection } from '@/components/journal-spread/FilterPills';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { PinKeypad } from '@/components/privacy/PinKeypad';
import { UserMenu } from '@/components/layout/UserMenu';
import type { EntryFilter } from '@/types/entry';
import CaptureSheet from '@/components/capture/CaptureSheet';

/**
 * Parse a URL `?focus=…` param into a journal filter. Accepted:
 *   focus=just-me        → private view (triggers PIN gate)
 *   focus=syntheses      → synthesis-only
 *   focus=<personId>     → that person
 * Anything else falls through to everyone.
 */
function filterFromFocus(raw: string | null): FilterSelection {
  if (!raw) return { kind: 'everyone' };
  if (raw === 'just-me') return { kind: 'just-me' };
  if (raw === 'syntheses') return { kind: 'syntheses' };
  return { kind: 'person', personId: raw };
}

/**
 * SpreadHome — the journal book surface. Mounted at /journal. Wires
 * useDashboard + useEntries into the JournalSpread composite, plus
 * the privacy-lock guard for the "Just me" filter and the capture
 * sheet. Previously rendered at / when NEXT_PUBLIC_JOURNAL_SPREAD=1;
 * now lives on its own route while / hosts the Surface.
 */
export function SpreadHome() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const { nameOf } = usePeopleMap();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get('focus');
  const [filterSel, setFilterSel] = useState<FilterSelection>(() =>
    filterFromFocus(focusParam)
  );
  const privacyLock = usePrivacyLock();
  const [pendingFilter, setPendingFilter] = useState<FilterSelection | null>(null);

  // Keep state in sync when the URL param changes (e.g. user
  // navigates from the Surface to /journal?focus=… a second time).
  useEffect(() => {
    const next = filterFromFocus(focusParam);
    setFilterSel((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
  }, [focusParam]);

  const handleFilterChange = (next: FilterSelection) => {
    if (
      next.kind === 'just-me' &&
      privacyLock.pinIsSet &&
      !privacyLock.unlocked
    ) {
      setPendingFilter(next);
      return;
    }
    setFilterSel(next);
  };

  useEffect(() => {
    if (
      filterSel.kind === 'just-me' &&
      privacyLock.pinIsSet &&
      !privacyLock.unlocked
    ) {
      setFilterSel({ kind: 'everyone' });
    }
  }, [filterSel.kind, privacyLock.pinIsSet, privacyLock.unlocked]);

  const familyId = user?.familyId ?? null;
  const peoplePersons = dashboard.people ?? [];
  const selfPerson = dashboard.selfPerson ?? null;

  const entryFilter: EntryFilter = useMemo(() => {
    if (filterSel.kind === 'person') return { subjectPersonIds: [filterSel.personId] };
    if (filterSel.kind === 'syntheses') return { types: ['synthesis'] };
    if (filterSel.kind === 'just-me') return { onlyPrivateToCurrentUser: true };
    return { excludePrivateToCurrentUser: true };
  }, [filterSel]);

  const { entries, loading, error } = useEntries({
    familyId,
    filter: entryFilter,
  });

  const members = useMemo(
    () => peoplePersons.map((p) => ({ id: p.personId, name: p.name })),
    [peoplePersons],
  );

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#f5ecd8', background: '#1f160e', minHeight: '100vh' }}>
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#f5ecd8', background: '#1f160e', minHeight: '100vh' }}>
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      <header className="journal-top-bar">
        <a href="/journal" className="journal-wordmark" aria-label="Relish">
          Relish
        </a>
        <div className="journal-top-right">
          <a href="/manual" className="cross-nav" aria-label="Open The Family Manual">
            The Family Manual →
          </a>
        </div>
      </header>
      <style jsx>{`
        .journal-top-bar {
          position: fixed;
          top: var(--relish-top-offset, 0);
          left: 0;
          right: 0;
          z-index: 20;
          transition: top 180ms ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 40px 68px 16px 24px;
          pointer-events: none;
        }
        .journal-top-bar :global(a) { pointer-events: auto; }
        .journal-top-bar .journal-wordmark {
          font-family: var(--font-parent-display), Georgia, serif;
          font-style: italic;
          font-weight: 300;
          font-size: 36px;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #2a1f14;
          text-decoration: none;
          transition: opacity 140ms ease;
        }
        .journal-top-bar .journal-wordmark:hover { opacity: 0.7; }
        .journal-top-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .journal-top-bar .cross-nav {
          font-family: var(--font-parent-display), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 15px;
          letter-spacing: 0;
          color: #2a1f14;
          text-decoration: none;
          padding: 4px 10px;
          border-radius: 4px;
          transition: background 140ms ease, opacity 140ms ease;
        }
        .cross-nav:hover {
          opacity: 0.7;
          background: rgba(42, 31, 20, 0.06);
        }
      `}</style>
      <UserMenu />
      <JournalSpread
        entries={entries}
        familyName={selfPerson?.name?.split(' ').slice(-1)[0] ?? 'Family'}
        volumeLabel="Volume IV · Spring, in progress"
        dateRangeLabel={dateLabel}
        members={members}
        people={members}
        filter={filterSel}
        onFilterChange={handleFilterChange}
        nameOf={nameOf}
        currentUserId={user?.userId}
        onCapture={() => {
          window.dispatchEvent(new Event('relish:open-capture'));
        }}
      />
      <CaptureSheet />
      {pendingFilter && (
        <PinKeypad
          title="Unlock private view"
          subtitle="Enter your 4-digit PIN"
          error={privacyLock.error}
          onSubmit={async (pin) => {
            const ok = await privacyLock.verify(pin);
            if (ok && pendingFilter) {
              setFilterSel(pendingFilter);
              setPendingFilter(null);
            }
            return ok;
          }}
          onCancel={() => setPendingFilter(null)}
        />
      )}
    </>
  );
}
