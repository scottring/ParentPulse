'use client';
/* ================================================================
   Relish · App — /workbook (wired)
   The Workbook, using real hooks via the integration adapters.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShellLayout } from '@/design/shell';
import { Room, Band, Rule } from '@/design/surfaces';
import { TodaySpread, RitualsDue, CaptureSheet } from '@/design/workbook';
import { useWorkbookData, useCaptureSubmit } from '@/integration';
import { usePeopleMap } from '@/hooks/usePeopleMap';
import { useNextRitual } from '@/hooks/useNextRitual';
import { NextRitualCard } from '@/components/workbook/NextRitualCard';
import { ensureSoloWeekly } from '@/lib/ritual-seeds';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import type { Thread as TodayThread } from '@/design/workbook/TodaySpread';

function humaniseOpenedAt(d: Date | undefined): string | null {
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function WorkbookPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const wb = useWorkbookData();
  const { nameOf } = usePeopleMap();
  const submit = useCaptureSubmit();
  const { ritual: nextRitual, loading: ritualLoading } = useNextRitual();
  const { threads: openThreads } = useOpenThreads();

  // P0.4 — the cover only shows items the open-thread predicate
  // returned. Plain recent entries no longer appear as threads.
  const reasonTag: Record<string, TodayThread['tag']> = {
    overdue_ritual: 'plans',
    unclosed_divergence: 'people',
    pending_invite: 'people',
    incomplete_practice: 'work',
  };
  const reasonTitle: Record<string, string> = {
    overdue_ritual: 'Ritual is due',
    unclosed_divergence: 'A divergence to respond to',
    pending_invite: 'A view is waiting',
    incomplete_practice: 'Practice unfinished',
  };
  const coverThreads: TodayThread[] = openThreads.slice(0, 3).map((t) => ({
    id: t.id,
    title: reasonTitle[t.reason] ?? t.closingAction.label,
    lastTouched: humaniseOpenedAt(t.openedAt) ?? 'now',
    preview: t.subtitle,
    tag: reasonTag[t.reason],
  }));
  // Map by id so onOpenThread can route to the correct closingAction
  // href rather than defaulting to /journal/{id}.
  const threadHrefById = new Map(openThreads.map((t) => [t.id, t.closingAction.href]));

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // On first Workbook visit, seed a solo_weekly ritual if the user
  // has none. Idempotent.
  useEffect(() => {
    if (ritualLoading || !user?.familyId || !user?.userId) return;
    if (nextRitual) return; // already has at least one
    ensureSoloWeekly({
      familyId: user.familyId,
      userId: user.userId,
    }).catch((err) => {
      console.warn('workbook: ensureSoloWeekly failed', err);
    });
  }, [ritualLoading, nextRitual, user?.familyId, user?.userId]);

  if (loading || !user) return null;

  const peopleChips = wb.threads
    .map((t) => t.title.replace(/^About /, ''))
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 6);

  const noThreadsFallback = coverThreads.length === 0 && !nextRitual;

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <Room name="workbook">
        {/* Masthead first — the date + greeting + open threads reads
            like the opening page of a book. The ritual card follows
            below as the featured action, not above the title. */}
        <TodaySpread
          firstName={wb.firstName}
          date={wb.date}
          season={wb.season}
          threads={coverThreads}
          onOpenThread={(id) => {
            const href = threadHrefById.get(id);
            if (href) router.push(href);
          }}
        />
        {nextRitual && (
          <div style={{ marginTop: '32px' }}>
            <NextRitualCard ritual={nextRitual} />
          </div>
        )}
        {noThreadsFallback && (
          <p
            style={{
              fontFamily: 'var(--r-serif)',
              fontStyle: 'italic',
              color: 'var(--r-text-3)',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            The book is quiet today.
          </p>
        )}
        {wb.rituals.length > 0 && (
          <>
            <Rule variant="fleuron" style={{ margin: '24px 0' }} />
            <Band
              tone="warm"
              padding={wb.rituals.length === 1 ? '20px 32px' : '32px 40px'}
              style={{ borderRadius: 'var(--r-radius-2)' }}
            >
              <RitualsDue rituals={wb.rituals} />
            </Band>
          </>
        )}
        <div style={{ height: 96 }} aria-hidden />
      </Room>
      <CaptureSheet
        people={peopleChips}
        tags={['health', 'home', 'people', 'work', 'plans']}
        onSubmit={submit}
      />
    </ShellLayout>
  );
}
