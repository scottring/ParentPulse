import { useState, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { OnboardingPhaseId, DomainId } from '@/types/user';
import type { ConversationTurn } from '@/types/onboarding';

interface ConversationResponse {
  conversationId: string;
  type: 'question' | 'synthesis';
  message: string;
  structuredData: Record<string, unknown> | null;
  turnCount: number;
  minTurns: number;
  maxTurns: number;
}

type ConversationParams =
  | { mode: 'onboarding'; phaseId: OnboardingPhaseId; familyId: string; previousDomains?: Record<string, unknown> }
  | { mode: 'refresh'; domainId: DomainId; familyId: string; currentDomainData: Record<string, unknown> };

interface UseConversationReturn {
  turns: ConversationTurn[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  lastResponse: ConversationResponse | null;
  startConversation: (phaseId: OnboardingPhaseId, familyId: string, previousDomains?: Record<string, unknown>) => Promise<void>;
  startRefreshConversation: (domainId: DomainId, familyId: string, currentDomainData: Record<string, unknown>) => Promise<void>;
  sendMessage: (message: string) => Promise<ConversationResponse>;
  requestSynthesis: () => Promise<ConversationResponse>;
}

export function useConversation(): UseConversationReturn {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ConversationResponse | null>(null);

  const paramsRef = useRef<ConversationParams | null>(null);

  const conductConversation = httpsCallable<Record<string, unknown>, ConversationResponse>(
    functions,
    'conductOnboardingConversation'
  );

  const startWithParams = useCallback(async (params: ConversationParams) => {
    paramsRef.current = params;
    setTurns([]);
    setConversationId(null);
    setError(null);
    setIsLoading(true);

    try {
      const callData: Record<string, unknown> = { familyId: params.familyId };
      if (params.mode === 'onboarding') {
        callData.phaseId = params.phaseId;
        callData.previousDomains = params.previousDomains;
      } else {
        callData.mode = 'refresh';
        callData.domainId = params.domainId;
        callData.currentDomainData = params.currentDomainData;
      }

      const result = await conductConversation(callData);
      const response = result.data;
      setConversationId(response.conversationId);
      setLastResponse(response);

      setTurns([{
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  }, [conductConversation]);

  const startConversation = useCallback(async (
    phaseId: OnboardingPhaseId,
    familyId: string,
    previousDomains?: Record<string, unknown>
  ) => {
    await startWithParams({ mode: 'onboarding', phaseId, familyId, previousDomains });
  }, [startWithParams]);

  const startRefreshConversation = useCallback(async (
    domainId: DomainId,
    familyId: string,
    currentDomainData: Record<string, unknown>
  ) => {
    await startWithParams({ mode: 'refresh', domainId, familyId, currentDomainData });
  }, [startWithParams]);

  const sendMessage = useCallback(async (message: string): Promise<ConversationResponse> => {
    const params = paramsRef.current;
    if (!params) {
      throw new Error('Conversation not started');
    }

    setError(null);
    setIsLoading(true);

    const userTurn: ConversationTurn = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setTurns(prev => [...prev, userTurn]);

    try {
      const callData: Record<string, unknown> = {
        familyId: params.familyId,
        conversationId,
        message,
      };
      if (params.mode === 'onboarding') {
        callData.phaseId = params.phaseId;
        callData.previousDomains = params.previousDomains;
      } else {
        callData.mode = 'refresh';
        callData.domainId = params.domainId;
        callData.currentDomainData = params.currentDomainData;
      }

      const result = await conductConversation(callData);
      const response = result.data;
      setConversationId(response.conversationId);
      setLastResponse(response);

      const aiTurn: ConversationTurn = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        ...(response.structuredData ? { extractedData: response.structuredData } : {}),
      };
      setTurns(prev => [...prev, aiTurn]);

      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, conductConversation]);

  const requestSynthesis = useCallback(async (): Promise<ConversationResponse> => {
    return sendMessage('Please synthesize what we discussed.');
  }, [sendMessage]);

  return {
    turns,
    conversationId,
    isLoading,
    error,
    lastResponse,
    startConversation,
    startRefreshConversation,
    sendMessage,
    requestSynthesis,
  };
}
