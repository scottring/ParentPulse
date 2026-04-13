'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';

export default function RelishPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selfPerson, loading } = useDashboard();

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (selfPerson) {
      router.replace(`/people/${selfPerson.personId}/relish`);
    } else {
      router.replace('/welcome');
    }
  }, [user, authLoading, loading, selfPerson, router]);

  return null;
}
