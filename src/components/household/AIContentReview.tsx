'use client';

import { useState } from 'react';
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
} from '@heroicons/react/24/outline';

interface ContentItem {
  id: string;
  type: 'string' | 'non-negotiable' | 'zone' | 'contact' | 'ritual' | 'card';
  value: string | Record<string, any>;
  label?: string;
}

interface AIContentReviewProps {
  sectionName: string;
  items: ContentItem[];
  onApprove: (items: ContentItem[]) => void;
  onReject: () => void;
  onEdit: (itemId: string, newValue: any) => void;
  isLoading?: boolean;
}

export default function AIContentReview({
  sectionName,
  items,
  onApprove,
  onReject,
  onEdit,
  isLoading = false,
}: AIContentReviewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());

  const handleStartEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditValue(
      typeof item.value === 'string' ? item.value : JSON.stringify(item.value, null, 2)
    );
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

  const handleApproveAll = () => {
    // Mark all as approved and save
    onApprove(items);
  };

  const renderItemValue = (item: ContentItem) => {
    if (typeof item.value === 'string') {
      return item.value;
    }

    // Render object-based items
    switch (item.type) {
      case 'non-negotiable':
        return (
          <div>
            <p className="font-medium">{(item.value as any).value}</p>
            {(item.value as any).description && (
              <p className="text-xs text-slate-500 mt-1">
                {(item.value as any).description}
              </p>
            )}
          </div>
        );
      case 'zone':
        return (
          <div>
            <p className="font-medium">{(item.value as any).name}</p>
            <p className="text-xs text-slate-500">
              {(item.value as any).type} · {(item.value as any).location}
            </p>
            {(item.value as any).purpose && (
              <p className="text-xs text-slate-600 mt-1">
                {(item.value as any).purpose}
              </p>
            )}
          </div>
        );
      case 'contact':
        return (
          <div>
            <p className="font-medium">{(item.value as any).name}</p>
            <p className="text-xs text-slate-500">
              {(item.value as any).relationship} · {(item.value as any).category}
            </p>
          </div>
        );
      case 'ritual':
        return (
          <div>
            <p className="font-medium">{(item.value as any).name}</p>
            <p className="text-xs text-slate-600 mt-1">
              {(item.value as any).description}
            </p>
            {(item.value as any).dayOfWeek !== undefined && (
              <TechnicalLabel variant="subtle" color="blue" size="xs" className="mt-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(item.value as any).dayOfWeek]}
              </TechnicalLabel>
            )}
          </div>
        );
      case 'card':
        return (
          <div>
            <p className="font-medium">{(item.value as any).name}</p>
            <p className="text-xs text-slate-500">
              {(item.value as any).category} · Owner: {(item.value as any).ownerName}
            </p>
          </div>
        );
      default:
        return JSON.stringify(item.value, null, 2);
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
          Review the generated content below. You can edit any item before saving,
          or approve all items at once.
        </p>
      </div>

      {/* Items list */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 border-2 ${
              approvedItems.has(item.id)
                ? 'border-green-400 bg-green-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            {editingId === item.id ? (
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {item.label && (
                    <span className="font-mono text-xs text-slate-500 uppercase block mb-1">
                      {item.label}
                    </span>
                  )}
                  <div className="text-sm text-slate-700">
                    {renderItemValue(item)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-1.5 hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => toggleApproval(item.id)}
                    className={`p-1.5 transition-colors ${
                      approvedItems.has(item.id)
                        ? 'bg-green-100 text-green-600'
                        : 'hover:bg-slate-100 text-slate-400'
                    }`}
                    title={approvedItems.has(item.id) ? 'Approved' : 'Approve'}
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
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
