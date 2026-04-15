'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SpreadHome } from '@/components/spread-home/SpreadHome';

/**
 * /journal — the book surface (formerly rendered at /).
 *
 * Mounted here after the Plan 4 route split. Signed-out visitors
 * are redirected home, where the library desk invites them to sign
 * in. Everything that used to live at / for signed-in users now
 * lives here: the JournalSpread, CaptureSheet, and privacy-lock
 * guard are all wrapped by SpreadHome.
 */
export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#f5ecd8',
          background: '#1f160e',
          minHeight: '100vh',
        }}
      >
        Loading…
      </div>
    );
  }

  return <SpreadHome />;
}
