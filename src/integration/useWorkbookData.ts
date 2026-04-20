'use client';
/* ================================================================
   Relish · Integration — useWorkbookData
   Bridges the real app hooks to the Workbook design components.
   Returns the shape TodaySpread + RitualsDue expect.
   ================================================================ */

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { usePeopleMap } from '@/hooks/usePeopleMap';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import type { Thread } from '@/design/workbook/TodaySpread';
import type { RitualDue } from '@/design/workbook/RitualsDue';

function humaniseAgo(ts: any): string {
  const date: Date | null = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!date) return 'recently';
  const ms = Date.now() - date.getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function season(d = new Date()): string {
  const m = d.getMonth();
  if (m < 2 || m === 11) return 'Winter';
  if (m < 5) return 'Spring';
  if (m < 8) return 'Summer';
  return 'Autumn';
}

export function useWorkbookData() {
  const { user } = useAuth();
  const { entries } = useJournalEntries();
  const { ritual } = useCoupleRitual();
  const { nameOf } = usePeopleMap();
  const privacyLock = usePrivacyLock();

  // Top 3 most recent entries become "open threads".
  const TAG_MAP: Record<string, Thread['tag']> = {
    health: 'health',
    home: 'home',
    people: 'people',
    work: 'work',
    plans: 'plans',
  };

  const threads: Thread[] = useMemo(() => {
    const userId = user?.userId;
    const visible = entries.filter((e) => {
      // Responses are not stand-alone threads; they belong attached to
      // the parent on the entry detail page.
      if (e.respondsToEntryId) return false;
      // Private entry = only the author can see it. On the Workbook
      // summary surface, hide these unless the PIN has been unlocked.
      const isPrivate =
        userId !== undefined &&
        e.visibleToUserIds.length === 1 &&
        e.visibleToUserIds[0] === userId;
      if (isPrivate && !privacyLock.unlocked) return false;
      return true;
    });
    return visible.slice(0, 3).map((e) => {
      const firstPersonId = e.personMentions?.[0];
      const personName = firstPersonId ? nameOf?.(firstPersonId) : undefined;
      const firstTag = e.tags?.[0];
      const title = personName
        ? `About ${personName}`
        : (e.text?.slice(0, 60) || 'A note');
      // Only include a preview when it adds something beyond the title.
      // Short entries would otherwise render the same sentence twice.
      const preview =
        personName || (e.text && e.text.length > 60) ? e.text : undefined;
      return {
        id: e.entryId,
        title,
        lastTouched: humaniseAgo(e.createdAt),
        preview,
        tag: firstTag ? TAG_MAP[firstTag] : undefined,
      };
    });
  }, [entries, nameOf, user?.userId, privacyLock.unlocked]);

  // Couple ritual → RitualDue if active. Tags the weekly cadence
  // with the `weekly-relish` slug so the card routes to the seeded
  // Practice detail page (Feature B).
  const rituals: RitualDue[] = useMemo(() => {
    if (!ritual || ritual.status !== 'active') return [];
    const isWeekly = ritual.cadence === 'weekly';
    return [{
      id: ritual.id,
      name: ritual.intention || 'Our weekly Relish',
      cadence: isWeekly ? 'Weekly' : ritual.cadence,
      slug: isWeekly ? 'weekly-relish' : undefined,
    }];
  }, [ritual]);

  return {
    firstName: user?.name?.split(' ')[0],
    date: new Date(),
    season: season(),
    threads,
    rituals,
  };
}
