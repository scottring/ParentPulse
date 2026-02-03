'use client';

import { useState, useEffect, useRef } from 'react';
import { useCoach } from '@/hooks/useCoach';

interface CoachChatProps {
  personId?: string;
  personName?: string;
  includeHousehold?: boolean;
  onClose?: () => void;
  initialMessage?: string;
  onInitialMessageSent?: () => void;
}

export function CoachChat({ personId, personName, includeHousehold, onClose, initialMessage, onInitialMessageSent }: CoachChatProps) {
  const { messages, loading, error, context, sendMessage, clearConversation } = useCoach();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle initial message - send it automatically when provided
  useEffect(() => {
    if (initialMessage && !initialMessageSent && !loading) {
      setInitialMessageSent(true);
      sendMessage(initialMessage, { personId, includeHousehold }).then(() => {
        onInitialMessageSent?.();
      });
    }
  }, [initialMessage, initialMessageSent, loading, sendMessage, personId, includeHousehold, onInitialMessageSent]);

  // Reset initial message sent flag when initial message changes
  useEffect(() => {
    if (!initialMessage) {
      setInitialMessageSent(false);
    }
  }, [initialMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message, { personId, includeHousehold });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - compact version */}
      <div className="border-b-2 border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-800 truncate">
                {personName ? `Coaching: ${personName}` : includeHousehold ? 'Household Coaching' : 'General Coaching'}
              </span>
              {/* Context badges - compact */}
              {context && (
                <div className="flex flex-wrap gap-1.5">
                  {context.journalEntriesFound > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-mono text-xs rounded">
                      {context.journalEntriesFound} journals
                    </span>
                  )}
                  {context.knowledgeItemsFound > 0 && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 font-mono text-xs rounded">
                      {context.knowledgeItemsFound} resources
                    </span>
                  )}
                  {personId && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-mono text-xs rounded">
                      manual loaded
                    </span>
                  )}
                  {context.householdFound && context.householdFound > 0 && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 font-mono text-xs rounded">
                      household loaded
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 border border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 hover:border-slate-800 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="font-mono text-sm text-slate-600 max-w-sm mx-auto mb-4">
              {personName
                ? `Ask me about ${personName}'s triggers, what strategies work best, or how to handle specific situations.`
                : includeHousehold
                ? 'Ask me about your household values, rituals, roles, or any family dynamics you\'re working on.'
                : 'Ask me about parenting strategies, relationship dynamics, or any challenges you\'re facing.'}
            </p>

            {personName && (
              <div className="space-y-1.5 font-mono text-xs text-slate-500 max-w-sm mx-auto text-left bg-slate-50 p-4 rounded border border-slate-200">
                <p className="font-bold text-slate-700 mb-2">Try asking:</p>
                <p>• "What are {personName}'s main triggers?"</p>
                <p>• "What strategies work best for {personName}?"</p>
                <p>• "How should I handle it when {personName} gets overwhelmed?"</p>
                <p>• "What boundaries are important for {personName}?"</p>
              </div>
            )}

            {!personName && includeHousehold && (
              <div className="space-y-1.5 font-mono text-xs text-slate-500 max-w-sm mx-auto text-left bg-slate-50 p-4 rounded border border-slate-200">
                <p className="font-bold text-slate-700 mb-2">Try asking:</p>
                <p>• "Help me think through our family's roles and rituals"</p>
                <p>• "How can we improve our communication rhythm?"</p>
                <p>• "What do our household values tell us about this situation?"</p>
                <p>• "How can I create better sanctuary zones at home?"</p>
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
              className={`max-w-[85%] p-4 font-mono text-sm rounded-lg ${
                message.role === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-amber-50 border border-amber-200 text-slate-900'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="inline-block px-2 py-0.5 bg-amber-600 text-white text-xs rounded mb-2">
                  COACH
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
            <div className="p-4 bg-amber-50 border border-amber-200 font-mono text-sm text-slate-900 rounded-lg">
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
          <div className="p-4 bg-red-50 border border-red-300 font-mono text-sm text-red-900 rounded-lg">
            <div className="font-bold mb-1">Error</div>
            <div className="text-xs">{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t-2 border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${personName || 'anything'}...`}
            rows={3}
            disabled={loading}
            className="flex-1 p-3 border-2 border-slate-300 bg-white font-mono text-sm focus:border-amber-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed rounded"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-amber-600 text-white font-mono font-bold hover:bg-amber-700 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600 self-end"
          >
            SEND
          </button>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <span className="font-mono text-xs text-slate-500">
            Enter to send, Shift+Enter for new line
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearConversation}
              className="px-2 py-1 border border-slate-300 bg-white font-mono text-xs text-slate-600 hover:border-slate-600 transition-all rounded"
            >
              ↻ Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
