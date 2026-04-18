'use client';
/* ================================================================
   Relish · App — /workbook (wired)
   The Workbook, using real hooks via the integration adapters.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShellLayout } from '@/design/shell';
import { TodaySpread, RitualsDue, CaptureSheet } from '@/design/workbook';
import { useWorkbookData, useCaptureSubmit } from '@/integration';
import { usePeopleMap } from '@/hooks/usePeopleMap';

export default function WorkbookPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const wb = useWorkbookData();
  const { nameOf } = usePeopleMap();
  const submit = useCaptureSubmit();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user) return null;

  const peopleChips = wb.threads
    .map((t) => t.title.replace(/^About /, ''))
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 6);

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <div style={{ maxWidth: 'var(--r-page-max, 1320px)', margin: '0 auto', padding: '0 32px' }}>
        <TodaySpread
          firstName={wb.firstName}
          date={wb.date}
          season={wb.season}
          threads={wb.threads}
          onOpenThread={(id) => router.push(`/journal/${id}`)}
        />
        <RitualsDue rituals={wb.rituals} />
      </div>
      <CaptureSheet
        people={peopleChips}
        tags={['health', 'home', 'people', 'work', 'plans']}
        onSubmit={submit}
      />
    </ShellLayout>
  );
}
