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

export default function WorkbookPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const wb = useWorkbookData();
  const { nameOf } = usePeopleMap();
  const submit = useCaptureSubmit();
  const { ritual: nextRitual, loading: ritualLoading } = useNextRitual();

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

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <Room name="workbook">
        {/* When an active ritual exists, it becomes the featured slot.
            The daily/threads surface falls to second billing. */}
        {nextRitual && (
          <div style={{ marginBottom: '32px' }}>
            <NextRitualCard ritual={nextRitual} />
          </div>
        )}
        <TodaySpread
          firstName={wb.firstName}
          date={wb.date}
          season={wb.season}
          threads={wb.threads}
          onOpenThread={(id) => router.push(`/journal/${id}`)}
        />
        {wb.rituals.length > 0 && (
          <>
            <Rule variant="fleuron" style={{ margin: '24px 0' }} />
            <Band tone="warm" padding="32px 40px" style={{ borderRadius: 'var(--r-radius-2)' }}>
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
