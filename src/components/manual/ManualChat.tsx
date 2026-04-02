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
    <div className="flex flex-col h-full bg-white border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-slate-800 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3 tracking-wider">
              ASK THE MANUAL
            </div>
            <h2 className="font-mono text-xl font-bold text-slate-900 mb-1">
              Ask about {personName}
            </h2>
            <p className="font-mono text-xs text-slate-500">
              Grounded in {personName}&apos;s manual data, perspectives, and patterns.
              New insights from this conversation will be added to the manual.
            </p>

            {/* Context badges */}
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
              {manual?.synthesizedContent && (
                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-600 text-emerald-900">
                  SYNTHESIZED
                </span>
              )}
              {(manual?.triggers?.length || 0) > 0 && (
                <span className="px-2 py-0.5 bg-red-50 border border-red-500 text-red-900">
                  {manual?.triggers?.length} TRIGGERS
                </span>
              )}
              {(manual?.whatWorks?.length || 0) > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-500 text-blue-900">
                  {manual?.whatWorks?.length} STRATEGIES
                </span>
              )}
              {(manual?.boundaries?.length || 0) > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 border border-amber-500 text-amber-900">
                  {manual?.boundaries?.length} BOUNDARIES
                </span>
              )}
              {(manual?.contributionIds?.length || 0) > 0 && (
                <span className="px-2 py-0.5 bg-purple-50 border border-purple-500 text-purple-900">
                  {manual?.contributionIds?.length} PERSPECTIVES
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 border-2 border-slate-300 bg-white font-mono text-sm font-bold text-slate-700 hover:border-slate-800 transition-all"
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
              <div className="inline-block px-3 py-1 bg-amber-50 border-2 border-amber-600 font-mono text-xs text-amber-900 mb-3">
                START A CONVERSATION
              </div>
              <p className="font-mono text-sm text-slate-600 max-w-md mx-auto">
                Ask anything about {personName}. Responses are grounded in their manual —
                what they&apos;ve shared, what observers have noted, and where perspectives align or diverge.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="space-y-2 max-w-lg mx-auto">
              <p className="font-mono text-xs text-slate-500 font-bold tracking-wider mb-3">
                SUGGESTED QUESTIONS
              </p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  disabled={loading}
                  className="w-full text-left p-3 border-2 border-slate-200 bg-white font-mono text-sm text-slate-700 hover:border-slate-800 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="inline-block w-5 h-5 text-center border border-slate-300 text-slate-400 text-xs leading-5 mr-2 group-hover:border-slate-800 group-hover:text-slate-800 transition-all">
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
              className={`max-w-[85%] p-4 font-mono text-sm ${
                message.role === 'user'
                  ? 'bg-slate-800 text-white border-2 border-slate-800'
                  : 'bg-amber-50 border-2 border-amber-600 text-slate-900'
              } shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]`}
            >
              {message.role === 'assistant' && (
                <div className="inline-block px-2 py-0.5 bg-slate-800 text-white text-xs mb-2 tracking-wider">
                  {personName.toUpperCase()}&apos;S MANUAL
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
            <div className="max-w-[85%] p-4 bg-amber-50 border-2 border-amber-600 font-mono text-sm text-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-slate-500 text-xs">Reading {personName}&apos;s manual...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border-2 border-red-600 font-mono text-sm text-red-900">
            <div className="font-bold mb-1 text-xs">ERROR</div>
            <div className="text-xs">{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t-4 border-slate-800 bg-white p-5">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName}...`}
            rows={2}
            disabled={loading}
            className="flex-1 p-3 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-slate-800 text-white font-mono font-bold text-sm hover:bg-amber-600 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
          >
            ASK
          </button>
        </div>

        <div className="mt-2 flex justify-between items-center">
          <span className="font-mono text-xs text-slate-400">
            Enter to send, Shift+Enter for new line
          </span>
          {messages.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-400">
                {messages.length} messages
              </span>
              <button
                type="button"
                onClick={clearConversation}
                className="px-2 py-1 border border-slate-300 bg-white font-mono text-xs text-slate-500 hover:border-slate-800 hover:text-slate-800 transition-all"
              >
                NEW CONVERSATION
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
