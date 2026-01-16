import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  journalEntriesFound: number;
  knowledgeItemsFound: number;
  actionsFound: number;
}

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);

  const sendMessage = async (message: string): Promise<void> => {
    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    // Add user message to UI immediately
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const functions = getFunctions();
      const chatWithCoach = httpsCallable(functions, 'chatWithCoach');

      const response = await chatWithCoach({
        message,
        conversationId,
      });

      const data = response.data as any;

      if (data.success) {
        // Update conversation ID if it's a new conversation
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Add assistant response to UI
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update context info
        if (data.context) {
          setContext(data.context);
        }
      } else {
        throw new Error('Failed to get response from AI coach');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      // Remove the user message from UI on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setContext(null);
    setError(null);
  };

  return {
    messages,
    loading,
    error,
    context,
    conversationId,
    sendMessage,
    startNewConversation,
  };
}
