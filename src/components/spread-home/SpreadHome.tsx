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
import Navigation from '@/components/layout/Navigation';
import type { EntryFilter } from '@/types/entry';

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
      <Navigation />
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
