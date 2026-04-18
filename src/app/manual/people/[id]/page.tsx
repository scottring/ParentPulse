'use client';
/* ================================================================
   Relish · App — /manual/people/[id] (wired)
   A single volume — one person's sheet — using real data.
   ================================================================ */

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShellLayout } from '@/design/shell';
import { Room } from '@/design/surfaces';
import { PersonSheet } from '@/design/manual';
import { useManualPersonSheet } from '@/integration';

export default function PersonVolumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const sheet = useManualPersonSheet(id);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <ShellLayout userName={user.name} onSignOut={() => logout().then(() => router.push('/login'))}>
      <Room name="manual">
        {sheet ? (
          <PersonSheet
            {...sheet}
            onEdit={() => router.push(`/people/${id}/manual`)}
          />
        ) : (
          <p style={{ padding: 48, color: 'var(--r-text-4)', fontStyle: 'italic' }}>
            This volume is not yet written.
          </p>
        )}
        <div style={{ height: 96 }} aria-hidden />
      </Room>
    </ShellLayout>
  );
}
