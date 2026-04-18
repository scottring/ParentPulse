'use client';
/* ================================================================
   Relish · App — /archive (wired)
   The Archive, using real journal_entries grouped by year + month.
   ================================================================ */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShellLayout } from '@/design/shell';
import { YearSelector, YearSummary, MonthTimeline } from '@/design/archive';
import { useArchiveData } from '@/integration';

export default function ArchivePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { years, monthsFor, entryCountFor } = useArchiveData();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (selected == null && years.length > 0) setSelected(years[0]);
  }, [years, selected]);

  if (loading || !user) return null;

  const yearList = years.length > 0 ? years : [new Date().getFullYear()];
  const current = selected ?? yearList[0];

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <div style={{ maxWidth: 'var(--r-page-max, 1320px)', margin: '0 auto', padding: '0 32px' }}>
        <YearSelector years={yearList} selected={current} onSelect={setSelected} />
        <YearSummary year={current} entryCount={entryCountFor(current)} />
        <MonthTimeline
          months={monthsFor(current)}
          onOpen={(id) => router.push(`/journal/${id}`)}
        />
      </div>
    </ShellLayout>
  );
}
