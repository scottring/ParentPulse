/**
 * useCoach Hook
 *
 * Manages AI coaching chat with RAG context from journals, manuals, workbooks
 * Supports person-specific coaching and suggestion acceptance
 */

'use client';

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatContext {
  journalEntriesFound: number;
  knowledgeItemsFound: number;
  actionsFound: number;
  manualsFound?: number;
  workbooksFound?: number;
}

export interface CoachSuggestion {
  type: 'trigger' | 'strategy' | 'boundary' | 'goal' | 'activity';
  content: string;
  reasoning?: string;
  personId?: string;
}

interface UseCoachReturn {
  // State
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  conversationId: string | null;
  context: ChatContext | null;

  // Actions
  sendMessage: (message: string, personId?: string) => Promise<void>;
  clearConversation: () => void;

  // Suggestions
  extractSuggestions: (assistantMessage: string) => CoachSuggestion[];
}

export function useCoach(): UseCoachReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [context, setContext] = useState<ChatContext | null>(null);

  const sendMessage = async (message: string, personId?: string): Promise<void> => {
    if (!user) {
      setError('You must be logged in to use the coach');
      return;
    }

    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    // Add user message optimistically
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const chatWithCoach = httpsCallable<
        { message: string; conversationId?: string; personId?: string },
        { success: boolean; conversationId: string; response: string; context: ChatContext; error?: string }
      >(functions, 'chatWithCoach');

      const result = await chatWithCoach({
        message,
        conversationId: conversationId || undefined,
        personId
      });

      if (result.data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.response,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(result.data.conversationId);
        setContext(result.data.context);
      } else {
        throw new Error(result.data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');

      // Remove optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setContext(null);
    setError(null);
  };

  // Extract actionable suggestions from assistant response
  const extractSuggestions = (assistantMessage: string): CoachSuggestion[] => {
    const suggestions: CoachSuggestion[] = [];

    // Look for suggested triggers
    const triggerMatch = assistantMessage.match(/trigger[:\s]+["']([^"']+)["']/gi);
    if (triggerMatch) {
      triggerMatch.forEach(match => {
        const content = match.replace(/trigger[:\s]+["']|["']/gi, '').trim();
        suggestions.push({ type: 'trigger', content });
      });
    }

    // Look for suggested strategies
    const strategyMatch = assistantMessage.match(/try[:\s]+["']([^"']+)["']|strategy[:\s]+["']([^"']+)["']/gi);
    if (strategyMatch) {
      strategyMatch.forEach(match => {
        const content = match.replace(/try[:\s]+["']|strategy[:\s]+["']|["']/gi, '').trim();
        suggestions.push({ type: 'strategy', content });
      });
    }

    // Look for suggested boundaries
    const boundaryMatch = assistantMessage.match(/boundary[:\s]+["']([^"']+)["']/gi);
    if (boundaryMatch) {
      boundaryMatch.forEach(match => {
        const content = match.replace(/boundary[:\s]+["']|["']/gi, '').trim();
        suggestions.push({ type: 'boundary', content });
      });
    }

    // Look for suggested goals
    const goalMatch = assistantMessage.match(/goal[:\s]+["']([^"']+)["']/gi);
    if (goalMatch) {
      goalMatch.forEach(match => {
        const content = match.replace(/goal[:\s]+["']|["']/gi, '').trim();
        suggestions.push({ type: 'goal', content });
      });
    }

    return suggestions;
  };

  return {
    messages,
    loading,
    error,
    conversationId,
    context,
    sendMessage,
    clearConversation,
    extractSuggestions
  };
}
