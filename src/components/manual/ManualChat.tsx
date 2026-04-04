'use client';

import { useState, useEffect, useRef } from 'react';
import { useManualChat, SuggestedQuestion } from '@/hooks/useManualChat';
import { PersonManual } from '@/types/person-manual';

interface ManualChatProps {
  personId: string;
  personName: string;
  manual: PersonManual | null;
}

export function ManualChat({ personId, personName, manual }: ManualChatProps) {
  const {
    messages,
    loading,
    error,
    suggestedQuestions,
    sendMessage,
    clearConversation,
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
    <div className="flex flex-col">
      {/* Suggested questions — shown when no messages */}
      {messages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(q)}
                disabled={loading}
                className="text-left px-4 py-2.5 glass-card rounded-full transition-all disabled:opacity-50 group hover:shadow-md"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#5C5347' }}
              >
                <span className="inline-flex w-4 h-4 items-center justify-center rounded-full mr-1.5" style={{ color: '#7C9082', fontSize: '10px', fontWeight: 700 }}>
                  {categoryIcon(q.category)}
                </span>
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search-style input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-full transition-all focus-within:shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName}, or log something new...`}
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent focus:outline-none resize-none disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '15px',
              color: '#3A3530',
              lineHeight: '1.4',
            }}
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-full text-white transition-all disabled:opacity-50 hover:shadow-md shrink-0"
              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
            >
              Send
            </button>
          )}
        </div>
        {messages.length > 0 && (
          <div className="flex justify-end mt-2 px-2">
            <button
              type="button"
              onClick={clearConversation}
              className="transition-all hover:opacity-70"
              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '11px', color: '#8A8078' }}
            >
              Clear conversation
            </button>
          </div>
        )}
      </form>

      {/* Conversation thread */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[90%] p-4 rounded-2xl"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  ...(message.role === 'user'
                    ? { backgroundColor: '#3A3530', color: 'white' }
                    : { background: 'rgba(124,144,130,0.08)', border: '1px solid rgba(124,144,130,0.15)', color: '#3A3530' })
                }}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(124,144,130,0.08)', border: '1px solid rgba(124,144,130,0.15)' }}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#7C9082', animationDelay: '300ms' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468', fontSize: '12px' }}>
                    Reading {personName}&apos;s manual...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
