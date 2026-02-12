import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { SystemObservation } from '@/types/checkin';

interface UseCoherenceReturn {
  observations: SystemObservation[];
  loading: boolean;
  error: string | null;
  generateObservations: (checkinId: string) => Promise<void>;
}

export function useCoherence(): UseCoherenceReturn {
  const { user } = useAuth();
  const [observations, setObservations] = useState<SystemObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateObservations = useCallback(async (checkinId: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const generateFn = httpsCallable<
        { familyId: string; checkinId: string },
        { observations: SystemObservation[] }
      >(functions, 'generateCoherenceObservations');

      const result = await generateFn({
        familyId: user.familyId,
        checkinId,
      });

      setObservations(result.data.observations || []);
    } catch (err: any) {
      console.error('Failed to generate observations:', err);
      setError(err.message || 'Failed to generate observations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    observations,
    loading,
    error,
    generateObservations,
  };
}
