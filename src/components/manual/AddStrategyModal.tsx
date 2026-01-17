'use client';

import { useState } from 'react';

interface AddStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: {
    description: string;
    context: string;
    effectiveness: number;
    notes: string;
  }) => Promise<void>;
  personName: string;
  type: 'works' | 'doesntWork';
}

export function AddStrategyModal({ isOpen, onClose, onSave, personName, type }: AddStrategyModalProps) {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [effectiveness, setEffectiveness] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isWorksType = type === 'works';
  const title = isWorksType ? 'What Works' : "What Doesn't Work";
  const emoji = isWorksType ? '✨' : '🚫';
  const descriptionPlaceholder = isWorksType
    ? 'e.g., Giving advance warning before transitions'
    : 'e.g., Yelling or threatening consequences';
  const contextPlaceholder = isWorksType
    ? 'e.g., Works best in the morning when they are well-rested'
    : 'e.g., Tends to escalate the situation rather than calm it';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !context.trim()) {
      alert('Description and context are required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        description: description.trim(),
        context: context.trim(),
        effectiveness: isWorksType ? effectiveness : 1, // What doesn't work always gets effectiveness 1
        notes: notes.trim()
      });

      // Reset form
      setDescription('');
      setContext('');
      setEffectiveness(3);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Failed to save strategy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="parent-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="parent-heading text-2xl flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">{emoji}</span>
              <span>Add Strategy - {title}</span>
            </h2>
            <button
              onClick={onClose}
              className="text-2xl transition-transform hover:scale-110"
              style={{ color: 'var(--parent-text-light)' }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Strategy Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descriptionPlaceholder}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
                required
              />
            </div>

            {/* Context */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Context / When to {isWorksType ? 'use' : 'avoid'} this *
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={contextPlaceholder}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
                required
              />
            </div>

            {/* Effectiveness (only for "What Works") */}
            {isWorksType && (
              <div>
                <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Effectiveness
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={effectiveness}
                    onChange={(e) => setEffectiveness(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={star <= effectiveness ? 'text-yellow-500' : 'text-gray-300'}
                        style={{ fontSize: '24px' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context or observations..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--parent-border)' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {saving ? 'Saving...' : 'Add Strategy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
