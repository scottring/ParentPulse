'use client';

import { useState, useEffect, useRef } from 'react';
import { useCoach, ChatMessage } from '@/hooks/useCoach';
import { MicButton } from '@/components/voice/MicButton';
import { ChatClosureKept } from '@/components/chat/ChatClosureKept';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface CoachChatProps {
  personId?: string;
  personName?: string;
  onClose?: () => void;
}

export function CoachChat({ personId, personName, onClose }: CoachChatProps) {
  const { messages, loading, error, context, sendMessage, clearConversation, conversationId } = useCoach();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close-with-distillation state — when the user clicks Close after
  // a real conversation, we distill and show a "Kept" moment before
  // actually dismissing.
  const [closureShow, setClosureShow] = useState(false);
  const [closureEmergent, setClosureEmergent] = useState('');
  const [closureEcho, setClosureEcho] = useState('');
  const [closing, setClosing] = useState(false);

  const userTurnCount = messages.filter((m) => m.role === 'user').length;

  const handleClose = async () => {
    if (closing) return;
    // No conversation yet → plain close, no ceremony.
    if (userTurnCount === 0 || !conversationId) {
      onClose?.();
      return;
    }
    setClosing(true);
    try {
      const fn = httpsCallable<
        { conversationId: string },
        {
          closureId: string | null;
          emergent: string;
          themes: string[];
          firstUserEcho: string;
          turnCount: number;
        }
      >(functions, 'distillCoachConversation');
      const res = await fn({ conversationId });
      setClosureEmergent(res.data.emergent || '');
      setClosureEcho(res.data.firstUserEcho || '');
    } catch (err) {
      // Soft-fail — still show a closure moment so the user feels heard.
      console.warn('distillCoachConversation failed (non-fatal):', err);
      const first = messages.find((m) => m.role === 'user');
      setClosureEcho(first?.content?.slice(0, 180) || '');
    } finally {
      setClosing(false);
      setClosureShow(true);
    }
  };

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
    await sendMessage(message, personId ? [personId] : undefined);
    // Keep focus in the composer so the user can keep typing.
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        className="p-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div
              className="inline-block px-3 py-1 rounded-full text-xs text-white mb-3"
              style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
            >
              Relationship Coach
            </div>
            <h2
              className="text-2xl mb-2"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontWeight: 500,
                color: '#3A3530',
              }}
            >
              {personName ? `Coaching: ${personName}` : 'General Coaching'}
            </h2>
            <p
              className="text-sm"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
            >
              Ask me anything about {personName || 'parenting, relationships, personal growth'}. I have access to your journals, manuals, and workbooks.
            </p>

            {/* Context Info */}
            {context && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'var(--font-parent-body)' }}>
                {context.journalEntriesFound > 0 && (
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.15)',
                      color: '#3b82f6',
                    }}
                  >
                    {context.journalEntriesFound} journals
                  </div>
                )}
                {context.knowledgeItemsFound > 0 && (
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(147,130,195,0.08)',
                      border: '1px solid rgba(147,130,195,0.15)',
                      color: '#7a6b8f',
                    }}
                  >
                    {context.knowledgeItemsFound} resources
                  </div>
                )}
                {context.actionsFound > 0 && (
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(22,163,74,0.08)',
                      border: '1px solid rgba(22,163,74,0.15)',
                      color: '#16a34a',
                    }}
                  >
                    {context.actionsFound} actions
                  </div>
                )}
                {personId && (
                  <div
                    className="px-2 py-1 rounded-full"
                    style={{
                      background: 'rgba(124,144,130,0.08)',
                      border: '1px solid rgba(124,144,130,0.15)',
                      color: '#7C9082',
                    }}
                  >
                    {personName}&apos;s manual
                  </div>
                )}
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="px-4 py-2 rounded-full text-sm font-medium hover:bg-black/[0.03] transition-all"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#5C5347',
                border: '1px solid rgba(255,255,255,0.4)',
                cursor: closing ? 'wait' : 'pointer',
                opacity: closing ? 0.6 : 1,
              }}
            >
              {closing ? 'Keeping…' : 'Close'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div
              className="inline-block px-4 py-2 rounded-full text-xs mb-4"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(124,144,130,0.08)',
                border: '1px solid rgba(124,144,130,0.15)',
                color: '#7C9082',
              }}
            >
              Start a conversation
            </div>
            <p
              className="text-sm max-w-md mx-auto"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}
            >
              {personName
                ? `Ask me about ${personName}'s triggers, what strategies work best, or how to handle specific situations.`
                : 'Ask me about parenting strategies, relationship dynamics, or any challenges you\'re facing.'}
            </p>

            {personName && (
              <div className="mt-6 space-y-2 text-xs max-w-md mx-auto text-left" style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}>
                <p className="font-medium mb-2" style={{ color: '#5C5347' }}>Try asking:</p>
                <p>&bull; &quot;What are {personName}&apos;s main triggers?&quot;</p>
                <p>&bull; &quot;What strategies work best for {personName}?&quot;</p>
                <p>&bull; &quot;How should I handle it when {personName} gets overwhelmed?&quot;</p>
                <p>&bull; &quot;What boundaries are important for {personName}?&quot;</p>
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
              className="max-w-[80%] p-4 rounded-xl text-sm"
              style={{
                fontFamily: 'var(--font-parent-body)',
                ...(message.role === 'user'
                  ? {
                      background: '#3A3530',
                      color: '#FFFFFF',
                    }
                  : {
                      background: 'rgba(124,144,130,0.08)',
                      border: '1px solid rgba(124,144,130,0.15)',
                      color: '#3A3530',
                    }),
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {message.role === 'assistant' && (
                <div
                  className="inline-block px-2 py-0.5 rounded-full text-xs text-white mb-2"
                  style={{ background: '#7C9082' }}
                >
                  Coach
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
            <div
              className="max-w-[80%] p-4 rounded-xl text-sm"
              style={{
                fontFamily: 'var(--font-parent-body)',
                background: 'rgba(124,144,130,0.08)',
                border: '1px solid rgba(124,144,130,0.15)',
                color: '#3A3530',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#7C9082', animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#7C9082', animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#7C9082', animationDelay: '300ms' }}></div>
                </div>
                <span style={{ color: '#5C5347' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-xl text-sm"
            style={{
              fontFamily: 'var(--font-parent-body)',
              background: 'rgba(220,38,38,0.05)',
              border: '1px solid rgba(220,38,38,0.15)',
              color: '#dc2626',
            }}
          >
            <div className="font-medium mb-1">Error</div>
            <div className="text-xs">{error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-6"
        style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}
      >
        <div className="flex gap-3">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flex: 1 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${personName || 'anything'}...`}
              rows={2}
              disabled={loading}
              className="flex-1 p-3 rounded-xl text-sm focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-parent-body)',
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.5)',
                color: '#3A3530',
              }}
            />
            <MicButton
              size="sm"
              disabled={loading}
              onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-2 rounded-full text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'var(--font-parent-body)',
              background: '#3A3530',
            }}
          >
            Send
          </button>
        </div>
        <div
          className="mt-2 text-xs"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
        >
          Press Enter to send, Shift+Enter for new line
        </div>

        {messages.length > 0 && (
          <div className="mt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={clearConversation}
              className="px-3 py-1 rounded-full text-xs hover:bg-black/[0.03] transition-all"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#5C5347',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              New Conversation
            </button>
            <div
              className="text-xs"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            >
              {messages.length} messages
            </div>
          </div>
        )}
      </form>

      {closureShow && (
        <ChatClosureKept
          emergent={closureEmergent}
          echo={closureEcho}
          followUp="A short note from this conversation will appear in your workbook as something to reflect on."
          firstTimeKey="relish:chat-close-intro:coach"
          firstTimeBody="When you close a conversation, Relish keeps what was most alive from it and surfaces that note back to you in your workbook. It's the back-half of the loop — what you told me comes back to you."
          onDismiss={() => {
            setClosureShow(false);
            clearConversation();
            onClose?.();
          }}
        />
      )}
    </div>
  );
}
