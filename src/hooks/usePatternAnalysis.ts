import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export interface PatternInsight {
  type: 'success' | 'failure' | 'pattern' | 'experiment';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface EffectivenessUpdate {
  strategyId?: string;
  strategyText: string;
  currentRating: number;
  suggestedRating: number;
  reason: string;
}

export interface SuggestedStrategy {
  text: string;
  estimatedEffectiveness: number;
  rationale: string;
}

export interface SuggestedExperiment {
  hypothesis: string;
  testInstructions: string;
  measureSuccess: string;
  duration: string;
}

export interface PatternAnalysis {
  insights: PatternInsight[];
  effectivenessUpdates: EffectivenessUpdate[];
  suggestedStrategies: SuggestedStrategy[];
  suggestedExperiments: SuggestedExperiment[];
}

export function usePatternAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePatterns = async (childId: string, daysBack: number = 14): Promise<PatternAnalysis | null> => {
    try {
      setLoading(true);
      setError(null);

      const analyzePatternsFunction = httpsCallable(functions, 'analyzePatterns');
      const result = await analyzePatternsFunction({ childId, daysBack });

      const data = result.data as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze patterns');
      }

      console.log('Pattern analysis complete:', data);

      return data.analysis as PatternAnalysis;
    } catch (err) {
      console.error('Error analyzing patterns:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze patterns';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    analyzePatterns,
    loading,
    error,
  };
}
