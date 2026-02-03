'use client';

import { useState, useRef, useEffect } from 'react';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
} from '@/components/technical';
import {
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useCoach } from '@/hooks/useCoach';

interface ContentItem {
  id: string;
  type: 'string' | 'non-negotiable' | 'zone' | 'contact' | 'ritual' | 'card';
  value: string | Record<string, unknown>;
  label?: string;
}

interface AIContentReviewProps {
  sectionName: string;
  sectionId: string;
  items: ContentItem[];
  originalAnswers?: Record<string, unknown>;
  onApprove: (items: ContentItem[]) => void;
  onReject: () => void;
  onEdit: (itemId: string, newValue: unknown) => void;
  isLoading?: boolean;
}

// Mini chat component for individual card discussions
function CardChat({
  item,
  allItems,
  sectionName,
  originalAnswers,
  onApplySuggestion,
}: {
  item: ContentItem;
  allItems: ContentItem[];
  sectionName: string;
  originalAnswers?: Record<string, unknown>;
  onApplySuggestion: (newValue: unknown) => void;
}) {
  const { messages, loading, sendMessage, clearConversation } = useCoach();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Build context message
    const itemDescription = typeof item.value === 'string'
      ? item.value
      : JSON.stringify(item.value, null, 2);

    const contextPrefix = messages.length === 0
      ? `I'm reviewing AI-generated content for my household's "${sectionName}" section.

CURRENT ITEM I WANT TO DISCUSS:
Type: ${item.type}
Label: ${item.label || 'N/A'}
Content: ${itemDescription}

ALL ITEMS IN THIS SECTION:
${allItems.map((i, idx) => `${idx + 1}. [${i.type}] ${i.label || ''}: ${typeof i.value === 'string' ? i.value : JSON.stringify(i.value)}`).join('\n')}

${originalAnswers ? `ORIGINAL ANSWERS I PROVIDED:
${JSON.stringify(originalAnswers, null, 2)}` : ''}

MY QUESTION: ${input.trim()}`
      : input.trim();

    setInput('');
    await sendMessage(contextPrefix, { includeHousehold: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Parse AI response for suggested edits
  const extractSuggestion = (text: string): string | null => {
    // Look for suggested edits in various formats
    const patterns = [
      /SUGGESTED EDIT:\s*["']?([^"'\n]+)["']?/i,
      /REVISION:\s*["']?([^"'\n]+)["']?/i,
      /TRY:\s*["']?([^"'\n]+)["']?/i,
      /ALTERNATIVE:\s*["']?([^"'\n]+)["']?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      {/* Chat messages */}
      <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 italic">
            Ask questions about this item or request changes...
          </p>
        )}
        {messages.map((msg, idx) => {
          const suggestion = msg.role === 'assistant' ? extractSuggestion(msg.content) : null;
          return (
            <div key={idx} className={`text-xs ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block p-2 rounded max-w-[90%] ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-amber-50 border border-amber-200 text-slate-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {suggestion && (
                  <button
                    onClick={() => onApplySuggestion(suggestion)}
                    className="mt-2 px-2 py-1 bg-green-600 text-white text-xs font-mono font-bold rounded hover:bg-green-700 transition-colors"
                  >
                    ✓ APPLY SUGGESTION
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="text-xs">
            <div className="inline-block p-2 bg-amber-50 border border-amber-200 rounded">
              <span className="text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this item..."
          className="flex-1 px-2 py-1.5 border border-slate-300 text-xs font-mono focus:outline-none focus:border-amber-500 rounded"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-mono font-bold rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ASK
        </button>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="px-2 py-1.5 border border-slate-300 text-xs font-mono text-slate-500 rounded hover:border-slate-500 transition-colors"
            title="Clear chat"
          >
            ↻
          </button>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {[
            'Why did you suggest this?',
            'Give me an alternative',
            'Make it more specific',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIContentReview({
  sectionName,
  sectionId,
  items,
  originalAnswers,
  onApprove,
  onReject,
  onEdit,
  isLoading = false,
}: AIContentReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);

  const handleStartEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditValue(
      typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2)
    );
    setExpandedChatId(null); // Close chat when editing
  };

  const handleSaveEdit = (itemId: string) => {
    try {
      const parsed = editValue.startsWith('{') ? JSON.parse(editValue) : editValue;
      onEdit(itemId, parsed);
      setEditingId(null);
    } catch {
      onEdit(itemId, editValue);
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const toggleApproval = (itemId: string) => {
    const newApproved = new Set(approvedItems);
    if (newApproved.has(itemId)) {
      newApproved.delete(itemId);
    } else {
      newApproved.add(itemId);
    }
    setApprovedItems(newApproved);
  };

  const toggleChat = (itemId: string) => {
    setExpandedChatId(expandedChatId === itemId ? null : itemId);
    setEditingId(null); // Close edit mode when opening chat
  };

  const handleApproveAll = () => {
    onApprove(items);
  };

  const handleApplySuggestion = (itemId: string, newValue: unknown) => {
    onEdit(itemId, newValue);
    // Optionally close the chat after applying
    // setExpandedChatId(null);
  };

  const renderItemValue = (item: ContentItem, expanded: boolean = false) => {
    if (typeof item.value === 'string') {
      return <span className={expanded ? '' : 'line-clamp-2'}>{item.value}</span>;
    }

    // Render object-based items
    const val = item.value as Record<string, unknown>;
    switch (item.type) {
      case 'non-negotiable':
        return (
          <div>
            <p className="font-medium">{val.value as string}</p>
            {typeof val.description === 'string' && val.description && (
              <p className={`text-xs text-slate-500 mt-1 ${expanded ? '' : 'line-clamp-1'}`}>
                {val.description}
              </p>
            )}
          </div>
        );
      case 'zone':
        return (
          <div>
            <p className="font-medium">{val.name as string}</p>
            <p className="text-xs text-slate-500">
              {val.type as string} · {val.location as string}
            </p>
            {typeof val.purpose === 'string' && val.purpose && (
              <p className={`text-xs text-slate-600 mt-1 ${expanded ? '' : 'line-clamp-1'}`}>
                {val.purpose}
              </p>
            )}
          </div>
        );
      case 'contact':
        return (
          <div>
            <p className="font-medium">{val.name as string}</p>
            <p className="text-xs text-slate-500">
              {val.relationship as string} · {val.category as string}
            </p>
          </div>
        );
      case 'ritual':
        return (
          <div>
            <p className="font-medium">{val.name as string}</p>
            <p className={`text-xs text-slate-600 mt-1 ${expanded ? '' : 'line-clamp-1'}`}>
              {val.description as string}
            </p>
            {val.dayOfWeek !== undefined && (
              <TechnicalLabel variant="subtle" color="blue" size="xs" className="mt-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][val.dayOfWeek as number]}
              </TechnicalLabel>
            )}
          </div>
        );
      case 'card':
        return (
          <div>
            <p className="font-medium">{val.name as string}</p>
            <p className="text-xs text-slate-500">
              {val.category as string} · Owner: {val.ownerName as string}
            </p>
          </div>
        );
      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(item.value, null, 2)}</pre>;
    }
  };

  if (isLoading) {
    return (
      <TechnicalCard shadowSize="md" className="p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider mb-2">
            AI is generating content...
          </p>
          <p className="text-slate-600">
            Creating personalized {sectionName.toLowerCase()} based on your answers
          </p>
        </div>
      </TechnicalCard>
    );
  }

  return (
    <TechnicalCard shadowSize="md" className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-mono font-bold text-lg text-slate-800">
            Review AI-Generated Content
          </h3>
          <p className="font-mono text-xs text-slate-500">
            {items.length} items generated for {sectionName}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 p-3 mb-6">
        <p className="text-sm text-amber-800">
          Review the generated content below. Click the <ChatBubbleLeftRightIcon className="w-4 h-4 inline" /> icon
          to discuss any item with AI, or edit directly.
        </p>
      </div>

      {/* Items list */}
      <div className="space-y-3 mb-6">
        {items.map((item) => {
          const isExpanded = expandedChatId === item.id;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 border-2 transition-all ${
                approvedItems.has(item.id)
                  ? 'border-green-400 bg-green-50'
                  : isExpanded
                  ? 'border-amber-400 bg-amber-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {isEditing ? (
                /* Edit mode */
                <div>
                  <label className="block font-mono text-xs text-slate-500 mb-1">
                    {item.label || item.type.toUpperCase()}
                  </label>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full p-2 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
                    rows={typeof item.value === 'string' ? 2 : 5}
                  />
                  <div className="flex gap-2 mt-2">
                    <TechnicalButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEdit(item.id)}
                    >
                      SAVE
                    </TechnicalButton>
                    <TechnicalButton
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      CANCEL
                    </TechnicalButton>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {item.label && (
                        <span className="font-mono text-xs text-slate-500 uppercase block mb-1">
                          {item.label}
                        </span>
                      )}
                      <div className="text-sm text-slate-700">
                        {renderItemValue(item, isExpanded)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* AI Chat button */}
                      <button
                        onClick={() => toggleChat(item.id)}
                        className={`p-1.5 transition-colors rounded ${
                          isExpanded
                            ? 'bg-amber-100 text-amber-600'
                            : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="Discuss with AI"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      </button>
                      {/* Edit button */}
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 hover:bg-slate-100 transition-colors rounded"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4 text-slate-400" />
                      </button>
                      {/* Approve button */}
                      <button
                        onClick={() => toggleApproval(item.id)}
                        className={`p-1.5 transition-colors rounded ${
                          approvedItems.has(item.id)
                            ? 'bg-green-100 text-green-600'
                            : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title={approvedItems.has(item.id) ? 'Approved' : 'Approve'}
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      {/* Expand/collapse indicator */}
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </div>

                  {/* Expanded chat section */}
                  {isExpanded && (
                    <CardChat
                      item={item}
                      allItems={items}
                      sectionName={sectionName}
                      originalAnswers={originalAnswers}
                      onApplySuggestion={(newValue) => handleApplySuggestion(item.id, newValue)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <TechnicalButton variant="outline" onClick={onReject}>
          <XMarkIcon className="w-4 h-4 mr-1" />
          REGENERATE
        </TechnicalButton>

        <TechnicalButton variant="primary" onClick={handleApproveAll}>
          <CheckIcon className="w-4 h-4 mr-1" />
          SAVE ALL ({items.length} ITEMS)
        </TechnicalButton>
      </div>
    </TechnicalCard>
  );
}
