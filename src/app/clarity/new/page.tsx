'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCreateObstacle } from '@/hooks/useObstacle';

export default function ClarityNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { create } = useCreateObstacle();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    create()
      .then((id) => router.replace(`/clarity/${id}`))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [authLoading, user, create, router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--r-text-4, #6B6254)',
        background: 'var(--r-cream, #F5F0E8)',
      }}
    >
      {error ? <p>Something went wrong: {error}</p> : <p>Opening…</p>}
    </main>
  );
}
