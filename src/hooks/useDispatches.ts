'use client';

import { useMemo } from 'react';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { JournalEntry } from '@/types/journal';

export interface EchoDispatch {
  kind: 'echo';
  entry: JournalEntry;        // the resurfaced older entry
  reason: string;              // "Kaleb · sleep" style tag
  daysAgo: number;
}

export interface PatternDispatch {
  kind: 'pattern';
  // Day-of-week rhythm over the past window. dayCounts[0] = Sunday.
  dayCounts: number[];
  // The day index (0–6) that stands out, or null if no pattern.
  peakDay: number | null;
  peakDayLabel: string | null; // "Wednesday"
  totalWindow: number;         // total entries in the window
  windowDays: number;          // 42 (= 6 weeks)
  confidence: 'low' | 'moderate' | 'high' | 'none';
}

// useDispatches — derives two of the four Workbook dispatches
// from journal_entries data available on the client. Lead synthesis
// and Brief still require a backend pipeline.
export function useDispatches(): {
  echo: EchoDispatch | null;
  pattern: PatternDispatch | null;
  loading: boolean;
} {
  const { entries, loading } = useJournalEntries();

  const echo = useMemo<EchoDispatch | null>(() => {
    return findEcho(entries);
  }, [entries]);

  const pattern = useMemo<PatternDispatch | null>(() => {
    return computePattern(entries);
  }, [entries]);

  return { echo, pattern, loading };
}

/* ════════════════════════════════════════════════════════════════
   Echo — surface an entry from ~a year ago that touches the same
   person or theme as a recent entry.
   ════════════════════════════════════════════════════════════════ */

function findEcho(entries: JournalEntry[]): EchoDispatch | null {
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 14);

  const recent = entries.filter((e) => {
    const d = e.createdAt?.toDate?.();
    return d && d >= recentCutoff;
  });
  if (recent.length === 0) return null;

  // Collect the subjects the user is currently writing about.
  const recentPeople = new Set<string>();
  const recentThemes = new Set<string>();
  for (const e of recent) {
    for (const p of e.personMentions ?? []) recentPeople.add(p);
    for (const t of e.enrichment?.themes ?? []) {
      recentThemes.add(t.toLowerCase());
    }
  }

  // Window: ±30 days around a year ago. Same subject or theme.
  const echoTarget = new Date(now);
  echoTarget.setFullYear(echoTarget.getFullYear() - 1);
  const start = new Date(echoTarget);
  start.setDate(start.getDate() - 30);
  const end = new Date(echoTarget);
  end.setDate(end.getDate() + 30);

  let best: JournalEntry | null = null;
  let bestScore = 0;
  let bestOverlap: string | null = null;

  for (const e of entries) {
    const d = e.createdAt?.toDate?.();
    if (!d || d < start || d > end) continue;
    const len = (e.text ?? '').trim().length;
    if (len < 40 || len > 340) continue;

    let score = 0;
    let overlapTag: string | null = null;
    for (const p of e.personMentions ?? []) {
      if (recentPeople.has(p)) {
        score += 3;
        if (!overlapTag) overlapTag = p;
      }
    }
    for (const t of e.enrichment?.themes ?? []) {
      if (recentThemes.has(t.toLowerCase())) {
        score += 1;
        if (!overlapTag) overlapTag = t;
      }
    }
    if (score > bestScore) {
      best = e;
      bestScore = score;
      bestOverlap = overlapTag;
    }
  }

  if (!best || bestScore === 0) return null;
  const daysAgo = Math.floor(
    (now.getTime() - (best.createdAt?.toDate?.().getTime() ?? 0)) /
      86_400_000,
  );
  return {
    kind: 'echo',
    entry: best,
    reason: bestOverlap ? `Surfaced on · ${bestOverlap}` : 'Same week, last year',
    daysAgo,
  };
}

/* ════════════════════════════════════════════════════════════════
   Pattern — day-of-week rhythm over the last 6 weeks. We surface
   it when one day noticeably outweighs the others.
   ════════════════════════════════════════════════════════════════ */

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function computePattern(entries: JournalEntry[]): PatternDispatch | null {
  const now = new Date();
  const windowDays = 42;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);

  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const e of entries) {
    const d = e.createdAt?.toDate?.();
    if (!d || d < cutoff || d > now) continue;
    const weekday = d.getDay();
    dayCounts[weekday]++;
    total++;
  }

  // Not enough to see a rhythm.
  if (total < 6) {
    return {
      kind: 'pattern',
      dayCounts,
      peakDay: null,
      peakDayLabel: null,
      totalWindow: total,
      windowDays,
      confidence: 'none',
    };
  }

  let peakDay = 0;
  let peakCount = dayCounts[0];
  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > peakCount) {
      peakDay = i;
      peakCount = dayCounts[i];
    }
  }
  const avgOther = (total - peakCount) / 6;
  const lift = avgOther > 0 ? peakCount / avgOther : peakCount;

  let confidence: PatternDispatch['confidence'] = 'none';
  if (peakCount >= 3 && lift >= 2.5) confidence = 'high';
  else if (peakCount >= 2 && lift >= 1.8) confidence = 'moderate';
  else if (peakCount >= 2 && lift >= 1.4) confidence = 'low';

  if (confidence === 'none') {
    return {
      kind: 'pattern',
      dayCounts,
      peakDay: null,
      peakDayLabel: null,
      totalWindow: total,
      windowDays,
      confidence,
    };
  }

  return {
    kind: 'pattern',
    dayCounts,
    peakDay,
    peakDayLabel: WEEKDAY_NAMES[peakDay],
    totalWindow: total,
    windowDays,
    confidence,
  };
}
