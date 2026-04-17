'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';

interface UseDinnerPromptReturn {
  prompt: string | null;
  loading: boolean;
}

export function useDinnerPrompt(): UseDinnerPromptReturn {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const functions = getFunctions();
    const getDinnerPrompt = httpsCallable(functions, 'getDinnerPrompt');

    getDinnerPrompt({ familyId: user.familyId })
      .then((result) => {
        if (!cancelled) {
          const data = result.data as { prompt?: string };
          setPrompt(data.prompt ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setPrompt(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.familyId]);

  return { prompt, loading };
}
