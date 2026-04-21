'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TherapyBookShell } from '@/components/therapy/TherapyBookShell';

/**
 * /therapy — a PIN-gated private space for session prep.
 *
 * Signed-out visitors are redirected to /. Everything else is
 * handled by TherapyBookShell: PIN gate, therapist setup, and the
 * workspace itself.
 */
export default function TherapyPage() {
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
          color: '#6d5a3f',
          background: '#fefaf0',
          minHeight: '100vh',
        }}
      >
        Loading…
      </div>
    );
  }

  return <TherapyBookShell />;
}
