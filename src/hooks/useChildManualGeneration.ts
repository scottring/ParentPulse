'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

interface GenerateManualParams {
  childId: string;
  childName: string;
  childAge?: number;
  answers: Record<string, any>;
}

interface GeneratedContent {
  triggers: Array<{
    text: string;
    severity: number;
    examples?: string[];
  }>;
  whatWorks: Array<{
    text: string;
    effectiveness: number;
    context?: string;
  }>;
  whatDoesntWork: Array<{
    text: string;
  }>;
  strengths: Array<{
    text: string;
  }>;
  contextNotes: string;
}

interface UseChildManualGenerationReturn {
  generateManual: (params: GenerateManualParams) => Promise<GeneratedContent>;
  loading: boolean;
  error: string | null;
}

export const useChildManualGeneration = (): UseChildManualGenerationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateManual = async (params: GenerateManualParams): Promise<GeneratedContent> => {
    try {
      setLoading(true);
      setError(null);

      console.log('Calling generateChildManualContent Cloud Function...');

      const generateFunction = httpsCallable(functions, 'generateChildManualContent');
      const result = await generateFunction(params);

      const data = result.data as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate manual content');
      }

      console.log('Manual generation successful:', data.content);

      return data.content as GeneratedContent;
    } catch (err: any) {
      console.error('Error generating manual:', err);
      const errorMessage = err.message || 'Failed to generate manual';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    generateManual,
    loading,
    error,
  };
};
