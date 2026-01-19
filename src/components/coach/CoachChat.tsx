'use client';

import { useState, useEffect, useRef } from 'react';
import { useCoach, ChatMessage } from '@/hooks/useCoach';

interface CoachChatProps {
  personId?: string;
  personName?: string;
  onClose?: () => void;
}

export function CoachChat({ personId, personName, onClose }: CoachChatProps) {
  const { messages, loading, error, context, sendMessage, clearConversation } = useCoach();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message, personId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-slate-800 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-3">
              🤖 AI RELATIONSHIP COACH
            </div>
            <h2 className="font-mono text-2xl font-bold text-slate-900 mb-2">
              {personName ? `Coaching: ${personName}` : 'General Coaching'}
            </h2>
            <p className="font-mono text-sm text-slate-600">
              Ask me anything about {personName || 'parenting, relationships, personal growth'}. I have access to your journals, manuals, and workbooks.
            </p>

            {/* Context Info */}
            {context && (
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
                {context.journalEntriesFound > 0 && (
                  <div className="px-2 py-1 bg-blue-50 border border-blue-600 text-blue-900">
                    📓 {context.journalEntriesFound} journals
                  </div>
                )}
                {context.knowledgeItemsFound > 0 && (
                  <div className="px-2 py-1 bg-purple-50 border border-purple-600 text-purple-900">
                    📚 {context.knowledgeItemsFound} resources
                  </div>
                )}
                {context.actionsFound > 0 && (
                  <div className="px-2 py-1 bg-green-50 border border-green-600 text-green-900">
                    ✓ {context.actionsFound} actions
                  </div>
                )}
                {personId && (
                  <div className="px-2 py-1 bg-amber-50 border border-amber-600 text-amber-900">
                    📖 {personName}'s manual
                  </div>
                )}
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-slate-300 bg-white font-mono text-sm font-bold text-slate-700 hover:border-slate-800 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block px-4 py-2 bg-amber-50 border-2 border-amber-600 font-mono text-xs text-amber-900 mb-4">
              👋 START A CONVERSATION
            </div>
            <p className="font-mono text-sm text-slate-600 max-w-md mx-auto">
              {personName
                ? `Ask me about ${personName}'s triggers, what strategies work best, or how to handle specific situations.`
                : 'Ask me about parenting strategies, relationship dynamics, or any challenges you\'re facing.'}
            </p>

            {personName && (
              <div className="mt-6 space-y-2 font-mono text-xs text-slate-500 max-w-md mx-auto text-left">
                <p className="font-bold text-slate-700 mb-2">Try asking:</p>
                <p>• "What are {personName}'s main triggers?"</p>
                <p>• "What strategies work best for {personName}?"</p>
                <p>• "How should I handle it when {personName} gets overwhelmed?"</p>
                <p>• "What boundaries are important for {personName}?"</p>
              </div>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 font-mono text-sm ${
                message.role === 'user'
                  ? 'bg-slate-800 text-white border-2 border-slate-800'
                  : 'bg-amber-50 border-2 border-amber-600 text-slate-900'
              } shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]`}
            >
              {message.role === 'assistant' && (
                <div className="inline-block px-2 py-1 bg-amber-600 text-white text-xs mb-2">
                  🤖 COACH
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
            <div className="max-w-[80%] p-4 bg-amber-50 border-2 border-amber-600 font-mono text-sm text-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-slate-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-600 font-mono text-sm text-red-900">
            <div className="font-bold mb-1">❌ Error</div>
            <div className="text-xs">{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t-4 border-slate-800 bg-white p-6">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName || 'anything'}...`}
            rows={2}
            disabled={loading}
            className="flex-1 p-3 border-2 border-slate-300 font-mono text-sm focus:border-slate-800 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
          >
            SEND →
          </button>
        </div>
        <div className="mt-2 font-mono text-xs text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </div>

        {messages.length > 0 && (
          <div className="mt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={clearConversation}
              className="px-3 py-1 border-2 border-slate-300 bg-white font-mono text-xs text-slate-600 hover:border-slate-800 transition-all"
            >
              ↻ New Conversation
            </button>
            <div className="font-mono text-xs text-slate-500">
              {messages.length} messages
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
