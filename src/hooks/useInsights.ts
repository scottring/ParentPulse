import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface Insight {
  insightId: string;
  familyId: string;
  type: 'pattern' | 'recommendation' | 'summary' | 'progress';
  title: string;
  description: string;
  category?: string;
  relatedEntryIds: string[];
  timeframe: {
    start: Timestamp;
    end: Timestamp;
  };
  generatedAt: Timestamp;
  priority: 'low' | 'medium' | 'high';
  dismissed: boolean;
}

export function useInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'parent') {
      setInsights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, 'insights'),
      where('familyId', '==', user.familyId),
      where('dismissed', '==', false),
      orderBy('generatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const insightsData = snapshot.docs.map((doc) => ({
          insightId: doc.id,
          ...doc.data(),
        })) as Insight[];

        setInsights(insightsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching insights:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const dismissInsight = async (insightId: string) => {
    // In a real implementation, this would update Firestore
    // For now, just filter it out locally
    setInsights(insights.filter(i => i.insightId !== insightId));
  };

  return {
    insights,
    loading,
    error,
    dismissInsight,
  };
}
