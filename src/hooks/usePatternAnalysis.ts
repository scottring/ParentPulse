'use client';

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

/**
 * Pattern Analysis Results from AI
 */
export interface PatternInsight {
  type: 'success' | 'failure' | 'pattern' | 'experiment';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface EffectivenessUpdate {
  strategyId: string;
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

export interface PatternAnalysisResult {
  success: boolean;
  error?: string;
  observationCount?: number;
  // Nested structure from Cloud Function
  analysis?: {
    insights: PatternInsight[];
    effectivenessUpdates: EffectivenessUpdate[];
    suggestedStrategies: SuggestedStrategy[];
    suggestedExperiments: SuggestedExperiment[];
  };
  // Flat structure for backwards compatibility
  insights?: PatternInsight[];
  effectivenessUpdates?: EffectivenessUpdate[];
  suggestedStrategies?: SuggestedStrategy[];
  suggestedExperiments?: SuggestedExperiment[];
  strategyStats?: Record<
    string,
    {
      text: string;
      total: number;
      workedGreat: number;
      workedOkay: number;
      didntWork: number;
      madeWorse: number;
    }
  >;
}

// Backwards compatibility alias
export type PatternAnalysis = PatternAnalysisResult;

interface UsePatternAnalysisReturn {
  loading: boolean;
  error: string | null;
  result: PatternAnalysisResult | null;
  analyzePatterns: (personId: string, daysBack?: number) => Promise<PatternAnalysisResult | null>;
  clearResult: () => void;
}

/**
 * Hook for running AI pattern analysis on behavior observations
 *
 * Uses the analyzePatterns Cloud Function to:
 * - Calculate strategy success rates from observations
 * - Identify behavioral patterns
 * - Suggest strategy effectiveness updates
 * - Recommend new strategies or experiments
 */
export function usePatternAnalysis(): UsePatternAnalysisReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PatternAnalysisResult | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const analyzePatterns = useCallback(
    async (personId: string, daysBack = 14): Promise<PatternAnalysisResult | null> => {
      if (!user) {
        setError('Must be logged in to analyze patterns');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Call the Cloud Function
        // Note: The function currently expects childId but can work with personId
        const analyzePatternsFunc = httpsCallable<
          { childId: string; daysBack: number },
          PatternAnalysisResult
        >(functions, 'analyzePatterns');

        const response = await analyzePatternsFunc({
          childId: personId, // The function uses childId but works with any person
          daysBack,
        });

        const rawResult = response.data;

        // Flatten the result for backwards compatibility
        // (some pages expect analysis.insights, others expect analysis.analysis.insights)
        const analysisResult: PatternAnalysisResult = {
          ...rawResult,
          // Add flat properties for backwards compatibility
          insights: rawResult.analysis?.insights,
          effectivenessUpdates: rawResult.analysis?.effectivenessUpdates,
          suggestedStrategies: rawResult.analysis?.suggestedStrategies,
          suggestedExperiments: rawResult.analysis?.suggestedExperiments,
        };

        setResult(analysisResult);

        if (!analysisResult.success) {
          setError(analysisResult.error || 'Pattern analysis failed');
        }

        return analysisResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to analyze patterns';
        setError(message);
        console.error('Error analyzing patterns:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    loading,
    error,
    result,
    analyzePatterns,
    clearResult,
  };
}
