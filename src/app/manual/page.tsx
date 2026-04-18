'use client';
/* ================================================================
   Relish · App — /manual (wired)
   The Family Manual, using real hooks via the integration adapters.
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShellLayout } from '@/design/shell';
import { Room } from '@/design/surfaces';
import { PeopleGrid } from '@/design/manual';
import { useManualPeople } from '@/integration';

export default function ManualPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const people = useManualPeople();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <Room name="manual">
        <PeopleGrid
          people={people}
          onOpen={(id) => router.push(`/manual/people/${id}`)}
          onAdd={() => router.push('/people/new')}
        />
        <div style={{ height: 96 }} aria-hidden />
      </Room>
    </ShellLayout>
  );
}
