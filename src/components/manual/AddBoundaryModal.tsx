'use client';

import { useState } from 'react';

interface AddBoundaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boundary: {
    description: string;
    category: 'immovable' | 'negotiable' | 'preference';
    context: string;
    consequences: string;
  }) => Promise<void>;
  personName: string;
}

export function AddBoundaryModal({ isOpen, onClose, onSave, personName }: AddBoundaryModalProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'immovable' | 'negotiable' | 'preference'>('negotiable');
  const [context, setContext] = useState('');
  const [consequences, setConsequences] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Boundary description is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        description: description.trim(),
        category,
        context: context.trim(),
        consequences: consequences.trim()
      });

      // Reset form
      setDescription('');
      setCategory('negotiable');
      setContext('');
      setConsequences('');
      onClose();
    } catch (error) {
      console.error('Error saving boundary:', error);
      alert('Failed to save boundary. Please try again.');
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
              <span className="text-3xl">🛡️</span>
              <span>Add Boundary</span>
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
                Boundary Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`e.g., No screen time after 8pm`}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Boundary Type
              </label>
              <div className="space-y-3">
                {[
                  { value: 'immovable', label: 'Immovable', description: 'Non-negotiable, must be respected' },
                  { value: 'negotiable', label: 'Negotiable', description: 'Can be discussed and adjusted in certain contexts' },
                  { value: 'preference', label: 'Preference', description: 'Preferred but flexible based on circumstances' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm"
                    style={{
                      border: `2px solid ${category === option.value ? 'var(--parent-accent)' : 'var(--parent-border)'}`,
                      backgroundColor: category === option.value ? 'var(--parent-bg)' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={option.value}
                      checked={category === option.value}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="mt-1 cursor-pointer"
                    />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--parent-text)' }}>
                        {option.label}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Context / Why is this important?
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., Needs adequate sleep for school and emotional regulation"
                rows={2}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
              />
            </div>

            {/* Consequences */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Consequences if crossed
              </label>
              <textarea
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                placeholder="e.g., Becomes overtired, meltdowns the next day"
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
                {saving ? 'Saving...' : 'Add Boundary'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
