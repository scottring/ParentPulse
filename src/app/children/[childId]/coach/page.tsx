'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { doc, collection } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Navigation from '@/components/layout/Navigation';

interface ChatMessage {
  role: 'parent' | 'ai';
  content: string;
  timestamp: Date;
}

export default function CoachPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create session ID on mount
  useEffect(() => {
    const newSessionId = doc(collection(firestore, 'coaching_sessions')).id;
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (children.length > 0) {
      const foundChild = children.find((c) => c.childId === childId);
      if (foundChild) {
        setChild(foundChild);
        // Add welcome message
        setMessages([
          {
            role: 'ai',
            content: `Hi! I'm your AI parenting coach for ${foundChild.name}. I know ${foundChild.name}'s triggers, what works, and recent behavior patterns. How can I help you today?`,
            timestamp: new Date(),
          },
        ]);
      } else {
        router.push('/dashboard');
      }
      setLoading(false);
    }
  }, [user, children, childId, router]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message to chat
    const newUserMessage: ChatMessage = {
      role: 'parent',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      setSending(true);

      // Get recent messages for context (last 5)
      const recentMessages = messages.slice(-5).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call Cloud Function
      const chatChildCoachFunction = httpsCallable(functions, 'chatChildCoach');
      const result = await chatChildCoachFunction({
        childId,
        message: userMessage,
        sessionId,
        recentMessages,
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to get coach response');
      }

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  // Suggested quick questions
  const quickQuestions = [
    `${child?.name} won't listen when I tell them to get ready for school. What should I try?`,
    `Bedtime is a battle every night. Any strategies?`,
    `What works best for ${child?.name} when they're having a meltdown?`,
    `I've tried everything and nothing works. What else can I do?`,
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">Child not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            AI Coach for {child.name}
          </h1>
          <p className="text-sm text-gray-600">
            Ask me anything about parenting {child.name}. I know their triggers, what works, and recent patterns.
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'parent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-5 py-3 rounded-2xl ${
                message.role === 'parent'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              <p
                className={`text-xs mt-2 ${
                  message.role === 'parent' ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="max-w-2xl px-5 py-3 rounded-2xl bg-white border border-gray-200">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions (show if no messages yet) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-4 max-w-4xl mx-auto w-full">
          <p className="text-xs text-gray-600 font-medium mb-3">Quick questions to get started:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInputMessage(question)}
                className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={`Ask me anything about ${child.name}...`}
              rows={2}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className={`px-6 py-3 rounded-lg font-medium transition-colors text-sm ${
                sending || !inputMessage.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
