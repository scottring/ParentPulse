'use client';

import { useState, useEffect, useRef } from 'react';
import { useManualChat, SuggestedQuestion } from '@/hooks/useManualChat';
import { PersonManual } from '@/types/person-manual';

interface ManualChatProps {
  personId: string;
  personName: string;
  manual: PersonManual | null;
  onClose: () => void;
}

export function ManualChat({ personId, personName, manual, onClose }: ManualChatProps) {
  const {
    messages,
    loading,
    error,
    suggestedQuestions,
    sendMessage,
    clearConversation,
    hasSession,
  } = useManualChat(personId, personName, manual);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = async (question: SuggestedQuestion) => {
    if (loading) return;
    await sendMessage(question.text);
  };

  const categoryIcon = (cat: SuggestedQuestion['category']) => {
    switch (cat) {
      case 'gap': return '~';
      case 'trigger': return '!';
      case 'pattern': return '#';
      case 'strategy': return '+';
      default: return '?';
    }
  };

  return (
    <div className="flex flex-col h-full glass-card-strong" style={{ borderRadius: '24px 0 0 24px' }}>
      {/* Header */}
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 rounded-full text-white mb-3" style={{ backgroundColor: '#7C9082', fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
              Ask the manual
            </div>
            <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }} className="mb-1">
              Ask about {personName}
            </h2>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>
              Grounded in {personName}&apos;s manual data, perspectives, and patterns.
              New insights from this conversation will be added to the manual.
            </p>

            {/* Context badges */}
            <div className="mt-3 flex flex-wrap gap-2" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
              {manual?.synthesizedContent && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                  Synthesized
                </span>
              )}
              {(manual?.triggers?.length || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  {manual?.triggers?.length} Triggers
                </span>
              )}
              {(manual?.whatWorks?.length || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
                  {manual?.whatWorks?.length} Strategies
                </span>
              )}
              {(manual?.boundaries?.length || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,144,130,0.1)', color: '#7C9082', border: '1px solid rgba(124,144,130,0.2)' }}>
                  {manual?.boundaries?.length} Boundaries
                </span>
              )}
              {(manual?.contributionIds?.length || 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(147,51,234,0.1)', color: '#9333ea', border: '1px solid rgba(147,51,234,0.2)' }}>
                  {manual?.contributionIds?.length} Perspectives
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 rounded-full transition-all hover:opacity-70"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', fontWeight: 500, color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            X
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="inline-block px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(124,144,130,0.1)', border: '1px solid rgba(124,144,130,0.2)', fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7C9082' }}>
                Start a conversation
              </div>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }} className="max-w-md mx-auto">
                Ask anything about {personName}. Responses are grounded in their manual —
                what they&apos;ve shared, what observers have noted, and where perspectives align or diverge.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="space-y-2 max-w-lg mx-auto">
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8A8078' }} className="mb-3">
                Suggested questions
              </p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  disabled={loading}
                  className="w-full text-left p-3 glass-card rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:shadow-md"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}
                >
                  <span className="inline-flex w-5 h-5 items-center justify-center rounded-full mr-2 transition-all" style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#8A8078', fontSize: '10px' }}>
                    {categoryIcon(q.category)}
                  </span>
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] p-4 rounded-2xl"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '14px',
                ...(message.role === 'user'
                  ? { backgroundColor: '#3A3530', color: 'white' }
                  : { background: 'rgba(124,144,130,0.1)', border: '1px solid rgba(124,144,130,0.2)', color: '#3A3530' })
              }}
            >
              {message.role === 'assistant' && (
                <div className="inline-block px-2 py-0.5 rounded-full text-white mb-2" style={{ backgroundColor: '#7C9082', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                  {personName}&apos;s manual
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl" style={{ background: 'rgba(124,144,130,0.1)', border: '1px solid rgba(124,144,130,0.2)', fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '300ms' }} />
                </div>
                <span style={{ color: '#7C7468', fontSize: '12px' }}>Reading {personName}&apos;s manual...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#dc2626' }}>
            <div style={{ fontWeight: 600, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const }} className="mb-1">Error</div>
            <div style={{ fontSize: '12px' }}>{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName}...`}
            rows={2}
            disabled={loading}
            className="flex-1 p-3 rounded-xl focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
          >
            Ask
          </button>
        </div>

        <div className="mt-2 flex justify-between items-center">
          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
            Enter to send, Shift+Enter for new line
          </span>
          {messages.length > 0 && (
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
                {messages.length} messages
              </span>
              <button
                type="button"
                onClick={clearConversation}
                className="px-2 py-1 rounded-full transition-all hover:opacity-70"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C7468', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                New conversation
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
