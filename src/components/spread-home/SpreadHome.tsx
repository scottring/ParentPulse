'use client';

import { useState, useMemo, useEffect } from 'react';
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
  const [filterSel, setFilterSel] = useState<FilterSelection>({ kind: 'everyone' });
  const privacyLock = usePrivacyLock();
  const [pendingFilter, setPendingFilter] = useState<FilterSelection | null>(null);

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
    return {};
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
      <a href="/" className="back-home" aria-label="Back to home">
        ← Home
        <style jsx>{`
          .back-home {
            position: fixed;
            top: 18px;
            left: 22px;
            z-index: 20;
            font-family: -apple-system, 'Helvetica Neue', sans-serif;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #5a4628;
            text-decoration: none;
            padding: 6px 10px;
            border-radius: 4px;
            transition: background 140ms ease, color 140ms ease;
          }
          .back-home:hover {
            color: #2a1f14;
            background: rgba(138, 111, 74, 0.12);
          }
        `}</style>
      </a>
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
