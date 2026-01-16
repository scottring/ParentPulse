'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';

export default function CoachPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { messages, loading, error, context, sendMessage, startNewConversation } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleNewChat = () => {
    if (confirm('Start a new conversation? This will clear the current chat history.')) {
      startNewConversation();
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const suggestedQuestions = [
    "What patterns have you noticed in my journal entries?",
    "What strategies have worked well for me in the past?",
    "Can you help me with the challenges I've been writing about?",
    "What should I focus on based on my recent entries?",
  ];

  return (
    <div className="min-h-screen parent-page flex flex-col">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  💬 AI Parenting Coach
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Ask questions about your parenting journey
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                  style={{
                    border: '1px solid var(--parent-border)',
                    color: 'var(--parent-text)'
                  }}
                >
                  New Chat
                </button>
              )}
              <button
                onClick={logout}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  color: 'var(--parent-text-light)',
                  border: '1px solid var(--parent-border)'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 lg:px-8 py-8">
        {/* Context Info */}
        {context && (
          <div
            className="mb-4 p-3 rounded-lg text-xs animate-fade-in"
            style={{
              backgroundColor: 'var(--parent-bg)',
              border: '1px solid var(--parent-border)',
            }}
          >
            <div className="flex items-center gap-4 text-center justify-center">
              <span style={{ color: 'var(--parent-text-light)' }}>
                📝 {context.journalEntriesFound} journal entries
              </span>
              <span style={{ color: 'var(--parent-text-light)' }}>
                📚 {context.knowledgeItemsFound} saved resources
              </span>
              <span style={{ color: 'var(--parent-text-light)' }}>
                ✨ {context.actionsFound} actions
              </span>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Welcome to Your AI Parenting Coach
              </h2>
              <p className="text-sm mb-6 max-w-lg mx-auto" style={{ color: 'var(--parent-text-light)' }}>
                I have access to your journal entries, saved articles, and action history. Ask me anything about your parenting journey!
              </p>
              <div className="space-y-2">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--parent-secondary)' }}>
                  Try asking:
                </p>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="block w-full max-w-md mx-auto text-left px-4 py-3 rounded-lg text-sm transition-all hover:shadow-md"
                    style={{
                      backgroundColor: 'var(--parent-card)',
                      border: '1px solid var(--parent-border)',
                      color: 'var(--parent-text)',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
                  }`}
                  style={{
                    backgroundColor: message.role === 'user' ? 'var(--parent-accent)' : 'var(--parent-card)',
                    color: message.role === 'user' ? 'white' : 'var(--parent-text)',
                    border: message.role === 'assistant' ? '1px solid var(--parent-border)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{message.role === 'user' ? '👤' : '🤖'}</span>
                    <span className="text-xs font-semibold opacity-70">
                      {message.role === 'user' ? 'You' : 'AI Coach'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div
                className="max-w-[80%] p-4 rounded-lg rounded-bl-none"
                style={{
                  backgroundColor: 'var(--parent-card)',
                  border: '1px solid var(--parent-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--parent-text-light)' }}>
                    AI Coach is thinking...
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--parent-accent)', animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--parent-accent)', animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--parent-accent)', animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-4 rounded-lg text-sm animate-fade-in"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#C62828',
                border: '1px solid #EF9A9A',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="parent-card p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your parenting journey..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg text-sm transition-all disabled:opacity-50"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)',
              }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
