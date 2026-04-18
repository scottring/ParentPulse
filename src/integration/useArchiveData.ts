'use client';
/* ================================================================
   Relish · Integration — useArchiveData
   Bridges useJournalEntries → YearSelector + MonthTimeline shape.
   Groups entries by year, then by month.
   ================================================================ */

import { useMemo } from 'react';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { ArchiveMonth, ArchiveEntry } from '@/design/archive/MonthTimeline';
import type { JournalEntry } from '@/types/journal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TAG_MAP: Record<string, ArchiveEntry['tag']> = {
  health: 'health',
  home: 'home',
  people: 'people',
  work: 'work',
  plans: 'plans',
};

function tagFor(e: JournalEntry): ArchiveEntry['tag'] {
  const first = e.tags?.[0];
  return first ? TAG_MAP[first] : undefined;
}

export function useArchiveData() {
  const { entries } = useJournalEntries();

  return useMemo(() => {
    const byYear = new Map<number, Map<number, ArchiveEntry[]>>();
    const counts = new Map<number, number>();

    for (const e of entries) {
      // Responses belong to their parent thread, not the Archive timeline.
      if (e.respondsToEntryId) continue;
      const d: Date | null = e.createdAt?.toDate ? e.createdAt.toDate() : null;
      if (!d) continue;
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!byYear.has(y)) byYear.set(y, new Map());
      const mm = byYear.get(y)!;
      if (!mm.has(m)) mm.set(m, []);
      mm.get(m)!.push({
        id: e.entryId,
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        title: e.text?.slice(0, 60) || 'A note',
        preview: e.text,
        tag: tagFor(e),
      });
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }

    const years = [...byYear.keys()].sort((a, b) => b - a);

    const monthsFor = (year: number): ArchiveMonth[] => {
      const mm = byYear.get(year);
      if (!mm) return [];
      // Include empty months for visual rhythm ("A quiet month").
      return MONTH_NAMES.map((name, idx) => ({
        name,
        entries: (mm.get(idx) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
      })).reverse(); // most recent month first
    };

    return {
      years,
      monthsFor,
      entryCountFor: (y: number) => counts.get(y) ?? 0,
    };
  }, [entries]);
}
