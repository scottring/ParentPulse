/**
 * useManualChat Hook
 *
 * Manages "Ask the Manual" AI chat — grounded in a person's manual data.
 * Handles conversation state, cloud function calls, session persistence,
 * and generates contextual suggested questions.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { functions, firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PersonManual, SynthesizedInsight } from '@/types/person-manual';

export interface ManualChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SuggestedQuestion {
  text: string;
  category: 'gap' | 'trigger' | 'pattern' | 'strategy' | 'general';
}

interface UseManualChatReturn {
  messages: ManualChatMessage[];
  loading: boolean;
  error: string | null;
  suggestedQuestions: SuggestedQuestion[];
  sendMessage: (question: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  loadExistingSession: () => Promise<void>;
  hasSession: boolean;
}

export function useManualChat(
  personId: string,
  personName: string,
  manual: PersonManual | null,
): UseManualChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ManualChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  // Load existing active session on mount
  const loadExistingSession = useCallback(async () => {
    if (!user || !personId) return;

    try {
      const q = query(
        collection(firestore, 'manual_chat_sessions'),
        where('personId', '==', personId),
        where('userId', '==', user.userId),
        where('active', '==', true),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const session = snap.docs[0].data();
        setMessages(session.messages || []);
        setHasSession(true);
      }
    } catch (err) {
      console.warn('Failed to load chat session:', err);
    }
  }, [user, personId]);

  useEffect(() => {
    loadExistingSession();
  }, [loadExistingSession]);

  const sendMessage = useCallback(async (question: string) => {
    if (!user || !question.trim()) return;

    setLoading(true);
    setError(null);

    const userMsg: ManualChatMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const askManual = httpsCallable<
        { personId: string; question: string; conversationHistory: ManualChatMessage[] },
        { success: boolean; answer: string; insightsApplied: boolean }
      >(functions, 'askManual');

      const result = await askManual({
        personId,
        question: question.trim(),
        conversationHistory: [...messages, userMsg],
      });

      if (result.data.success) {
        const assistantMsg: ManualChatMessage = {
          role: 'assistant',
          content: result.data.answer,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setHasSession(true);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      console.error('askManual error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove optimistic user message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [user, personId, messages]);

  const clearConversation = useCallback(async () => {
    if (!user || !personId) return;

    try {
      const closeChat = httpsCallable(functions, 'closeManualChat');
      await closeChat({ personId });
    } catch (err) {
      console.warn('Failed to close session:', err);
    }

    setMessages([]);
    setHasSession(false);
    setError(null);
  }, [user, personId]);

  // Generate contextual suggested questions from manual data
  const suggestedQuestions = useMemo((): SuggestedQuestion[] => {
    if (!manual) return getDefaultQuestions(personName);

    const questions: SuggestedQuestion[] = [];

    // From gaps (most valuable)
    if (manual.synthesizedContent?.gaps) {
      for (const gap of manual.synthesizedContent.gaps.slice(0, 2)) {
        if (gap.gapSeverity === 'significant_gap') {
          questions.push({
            text: `You and ${personName} see "${gap.topic}" differently — how can I bridge that gap?`,
            category: 'gap',
          });
        } else {
          questions.push({
            text: `What should I understand about the different perspectives on "${gap.topic}"?`,
            category: 'gap',
          });
        }
      }
    }

    // From triggers
    if (manual.triggers && manual.triggers.length > 0) {
      const significantTrigger = manual.triggers.find(t => t.severity === 'significant') || manual.triggers[0];
      questions.push({
        text: `How should I handle it when ${personName} gets triggered by "${significantTrigger.description}"?`,
        category: 'trigger',
      });
    }

    // From patterns
    if (manual.emergingPatterns && manual.emergingPatterns.length > 0) {
      const pattern = manual.emergingPatterns[0];
      questions.push({
        text: `I've noticed "${pattern.description}" — what's the best way to respond?`,
        category: 'pattern',
      });
    }

    // From strategies
    if (manual.whatWorks && manual.whatWorks.length > 0) {
      const topStrategy = [...manual.whatWorks].sort((a, b) => b.effectiveness - a.effectiveness)[0];
      questions.push({
        text: `"${topStrategy.description}" works well — when exactly should I use it?`,
        category: 'strategy',
      });
    }

    // From blind spots
    if (manual.synthesizedContent?.blindSpots?.length) {
      const spot = manual.synthesizedContent.blindSpots[0];
      questions.push({
        text: `There's a blind spot around "${spot.topic}" — how should I approach it?`,
        category: 'gap',
      });
    }

    // Always add a general opener
    questions.push({
      text: `What's the most important thing to understand about ${personName} right now?`,
      category: 'general',
    });

    return questions.slice(0, 5);
  }, [manual, personName]);

  return {
    messages,
    loading,
    error,
    suggestedQuestions,
    sendMessage,
    clearConversation,
    loadExistingSession,
    hasSession,
  };
}

function getDefaultQuestions(personName: string): SuggestedQuestion[] {
  return [
    { text: `What are ${personName}'s main triggers and how should I handle them?`, category: 'trigger' },
    { text: `What strategies work best with ${personName}?`, category: 'strategy' },
    { text: `What's the most important thing to understand about ${personName}?`, category: 'general' },
  ];
}
