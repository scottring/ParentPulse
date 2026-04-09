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

  return (
    <div className="flex flex-col">
      {/* Suggested questions — editorial italic list, not pills */}
      {messages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="mb-6">
          <span className="press-chapter-label">You might ask</span>
          <div className="mt-3">
            {suggestedQuestions.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(q)}
                disabled={loading}
                className="block text-left w-full py-2.5"
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: 17,
                  fontStyle: 'italic',
                  color: '#5C5347',
                  background: 'transparent',
                  border: 0,
                  borderBottom: '1px solid rgba(200,190,172,0.4)',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'padding 0.2s ease, color 0.2s ease',
                  lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  if (loading) return;
                  e.currentTarget.style.paddingLeft = '8px';
                  e.currentTarget.style.color = '#2D5F5D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.paddingLeft = '0';
                  e.currentTarget.style.color = '#5C5347';
                }}
              >
                — {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation thread */}
      {messages.length > 0 && (
        <div className="mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                paddingTop: 14,
                paddingBottom: 14,
                borderBottom: '1px solid rgba(200,190,172,0.35)',
              }}
            >
              {/* Speaker label */}
              <div
                className="press-chapter-label"
                style={{
                  color: message.role === 'user' ? '#2D5F5D' : '#6B6254',
                  marginBottom: 6,
                }}
              >
                {message.role === 'user' ? 'You asked' : 'The manual'}
              </div>
              {/* Message body — editorial serif */}
              <div
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: message.role === 'user' ? 18 : 17,
                  fontStyle: message.role === 'user' ? 'italic' : 'normal',
                  fontWeight: 400,
                  lineHeight: 1.55,
                  color: '#3A3530',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ paddingTop: 14, paddingBottom: 14 }}>
              <div
                className="press-chapter-label"
                style={{ color: '#6B6254', marginBottom: 6 }}
              >
                The manual
              </div>
              <p
                className="press-body-italic"
                style={{
                  fontSize: 17,
                  color: '#746856',
                }}
              >
                Turning the pages&hellip;
              </p>
            </div>
          )}

          {error && (
            <div style={{ paddingTop: 14 }}>
              <p
                className="press-marginalia"
                style={{ fontSize: 15, color: '#C08070' }}
              >
                — {error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input — no border box, just an underline and italic placeholder */}
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-baseline gap-3 py-2"
          style={{ borderBottom: '1px solid rgba(58,53,48,0.25)' }}
        >
          <span
            className="press-marginalia"
            style={{ fontSize: 15, color: '#7C9082', flexShrink: 0 }}
          >
            →
          </span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName}, or tell the manual something new…`}
            rows={1}
            disabled={loading}
            className="flex-1 focus:outline-none resize-none disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 18,
              fontStyle: 'italic',
              color: '#3A3530',
              background: 'transparent',
              border: 0,
              lineHeight: 1.45,
              padding: '4px 0',
            }}
          />
          {input.trim() && (
            <button
              type="submit"
              disabled={loading}
              className="press-link-sm"
              style={{
                background: 'transparent',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              Send ⟶
            </button>
          )}
        </div>

        {messages.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <button
              type="button"
              onClick={clearConversation}
              className="press-marginalia"
              style={{
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                fontSize: 14,
                color: '#7A6E5C',
              }}
            >
              — begin a new conversation
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
